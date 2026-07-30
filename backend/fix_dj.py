import asyncio
from database import connect_to_mongo, close_mongo_connection, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    
    # Fetch DJ
    alg = await db.algorithm_catalog.find_one({"slug": "deutsch-jozsa-algorithm"})
    if alg and "content" in alg and "circuitExplanation" in alg["content"]:
        circ_exp = alg["content"]["circuitExplanation"]
        # Remove ASCII circuit lines
        lines = circ_exp.split('\n')
        new_lines = []
        for line in lines:
            if 'x0: |0>' in line or 'M |' in line or '---' in line or 'y: |1>' in line or 'M x' in line:
                continue
            new_lines.append(line)
        new_exp = '\n'.join(new_lines).strip()
        
        await db.algorithm_catalog.update_one(
            {"slug": "deutsch-jozsa-algorithm"},
            {"$set": {"content.circuitExplanation": new_exp}}
        )
        print("Fixed DJ ASCII circuit in DB!")
    else:
        print("DJ algorithm not found or no circuitExplanation")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run())
