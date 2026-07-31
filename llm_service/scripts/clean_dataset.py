"""Clean and chat-format samuellimabraz/quantum-assistant for QLoRA SFT.

Rules (IMPLEMENTATION_PLAN.md Section 2, revised after inspecting the actual
data rather than trusting the dataset card alone):

- Drop `image` entirely: Qwen3-1.7B is text-only.
- Drop ALL qa-type rows with a non-null image. The plan's original rule kept
  a "qiskit-documentation/notebook" subset after dropping only the
  papers/qgss-2025-lecture-notes rows, but a manual check of that remaining
  subset found 800/801 questions still explicitly depend on the image
  ("shown in the diagram", "the scatter plot", "the heatmap", ...) - keeping
  them would teach the model to answer confidently about visuals it can't
  see (the exact risk IMPLEMENTATION_PLAN.md Section 11 warns about).
- Keep all code_generation/function_completion rows regardless of image: the
  image there is a redundant render of a circuit the question already spells
  out gate-by-gate in text (verified by sampling).
- Drop exact-normalized-text duplicate questions (rare: ~17/5837 on train).
- Drop rows whose formatted+tokenized prompt exceeds MAX_SEQ_LENGTH.
"""

import json
import re
from pathlib import Path

import pandas as pd
from transformers import AutoTokenizer

DATA_DIR = Path("data")
OUT_DIR = Path("dataset/cleaned")
MODEL_DIR = Path("model/Qwen3-1.7B")
MAX_SEQ_LENGTH = 1024
SYSTEM_PROMPT = "You are a Qiskit coding assistant."
SPLITS = [("train", "train"), ("validation", "val"), ("test", "test")]


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def chat_template_length(tokenizer, messages: list[dict]) -> int:
    """`apply_chat_template(..., tokenize=True)` returns a BatchEncoding
    (dict with "input_ids") under vanilla transformers, but Unsloth patches
    it globally to return a plain list of token ids once `unsloth` has been
    imported anywhere in the process - handle both."""
    result = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=False)
    # Unsloth-patched path returns a plain list[int]; vanilla transformers
    # returns a BatchEncoding (a Mapping, not a dict subclass - isinstance(x, dict) is False for it).
    ids = result if isinstance(result, list) else result["input_ids"]
    return len(ids)


def to_messages(row: pd.Series) -> list[dict]:
    if row["type"] == "function_completion":
        user = f"{row['question']}\n\nComplete this function."
    else:
        user = row["question"]
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
        {"role": "assistant", "content": row["answer"]},
    ]


def clean_split(df: pd.DataFrame, tokenizer) -> tuple[pd.DataFrame, dict]:
    stats = {"start": len(df)}

    df = df[~((df["type"] == "qa") & df["image"].notna())]
    stats["after_qa_image_drop"] = len(df)

    df = df.drop(columns=["image"])

    norm = df["question"].map(normalize)
    df = df[~norm.duplicated(keep="first")]
    stats["after_dedup"] = len(df)

    messages = df.apply(to_messages, axis=1)
    lengths = messages.map(lambda m: chat_template_length(tokenizer, m))
    assert lengths.min() > 10, f"tokenized lengths look degenerate (min={lengths.min()}) - check apply_chat_template usage"
    df = df[lengths <= MAX_SEQ_LENGTH]
    stats["after_length_filter"] = len(df)

    return df.assign(messages=messages[df.index]), stats


def selfcheck(path: Path, expected_rows: int) -> None:
    rows = [json.loads(line) for line in path.open(encoding="utf-8")]
    assert len(rows) == expected_rows, f"{path}: wrote {len(rows)}, expected {expected_rows}"
    for r in rows: 
        roles = [m["role"] for m in r["messages"]]
        assert roles == ["system", "user", "assistant"], f"{path}: bad roles {roles}"
        assert all(m["content"].strip() for m in r["messages"]), f"{path}: empty message content"


def main() -> None:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for split, out_name in SPLITS:
        df = pd.read_parquet(DATA_DIR / f"{split}-00000-of-00001.parquet")
        cleaned, stats = clean_split(df, tokenizer)
        print(out_name, stats)

        out_path = OUT_DIR / f"{out_name}.jsonl"
        with out_path.open("w", encoding="utf-8") as f:
            for messages in cleaned["messages"]:
                f.write(json.dumps({"messages": messages}, ensure_ascii=False) + "\n")

        selfcheck(out_path, len(cleaned))
        print(f"  wrote {out_path} ({len(cleaned)} rows, verified)")


if __name__ == "__main__":
    main()
