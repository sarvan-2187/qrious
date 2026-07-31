import asyncio
import os
from database import connect_to_mongo, get_db
from groq import AsyncGroq

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are a quantum computing markdown formatting expert. 
Your task is to take a raw markdown text describing a quantum algorithm and format it correctly for the web.

RULES:
1. REMOVE ANY AND ALL ASCII CIRCUITS. If you see lines containing '──', '─', 'M', 'Uf', or wires like '|0⟩ ──H──', DELETE those entire blocks completely. They are redundant.
2. PRESERVE ALL TEXT AND EXPLANATIONS. Do not rewrite the educational text or explanations, just format them.
3. FORMAT MATHEMATICS IN LATEX. Convert unicode math or raw math into LaTeX equations. 
   - Wrap inline math with `$...$`.
   - Wrap block/standalone equations with `$$...$$`.
   - Ensure fractions, subscripts, and greek letters (like pi, theta) are properly converted to \pi, \theta, \frac{1}{\sqrt{2}}, etc.
   - Example: convert `1/sqrt(2)(|00> + |11>)` to `$$\frac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$`.
   - Ensure Dirac notation like `|0⟩` or `|x>` is converted to `|0\rangle` or `|x\rangle`.
4. OUTPUT ONLY THE FORMATTED TEXT. Do not add any introductory or conversational text. Return the raw formatted markdown directly. Do not wrap the whole response in ```markdown unless the original text had it.
"""

async def process_text(text):
    if not text or not text.strip():
        return text
    
    try:
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ],
            temperature=0.1,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error processing text: {e}")
        return text

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({'status': 'unlocked'}).to_list(100)
    
    print(f"Found {len(algs)} algorithms. Processing...")
    count = 0
    
    # To avoid rate limits, we'll process them sequentially with a small delay
    for i, a in enumerate(algs):
        slug = a.get('slug')
        content = a.get('content', {})
        needs_update = False
        
        fields_to_process = ['circuitExplanation', 'mathematicalExplanation', 'workedExample', 'quantumIdea', 'stepByStep']
        
        updates = {}
        for field in fields_to_process:
            raw_text = content.get(field, "")
            if not raw_text:
                continue
            
            # Simple heuristic to avoid sending text that clearly doesn't need processing
            if '──' not in raw_text and '─' not in raw_text and '∑' not in raw_text and '|0⟩' not in raw_text and '$$' in raw_text:
                continue
                
            print(f"Processing {slug} -> {field}...")
            formatted_text = await process_text(raw_text)
            
            if formatted_text.startswith("```markdown"):
                formatted_text = formatted_text[11:]
            if formatted_text.startswith("```"):
                formatted_text = formatted_text[3:]
            if formatted_text.endswith("```"):
                formatted_text = formatted_text[:-3]
            formatted_text = formatted_text.strip()
            
            if formatted_text != raw_text:
                updates[f"content.{field}"] = formatted_text
                needs_update = True
            
            # Add a small delay between requests to avoid rate limits
            await asyncio.sleep(1)
                
        if needs_update:
            await db.algorithm_catalog.update_one({"_id": a["_id"]}, {"$set": updates})
            print(f"Updated {slug}")
            count += 1
            
    print(f"Done. Updated {count} algorithms.")

if __name__ == "__main__":
    asyncio.run(run())
