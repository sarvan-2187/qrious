import asyncio
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find().to_list(100)
    
    # create lookup maps
    name_to_slug = {a['name'].lower(): a['slug'] for a in algs}
    slugs = {a['slug'] for a in algs}
    
    missing = []
    
    for a in algs:
        quick_info = a.get('quickInfo', {})
        related = quick_info.get('relatedAlgorithms', [])
        for r in related:
            if r in slugs: continue
            if r.lower() in name_to_slug: continue
            missing.append({'from': a['slug'], 'related': r})
            
    for m in missing:
        print(f"Algorithm '{m['from']}' missing related: '{m['related']}'")
        
    print(f"Total missing: {len(missing)}")

if __name__ == "__main__":
    asyncio.run(run())
