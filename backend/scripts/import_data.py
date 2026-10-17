import os
import sys
import json
import bcrypt
import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db import SessionLocal, engine, Base
from app import models

DATA_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "data_dashboard_mobil.json"
)
SCALER_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "artifacts",
    "scaler_mobil.pkl"
)

SEEDS_SEGMENTS = [
    (0, "Mobil Premium Fitur Lengkap", "Premium", "#2557D6", "Segmen mobil kelas atas dengan fitur keselamatan dan kenyamanan terlengkap."),
    (1, "Mobil Keluarga Tahun Muda", "Keluarga Muda", "#0CA678", "Segmen mobil tahun muda dengan efisiensi tinggi, ideal untuk mobilitas keluarga."),
    (2, "Mobil Ekonomis Jarak Tempuh Tinggi", "Ekonomis", "#AE3EC9", "Segmen mobil ekonomis dengan harga terjangkau untuk kebutuhan fungsional harian.")
]

SEEDS_FEATURES = [
    ("rear camera", "Kamera belakang"),
    ("sun roof", "Sunroof"),
    ("auto retract mirror", "Spion lipat otomatis"),
    ("electric parking brake", "Rem parkir elektrik"),
    ("map navigator", "Navigasi peta"),
    ("vehicle stability control", "Kontrol stabilitas"),
    ("keyless push start", "Keyless push start"),
    ("sports mode", "Mode sport"),
    ("360 camera view", "Kamera 360"),
    ("power sliding door", "Pintu geser elektrik"),
    ("auto cruise control", "Cruise control")
]

SEEDS_EVALUASI_K = [
    (2, 1700.82, 0.2960, 0, "notebook"),
    (3, 1257.51, 0.3061, 1, "notebook"),
    (4, 1069.11, 0.3186, 0, "notebook"),
    (5, 902.18, 0.2839, 0, "notebook"),
    (6, 801.91, 0.2915, 0, "notebook")
]

SEEDS_METRIK = [
    ("silhouette_latih", 0.3073, "Silhouette score pada data latih (80%, 487 baris)"),
    ("silhouette_uji", 0.2873, "Silhouette score pada data uji (20%, 122 baris)"),
    ("ari_uji_vs_model_penuh", 0.974, "Adjusted Rand Index model 80% vs model penuh 100%")
]

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def run_import():
    print("Memulai import data CekGarasi...")

    # Load scaler
    scaler = joblib.load(SCALER_PATH)
    mean = scaler.mean_
    scale = scaler.scale_

    # Load JSON data
    with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Total data dibaca dari JSON: {len(records)} baris.")

    # Calculate PCA on all 609 cars
    df_raw = pd.DataFrame(records)
    feat_order = ["year", "mileage (km)", "price (Rp)", "total_fitur"]
    X = df_raw[feat_order].values.astype(float)
    X_z = (X - mean) / scale

    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(X_z)
    df_raw["pca1"] = coords[:, 0]
    df_raw["pca2"] = coords[:, 1]

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.bind.dialect.name == "mysql":
            db.execute(text("SET SESSION sql_mode = CONCAT(@@sql_mode, ',NO_AUTO_VALUE_ON_ZERO')"))
        # Clear existing data in correct FK order for idempotency
        print("Membersihkan data lama jika ada...")
        db.query(models.CarFeature).delete()
        db.query(models.TestDrive).delete()
        db.query(models.ViewHistory).delete()
        db.query(models.Favorite).delete()
        db.query(models.Car).delete()
        db.query(models.CarModel).delete()
        db.query(models.Brand).delete()
        db.query(models.Feature).delete()
        db.query(models.User).delete()
        db.query(models.MLEvaluasiK).delete()
        db.query(models.MLMetrik).delete()
        db.query(models.Segment).delete()

        # 1. Seed Segments
        print("Menyemai tabel segments...")
        for seg_id, nama_lengkap, nama_pendek, warna_hex, deskripsi in SEEDS_SEGMENTS:
            db.add(models.Segment(
                id=seg_id,
                nama_lengkap=nama_lengkap,
                nama_pendek=nama_pendek,
                warna_hex=warna_hex,
                deskripsi=deskripsi
            ))
        db.flush()

        # 2. Seed Features
        print("Menyemai tabel features...")
        feat_map = {}
        for kode, nama_id in SEEDS_FEATURES:
            feat_obj = models.Feature(kode=kode, nama_id=nama_id)
            db.add(feat_obj)
            db.flush()
            feat_map[kode] = feat_obj.id

        # 3. Seed ML Evaluasi K & Metrik
        print("Menyemai evaluasi & metrik ML...")
        for k, inertia, sil, is_prod, sumber in SEEDS_EVALUASI_K:
            db.add(models.MLEvaluasiK(
                k=k,
                inertia=inertia,
                silhouette=sil,
                is_production=is_prod,
                sumber=sumber
            ))

        for kunci, nilai, ket in SEEDS_METRIK:
            db.add(models.MLMetrik(
                kunci=kunci,
                nilai=nilai,
                keterangan=ket
            ))
        db.flush()

        # 4. Seed Users
        print("Menyemai akun admin & pembeli demo...")
        admin_pass = os.getenv("ADMIN_PASSWORD", "adminsecretpassword123")
        buyer_pass = os.getenv("BUYER_PASSWORD", "buyersecretpassword123")

        admin_user = models.User(
            nama="Admin Dealer CekGarasi",
            email=os.getenv("ADMIN_EMAIL", "admin@cekgarasi.test"),
            no_hp="081234567890",
            password_hash=hash_pw(admin_pass),
            role="admin",
            hp_terverifikasi=1,
            cabang="Jakarta Pusat",
            is_active=1
        )
        db.add(admin_user)
        db.flush()

        buyer_user = models.User(
            nama="Budi Pembeli Demo",
            email=os.getenv("BUYER_EMAIL", "buyer@cekgarasi.test"),
            no_hp="081987654321",
            password_hash=hash_pw(buyer_pass),
            role="pembeli",
            hp_terverifikasi=1,
            segmen_awal_id=1,
            is_active=1
        )
        db.add(buyer_user)
        db.flush()

        # 5. Populate Brands & Models
        print("Menyemai brands dan car_models...")
        brand_map = {}
        model_map = {}

        for _, row in df_raw.iterrows():
            b_name = str(row["brand"]).strip()
            if b_name not in brand_map:
                b_obj = models.Brand(nama=b_name)
                db.add(b_obj)
                db.flush()
                brand_map[b_name] = b_obj.id

            m_name = str(row["model_mobil"]).strip().upper()
            bm_key = (brand_map[b_name], m_name)
            if bm_key not in model_map:
                m_obj = models.CarModel(brand_id=brand_map[b_name], nama=m_name)
                db.add(m_obj)
                db.flush()
                model_map[bm_key] = m_obj.id

        # 6. Populate Cars & Car Features
        print("Menyemai mobil dan relasi fitur...")
        cars_to_add = []
        car_features_to_add = []

        for idx, row in df_raw.iterrows():
            loc = row.get("location")
            if loc is not None and str(loc).strip().lower() == "unknown":
                loc = None
            elif loc is not None:
                loc = str(loc).strip()

            plat_src = str(row.get("plate type", "")).strip().lower()
            jenis_plat = "ganjil" if "odd" in plat_src else "genap"

            transmisi = str(row.get("transmission", "Automatic")).strip()
            if transmisi not in ["Manual", "Automatic"]:
                transmisi = "Automatic"

            b_id = brand_map[str(row["brand"]).strip()]
            m_id = model_map[(b_id, str(row["model_mobil"]).strip().upper())]

            cicilan = row.get("instalment (Rp|Monthly)")
            cicilan_val = int(cicilan) if cicilan is not None and not pd.isna(cicilan) else None

            car = models.Car(
                id=idx + 1,
                nama_mobil=str(row["car name"]).strip(),
                model_id=m_id,
                tahun=int(row["year"]),
                jarak_tempuh_ribu_km=float(row["mileage (km)"]),
                lokasi=loc,
                transmisi=transmisi,
                jenis_plat=jenis_plat,
                harga_rp=int(row["price (Rp)"]),
                cicilan_rp=cicilan_val,
                total_fitur=int(row["total_fitur"]),
                klaster=int(row["klaster"]),
                pca1=float(row["pca1"]),
                pca2=float(row["pca2"]),
                status="tayang",
                dibuat_oleh=admin_user.id
            )
            cars_to_add.append(car)

        db.bulk_save_objects(cars_to_add)
        db.flush()

        # Car features
        for idx, row in df_raw.iterrows():
            car_id = idx + 1
            for kode, _ in SEEDS_FEATURES:
                if int(row.get(kode, 0)) == 1:
                    car_features_to_add.append(models.CarFeature(
                        car_id=car_id,
                        feature_id=feat_map[kode]
                    ))

        db.bulk_save_objects(car_features_to_add)

        # Commit everything in one transaction
        db.commit()
        print("Import data selesai dengan sukses dalam 1 transaksi!")

    except Exception as e:
        db.rollback()
        print(f"Error saat import data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_import()
