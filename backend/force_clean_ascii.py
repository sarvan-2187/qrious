import asyncio
import re
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({'status': 'unlocked'}).to_list(100)
    
    print(f"Checking {len(algs)} algorithms for remaining ASCII circuits...")
    count = 0
    
    for a in algs:
        slug = a.get('slug')
        content = a.get('content', {})
        updates = {}
        needs_update = False
        
        for field in ['circuitExplanation', 'mathematicalExplanation', 'workedExample', 'quantumIdea', 'stepByStep']:
            text = content.get(field, "")
            if not text: continue
            
            lines = text.split('\n')
            new_lines = []
            changed = False
            for line in lines:
                # Stronger check for ASCII lines
                if '──' in line or '─' in line or line.strip().startswith('q0:') or line.strip().startswith('q1:') or '---|' in line or '|---' in line:
                    changed = True
                    continue
                new_lines.append(line)
                
            if changed:
                new_text = '\n'.join(new_lines)
                updates[f"content.{field}"] = new_text
                needs_update = True
                
        if needs_update:
            await db.algorithm_catalog.update_one({"_id": a["_id"]}, {"$set": updates})
            print(f"Cleaned ASCII from {slug}")
            count += 1
            
    print(f"Done! Cleaned {count} algorithms.")

if __name__ == "__main__":
    asyncio.run(run())
