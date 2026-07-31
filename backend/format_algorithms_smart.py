import asyncio
import re
import requests
import time
from database import connect_to_mongo, get_db

GROQ_API_KEY = "YOUR_GROQ_API_KEY"
MODEL = "llama-3.1-8b-instant"
HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json"
}

SYSTEM_PROMPT = """
You are a quantum computing markdown formatting expert. 
Your task is to take a raw markdown text describing a quantum algorithm and format it correctly for the web.

RULES:
1. REMOVE ANY AND ALL ASCII CIRCUITS. If you see lines containing '──', '─', 'M', 'Uf', or wires like '|0⟩ ──H──', DELETE those entire blocks completely. They are redundant.
2. PRESERVE ALL TEXT AND EXPLANATIONS. Do not rewrite the educational text or explanations, just format them.
3. FORMAT MATHEMATICS IN LATEX. Convert unicode math or raw math into LaTeX equations. 
   - Wrap inline math with `$...$`.
   - Wrap block/standalone equations with `$$...$$`.
   - Ensure Dirac notation like `|0⟩` or `|x>` is converted to `|0\rangle` or `|x\rangle`.
4. OUTPUT ONLY THE FORMATTED TEXT. Return the raw formatted markdown directly without ```markdown wrappers.
"""

def process_text_llm(text):
    if not text or not text.strip():
        return text
    
    # Check if there is anything that even needs formatting
    if '──' not in text and '─' not in text and '|' not in text and '$$' in text and '\\' in text:
        return text

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        "temperature": 0.1
    }
    
    try:
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=HEADERS, json=payload, timeout=15)
        response.raise_for_status()
        res_json = response.json()
        formatted = res_json['choices'][0]['message']['content'].strip()
        
        if formatted.startswith("```markdown"):
            formatted = formatted[11:]
        if formatted.startswith("```"):
            formatted = formatted[3:]
        if formatted.endswith("```"):
            formatted = formatted[:-3]
        return formatted.strip()
    except Exception as e:
        print(f"  [LLM Error: {e}] Falling back to smart regex...")
        return process_text_regex(text)

def process_text_regex(text):
    if not text: return text
    lines = text.split('\n')
    new_lines = []
    
    for line in lines:
        if '──' in line or '─' in line or 'U_f' in line or 'Uf' in line:
            drawing_chars = sum(1 for c in line if c in '─│┌┐└┘├┤┬┴┼')
            if drawing_chars > 2 or '──' in line:
                continue 
                
        # Basic symbol replacements
        line = line.replace('∣0⟩', '|0\\rangle').replace('∣1⟩', '|1\\rangle')
        line = line.replace('|0⟩', '|0\\rangle').replace('|1⟩', '|1\\rangle')
        line = line.replace('∣', '|').replace('⟩', '\\rangle').replace('⟨', '\\langle')
        
        if '∑' in line:
            line = line.replace('∑', '\\sum')
            
        new_lines.append(line)
        
    return '\n'.join(new_lines)


async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({'status': 'unlocked'}).to_list(100)
    
    print(f"Found {len(algs)} algorithms. Processing with API + Smart Fallback...")
    count = 0
    
    for a in algs:
        slug = a.get('slug')
        content = a.get('content', {})
        needs_update = False
        
        fields_to_process = ['circuitExplanation', 'mathematicalExplanation', 'workedExample', 'quantumIdea', 'stepByStep']
        updates = {}
        
        for field in fields_to_process:
            raw_text = content.get(field, "")
            if not raw_text:
                continue
                
            if ('\\rangle' in raw_text or '\\langle' in raw_text or '\\sum' in raw_text or '\\theta' in raw_text) and '$' not in raw_text:
                print(f"Processing {slug} -> {field}")
                formatted = process_text_llm(raw_text)
                
                if formatted != raw_text and formatted:
                    updates[f"content.{field}"] = formatted
                    needs_update = True
                    
                time.sleep(3) # rate limit protection
            

                
        if needs_update:
            await db.algorithm_catalog.update_one({"_id": a["_id"]}, {"$set": updates})
            print(f"Updated {slug}")
            count += 1
            
    print(f"\nDone! Successfully updated {count} algorithms.")

if __name__ == "__main__":
    asyncio.run(run())
