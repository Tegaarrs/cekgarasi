import json

with open("distinct_cars.json", "r", encoding="utf-8") as f:
    data = json.load(f)

models_map = {}
for item in data:
    m = item["model"]
    b = item["brand"]
    nm = item["nama_mobil"]
    tb = item["tipe_bodi"]
    if m not in models_map:
        models_map[m] = {
            "brand": b,
            "tipe_bodi": tb,
            "variants": []
        }
    models_map[m]["variants"].append(nm)

print(f"Total Models: {len(models_map)}")
with open("models_overview.json", "w", encoding="utf-8") as f:
    json.dump(models_map, f, indent=2, ensure_ascii=False)

for m, val in sorted(models_map.items()):
    print(f"- {val['brand']} {m} ({val['tipe_bodi']}): {len(val['variants'])} variants -> {val['variants'][:3]}")
