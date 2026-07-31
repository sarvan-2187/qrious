"""Merge the LoRA adapter into the base model and publish to Hugging Face Hub
(Phase 7). Plain `transformers`/`peft` are used here, not Unsloth -- merging
requires the base model in fp16 (LoRA can't be merged into 4-bit quantized
weights), and Unsloth's speed optimizations only matter for training/inference,
not a one-shot weight merge.

Two separate steps, run locally (needs the GPU-loadable base model + adapter
on disk, plus network for the push):

    python scripts/publish_model.py --merge   # base + adapter -> outputs/qrious-code-1.0-merged/
    python scripts/publish_model.py --push    # upload that folder to HF Hub (private repo)

Mechanical parts (paths, repo id shape) can be checked without a GPU/network
via `python scripts/publish_model.py --selfcheck`.
"""

import argparse
from pathlib import Path

MODEL_DIR = "model/Qwen3-1.7B"
ADAPTER_DIR = "adapters/qiskit-lora-v1"
MERGED_DIR = "outputs/qrious-code-1.0-merged"
HF_REPO_ID = "sarvan-2187/qrious-code-1.0"


def merge() -> None:
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print(f"Loading base model from {MODEL_DIR} (fp16, not 4-bit)...")
    base_model = AutoModelForCausalLM.from_pretrained(MODEL_DIR, dtype=torch.float16)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)

    print(f"Loading adapter from {ADAPTER_DIR} and merging...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    model = model.merge_and_unload()

    Path(MERGED_DIR).mkdir(parents=True, exist_ok=True)
    model.save_pretrained(MERGED_DIR, safe_serialization=True)
    tokenizer.save_pretrained(MERGED_DIR)
    print(f"Merged model saved to {MERGED_DIR}")


def push(private: bool = True) -> None:
    from huggingface_hub import HfApi

    if not Path(MERGED_DIR).exists():
        raise SystemExit(f"{MERGED_DIR} doesn't exist yet -- run --merge first")

    api = HfApi()
    api.create_repo(repo_id=HF_REPO_ID, private=private, exist_ok=True)
    api.upload_folder(repo_id=HF_REPO_ID, folder_path=MERGED_DIR)
    print(f"Pushed to https://huggingface.co/{HF_REPO_ID} (private={private})")


def selfcheck() -> None:
    assert Path(MODEL_DIR).exists(), f"missing {MODEL_DIR}"
    assert Path(ADAPTER_DIR).exists(), f"missing {ADAPTER_DIR}"
    assert HF_REPO_ID.count("/") == 1, "HF_REPO_ID must be '<username>/<repo>'"
    print("selfcheck OK:", MODEL_DIR, "+", ADAPTER_DIR, "->", HF_REPO_ID)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--selfcheck", action="store_true")
    parser.add_argument("--merge", action="store_true")
    parser.add_argument("--push", action="store_true")
    args = parser.parse_args()

    if args.selfcheck:
        selfcheck()
    elif args.merge:
        merge()
    elif args.push:
        push(private=True)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
