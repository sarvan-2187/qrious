import asyncio
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({'status': 'unlocked'}).to_list(100)
    ascii_count = 0
    for a in algs:
        ce = a.get('content', {}).get('circuitExplanation', '')
        if '──' in ce or '─' in ce or '|0⟩' in ce:
            ascii_count += 1
            print(f"Found ASCII circuit in {a.get('slug')}")
            
        math_content = a.get('content', {}).get('mathematicalExplanation', '')
        if '$$' not in math_content and '\\frac' not in math_content and '∑' in math_content:
            print(f"Potential unformatted math in {a.get('slug')}")
            
    print(f'Total algorithms with ASCII circuits: {ascii_count}')

if __name__ == "__main__":
    asyncio.run(run())
