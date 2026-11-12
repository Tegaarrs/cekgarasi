from app.db import SessionLocal
from app.models import Car
import json

db = SessionLocal()
cars = db.query(Car).all()

car_dict = {}
for c in cars:
    brand = c.car_model.brand.nama if c.car_model and c.car_model.brand else ""
    model = c.car_model.nama if c.car_model else ""
    tipe_bodi = c.car_model.tipe_bodi if c.car_model else ""
    key = f"{brand} - {c.nama_mobil}"
    if key not in car_dict:
        car_dict[key] = {
            "nama_mobil": c.nama_mobil,
            "brand": brand,
            "model": model,
            "tipe_bodi": tipe_bodi,
            "tahun_sample": c.tahun,
            "transmisi": c.transmisi,
            "count": 1
        }
    else:
        car_dict[key]["count"] += 1

print(f"Total distinct car variants: {len(car_dict)}")
with open("distinct_cars.json", "w", encoding="utf-8") as f:
    json.dump(list(car_dict.values()), f, indent=2, ensure_ascii=False)
print("Saved to distinct_cars.json")
