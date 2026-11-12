import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db import SessionLocal
from app import models, auth

def seed_buyers():
    db = SessionLocal()
    try:
        # 1. Update existing buyer users with fokus_penggunaan if empty
        existing_updates = {
            3: ("Keluarga Lapang", 1),
            4: ("Fitur Mewah", 0),
            5: ("Keluarga Lapang", 1),
            6: ("Hemat & Harian", 2),
            7: ("Keluarga Lapang", 1),
            11: ("Keluarga Lapang", 1),
        }
        for uid, (fokus, segmen) in existing_updates.items():
            u = db.query(models.User).filter(models.User.id == uid).first()
            if u:
                u.fokus_penggunaan = fokus
                if u.segmen_awal_id is None:
                    u.segmen_awal_id = segmen

        # 2. Add realistic buyers
        buyers_data = [
            {
                "nama": "Bambang Pamungkas",
                "email": "bambang.pamungkas@gmail.com",
                "no_hp": "081288992211",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 180_000_000,
                "pref_harga_max": 250_000_000,
                "pref_tahun_min": 2018,
                "segmen_awal_id": 1,
                "fokus_penggunaan": "Keluarga Lapang"
            },
            {
                "nama": "Dr. Anita Wijaya",
                "email": "dr.anita.wijaya@yahoo.com",
                "no_hp": "081199223344",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 320_000_000,
                "pref_harga_max": 550_000_000,
                "pref_tahun_min": 2020,
                "segmen_awal_id": 0,
                "fokus_penggunaan": "Fitur Mewah"
            },
            {
                "nama": "Dimas Suryo Nugroho",
                "email": "dimas.suryo@gmail.com",
                "no_hp": "085711223344",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 90_000_000,
                "pref_harga_max": 140_000_000,
                "pref_tahun_min": 2016,
                "segmen_awal_id": 2,
                "fokus_penggunaan": "Hemat & Harian"
            },
            {
                "nama": "Farhan Ramadhan",
                "email": "farhan.ramadhan@gmail.com",
                "no_hp": "081377889900",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 160_000_000,
                "pref_harga_max": 230_000_000,
                "pref_tahun_min": 2018,
                "segmen_awal_id": 1,
                "fokus_penggunaan": "Keluarga Lapang"
            },
            {
                "nama": "Clarissa Olivia",
                "email": "clarissa.olivia@outlook.com",
                "no_hp": "081255443322",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 280_000_000,
                "pref_harga_max": 450_000_000,
                "pref_tahun_min": 2019,
                "segmen_awal_id": 0,
                "fokus_penggunaan": "Fitur Mewah"
            },
            {
                "nama": "Reza Aditya Pratama",
                "email": "reza.aditya@gmail.com",
                "no_hp": "087822334455",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 110_000_000,
                "pref_harga_max": 150_000_000,
                "pref_tahun_min": 2017,
                "segmen_awal_id": 2,
                "fokus_penggunaan": "Hemat & Harian"
            },
            {
                "nama": "Mega Puspitasari",
                "email": "mega.puspitap@gmail.com",
                "no_hp": "081299887766",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 190_000_000,
                "pref_harga_max": 270_000_000,
                "pref_tahun_min": 2019,
                "segmen_awal_id": 1,
                "fokus_penggunaan": "Keluarga Lapang"
            },
            {
                "nama": "Ir. Gunawan Susanto",
                "email": "gunawan.susanto@gmail.com",
                "no_hp": "081122334455",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 350_000_000,
                "pref_harga_max": 600_000_000,
                "pref_tahun_min": 2021,
                "segmen_awal_id": 0,
                "fokus_penggunaan": "Fitur Mewah"
            },
            {
                "nama": "Fajar Nugraha",
                "email": "fajar.nugraha@gmail.com",
                "no_hp": "085611223344",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 100_000_000,
                "pref_harga_max": 140_000_000,
                "pref_tahun_min": 2015,
                "segmen_awal_id": 2,
                "fokus_penggunaan": "Hemat & Harian"
            },
            {
                "nama": "Putri Maharani",
                "email": "putri.maharani@gmail.com",
                "no_hp": "081344556677",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 170_000_000,
                "pref_harga_max": 240_000_000,
                "pref_tahun_min": 2018,
                "segmen_awal_id": 1,
                "fokus_penggunaan": "Keluarga Lapang"
            },
            {
                "nama": "Kevin Jonathan",
                "email": "kevin.jonathan@techindo.id",
                "no_hp": "081900112233",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 270_000_000,
                "pref_harga_max": 420_000_000,
                "pref_tahun_min": 2020,
                "segmen_awal_id": 0,
                "fokus_penggunaan": "Fitur Mewah"
            },
            {
                "nama": "Ahmad Fauzi",
                "email": "ahmad.fauzi@gmail.com",
                "no_hp": "081233445566",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 0,
                "pref_harga_min": 120_000_000,
                "pref_harga_max": 160_000_000,
                "pref_tahun_min": 2016,
                "segmen_awal_id": 2,
                "fokus_penggunaan": "Hemat & Harian"
            },
            {
                "nama": "Nadia Safitri",
                "email": "nadia.safitri@yahoo.com",
                "no_hp": "087788990011",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 0,
                "pref_harga_min": 180_000_000,
                "pref_harga_max": 260_000_000,
                "pref_tahun_min": 2019,
                "segmen_awal_id": 1,
                "fokus_penggunaan": "Keluarga Lapang"
            },
            {
                "nama": "Eko Wahyudi",
                "email": "eko.wahyudi@gmail.com",
                "no_hp": "085211223344",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 95_000_000,
                "pref_harga_max": 135_000_000,
                "pref_tahun_min": 2016,
                "segmen_awal_id": 2,
                "fokus_penggunaan": "Hemat & Harian"
            },
            {
                "nama": "Maya Angeline",
                "email": "maya.angeline@gmail.com",
                "no_hp": "081299001122",
                "password_hash": auth.hash_password("password123"),
                "role": "pembeli",
                "hp_terverifikasi": 1,
                "pref_harga_min": 310_000_000,
                "pref_harga_max": 480_000_000,
                "pref_tahun_min": 2021,
                "segmen_awal_id": 0,
                "fokus_penggunaan": "Fitur Mewah"
            }
        ]

        added_count = 0
        for b in buyers_data:
            existing = db.query(models.User).filter(models.User.email == b["email"]).first()
            if not existing:
                user = models.User(**b, is_active=1)
                db.add(user)
                added_count += 1

        db.commit()
        print(f"Seeding finished. Added {added_count} new buyers.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding buyers: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_buyers()
