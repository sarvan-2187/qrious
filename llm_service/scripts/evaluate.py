"""Evaluate the qiskit-lora-v1 adapter vs. base Qwen3-1.7B (IMPLEMENTATION_PLAN.md Section 9).

Axes covered:
  - Execution-based pass@1 for code_generation/function_completion rows:
    generated code is run against the row's own `test_code` in a sandboxed
    subprocess (a real Qiskit process, not a string/BLEU comparison).
  - LLM-judge for qa rows: base Qwen3-1.7B (untuned) scores both models'
    answers against the reference answer on a 1-5 rubric. This is a same-
    size self-judge, a weak signal by construction - treat scores as
    directional, not authoritative.
  - Instruction-following: a small hand-written format-compliance probe set.
  - "Regression vs. base model" isn't a separate pass - both models are run
    on every sampled row throughout, so it falls out of the two axes above.

Skipped on purpose: the RAG-on/off hallucination check from Section 9 needs
the RAG pipeline, which doesn't exist yet (Phases 4-6) - that check belongs
in Phase 6's smoke test, not here.

Scope and thermal footprint: this deliberately does NOT run the full 744
code / 136 qa test rows in one sitting on a laptop GPU. Sustained near-100%
GPU utilization for hours is a real hardware concern (this laptop hit 73C
and the run was stopped), not just a time one, so the defaults below are
picked to keep total GPU-active time and peak power draw down per run:
  - MAX_CODE_ROWS/MAX_QA_ROWS split the eligible pool into non-overlapping
    "shards" of about this many rows each (stratified, so every shard still
    covers every category), instead of one sample that discards the rest.
    `--shard N` (1-indexed, default 1) picks which shard to run. Run shard 1
    today, shard 2 tomorrow, etc. - after running all shards (the startup
    print tells you how many there are) you've covered the full test set,
    just spread across sessions instead of one multi-hour run. Each shard
    writes its own outputs/eval_report_v1_shardNofM.json. Set either
    constant to None to disable sharding for that pool (1 shard = everything).
  - BATCH_SIZE=4 (not 8) trades some throughput for lower peak power draw
    per generation step.
  - MAX_NEW_TOKENS_ANSWER=384 (not 512) caps worst-case compute per item;
    most reference answers are well under this anyway (median ~400-600
    chars, ~100-150 tokens).
  - BATCH_PAUSE_SEC inserts a short idle gap after every batch so the GPU
    isn't pinned at 100% continuously - a real cooldown, not just cosmetic.
  - Only one full model load from disk (base). The tuned pass reuses it
    with the LoRA adapter attached, and the judge pass reuses it again with
    the adapter temporarily disabled - two fewer ~10s full reloads and less
    VRAM alloc/dealloc churn than loading the same base weights three times.

Run: `python scripts/evaluate.py [--shard N]`. Mechanical parts (no GPU/
model) can be checked on their own via `python scripts/evaluate.py --selfcheck`.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import time
import warnings
from pathlib import Path

import pandas as pd

# Unsloth's patched Llama forward pass calls transformers' deprecated
# modeling_attn_mask_utils internally during generation - not something this
# script controls, and harmless (the replacement API isn't removed until
# transformers v5.10), so silence the noise instead of leaving it unactionable.
warnings.filterwarnings("ignore", category=FutureWarning, module=r"transformers\.modeling_attn_mask_utils")
from tqdm import tqdm

MODEL_DIR = "model/Qwen3-1.7B"
ADAPTER_DIR = "adapters/qiskit-lora-v1"
DATA_DIR = "data"
REPORT_PATH = "outputs/eval_report_v1.json"
MAX_SEQ_LENGTH = 1024

MAX_CODE_ROWS = 200
MAX_QA_ROWS = 40
BATCH_SIZE = 4
BATCH_PAUSE_SEC = 2.0
MAX_NEW_TOKENS_ANSWER = 384
MAX_NEW_TOKENS_JUDGE = 150
EXEC_TIMEOUT_SEC = 30
SEED = 42

SYSTEM_PROMPT = "You are a Qiskit coding assistant."

# packages a code row's test_code is allowed to import for it to be eligible
# (qiskit's own transitive deps like rustworkx/scipy/sympy ride along for free)
CORE_PKGS = {
    "qiskit", "qiskit_aer", "qiskit_ibm_runtime", "numpy", "scipy", "sympy",
    "matplotlib", "rustworkx", "math", "cmath", "typing", "random", "re",
    "sys", "os", "itertools", "functools", "collections", "dataclasses",
    "statistics", "warnings", "unittest", "tempfile", "types", "time", "io",
    "importlib", "inspect", "datetime", "ctypes", "builtins", "gzip",
    "__main__", "__future__",
}

INSTRUCTION_PROBES = [
    "Write only the Qiskit code to create a 2-qubit Bell state circuit. Return only code, no explanation.",
    "Return only a Python function `ghz_state(n)` that builds an n-qubit GHZ state circuit using Qiskit. No prose, code only.",
    "Give me just the Qiskit import statement for QuantumCircuit. One line, nothing else.",
    "Output only the code for a QFT circuit on 3 qubits using qiskit.circuit.library.QFT. No commentary.",
    "Respond with only the code that transpiles a circuit `qc` for backend `backend` at optimization_level=3. No explanation text.",
]


# --------------------------------------------------------------------------
# Mechanical helpers (no GPU/model needed - covered by --selfcheck)
# --------------------------------------------------------------------------

def strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>\s*", "", text, flags=re.DOTALL).strip()


def extract_code(text: str) -> str:
    text = strip_thinking(text)
    m = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    return m.group(1).strip() if m else text.strip()


def reconstruct_function_completion(stub_question: str, completion: str) -> str:
    """function_completion rows train the model to emit only the missing
    body, not the full function - stitch it back into the stub's `pass`
    placeholder to get a runnable script."""
    code = re.sub(r"^```python\s*\n?", "", stub_question.strip())
    code = re.sub(r"\n?```\s*$", "", code)
    lines = code.split("\n")
    completion_lines = strip_thinking(completion).strip("\n").split("\n")
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == "pass":
            indent = lines[i][: len(lines[i]) - len(lines[i].lstrip())]
            completion_lines[0] = indent + completion_lines[0]
            lines[i : i + 1] = completion_lines
            return "\n".join(lines)
    # no bare `pass` placeholder found - best-effort fallback
    return code + "\n" + "\n".join(completion_lines)


def run_test(script: str, timeout: int = EXEC_TIMEOUT_SEC) -> tuple[bool, str]:
    fd, path = tempfile.mkstemp(suffix=".py")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(script)
        proc = subprocess.run(
            [sys.executable, path], capture_output=True, text=True, timeout=timeout
        )
        return proc.returncode == 0, proc.stderr[-2000:]
    except subprocess.TimeoutExpired:
        return False, "timeout"
    finally:
        os.unlink(path)


def code_imports_satisfiable(test_code: str) -> bool:
    pkgs = {m.group(1) for m in re.finditer(r"^\s*(?:from|import)\s+([a-zA-Z0-9_]+)", test_code, re.MULTILINE)}
    return not (pkgs - CORE_PKGS)


def parse_judge_score(text: str) -> int | None:
    m = re.search(r"SCORE:\s*([1-5])", text)
    return int(m.group(1)) if m else None


JUDGE_FIELD_MAX_CHARS = 800  # reference answers run up to 5054 chars (Phase 1 stats) - cap each
# field so question+reference+candidate can't overflow MAX_SEQ_LENGTH and corrupt/truncate
# the chat template's trailing generation-prompt marker.


def judge_messages(question: str, reference: str, candidate: str) -> list[dict]:
    question = question[:JUDGE_FIELD_MAX_CHARS]
    reference = reference[:JUDGE_FIELD_MAX_CHARS]
    candidate = candidate[:JUDGE_FIELD_MAX_CHARS]
    return [
        {
            "role": "system",
            "content": (
                "You grade a Qiskit assistant's answer for correctness against a "
                "reference answer. Respond in exactly this format:\nSCORE: <1-5>\n"
                "REASON: <one line>\nA 5 means fully correct and consistent with "
                "the reference; a 1 means wrong or irrelevant."
            ),
        },
        {
            "role": "user",
            "content": f"Question: {question}\n\nReference answer: {reference}\n\nCandidate answer: {candidate}\n\nScore the candidate answer.",
        },
    ]


def chunked(seq: list, n: int) -> list[list]:
    return [seq[i : i + n] for i in range(0, len(seq), n)]


def make_shards(df: pd.DataFrame, n_shards: int, seed: int = SEED) -> list[pd.DataFrame]:
    """Partition df into n_shards non-overlapping pieces that together cover
    every row exactly once - a full-set eval spread across multiple runs
    instead of one sample that silently discards the rest. Shuffling once
    with a fixed seed then interleaving (`iloc[i::n_shards]`) keeps shard
    boundaries deterministic across separate invocations and gives each
    shard a roughly proportional category mix without extra bookkeeping."""
    if n_shards <= 1:
        return [df]
    shuffled = df.sample(frac=1, random_state=seed)
    return [shuffled.iloc[i::n_shards] for i in range(n_shards)]


def get_shard_arg() -> int:
    """1-indexed --shard N from argv; defaults to 1."""
    if "--shard" in sys.argv:
        return int(sys.argv[sys.argv.index("--shard") + 1])
    return 1


# --------------------------------------------------------------------------
# Self-check: exercises the mechanical logic above without touching the GPU
# --------------------------------------------------------------------------

def selfcheck() -> None:
    assert extract_code("blah\n```python\nx = 1\n```\ntrailing") == "x = 1"
    assert extract_code("<think>reasoning</think>\nx = 1") == "x = 1"
    assert extract_code("no fence here") == "no fence here"

    stub = '```python\ndef f():\n    """doc"""\n    pass\n```'
    rebuilt = reconstruct_function_completion(stub, "return 1")
    assert rebuilt == 'def f():\n    """doc"""\n    return 1', rebuilt

    ok, err = run_test("x = 1\nassert x == 1\n")
    assert ok, err
    ok, err = run_test("x = 1\nassert x == 2\n")
    assert not ok

    assert parse_judge_score("SCORE: 4\nREASON: mostly right") == 4
    assert parse_judge_score("no score here") is None

    assert code_imports_satisfiable("import qiskit\nimport numpy as np\n")
    assert not code_imports_satisfiable("import qiskit_addon_cutting\n")

    assert chunked([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
    assert chunked([], 2) == []

    df = pd.DataFrame({"category": ["a"] * 8 + ["b"] * 2, "v": range(10)})
    shards = make_shards(df, 3)
    assert len(shards) == 3
    assert sum(len(s) for s in shards) == 10
    assert sorted(pd.concat(shards)["v"]) == list(range(10))  # exact partition, no overlap/loss
    assert make_shards(df, 1) == [df] or len(make_shards(df, 1)[0]) == 10

    print("selfcheck OK")


# --------------------------------------------------------------------------
# Full eval (GPU/model required)
# --------------------------------------------------------------------------

def load_split_with_metadata(split: str) -> pd.DataFrame:
    sys.path.insert(0, "scripts")
    from clean_dataset import clean_split  # noqa: E402
    from transformers import AutoTokenizer  # noqa: E402

    tok = AutoTokenizer.from_pretrained(MODEL_DIR)
    df = pd.read_parquet(f"{DATA_DIR}/{split}-00000-of-00001.parquet")
    cleaned, _ = clean_split(df, tok)
    return cleaned


def generate_batch(model, tokenizer, messages_batch: list[list[dict]], max_new_tokens: int) -> list[str]:
    """Batched, left-padded generation. Left padding is required for batched
    decoder-only generation: it aligns every prompt's last token at the same
    column, so generation continues in lockstep across the batch and the
    single `prompt_len` slice below correctly isolates new tokens for every row."""
    tokenizer.padding_side = "left"
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model.generation_config.max_length = None  # avoid the max_new_tokens/max_length conflict warning on every call
    texts = [
        # enable_thinking=False: Qwen3's template otherwise lets the model
        # generate its own <think>...</think> reasoning before answering,
        # which can consume the entire max_new_tokens budget and leave zero
        # room for the actual code/SCORE line (confirmed in shard 1's raw
        # instruction-probe output - reasoning truncated mid-sentence, no
        # code at all). Forcing this off makes both models answer directly.
        tokenizer.apply_chat_template(m, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        for m in messages_batch
    ]
    enc = tokenizer(texts, return_tensors="pt", padding=True, add_special_tokens=False).to(model.device)
    out = model.generate(
        **enc,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        pad_token_id=tokenizer.pad_token_id,
    )
    prompt_len = enc["input_ids"].shape[1]
    return [tokenizer.decode(seq[prompt_len:], skip_special_tokens=True) for seq in out]


def batched_generate_for_rows(model, tokenizer, indexed_messages: list[tuple], max_new_tokens: int, desc: str) -> dict:
    """indexed_messages: list of (key, messages) - key can be a row index or
    any hashable id, so this doubles as the judge/instruction-probe driver too."""
    results = {}
    batches = chunked(indexed_messages, BATCH_SIZE)
    with tqdm(total=len(indexed_messages), desc=desc) as pbar:
        for i, batch in enumerate(batches):
            keys = [k for k, _ in batch]
            msgs = [m for _, m in batch]
            outputs = generate_batch(model, tokenizer, msgs, max_new_tokens)
            results.update(zip(keys, outputs))
            pbar.update(len(batch))
            if BATCH_PAUSE_SEC and i < len(batches) - 1:
                time.sleep(BATCH_PAUSE_SEC)
    return results


def run_generation_pass(model, tokenizer, code_rows: pd.DataFrame, qa_rows: pd.DataFrame, label: str) -> dict:
    code_items = []
    for idx, row in code_rows.iterrows():
        user = row["question"] if row["type"] == "code_generation" else f"{row['question']}\n\nComplete this function."
        code_items.append((idx, [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]))
    qa_items = [
        (idx, [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": row["question"]}])
        for idx, row in qa_rows.iterrows()
    ]
    code_answers = batched_generate_for_rows(model, tokenizer, code_items, MAX_NEW_TOKENS_ANSWER, f"{label}: code gen")
    qa_answers = batched_generate_for_rows(model, tokenizer, qa_items, MAX_NEW_TOKENS_ANSWER, f"{label}: qa gen")
    return {"code": code_answers, "qa": qa_answers}


def score_code_rows(code_rows: pd.DataFrame, raw_answers: dict, label: str) -> dict:
    results = {}
    for idx, row in tqdm(code_rows.iterrows(), total=len(code_rows), desc=f"{label}: exec test"):
        raw = raw_answers[idx]
        code = extract_code(raw)
        if row["type"] == "function_completion":
            script = reconstruct_function_completion(row["question"], code) + "\n\n" + row["test_code"]
        else:
            script = code + "\n\n" + row["test_code"]
        passed, err = run_test(script)
        results[idx] = {"passed": passed, "error": err if not passed else ""}
    return results


def main() -> None:
    import torch  # noqa: E402
    import unsloth  # noqa: F401,E402  (import before trl/transformers/peft)
    from peft import PeftModel  # noqa: E402
    from unsloth import FastLanguageModel  # noqa: E402

    print("Loading test split...")
    test_df = load_split_with_metadata("test")
    code_pool = test_df[
        test_df["type"].isin(["code_generation", "function_completion"])
        & test_df["test_code"].map(code_imports_satisfiable)
    ]
    qa_pool = test_df[test_df["type"] == "qa"]

    n_shards = max(
        1,
        -(-len(code_pool) // MAX_CODE_ROWS) if MAX_CODE_ROWS else 1,
        -(-len(qa_pool) // MAX_QA_ROWS) if MAX_QA_ROWS else 1,
    )
    shard_num = get_shard_arg()
    if not (1 <= shard_num <= n_shards):
        raise SystemExit(f"--shard must be between 1 and {n_shards} (this pool splits into {n_shards} shards)")
    code_rows = make_shards(code_pool, n_shards)[shard_num - 1]
    qa_rows = make_shards(qa_pool, n_shards)[shard_num - 1]
    report_path = REPORT_PATH if n_shards == 1 else REPORT_PATH.replace(".json", f"_shard{shard_num}of{n_shards}.json")
    print(
        f"Shard {shard_num}/{n_shards}: {len(code_rows)}/{len(code_pool)} code rows, {len(qa_rows)}/{len(qa_pool)} qa rows. "
        f"Batch size {BATCH_SIZE}, {BATCH_PAUSE_SEC}s pause between batches. Report -> {report_path}"
    )

    print("Loading base model (single load, reused for base/tuned/judge passes)...")
    base_model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_DIR, max_seq_length=MAX_SEQ_LENGTH, load_in_4bit=True, dtype=None,
    )
    FastLanguageModel.for_inference(base_model)
    base_answers = run_generation_pass(base_model, tokenizer, code_rows, qa_rows, label="base")

    print("Attaching LoRA adapter on top of the same loaded weights for the tuned pass...")
    tuned_model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    FastLanguageModel.for_inference(tuned_model)
    tuned_answers = run_generation_pass(tuned_model, tokenizer, code_rows, qa_rows, label="tuned")

    base_code_results = score_code_rows(code_rows, base_answers["code"], label="base")
    tuned_code_results = score_code_rows(code_rows, tuned_answers["code"], label="tuned")

    judge_items = []
    for idx, row in qa_rows.iterrows():
        for model_label, ans_dict in [("base", base_answers["qa"]), ("tuned", tuned_answers["qa"])]:
            candidate = strip_thinking(ans_dict[idx])
            judge_items.append(((idx, model_label), judge_messages(row["question"], row["answer"], candidate)))
    instruction_items = [
        (i, [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": p}])
        for i, p in enumerate(INSTRUCTION_PROBES)
    ]

    print("Temporarily disabling the adapter to reuse the same weights as qa judge...")
    with tuned_model.disable_adapter():
        judge_texts = batched_generate_for_rows(tuned_model, tokenizer, judge_items, MAX_NEW_TOKENS_JUDGE, "judging qa (base+tuned)")
        instruction_texts = batched_generate_for_rows(tuned_model, tokenizer, instruction_items, 200, "instruction-following probes")

    qa_scores = {"base": {}, "tuned": {}}
    for (idx, model_label), text in judge_texts.items():
        qa_scores[model_label][idx] = parse_judge_score(text)

    instruction_results = []
    for i, prompt in enumerate(INSTRUCTION_PROBES):
        resp = strip_thinking(instruction_texts[i])
        # heuristic: compliant if no sentence-like prose outside any code fence
        body = re.sub(r"```(?:python)?\s*\n.*?```", "", resp, flags=re.DOTALL)
        prose_hit = re.search(r"[A-Z][a-z]{2,}.{0,40}\.\s", body)
        instruction_results.append({"prompt": prompt, "response": resp, "compliant": prose_hit is None})

    del tuned_model, base_model
    torch.cuda.empty_cache()

    # ---- aggregate ----
    def pass_rate_by_category(rows: pd.DataFrame, results: dict) -> dict:
        rows = rows.assign(passed=[results[i]["passed"] for i in rows.index])
        return rows.groupby("category")["passed"].mean().round(3).to_dict()

    def judge_avg_by_category(rows: pd.DataFrame, scores: dict) -> dict:
        rows = rows.assign(score=[scores[i] for i in rows.index])
        return rows.dropna(subset=["score"]).groupby("category")["score"].mean().round(2).to_dict()

    report = {
        "shard": f"{shard_num}/{n_shards}",
        "n_code_rows": len(code_rows),
        "n_qa_rows": len(qa_rows),
        "code_pass_at_1": {
            "base_overall": round(pd.Series([r["passed"] for r in base_code_results.values()]).mean(), 3),
            "tuned_overall": round(pd.Series([r["passed"] for r in tuned_code_results.values()]).mean(), 3),
            "base_by_category": pass_rate_by_category(code_rows, base_code_results),
            "tuned_by_category": pass_rate_by_category(code_rows, tuned_code_results),
        },
        "qa_judge_score_1to5": {
            "base_overall": round(pd.Series(list(qa_scores["base"].values()), dtype="float").mean(), 2),
            "tuned_overall": round(pd.Series(list(qa_scores["tuned"].values()), dtype="float").mean(), 2),
            "base_by_category": judge_avg_by_category(qa_rows, qa_scores["base"]),
            "tuned_by_category": judge_avg_by_category(qa_rows, qa_scores["tuned"]),
        },
        "instruction_following": {
            "compliance_rate": round(sum(r["compliant"] for r in instruction_results) / len(instruction_results), 2),
            "probes": instruction_results,
        },
        "note": "RAG-on/off hallucination check skipped - deferred to Phase 6 (needs the RAG pipeline).",
    }

    Path("outputs").mkdir(exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nSaved report to {report_path}")


if __name__ == "__main__":
    if "--selfcheck" in sys.argv:
        selfcheck()
    else:
        main()
