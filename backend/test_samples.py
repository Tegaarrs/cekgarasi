import json

with open("distinct_cars.json", "r", encoding="utf-8") as f:
    cars = json.load(f)

print(f"Total cars in database: {len(cars)}")
sample_tests = [
    "AYLA X 1.2", "AGYA TRD SPORTIVO 1.0", "X-TRAIL 2.5", "YARIS S TRD 1.5",
    "AVANZA G 1.3", "AVANZA G 1.5", "FORTUNER VRZ GR SPORT 2.8", "FORTUNER VRZ 2.4",
    "PAJERO SPORT DAKAR 4X2 2.4", "CR-V TURBO 1.5", "CR-V 2.0", "BRIO SATYA E 1.2",
    "KIJANG INNOVA REBORN G 2.0", "ALMAZ RS LT LUX + SC CVT 1.5", "SANTA FE CRDI 2.2",
    "3 20I (CKD) 2.0", "CX-5 ELITE 2.5", "CARRY PICK UP 1.5"
]

for test in sample_tests:
    matched = [c for c in cars if c["nama_mobil"] == test]
    if matched:
        c = matched[0]
        print(f"OK: {c['brand']} {c['nama_mobil']} ({c['model']}, {c['tipe_bodi']}, {c['transmisi']}, {c['tahun_sample']})")
    else:
        print(f"MISSING: {test}")
