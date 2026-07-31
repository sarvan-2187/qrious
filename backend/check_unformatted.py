import asyncio
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({'status': 'unlocked'}).to_list(100)
    
    unformatted = []
    for a in algs:
        slug = a.get('slug')
        content = a.get('content', {})
        needs_fix = False
        
        for field in ['circuitExplanation', 'mathematicalExplanation', 'workedExample', 'quantumIdea', 'stepByStep']:
            text = content.get(field, "")
            # If it has latex commands but no math wrappers, it's unformatted raw latex
            if ('\\rangle' in text or '\\langle' in text or '\\sum' in text or '\\theta' in text) and '$' not in text:
                needs_fix = True
                
        if needs_fix:
            unformatted.append(slug)
            
    print(f"Found {len(unformatted)} algorithms that have raw latex commands without '$' wrappers:")
    for u in unformatted:
        print(f" - {u}")

if __name__ == "__main__":
    asyncio.run(run())
