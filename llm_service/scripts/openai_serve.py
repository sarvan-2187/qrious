import os
import sys
import time
import uuid

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "qrious-code-1.0"))

app = FastAPI(title="Qrious Code OpenAI-Compatible Server")

model = None
tokenizer = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 512

@app.on_event("startup")
def load_model():
    global model, tokenizer
    print(f"Loading model from {MODEL_DIR}...")
    # The local qrious-code-1.0 folder is missing its tokenizer.json / vocab files!
    # We load the exact matching tokenizer from the HuggingFace Hub instead.
    tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-Coder-1.5B-Instruct")
    
    # Use GPU if available, else fallback to CPU
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        torch_dtype=dtype,
        low_cpu_mem_usage=True,
    )
    model.eval()
    model.to(device)
    print(f"Model loaded successfully on {device}!")

@app.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest):
    if not model or not tokenizer:
        raise HTTPException(status_code=503, detail="Model is still loading")

    messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
    
    # Apply chat template
    inputs = tokenizer.apply_chat_template(
        messages_dict, tokenize=True, return_dict=True, add_generation_prompt=True, enable_thinking=False, return_tensors="pt"
    ).to(model.device)
    
    start_time = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=req.max_tokens or 512,
            temperature=req.temperature,
            do_sample=True if req.temperature > 0 else False,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        )
    
    prompt_len = inputs["input_ids"].shape[1]
    generated_tokens = outputs[0][prompt_len:]
    response_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
    
    return {
        "id": f"chatcmpl-{uuid.uuid4()}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": prompt_len,
            "completion_tokens": len(generated_tokens),
            "total_tokens": prompt_len + len(generated_tokens)
        }
    }

if __name__ == "__main__":
    import uvicorn
    # Make sure to run this in an environment where torch, transformers, and fastapi are installed
    uvicorn.run(app, host="127.0.0.1", port=8085)
