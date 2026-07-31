"""QLoRA SFT of Qwen3-1.7B on the cleaned quantum-assistant dataset.

Config per IMPLEMENTATION_PLAN.md Sections 5/10, sized for a 6 GB RTX 3050:
4-bit NF4 (Unsloth) + LoRA on attn+MLP + gradient checkpointing + paged
8-bit AdamW + short packed sequences. Run: `python scripts/train_qlora.py`.
"""

import unsloth  # noqa: F401  (must import before trl/transformers/peft - Unsloth's own requirement)
from datasets import load_dataset
from trl import SFTConfig, SFTTrainer
from unsloth import FastLanguageModel

MODEL_DIR = "model/Qwen3-1.7B"
DATA_DIR = "dataset/cleaned"
ADAPTER_DIR = "adapters/qiskit-lora-v1"
RUN_DIR = "outputs/qlora-v1"
MAX_SEQ_LENGTH = 1024

TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]


def main() -> None:
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_DIR,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
        dtype=None,  # auto: bf16 on this Ampere GPU
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        lora_alpha=16,
        lora_dropout=0.0,
        bias="none",
        target_modules=TARGET_MODULES,
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    dataset = load_dataset(
        "json",
        data_files={
            "train": f"{DATA_DIR}/train.jsonl",
            "validation": f"{DATA_DIR}/val.jsonl",
        },
    )

    def formatting_func(examples: dict) -> list[str]:
        # Unsloth's SFTTrainer calls this two ways: once with a single raw
        # example (messages = one conversation, a list of role-dicts) to
        # sniff the return type, then for real via dataset.map(batched=True)
        # (messages = a list of conversations). Handle both shapes.
        convos = examples["messages"]
        if convos and isinstance(convos[0], dict):
            convos = [convos]
        return [
            tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False)
            for convo in convos
        ]

    args = SFTConfig(
        output_dir=RUN_DIR,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        num_train_epochs=3,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        optim="paged_adamw_8bit",
        bf16=True,
        max_length=MAX_SEQ_LENGTH,
        packing=True,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        args=args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        processing_class=tokenizer,
        formatting_func=formatting_func,
    )

    trainer.train()

    model.save_pretrained(ADAPTER_DIR)
    tokenizer.save_pretrained(ADAPTER_DIR)
    print(f"Saved adapter to {ADAPTER_DIR}")


if __name__ == "__main__":
    main()
