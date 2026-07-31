import asyncio
import re
from database import connect_to_mongo, get_db

def format_text(text):
    if not text:
        return text
        
    lines = text.split('\n')
    new_lines = []
    
    for line in lines:
        # Strip ASCII circuits lines
        # E.g. "Reg 2 (y): |0⟩ ───────────────────|      |─────────────────────"
        if '──' in line or '─' in line or 'U_f' in line or 'Uf' in line:
            # Check if this line is overwhelmingly drawing characters
            drawing_chars = sum(1 for c in line if c in '─│┌┐└┘├┤┬┴┼')
            if drawing_chars > 2 or '──' in line:
                continue # Skip this line
                
        # Basic math formatting replacements
        line = line.replace('∣0⟩', '|0\\rangle')
        line = line.replace('∣1⟩', '|1\\rangle')
        line = line.replace('|0⟩', '|0\\rangle')
        line = line.replace('|1⟩', '|1\\rangle')
        line = line.replace('∣', '|')
        line = line.replace('⟩', '\\rangle')
        line = line.replace('⟨', '\\langle')
        
        if '∑' in line:
            line = line.replace('∑', '\\sum')
            
        # Very rough wrap if it looks like an equation and isn't already wrapped
        if ('\\rangle' in line or '\\langle' in line or '\\sum' in line or 'O(' in line) and '$$' not in line and '$' not in line:
            # If the whole line is an equation
            if len(line.strip()) > 3 and not line.startswith('The') and not line.startswith('This'):
                if '=' in line or '\\rangle' in line:
                    line = f"$${line.strip()}$$"
                    
        new_lines.append(line)
        
    return '\n'.join(new_lines)


async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({'status': 'unlocked'}).to_list(100)
    
    print(f"Found {len(algs)} algorithms. Processing locally with Regex...")
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
                
            formatted = format_text(raw_text)
            if formatted != raw_text:
                updates[f"content.{field}"] = formatted
                needs_update = True
                
        if needs_update:
            await db.algorithm_catalog.update_one({"_id": a["_id"]}, {"$set": updates})
            print(f"Formatted and cleaned ASCII from: {slug}")
            count += 1
            
    print(f"\nDone! Successfully updated {count} algorithms instantly.")

if __name__ == "__main__":
    asyncio.run(run())
