"""
Layanan Business Intelligence berbasis hasil K-Means CekGarasi.

Semua angka dihitung dari tabel `cars` (dataset asli) dan artifact model produksi
(scaler_mobil.pkl + model_kmeans.pkl). Tidak ada nilai dummy.
Label segmen / centroid produksi TIDAK diubah di sini (hanya dibaca).
"""
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from . import ml_service, models

# Odometer > 1.000 rb km (1 juta km) dianggap salah input dan dikeluarkan dari rata-rata/evaluasi.
KM_MAKS_WAJAR = 1000.0
AMBANG_MURAH = -10.0   # persen terhadap median segmen
AMBANG_MAHAL = 10.0
AMBANG_PERHATIAN_DEFAULT = 40.0

EVAL_PATH = os.path.join(ml_service.BASE_DIR, "artifacts", "evaluasi_kmeans.json")

SLUG = {0: "premium", 1: "keluarga-muda", 2: "ekonomis"}


# --------------------------------------------------------------------------- data
def segmen_meta(db: Session) -> Dict[int, Dict[str, Any]]:
    return {
        int(s.id): {
            "klaster": int(s.id),
            "slug": SLUG.get(int(s.id), f"klaster-{s.id}"),
            "nama_pendek": s.nama_pendek,
            "nama_lengkap": s.nama_lengkap,
            "warna_hex": s.warna_hex,
            "deskripsi": s.deskripsi,
        }
        for s in db.query(models.Segment).order_by(models.Segment.id).all()
    }


def muat_df(db: Session) -> pd.DataFrame:
    """Seluruh unit + jarak ke centroid segmennya (ruang z-score yang sama dengan training)."""
    rows = (
        db.query(models.Car, models.CarModel, models.Brand)
        .join(models.CarModel, models.Car.model_id == models.CarModel.id)
        .join(models.Brand, models.CarModel.brand_id == models.Brand.id)
        .all()
    )
    df = pd.DataFrame([{
        "id": int(c.id),
        "nama_mobil": c.nama_mobil,
        "merek": b.nama,
        "model": m.nama,
        "tipe_bodi": m.tipe_bodi or "-",
        "tahun": int(c.tahun),
        "km": float(c.jarak_tempuh_ribu_km),
        "harga": float(c.harga_rp),
        "fitur": int(c.total_fitur),
        "transmisi": c.transmisi,
        "klaster": int(c.klaster),
        "status": c.status,
        "lokasi": c.lokasi,
    } for c, m, b in rows])
    if df.empty:
        return df
    Z = (df[["tahun", "km", "harga", "fitur"]].to_numpy(float) - ml_service.MEAN) / ml_service.SCALE
    df["jarak_centroid"] = np.linalg.norm(Z - ml_service.CENTERS[df["klaster"].to_numpy()], axis=1)
    df["km_wajar"] = df["km"] <= KM_MAKS_WAJAR
    return df


def _tahun_ref() -> int:
    return datetime.now().year


def _rp(v: float) -> int:
    return int(round(float(v)))


# --------------------------------------------------------------------------- Fase 1
def analisis_mobil(db: Session, car_id: int) -> Optional[Dict[str, Any]]:
    df = muat_df(db)
    row = df[df["id"] == car_id]
    if row.empty:
        return None
    r = row.iloc[0]
    meta = segmen_meta(db)
    k = int(r["klaster"])
    peers = df[(df["klaster"] == k) & df["km_wajar"]]

    # 1) Posisi harga terhadap median segmen
    median = float(peers["harga"].median())
    selisih_pct = (float(r["harga"]) - median) / median * 100.0
    verdict = "Murah" if selisih_pct < AMBANG_MURAH else "Mahal" if selisih_pct > AMBANG_MAHAL else "Wajar"

    # 2) Kedekatan dengan centroid: persentil anggota segmen yang lebih jauh dari unit ini
    d = float(r["jarak_centroid"])
    jarak_peers = peers["jarak_centroid"].to_numpy()
    kecocokan = float((jarak_peers >= d).mean() * 100.0) if len(jarak_peers) else 0.0

    # 3) Mobil serupa (jarak z-score terdekat, segmen sama, 4 variabel)
    Z_all = (df[["tahun", "km", "harga", "fitur"]].to_numpy(float) - ml_service.MEAN) / ml_service.SCALE
    idx_self = row.index[0]
    kandidat = df[(df["klaster"] == k) & (df["id"] != car_id) & df["km_wajar"] & (df["status"] == "tayang")]
    dist = np.linalg.norm(Z_all[kandidat.index.to_numpy()] - Z_all[idx_self], axis=1)
    urut = np.argsort(dist)[:4]
    serupa = []
    for j in urut:
        c = kandidat.iloc[j]
        serupa.append({
            "id": int(c["id"]), "nama_mobil": c["nama_mobil"], "merek": c["merek"],
            "tahun": int(c["tahun"]), "km": round(float(c["km"]), 1), "harga_rp": _rp(c["harga"]),
            "transmisi": c["transmisi"], "jarak": round(float(dist[j]), 3),
        })

    return {
        "id": car_id,
        "segmen": meta.get(k, {}),
        "km_tidak_wajar": bool(not r["km_wajar"]),
        "posisi_harga": {
            "harga_rp": _rp(r["harga"]),
            "median_segmen_rp": _rp(median),
            "selisih_rp": _rp(float(r["harga"]) - median),
            "selisih_persen": round(selisih_pct, 1),
            "verdict": verdict,
            "ambang_murah_persen": AMBANG_MURAH,
            "ambang_mahal_persen": AMBANG_MAHAL,
            "jumlah_pembanding": int(len(peers)),
            "penjelasan": (
                f"Harga dibandingkan dengan median {len(peers)} unit di segmen "
                f"{meta.get(k, {}).get('nama_pendek', k)} (Rp {median/1e6:.0f} jt). "
                f"Di bawah {AMBANG_MURAH:.0f}% = Murah; {AMBANG_MURAH:.0f}% sampai +{AMBANG_MAHAL:.0f}% = Wajar; "
                f"di atas +{AMBANG_MAHAL:.0f}% = Mahal."
            ),
        },
        "kedekatan_centroid": {
            "jarak": round(d, 3),
            "jarak_rata_segmen": round(float(jarak_peers.mean()), 3) if len(jarak_peers) else None,
            "kecocokan_persen": round(kecocokan, 1),
            "penjelasan": (
                "Jarak Euclidean unit ke pusat segmen (centroid) pada data yang sudah distandarkan "
                "(tahun, odometer, harga, fitur). Tingkat kecocokan = persentase unit lain di segmen yang sama "
                "yang posisinya lebih jauh dari pusat daripada unit ini; 100% berarti tepat di pusat segmen."
            ),
        },
        "mobil_serupa": serupa,
    }


# --------------------------------------------------------------------------- Fase 2
def opsi_filter(df: pd.DataFrame) -> Dict[str, Any]:
    return {
        "merek": sorted(df["merek"].unique().tolist()),
        "harga_min": int(df["harga"].min()), "harga_max": int(df["harga"].max()),
        "tahun_min": int(df["tahun"].min()), "tahun_max": int(df["tahun"].max()),
    }


def dashboard(
    db: Session,
    segmen: Optional[int] = None,
    merek: Optional[str] = None,
    harga_min: Optional[int] = None,
    harga_max: Optional[int] = None,
    tahun_min: Optional[int] = None,
    tahun_max: Optional[int] = None,
    ambang_perhatian: float = AMBANG_PERHATIAN_DEFAULT,
) -> Dict[str, Any]:
    full = muat_df(db)
    meta = segmen_meta(db)
    if full.empty:
        return {"kosong": True}

    # Median referensi segmen selalu dari seluruh data (tidak ikut filter) agar stabil
    median_ref = full[full["km_wajar"]].groupby("klaster")["harga"].median().to_dict()

    df = full
    if segmen is not None:
        df = df[df["klaster"] == segmen]
    if merek:
        df = df[df["merek"].str.lower() == merek.lower()]
    if harga_min is not None:
        df = df[df["harga"] >= harga_min]
    if harga_max is not None:
        df = df[df["harga"] <= harga_max]
    if tahun_min is not None:
        df = df[df["tahun"] >= tahun_min]
    if tahun_max is not None:
        df = df[df["tahun"] <= tahun_max]

    ref = _tahun_ref()
    total = int(len(df))
    wajar = df[df["km_wajar"]]
    kpi = {
        "total_unit": total,
        "rata_harga": _rp(df["harga"].mean()) if total else 0,
        "rata_km": round(float(wajar["km"].mean()), 1) if len(wajar) else 0,
        "rata_umur": round(float((ref - df["tahun"]).mean()), 1) if total else 0,
        "tahun_acuan_umur": ref,
        "unit_km_dikeluarkan": int(total - len(wajar)),
        "per_segmen": [
            {**meta[k], "jumlah": int((df["klaster"] == k).sum())} for k in sorted(meta)
        ],
    }

    komposisi = [
        {"klaster": k, "nama": meta[k]["nama_pendek"], "warna": meta[k]["warna_hex"],
         "jumlah": int((df["klaster"] == k).sum()),
         "persen": round(float((df["klaster"] == k).sum()) / total * 100, 1) if total else 0}
        for k in sorted(meta)
    ]

    scatter = [
        {"id": int(r.id), "nama_mobil": r.nama_mobil, "tahun": int(r.tahun), "harga": _rp(r.harga),
         "km": round(float(r.km), 1), "klaster": int(r.klaster)}
        for r in df.itertuples()
    ]

    top_merek = {}
    for k in sorted(meta):
        sub = df[df["klaster"] == k]
        vc = sub["merek"].value_counts().head(5)
        top_merek[str(k)] = [{"merek": m, "jumlah": int(c)} for m, c in vc.items()]

    stok = []
    for k in sorted(meta):
        sub = df[df["klaster"] == k]
        stok.append({
            **meta[k],
            "jumlah": int(len(sub)),
            "persen": round(len(sub) / total * 100, 1) if total else 0,
            "rata_harga": _rp(sub["harga"].mean()) if len(sub) else 0,
            "median_harga": _rp(sub["harga"].median()) if len(sub) else 0,
        })

    insight: List[str] = []
    ada = [s for s in stok if s["jumlah"] > 0]
    if len(ada) >= 2:
        terbanyak = max(ada, key=lambda s: s["jumlah"])
        tersedikit = min(ada, key=lambda s: s["jumlah"])
        insight.append(
            f"Stok terbanyak ada di segmen {terbanyak['nama_pendek']} ({terbanyak['jumlah']} unit, {terbanyak['persen']}%)."
        )
        insight.append(
            f"Stok tersedikit ada di segmen {tersedikit['nama_pendek']} ({tersedikit['jumlah']} unit, {tersedikit['persen']}%)."
        )
        termahal = max(ada, key=lambda s: s["rata_harga"])
        insight.append(
            f"Rata-rata harga tertinggi: segmen {termahal['nama_pendek']} (Rp {termahal['rata_harga']/1e6:.0f} jt)."
        )
    elif len(ada) == 1:
        insight.append(f"Data terfilter hanya berisi segmen {ada[0]['nama_pendek']} ({ada[0]['jumlah']} unit).")
    else:
        insight.append("Tidak ada unit yang cocok dengan filter saat ini.")
    if kpi["unit_km_dikeluarkan"]:
        insight.append(
            f"{kpi['unit_km_dikeluarkan']} unit memiliki odometer tidak wajar (> {int(KM_MAKS_WAJAR)} rb km) "
            "dan dikeluarkan dari rata-rata KM; mohon periksa inputnya."
        )

    perhatian = []
    for r in df.itertuples():
        med = median_ref.get(int(r.klaster))
        if not med:
            continue
        sel = (r.harga - med) / med * 100
        tidak_wajar = not r.km_wajar
        if abs(sel) >= ambang_perhatian or tidak_wajar:
            perhatian.append({
                "id": int(r.id), "nama_mobil": r.nama_mobil, "tahun": int(r.tahun),
                "harga_rp": _rp(r.harga), "median_segmen_rp": _rp(med),
                "selisih_persen": round(sel, 1), "klaster": int(r.klaster),
                "nama_segmen": meta[int(r.klaster)]["nama_pendek"],
                "catatan": "Odometer tidak wajar" if tidak_wajar else ("Jauh di atas median" if sel > 0 else "Jauh di bawah median"),
            })
    perhatian.sort(key=lambda x: (x["catatan"] != "Odometer tidak wajar", -abs(x["selisih_persen"])))

    return {
        "kosong": total == 0,
        "kpi": kpi,
        "komposisi": komposisi,
        "scatter": scatter,
        "top_merek": top_merek,
        "stok": stok,
        "insight": insight,
        "perhatian": perhatian[:30],
        "total_perhatian": len(perhatian),
        "ambang_perhatian_persen": ambang_perhatian,
        "opsi_filter": opsi_filter(full),
        "segmen": [meta[k] for k in sorted(meta)],
    }


# --------------------------------------------------------------------------- Fase 3
def metodologi() -> Dict[str, Any]:
    if not os.path.isfile(EVAL_PATH):
        raise FileNotFoundError(
            "Hasil evaluasi belum dihitung. Jalankan: cd backend && venv\\Scripts\\python.exe scripts\\hitung_evaluasi_kmeans.py"
        )
    with open(EVAL_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


# --------------------------------------------------------------------------- Fase 4
def bandingkan_segmen(db: Session) -> Dict[str, Any]:
    df = muat_df(db)
    meta = segmen_meta(db)
    total = len(df)
    ref = _tahun_ref()
    items = []
    for k in sorted(meta):
        sub = df[df["klaster"] == k]
        wajar = sub[sub["km_wajar"]]
        merek_vc = sub["merek"].value_counts()
        bodi_vc = sub["tipe_bodi"].value_counts()
        items.append({
            **meta[k],
            "jumlah": int(len(sub)),
            "pangsa_persen": round(len(sub) / total * 100, 1),
            "median_harga": _rp(sub["harga"].median()),
            "median_tahun": int(sub["tahun"].median()),
            "median_umur": int(ref - sub["tahun"].median()),
            "median_km": round(float(wajar["km"].median()), 1),
            "rata_fitur": round(float(sub["fitur"].mean()), 2),
            "persen_matic": round(float((sub["transmisi"] == "Automatic").mean() * 100), 1),
            "persen_manual": round(float((sub["transmisi"] == "Manual").mean() * 100), 1),
            "merek_dominan": [
                {"merek": m, "jumlah": int(c), "persen": round(c / len(sub) * 100, 1)}
                for m, c in merek_vc.head(3).items()
            ],
            "bodi_dominan": [
                {"tipe_bodi": b, "persen": round(c / len(sub) * 100, 1)} for b, c in bodi_vc.head(2).items()
            ],
        })

    # Normalisasi 0-100 terhadap nilai tertinggi antar segmen
    for kunci_in, kunci_out in (("median_harga", "harga"), ("median_umur", "umur"), ("median_km", "km")):
        mx = max(i[kunci_in] for i in items) or 1
        for i in items:
            i.setdefault("normal", {})[kunci_out] = round(i[kunci_in] / mx * 100, 1)

    # "Cocok untuk siapa": disusun dari peringkat data
    def pemenang(kunci, tertinggi=True):
        return (max if tertinggi else min)(items, key=lambda i: i[kunci])["klaster"]

    termurah, termahal = pemenang("median_harga", False), pemenang("median_harga", True)
    termuda, tertua = pemenang("median_umur", False), pemenang("median_umur", True)
    km_rendah, km_tinggi = pemenang("median_km", False), pemenang("median_km", True)
    fitur_max = pemenang("rata_fitur", True)
    for i in items:
        k = i["klaster"]
        poin = []
        if k == termurah:
            poin.append("yang mengutamakan anggaran paling hemat (median harga terendah)")
        if k == termahal:
            poin.append("yang mengutamakan kelas harga tertinggi")
        if k == termuda:
            poin.append("yang menginginkan mobil berumur paling muda")
        if k == tertua:
            poin.append("yang fleksibel soal usia mobil demi harga")
        if k == km_rendah:
            poin.append("yang mencari odometer paling rendah")
        if k == km_tinggi:
            poin.append("yang toleran terhadap jarak tempuh lebih tinggi")
        if k == fitur_max:
            poin.append("yang mengincar fitur kendaraan paling lengkap")
        if not poin:
            poin.append("yang mencari profil seimbang di antara segmen lain")
        i["cocok_untuk"] = "Cocok untuk pembeli " + ", ".join(poin) + "."
        i["dasar_data"] = (
            f"Median harga Rp {i['median_harga']/1e6:.0f} jt, tahun {i['median_tahun']}, "
            f"odometer {i['median_km']} rb km, rata-rata {i['rata_fitur']} fitur."
        )
    return {"total_unit": total, "tahun_acuan": ref, "segmen": items}


# --------------------------------------------------------------------------- Fase 5
def simulasi(db: Session, tahun: float, km: float, harga: float, fitur: float, n: int = 6) -> Dict[str, Any]:
    meta = segmen_meta(db)
    z = (np.array([tahun, km, harga, fitur], float) - ml_service.MEAN) / ml_service.SCALE
    jarak = np.linalg.norm(ml_service.CENTERS - z, axis=1)
    terdekat = int(jarak.argmin())
    dmax = float(jarak.max()) or 1.0
    daftar = [
        {**meta[k], "jarak": round(float(jarak[k]), 3), "bar_persen": round(float(jarak[k]) / dmax * 100, 1),
         "terpilih": k == terdekat}
        for k in sorted(meta)
    ]

    df = muat_df(db)
    sub = df[(df["klaster"] == terdekat) & df["km_wajar"] & (df["status"] == "tayang")]
    Z = (sub[["tahun", "km", "harga", "fitur"]].to_numpy(float) - ml_service.MEAN) / ml_service.SCALE
    d = np.linalg.norm(Z - z, axis=1)
    urut = np.argsort(d)[:n]
    cocok = [{
        "id": int(sub.iloc[j]["id"]), "nama_mobil": sub.iloc[j]["nama_mobil"], "tahun": int(sub.iloc[j]["tahun"]),
        "km": round(float(sub.iloc[j]["km"]), 1), "harga_rp": _rp(sub.iloc[j]["harga"]), "jarak": round(float(d[j]), 3),
    } for j in urut]

    return {
        "input_z": {f: round(float(v), 3) for f, v in zip(["tahun", "km", "harga", "fitur"], z)},
        "segmen_terdekat": meta[terdekat],
        "jarak_centroid": daftar,
        "penjelasan": (
            f"Profil kamu paling dekat dengan Segmen {meta[terdekat]['nama_pendek']} "
            f"(jarak {jarak[terdekat]:.2f} pada data yang sudah distandarkan)."
        ),
        "mobil_cocok": cocok,
        "slug": meta[terdekat]["slug"],
    }
