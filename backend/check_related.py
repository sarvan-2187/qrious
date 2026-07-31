import asyncio
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find().to_list(1000)
    
    # create lookup maps
    name_to_slug = {a['name'].lower(): a['slug'] for a in algs}
    slugs = {a['slug'] for a in algs}
    
    missing_count = 0
    total_count = 0
    
    for a in algs:
        related = a.get('relatedAlgorithms', [])
        for r in related:
            total_count += 1
            if r in slugs:
                continue
            if r.lower() in name_to_slug:
                continue
            
            print(f"Algorithm '{a['slug']}' has NOT FOUND related: '{r}'")
            missing_count += 1
            
    print(f"Total related: {total_count}, Missing: {missing_count}")

if __name__ == "__main__":
    asyncio.run(run())
