import os
import sys
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app import models

def seed_test_drives():
    db = SessionLocal()
    try:
        # Check existing test drives
        count = db.query(models.TestDrive).count()
        if count > 0:
            print(f"Sudah ada {count} data TestDrive di database.")
            return

        # Ensure we have buyer users
        buyers_data = [
            ("Daffi Alfarizi", "dapi@gmail.com", "082111750825", "Jakarta Selatan", 1),
            ("Budi Santoso", "budi.santoso@gmail.com", "081234567890", "Jakarta Barat", 1),
            ("Siti Rahmawati", "siti.rahma@yahoo.com", "081398765432", "Tangerang Selatan", 2),
            ("Hendro Prasetyo", "hendro.p@corp.id", "081809123456", "Jakarta Pusat", 0),
            ("Rian Ardiansyah", "rian.ard@gmail.com", "085678901234", "Bekasi", 2),
            ("Dewi Lestari", "dewi.lestari@outlook.com", "087812345678", "Depok", 1),
            ("Ahmad Fauzi", "ahmad.fauzi@gmail.com", "081299887766", "Jakarta Selatan", 0),
            ("Maya Anggraini", "maya.anggraini@gmail.com", "081566778899", "Tangerang", 1),
        ]

        created_users = []
        for nama, email, hp, cabang, seg in buyers_data:
            existing = db.query(models.User).filter(models.User.email == email).first()
            if not existing:
                u = models.User(
                    nama=nama,
                    email=email,
                    role="pembeli",
                    password_hash="mock_hash_123",
                    no_hp=hp,
                    hp_terverifikasi=1,
                    cabang=cabang,
                    segmen_awal_id=seg
                )
                db.add(u)
                db.flush()
                created_users.append(u)
            else:
                created_users.append(existing)

        # Get cars for each cluster (0 = Premium, 1 = Keluarga, 2 = Ekonomis)
        car_seg0 = db.query(models.Car).filter(models.Car.klaster == 0).limit(3).all()
        car_seg1 = db.query(models.Car).filter(models.Car.klaster == 1).limit(4).all()
        car_seg2 = db.query(models.Car).filter(models.Car.klaster == 2).limit(3).all()

        today = datetime.date.today()

        sample_leads = [
            # Segmen 1 (Keluarga) - 3 items
            {
                "kode": "TD-2610-001",
                "user": created_users[0], # Daffi Alfarizi
                "car": car_seg1[0],
                "tanggal": today + datetime.timedelta(days=1),
                "jam": datetime.time(10, 0),
                "cabang": "CekGarasi Jakarta Selatan",
                "catatan": "Mohon cek kondisi AC double blower dan bawa keluarga untuk coba baris ketiga.",
                "status": "menunggu",
            },
            {
                "kode": "TD-2610-002",
                "user": created_users[1], # Budi Santoso
                "car": car_seg1[1] if len(car_seg1) > 1 else car_seg1[0],
                "tanggal": today + datetime.timedelta(days=2),
                "jam": datetime.time(14, 0),
                "cabang": "CekGarasi Tangerang BSD",
                "catatan": "Tertarik simulasi kredit DP 20% dan tukar tambah mobil lama.",
                "status": "terkonfirmasi",
            },
            {
                "kode": "TD-2610-003",
                "user": created_users[5], # Dewi Lestari
                "car": car_seg1[2] if len(car_seg1) > 2 else car_seg1[0],
                "tanggal": today - datetime.timedelta(days=1),
                "jam": datetime.time(11, 30),
                "cabang": "CekGarasi Jakarta Selatan",
                "catatan": "Unit sangat mulus, sedang tahap pengajuan leasing.",
                "status": "selesai",
            },
            {
                "kode": "TD-2610-004",
                "user": created_users[7], # Maya Anggraini
                "car": car_seg1[3] if len(car_seg1) > 3 else car_seg1[0],
                "tanggal": today + datetime.timedelta(days=3),
                "jam": datetime.time(15, 0),
                "cabang": "CekGarasi Bekasi Barat",
                "catatan": "Ingin tes suspensi di jalan tidak rata.",
                "status": "menunggu",
            },

            # Segmen 0 (Premium) - 2 items
            {
                "kode": "TD-2610-005",
                "user": created_users[3], # Hendro Prasetyo
                "car": car_seg0[0],
                "tanggal": today + datetime.timedelta(days=1),
                "jam": datetime.time(13, 0),
                "cabang": "CekGarasi Jakarta Pusat",
                "catatan": "Harap siapkan buku servis lengkap dan rekam jejak bengkel resmi.",
                "status": "menunggu",
            },
            {
                "kode": "TD-2610-006",
                "user": created_users[6], # Ahmad Fauzi
                "car": car_seg0[1] if len(car_seg0) > 1 else car_seg0[0],
                "tanggal": today - datetime.timedelta(days=2),
                "jam": datetime.time(16, 0),
                "cabang": "CekGarasi Jakarta Selatan",
                "catatan": "Uji jalan selesai, pembeli puas dengan performa mesin.",
                "status": "selesai",
            },

            # Segmen 2 (Ekonomis) - 2 items
            {
                "kode": "TD-2610-007",
                "user": created_users[2], # Siti Rahmawati
                "car": car_seg2[0],
                "tanggal": today + datetime.timedelta(days=2),
                "jam": datetime.time(9, 30),
                "cabang": "CekGarasi Depok Margonda",
                "catatan": "Mobil pertama untuk anak kuliah, ingin cek konsumsi bahan bakar.",
                "status": "menunggu",
            },
            {
                "kode": "TD-2610-008",
                "user": created_users[4], # Rian Ardiansyah
                "car": car_seg2[1] if len(car_seg2) > 1 else car_seg2[0],
                "tanggal": today - datetime.timedelta(days=3),
                "jam": datetime.time(14, 30),
                "cabang": "CekGarasi Tangerang BSD",
                "catatan": "Pembeli berhalangan hadir karena urusan mendadak.",
                "status": "dibatalkan",
            },
        ]

        for s in sample_leads:
            td = models.TestDrive(
                kode=s["kode"],
                user_id=s["user"].id,
                car_id=s["car"].id,
                tanggal=s["tanggal"],
                jam=s["jam"],
                cabang=s["cabang"],
                catatan=s["catatan"],
                status=s["status"]
            )
            db.add(td)

        db.commit()
        print(f"Berhasil menambahkan {len(sample_leads)} data pendaftar Uji Jalan ke database!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding test drives: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_drives()
