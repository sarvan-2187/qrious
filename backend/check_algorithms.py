import json

with open('parsed_algorithms.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for d in data:
    if d.get('status') != 'coming_soon':
        print(f"Level {d['level']}: {d['slug']}")
