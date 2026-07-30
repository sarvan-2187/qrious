import asyncio
from database import connect_to_mongo, get_db
from services.algorithm_service import algorithm_service

async def run():
    await connect_to_mongo()
    alg = await algorithm_service.get_algorithm("ghz-state")
    if alg:
        print(alg.keys())
        print("example_circuit in alg:", 'example_circuit' in alg)
    else:
        print("Alg not found")

if __name__ == "__main__":
    asyncio.run(run())
