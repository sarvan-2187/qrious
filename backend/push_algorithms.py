import json
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = 'mongodb+srv://qrious-user:ybMA0PdURZDVHM99@qrious-cluster.y1th5lk.mongodb.net/?appName=qrious-cluster/qrious-db'

def main():
    with open('parsed_algorithms.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print("Updating MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client.qrious_db
    collection = db.algorithm_catalog
    
    updated = 0
    for alg in data:
        if alg.get('status') == 'locked':
            continue
        # We update the algorithm content for unlocked algorithms
        collection.update_one({'id': alg['id']}, {'$set': {'content': alg['content']}})
        updated += 1
        
    print(f"Update complete. Pushed {updated} algorithms.")

if __name__ == '__main__':
    main()
