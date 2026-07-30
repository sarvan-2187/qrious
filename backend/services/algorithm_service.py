import os
from models.algorithm_model import AlgorithmBase
from database import get_db

class AlgorithmService:
    @property
    def collection(self):
        return get_db().algorithm_catalog

    async def seed_if_empty(self):
        count = await self.collection.count_documents({})
        if count == 0:
            print("Seeding algorithm_catalog from parsed_algorithms.json...")
            import json
            import os
            
            # The file is in backend/parsed_algorithms.json
            json_path = os.path.join(os.path.dirname(__file__), '..', 'parsed_algorithms.json')
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    seed_data = json.load(f)
                    
                await self.collection.insert_many(seed_data)
                await self.collection.create_index("slug", unique=True)
                print(f"Seeding complete. Inserted {len(seed_data)} algorithms.")
            except Exception as e:
                print(f"Failed to seed algorithms: {e}")

    async def get_algorithms(self):
        cursor = self.collection.find({})
        algorithms = await cursor.to_list(length=100)
        return algorithms

    async def get_algorithm(self, slug: str):
        alg = await self.collection.find_one({"slug": slug})
        return alg

algorithm_service = AlgorithmService()
