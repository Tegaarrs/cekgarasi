"""
Menghitung evaluasi K-Means (Elbow, Silhouette, centroid, PCA, profil klaster)
dari dataset asli di database, lalu menyimpannya ke artifacts/evaluasi_kmeans.json.

Dijalankan SEKALI (atau setiap data berubah), bukan pada setiap request:

    cd backend
    venv\\Scripts\\python.exe scripts\\hitung_evaluasi_kmeans.py

Catatan:
- Model produksi (K=3) TIDAK dilatih ulang: centroid & scaler dibaca dari
  artifacts/model_kmeans.pkl dan artifacts/scaler_mobil.pkl agar label segmen tidak berubah.
- Kurva Elbow/Silhouette K=2..10 dihitung dengan KMeans(random_state=42, n_init=10)
  pada data yang distandarkan dengan scaler produksi yang sama.
"""
import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import davies_bouldin_score, silhouette_score

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app import ml_service, models  # noqa: E402
from app.db import SessionLocal  # noqa: E402

OUT_PATH = os.path.join(BACKEND_DIR, "artifacts", "evaluasi_kmeans.json")
FITUR = ["tahun", "jarak_tempuh_ribu_km", "harga_rp", "total_fitur"]  # urutan = urutan scaler produksi
K_RANGE = list(range(2, 11))
# Odometer > 1.000 rb km (1 juta km) tidak masuk akal -> dianggap salah input & dikeluarkan dari evaluasi.
KM_MAKS_WAJAR = 1000.0


def muat_data():
    db = SessionLocal()
    try:
        rows = db.query(models.Car).all()
        segs = {s.id: s for s in db.query(models.Segment).all()}
        df = pd.DataFrame([{
            "id": c.id,
            "tahun": int(c.tahun),
            "jarak_tempuh_ribu_km": float(c.jarak_tempuh_ribu_km),
            "harga_rp": float(c.harga_rp),
            "total_fitur": int(c.total_fitur),
            "klaster_db": int(c.klaster),
        } for c in rows])
        seg_meta = {
            int(s.id): {"nama_pendek": s.nama_pendek, "nama_lengkap": s.nama_lengkap, "warna_hex": s.warna_hex}
            for s in segs.values()
        }
        return df, seg_meta
    finally:
        db.close()


def narasi_profil(nama, prof, glob):
    """Alasan penamaan segmen, disusun dari selisih relatif terhadap rata-rata seluruh data."""
    def arah(v, g, tinggi, rendah, tol=0.10):
        r = (v - g) / g if g else 0
        return tinggi if r > tol else rendah if r < -tol else None

    bagian = []
    h = arah(prof["rata_harga"], glob["rata_harga"], "harga di atas rata-rata pasar", "harga di bawah rata-rata pasar")
    k = arah(prof["rata_km"], glob["rata_km"], "jarak tempuh tinggi", "jarak tempuh rendah")
    f = arah(prof["rata_fitur"], glob["rata_fitur"], "fitur lebih lengkap", "fitur lebih sedikit")
    for b in (h, k, f):
        if b:
            bagian.append(b)
    tahun_txt = (
        f"tahun median {prof['median_tahun']} "
        f"({'lebih muda' if prof['rata_tahun'] > glob['rata_tahun'] else 'lebih tua'} dari rata-rata data {glob['rata_tahun']:.1f})"
    )
    ciri = ", ".join(bagian) if bagian else "karakteristik mendekati rata-rata pasar"
    return f"Segmen {nama}: {ciri}; {tahun_txt}."


def main():
    df, seg_meta = muat_data()
    tidak_wajar = df[df["jarak_tempuh_ribu_km"] > KM_MAKS_WAJAR]
    id_dikeluarkan = [int(i) for i in tidak_wajar["id"]]
    if id_dikeluarkan:
        print(f"[PERINGATAN] {len(id_dikeluarkan)} unit dikeluarkan dari evaluasi (km tidak wajar): id {id_dikeluarkan}")
    df = df[df["jarak_tempuh_ribu_km"] <= KM_MAKS_WAJAR].reset_index(drop=True)
    X = df[FITUR].to_numpy(dtype=float)
    Z = (X - ml_service.MEAN) / ml_service.SCALE
    n = len(df)
    print(f"[INFO] {n} unit mobil dimuat dari database.")

    # 1. Elbow & Silhouette K=2..10
    kurva = []
    for k in K_RANGE:
        km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(Z)
        kurva.append({
            "k": k,
            "inertia": round(float(km.inertia_), 2),
            "silhouette": round(float(silhouette_score(Z, km.labels_)), 4),
        })
        print(f"  K={k}: inertia={kurva[-1]['inertia']} silhouette={kurva[-1]['silhouette']}")

    # 2. Model produksi K=3 (label dari model tersimpan)
    label_prod = ml_service.kmeans.predict(Z)
    selisih = int((label_prod != df["klaster_db"].to_numpy()).sum())
    print(f"[CEK] Label model tersimpan vs kolom klaster di DB: {selisih} baris berbeda.")
    sil_prod = float(silhouette_score(Z, label_prod))
    dbi_prod = float(davies_bouldin_score(Z, label_prod))
    inertia_prod = float(((Z - ml_service.CENTERS[label_prod]) ** 2).sum())

    # 3. Centroid (z & nilai asli)
    centroid = []
    for c in range(ml_service.CENTERS.shape[0]):
        z = ml_service.CENTERS[c]
        asli = z * ml_service.SCALE + ml_service.MEAN
        centroid.append({
            "klaster": c,
            "z": {f: round(float(v), 4) for f, v in zip(FITUR, z)},
            "asli": {f: round(float(v), 2) for f, v in zip(FITUR, asli)},
        })

    # 4. PCA 2D
    pca = PCA(n_components=2, random_state=42).fit(Z)
    coords = pca.transform(Z)
    titik_pca = [
        {"id": int(i), "x": round(float(p[0]), 4), "y": round(float(p[1]), 4), "klaster": int(c)}
        for i, p, c in zip(df["id"], coords, label_prod)
    ]
    pusat_pca = pca.transform(ml_service.CENTERS)
    centroid_pca = [{"klaster": c, "x": round(float(p[0]), 4), "y": round(float(p[1]), 4)} for c, p in enumerate(pusat_pca)]

    # 5. Profil klaster
    glob = {
        "rata_harga": float(df["harga_rp"].mean()),
        "rata_km": float(df["jarak_tempuh_ribu_km"].mean()),
        "rata_tahun": float(df["tahun"].mean()),
        "rata_fitur": float(df["total_fitur"].mean()),
    }
    profil = []
    for c in sorted(seg_meta):
        sub = df[label_prod == c]
        prof = {
            "klaster": c,
            "nama_pendek": seg_meta[c]["nama_pendek"],
            "nama_lengkap": seg_meta[c]["nama_lengkap"],
            "warna_hex": seg_meta[c]["warna_hex"],
            "jumlah": int(len(sub)),
            "persen": round(len(sub) / n * 100, 1),
            "rata_harga": round(float(sub["harga_rp"].mean()), 0),
            "median_harga": round(float(sub["harga_rp"].median()), 0),
            "rata_tahun": round(float(sub["tahun"].mean()), 2),
            "median_tahun": int(sub["tahun"].median()),
            "rata_km": round(float(sub["jarak_tempuh_ribu_km"].mean()), 2),
            "median_km": round(float(sub["jarak_tempuh_ribu_km"].median()), 2),
            "rata_fitur": round(float(sub["total_fitur"].mean()), 2),
        }
        prof["alasan_nama"] = narasi_profil(prof["nama_pendek"], prof, glob)
        profil.append(prof)

    hasil = {
        "dibuat_pada": datetime.now().isoformat(timespec="seconds"),
        "jumlah_data": n,
        "id_dikeluarkan_km_tidak_wajar": id_dikeluarkan,
        "batas_km_wajar_ribu": KM_MAKS_WAJAR,
        "fitur": FITUR,
        "scaler": {
            "jenis": "StandardScaler (z-score)",
            "mean": {f: round(float(v), 4) for f, v in zip(FITUR, ml_service.MEAN)},
            "std": {f: round(float(v), 4) for f, v in zip(FITUR, ml_service.SCALE)},
        },
        "kurva_k": kurva,
        "k_produksi": 3,
        "produksi": {
            "inertia": round(inertia_prod, 2),
            "silhouette": round(sil_prod, 4),
            "davies_bouldin": round(dbi_prod, 4),
            "label_beda_dengan_db": selisih,
        },
        "centroid": centroid,
        "pca": {
            "varian_dijelaskan": [round(float(v), 4) for v in pca.explained_variance_ratio_],
            "komponen": {f"PC{i+1}": {fn: round(float(v), 4) for fn, v in zip(FITUR, row)} for i, row in enumerate(pca.components_)},
            "titik": titik_pca,
            "centroid": centroid_pca,
        },
        "profil": profil,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(hasil, fh, ensure_ascii=False)
    print(f"[OK] Hasil disimpan ke {OUT_PATH}")


if __name__ == "__main__":
    main()
