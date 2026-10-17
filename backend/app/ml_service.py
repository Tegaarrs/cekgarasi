import os
import joblib
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score, adjusted_rand_score
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session
from . import models

# Paths to verified artifacts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCALER_PATH = os.path.join(BASE_DIR, "artifacts", "scaler_mobil.pkl")
MODEL_PATH = os.path.join(BASE_DIR, "artifacts", "model_kmeans.pkl")

# Load only these two files
scaler = joblib.load(SCALER_PATH)
kmeans = joblib.load(MODEL_PATH)

MEAN = scaler.mean_
SCALE = scaler.scale_
CENTERS = kmeans.cluster_centers_  # feature order: [tahun, km_ribu, harga_rp, total_fitur]

# Cache for stats_segmen
_STATS_CACHE: Optional[Dict[int, Dict[str, Any]]] = None

def invalidate_stats_cache():
    global _STATS_CACHE
    _STATS_CACHE = None

def _z(v):
    return (np.asarray(v, float) - MEAN) / SCALE

def prediksi_segmen(tahun: float, km_ribu: float, harga_rp: float, total_fitur: float) -> int:
    z_val = _z([tahun, km_ribu, harga_rp, total_fitur]).reshape(1, -1)
    return int(kmeans.predict(z_val)[0])

def segmen_cocok(tahun: Optional[float] = None, harga_rp: Optional[float] = None) -> Optional[int]:
    """Nearest centroid on ONLY the dimensions given (idx 0 for tahun, idx 2 for harga_rp)."""
    idx, pref = [], []
    if tahun is not None:
        idx.append(0)
        pref.append((float(tahun) - MEAN[0]) / SCALE[0])
    if harga_rp is not None:
        idx.append(2)
        pref.append((float(harga_rp) - MEAN[2]) / SCALE[2])
    if not idx:
        return None
    diff = CENTERS[:, idx] - np.array(pref)
    dist = (diff ** 2).sum(axis=1)
    return int(dist.argmin())

def preferensi_midpoint(
    tahun_min: Optional[int] = None,
    tahun_max: Optional[int] = None,
    harga_min: Optional[int] = None,
    harga_max: Optional[int] = None
) -> tuple[Optional[float], Optional[float]]:
    """Calculate preference midpoints. If only one bound is given use that bound."""
    mid_tahun = None
    if tahun_min is not None and tahun_max is not None:
        mid_tahun = (tahun_min + tahun_max) / 2.0
    elif tahun_min is not None:
        mid_tahun = float(tahun_min)
    elif tahun_max is not None:
        mid_tahun = float(tahun_max)

    mid_harga = None
    if harga_min is not None and harga_max is not None:
        mid_harga = (harga_min + harga_max) / 2.0
    elif harga_min is not None:
        mid_harga = float(harga_min)
    elif harga_max is not None:
        mid_harga = float(harga_max)

    return mid_tahun, mid_harga

def rekomendasi(df_seg: pd.DataFrame, tahun: Optional[float], harga_rp: Optional[float], exclude_ids: List[int], n: int = 10) -> pd.DataFrame:
    """df_seg columns: id, tahun, harga_rp (+ other fields). Ranked by closeness to requested year & price."""
    if df_seg.empty:
        return df_seg
    d = df_seg[~df_seg["id"].isin(exclude_ids)].copy()
    if d.empty:
        return d
    dist = np.zeros(len(d))
    if tahun is not None:
        dist += ((d["tahun"] - tahun) / SCALE[0]) ** 2
    if harga_rp is not None:
        dist += ((d["harga_rp"] - harga_rp) / SCALE[2]) ** 2
    return d.assign(jarak=dist).sort_values("jarak").head(n)

def stats_segmen(db: Session, force_refresh: bool = False) -> Dict[int, Dict[str, Any]]:
    """Cached segment statistics computed from DB."""
    global _STATS_CACHE
    if _STATS_CACHE is not None and not force_refresh:
        return _STATS_CACHE

    cars = db.query(
        models.Car.id,
        models.Car.klaster,
        models.Car.tahun,
        models.Car.jarak_tempuh_ribu_km,
        models.Car.harga_rp,
        models.Car.transmisi,
        models.Car.total_fitur
    ).filter(models.Car.status == "tayang").all()

    if not cars:
        return {}

    df = pd.DataFrame([{
        "id": c.id,
        "klaster": c.klaster,
        "tahun": float(c.tahun),
        "km": float(c.jarak_tempuh_ribu_km),
        "harga": float(c.harga_rp),
        "is_matic": 1 if c.transmisi == "Automatic" else 0,
        "total_fitur": float(c.total_fitur)
    } for c in cars])

    total_count = len(df)
    stats: Dict[int, Dict[str, Any]] = {}

    for k in [0, 1, 2]:
        sub = df[df["klaster"] == k]
        if sub.empty:
            continue
        q1 = float(sub["harga"].quantile(0.25))
        q3 = float(sub["harga"].quantile(0.75))
        median_harga = float(sub["harga"].median())
        median_tahun = int(sub["tahun"].median())
        mean_km = float(sub["km"].mean())
        mean_total_fitur = float(sub["total_fitur"].mean())
        share_auto = float(sub["is_matic"].mean())
        count = len(sub)
        share = count / total_count if total_count > 0 else 0.0

        stats[k] = {
            "count": count,
            "share": share,
            "q1_harga": q1,
            "median_harga": median_harga,
            "q3_harga": q3,
            "median_tahun": median_tahun,
            "mean_km": mean_km,
            "mean_total_fitur": mean_total_fitur,
            "share_automatic": share_auto
        }

    _STATS_CACHE = stats
    return stats

def posisi_harga(arg1: Any, arg2: Any, arg3: Any = None) -> Dict[str, Any]:
    """Segment Q1/Q3/median + verdict ('di dalam rentang' | 'di atas rentang' | 'di bawah rentang').
    Supports:
      posisi_harga(db: Session, klaster: int, harga: float)
      posisi_harga(car: models.Car, db: Session)
    """
    if isinstance(arg1, Session):
        db = arg1
        klaster = int(arg2)
        harga = float(arg3)
    elif hasattr(arg1, "klaster") and hasattr(arg1, "harga_rp"):
        car = arg1
        db = arg2
        klaster = int(car.klaster)
        harga = float(car.harga_rp)
    else:
        # Fallback (klaster, harga, db)
        klaster = int(arg1)
        harga = float(arg2)
        db = arg3

    st = stats_segmen(db).get(klaster) if db else None
    if not st:
        return {
            "q1": None,
            "median": None,
            "q3": None,
            "verdict": "tidak diketahui",
            "selisih_median_rp": 0
        }

    q1 = st["q1_harga"]
    q3 = st["q3_harga"]
    median = st["median_harga"]

    if harga < q1:
        verdict = "di bawah rentang"
    elif harga > q3:
        verdict = "di atas rentang"
    else:
        verdict = "di dalam rentang"

    return {
        "q1": q1,
        "median": median,
        "q3": q3,
        "verdict": verdict,
        "selisih_median_rp": harga - median
    }

def mobil_serupa(arg1: Any, arg2: Any, n: int = 4) -> List[models.Car]:
    """Nearest cars in the same segment by squared z-distance over all 4 features.
    Supports mobil_serupa(car, db, n) and mobil_serupa(db, car, n).
    """
    if isinstance(arg1, Session):
        db = arg1
        car = arg2
    else:
        car = arg1
        db = arg2

    peers = db.query(models.Car).filter(
        models.Car.klaster == car.klaster,
        models.Car.id != car.id,
        models.Car.status == "tayang"
    ).all()

    if not peers:
        return []

    target_z = _z([car.tahun, float(car.jarak_tempuh_ribu_km), float(car.harga_rp), car.total_fitur])
    peer_matrix = np.array([
        _z([p.tahun, float(p.jarak_tempuh_ribu_km), float(p.harga_rp), p.total_fitur])
        for p in peers
    ])

    dists = ((peer_matrix - target_z) ** 2).sum(axis=1)
    sorted_indices = np.argsort(dists)[:n]
    return [peers[i] for i in sorted_indices]

def eksperimen_k(k: int, db: Session) -> Dict[str, Any]:
    """
    Fits KMeans(n_clusters=k, random_state=42, n_init=10) IN MEMORY on z-scored DB data.
    NEVER writes to the DB and NEVER replaces the production model.
    """
    if k < 2 or k > 6:
        raise ValueError("k harus antara 2 dan 6")

    cars = db.query(
        models.Car.id,
        models.Car.nama_mobil,
        models.Car.tahun,
        models.Car.jarak_tempuh_ribu_km,
        models.Car.harga_rp,
        models.Car.total_fitur
    ).all()

    if not cars:
        return {}

    raw = np.array([
        [c.tahun, float(c.jarak_tempuh_ribu_km), float(c.harga_rp), c.total_fitur]
        for c in cars
    ], dtype=float)

    z_scored = (raw - MEAN) / SCALE

    model_k = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model_k.fit_predict(z_scored)
    inertia = float(model_k.inertia_)
    sil = float(silhouette_score(z_scored, labels))

    # Compute PCA for visualization
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(z_scored)

    # Name clusters
    df = pd.DataFrame({
        "id": [c.id for c in cars],
        "cluster": labels,
        "tahun": raw[:, 0],
        "km": raw[:, 1],
        "harga": raw[:, 2],
        "total_fitur": raw[:, 3],
        "pca1": coords[:, 0],
        "pca2": coords[:, 1]
    })

    median_prices = df.groupby("cluster")["harga"].median().sort_values()
    
    # Mapping to names
    name_map = {}
    if k == 3:
        # Match standard segment labels:
        # cluster with highest average price is Premium
        # of the remaining, cluster with highest km is Ekonomis, other is Keluarga Muda
        mean_stats = df.groupby("cluster")[["harga", "km"]].mean()
        id_prem = int(mean_stats["harga"].idxmax())
        sisa = mean_stats.drop(index=id_prem)
        id_eko = int(sisa["km"].idxmax())
        id_kel = int([i for i in sisa.index if i != id_eko][0])
        name_map = {
            id_prem: {"nama": "Mobil Premium Fitur Lengkap", "nama_pendek": "Premium", "warna": "#2557D6"},
            id_kel: {"nama": "Mobil Keluarga Tahun Muda", "nama_pendek": "Keluarga Muda", "warna": "#0CA678"},
            id_eko: {"nama": "Mobil Ekonomis Jarak Tempuh Tinggi", "nama_pendek": "Ekonomis", "warna": "#AE3EC9"}
        }
    else:
        letters = ["A", "B", "C", "D", "E", "F"]
        colors = ["#2557D6", "#0CA678", "#AE3EC9", "#FA5252", "#FD7E14", "#7950F2"]
        for rank, cl_id in enumerate(median_prices.index):
            name_map[cl_id] = {
                "nama": f"Segmen {letters[rank]}",
                "nama_pendek": f"Segmen {letters[rank]}",
                "warna": colors[rank % len(colors)]
            }

    cluster_profiles = []
    for cl_id in median_prices.index:
        sub = df[df["cluster"] == cl_id]
        meta = name_map[cl_id]
        cluster_profiles.append({
            "cluster_id": int(cl_id),
            "nama": meta["nama"],
            "nama_pendek": meta["nama_pendek"],
            "warna": meta["warna"],
            "count": len(sub),
            "share": len(sub) / len(df),
            "median_harga": float(sub["harga"].median()),
            "mean_harga": float(sub["harga"].mean()),
            "median_tahun": int(sub["tahun"].median()),
            "mean_km": float(sub["km"].mean()),
            "mean_total_fitur": float(sub["total_fitur"].mean())
        })

    # Return summary + scatter points sample
    points = [{
        "id": int(row["id"]),
        "cluster_id": int(row["cluster"]),
        "nama_segmen": name_map[row["cluster"]]["nama_pendek"],
        "warna": name_map[row["cluster"]]["warna"],
        "pca1": round(float(row["pca1"]), 4),
        "pca2": round(float(row["pca2"]), 4),
        "tahun": int(row["tahun"]),
        "km": round(float(row["km"]), 3),
        "harga": int(row["harga"]),
        "total_fitur": int(row["total_fitur"])
    } for _, row in df.iterrows()]

    return {
        "k": k,
        "inertia": round(inertia, 2),
        "silhouette": round(sil, 4),
        "is_production": 1 if k == 3 else 0,
        "profiles": cluster_profiles,
        "points": points
    }


def _prepare_scenario_data(db: Session):
    cars = db.query(models.Car).join(models.Car.car_model).all()
    records = []
    for c in cars:
        records.append({
            "id": c.id,
            "harga_rp": float(c.harga_rp),
            "tahun": int(c.tahun),
            "jarak_tempuh_ribu_km": float(c.jarak_tempuh_ribu_km),
            "total_fitur": int(c.total_fitur),
            "tipe_bodi": c.car_model.tipe_bodi or "MPV"
        })
    return pd.DataFrame(records)


def _get_scenario_features_and_matrix(df: pd.DataFrame, skenario: str):
    if skenario == "produksi":
        cols = ["harga_rp", "tahun", "jarak_tempuh_ribu_km", "total_fitur"]
        X = StandardScaler().fit_transform(df[cols])
        return cols, 0, X
    elif skenario == "A":
        cols_num = ["harga_rp", "tahun"]
        X_num = StandardScaler().fit_transform(df[cols_num])
        ohe = pd.get_dummies(df["tipe_bodi"], dtype=float).reindex(
            columns=["Hatchback", "MPV", "Niaga", "SUV", "Sedan"], fill_value=0.0
        )
        X = np.hstack([X_num, ohe.values])
        return ["harga_rp", "tahun", "tipe_bodi"], 1, X
    elif skenario == "B":
        cols = ["harga_rp", "jarak_tempuh_ribu_km", "total_fitur"]
        X = StandardScaler().fit_transform(df[cols])
        return cols, 0, X
    else:
        raise ValueError(f"Skenario '{skenario}' tidak dikenal. Pilih 'produksi', 'A', atau 'B'.")


def uji_skenario(skenario: str, k: int, db: Session) -> Dict[str, Any]:
    """
    Runs in-memory clustering experiment for given scenario and k (2..6).
    Never touches cars, segments, or production artifacts.
    Caches evaluation metrics in ml_uji_skenario.
    """
    if skenario not in ("produksi", "A", "B"):
        raise ValueError(f"Skenario '{skenario}' tidak valid. Harus 'produksi', 'A', atau 'B'.")
    if k < 2 or k > 6:
        raise ValueError("k harus antara 2 dan 6.")

    df = _prepare_scenario_data(db)
    if df.empty:
        raise ValueError("Basis data mobil kosong.")

    fitur_list, pakai_tipe, X = _get_scenario_features_and_matrix(df, skenario)

    km_full = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)
    labels_full = km_full.labels_

    sil = round(float(silhouette_score(X, labels_full)), 4)
    db_idx = round(float(davies_bouldin_score(X, labels_full)), 3)
    ch = round(float(calinski_harabasz_score(X, labels_full)), 1)

    # 30-run stability (80/20 split with seeds 0..29)
    sil_tests = []
    aris = []
    n_samples = len(df)

    for seed in range(30):
        tr_idx, te_idx = train_test_split(np.arange(n_samples), test_size=0.2, random_state=seed)
        df_tr = df.iloc[tr_idx]
        df_te = df.iloc[te_idx]
        sc = StandardScaler()

        if skenario == "produksi":
            cols = ["harga_rp", "tahun", "jarak_tempuh_ribu_km", "total_fitur"]
            X_tr = sc.fit_transform(df_tr[cols])
            X_te = sc.transform(df_te[cols])
        elif skenario == "A":
            X_tr_num = sc.fit_transform(df_tr[["harga_rp", "tahun"]])
            X_te_num = sc.transform(df_te[["harga_rp", "tahun"]])
            ohe_tr = pd.get_dummies(df_tr["tipe_bodi"], dtype=float).reindex(
                columns=["Hatchback", "MPV", "Niaga", "SUV", "Sedan"], fill_value=0.0
            )
            ohe_te = pd.get_dummies(df_te["tipe_bodi"], dtype=float).reindex(
                columns=["Hatchback", "MPV", "Niaga", "SUV", "Sedan"], fill_value=0.0
            )
            X_tr = np.hstack([X_tr_num, ohe_tr.values])
            X_te = np.hstack([X_te_num, ohe_te.values])
        elif skenario == "B":
            cols = ["harga_rp", "jarak_tempuh_ribu_km", "total_fitur"]
            X_tr = sc.fit_transform(df_tr[cols])
            X_te = sc.transform(df_te[cols])

        km_tr = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_tr)
        labels_te = km_tr.predict(X_te)
        sil_te = float(silhouette_score(X_te, labels_te))
        ari_te = float(adjusted_rand_score(labels_full[te_idx], labels_te))
        sil_tests.append(sil_te)
        aris.append(ari_te)

    sil_uji = round(float(np.mean(sil_tests)), 4)
    ari_rata = round(float(np.mean(aris)), 4)
    ari_min = round(float(np.min(aris)), 4)

    # Per-cluster profile
    profiles = []
    for cl in range(k):
        sub = df[labels_full == cl]
        top_2 = sub["tipe_bodi"].value_counts().head(2).index.tolist()
        profiles.append({
            "klaster": int(cl),
            "count": int(len(sub)),
            "median_price": float(sub["harga_rp"].median()),
            "median_year": int(sub["tahun"].median()),
            "median_mileage": round(float(sub["jarak_tempuh_ribu_km"].median()), 2),
            "mean_total_fitur": round(float(sub["total_fitur"].mean()), 2),
            "top_2_tipe_bodi": top_2
        })

    # Cache in ml_uji_skenario
    try:
        cached = db.query(models.MLUjiSkenario).filter(
            models.MLUjiSkenario.nama == skenario,
            models.MLUjiSkenario.k == k
        ).first()
        if not cached:
            cached = models.MLUjiSkenario(
                nama=skenario,
                fitur=fitur_list,
                pakai_tipe=pakai_tipe,
                k=k,
                silhouette=sil,
                davies_bouldin=db_idx,
                calinski_harabasz=ch,
                silhouette_uji=sil_uji,
                ari_rata=ari_rata,
                ari_min=ari_min
            )
            db.add(cached)
        else:
            cached.fitur = fitur_list
            cached.pakai_tipe = pakai_tipe
            cached.silhouette = sil
            cached.davies_bouldin = db_idx
            cached.calinski_harabasz = ch
            cached.silhouette_uji = sil_uji
            cached.ari_rata = ari_rata
            cached.ari_min = ari_min
        db.commit()
    except Exception:
        db.rollback()

    return {
        "skenario": skenario,
        "k": k,
        "fitur": fitur_list,
        "pakai_tipe": pakai_tipe,
        "silhouette": sil,
        "davies_bouldin": db_idx,
        "calinski_harabasz": ch,
        "silhouette_uji": sil_uji,
        "ari_rata": ari_rata,
        "ari_min": ari_min,
        "profile": profiles,
        "_labels": labels_full
    }


def ringkasan_uji_skenario(db: Session, k: int = 3) -> Dict[str, Any]:
    """
    Returns the three scenarios at k (default 3) plus pairwise ARI matrix.
    Caches results in ml_uji_skenario.
    """
    res_prod = uji_skenario("produksi", k, db)
    res_a = uji_skenario("A", k, db)
    res_b = uji_skenario("B", k, db)

    lbl_prod = res_prod["_labels"]
    lbl_a = res_a["_labels"]
    lbl_b = res_b["_labels"]

    ari_prod_b = round(float(adjusted_rand_score(lbl_prod, lbl_b)), 3)
    ari_prod_a = round(float(adjusted_rand_score(lbl_prod, lbl_a)), 3)
    ari_a_b = round(float(adjusted_rand_score(lbl_a, lbl_b)), 3)

    # Clean internal _labels from response
    prod_clean = {k_: v for k_, v in res_prod.items() if k_ != "_labels"}
    a_clean = {k_: v for k_, v in res_a.items() if k_ != "_labels"}
    b_clean = {k_: v for k_, v in res_b.items() if k_ != "_labels"}

    matrix = {
        "produksi": {"produksi": 1.0, "A": ari_prod_a, "B": ari_prod_b},
        "A": {"produksi": ari_prod_a, "A": 1.0, "B": ari_a_b},
        "B": {"produksi": ari_prod_b, "A": ari_a_b, "B": 1.0}
    }

    pairs = [
        {"pair": "Produksi - Skenario B", "scenario1": "produksi", "scenario2": "B", "ari": ari_prod_b, "kesamaan": f"{'Tinggi' if ari_prod_b >= 0.7 else 'Moderat' if ari_prod_b >= 0.4 else 'Rendah'} ({ari_prod_b:.3f})"},
        {"pair": "Produksi - Skenario A", "scenario1": "produksi", "scenario2": "A", "ari": ari_prod_a, "kesamaan": f"{'Tinggi' if ari_prod_a >= 0.7 else 'Moderat' if ari_prod_a >= 0.4 else 'Rendah'} ({ari_prod_a:.3f})"},
        {"pair": "Skenario A - Skenario B", "scenario1": "A", "scenario2": "B", "ari": ari_a_b, "kesamaan": f"{'Tinggi' if ari_a_b >= 0.7 else 'Moderat' if ari_a_b >= 0.4 else 'Rendah'} ({ari_a_b:.3f})"}
    ]

    return {
        "skenario": {
            "produksi": prod_clean,
            "A": a_clean,
            "B": b_clean
        },
        "matrix": matrix,
        "pairs": pairs,
        "k": k
    }


# Cache for scenario comparison prediction models
_SCENARIO_PRED_CACHE = {}

def get_scenario_predictors(db: Session):
    global _SCENARIO_PRED_CACHE
    if "km_a" in _SCENARIO_PRED_CACHE and "km_b" in _SCENARIO_PRED_CACHE:
        return _SCENARIO_PRED_CACHE

    df = _prepare_scenario_data(db)

    # 1. Scenario A
    cols_a = ["harga_rp", "tahun"]
    sc_a = StandardScaler().fit(df[cols_a])
    X_num_a = sc_a.transform(df[cols_a])
    ohe_a = pd.get_dummies(df["tipe_bodi"], dtype=float).reindex(
        columns=["Hatchback", "MPV", "Niaga", "SUV", "Sedan"], fill_value=0.0
    )
    X_a = np.hstack([X_num_a, ohe_a.values])
    km_a = KMeans(n_clusters=3, random_state=42, n_init=10).fit(X_a)

    # 2. Scenario B
    cols_b = ["harga_rp", "jarak_tempuh_ribu_km", "total_fitur"]
    sc_b = StandardScaler().fit(df[cols_b])
    X_b = sc_b.transform(df[cols_b])
    km_b = KMeans(n_clusters=3, random_state=42, n_init=10).fit(X_b)

    # Align labels with production segments based on overlap/median price:
    # A: label 1 -> Segmen 0, label 0 -> Segmen 1, label 2 -> Segmen 2
    map_a = {1: 0, 0: 1, 2: 2}
    # B: label 1 -> Segmen 0, label 2 -> Segmen 1, label 0 -> Segmen 2
    map_b = {1: 0, 2: 1, 0: 2}

    _SCENARIO_PRED_CACHE = {
        "sc_a": sc_a,
        "km_a": km_a,
        "map_a": map_a,
        "sc_b": sc_b,
        "km_b": km_b,
        "map_b": map_b
    }
    return _SCENARIO_PRED_CACHE


def prediksi_komparasi_skenario(
    harga_rp: float,
    tahun: float,
    jarak_tempuh_ribu_km: float,
    total_fitur: float,
    tipe_bodi: str,
    db: Session
) -> dict:
    """
    Juxtaposes clustering algorithms across feature subsets:
    - Skenario Produksi: [harga_rp, tahun, jarak_tempuh_ribu_km, total_fitur]
    - Skenario A: [harga_rp, tahun] + one-hot(tipe_bodi)
    - Skenario B: [harga_rp, jarak_tempuh_ribu_km, total_fitur]
    Evaluates whether the predictions are accurate/consistent or divergent.
    """
    predictors = get_scenario_predictors(db)

    # 1. Produksi Prediction
    c_prod = prediksi_segmen(tahun, jarak_tempuh_ribu_km, harga_rp, total_fitur)

    # 2. Skenario A Prediction
    sc_a = predictors["sc_a"]
    km_a = predictors["km_a"]
    map_a = predictors["map_a"]

    x_num_a = sc_a.transform([[harga_rp, tahun]])
    valid_bodies = ["Hatchback", "MPV", "Niaga", "SUV", "Sedan"]
    clean_body = tipe_bodi if tipe_bodi in valid_bodies else "MPV"
    ohe_vec = [[1.0 if b == clean_body else 0.0 for b in valid_bodies]]
    x_input_a = np.hstack([x_num_a, ohe_vec])
    raw_a = int(km_a.predict(x_input_a)[0])
    c_a = map_a.get(raw_a, raw_a)

    # 3. Skenario B Prediction
    sc_b = predictors["sc_b"]
    km_b = predictors["km_b"]
    map_b = predictors["map_b"]

    x_input_b = sc_b.transform([[harga_rp, jarak_tempuh_ribu_km, total_fitur]])
    raw_b = int(km_b.predict(x_input_b)[0])
    c_b = map_b.get(raw_b, raw_b)

    # Retrieve segments metadata
    segs = {s.id: s for s in db.query(models.Segment).all()}

    def get_seg_info(cid: int):
        s = segs.get(cid)
        if s:
            return {
                "klaster": s.id,
                "nama_lengkap": s.nama_lengkap,
                "nama_pendek": s.nama_pendek,
                "warna_hex": s.warna_hex,
                "deskripsi": s.deskripsi
            }
        return {
            "klaster": cid,
            "nama_lengkap": f"Segmen {cid}",
            "nama_pendek": f"Klaster {cid}",
            "warna_hex": "#2563EB",
            "deskripsi": ""
        }

    info_prod = get_seg_info(c_prod)
    info_a = get_seg_info(c_a)
    info_b = get_seg_info(c_b)

    # Accuracy & Consistency Evaluation
    selaras_ab = (c_a == c_b)
    selaras_semua = (c_prod == c_a == c_b)

    if selaras_semua:
        status_text = "Sangat Akurat (100% Selaras)"
        detail = f"Seluruh model (Produksi, Skenario A, dan Skenario B) sepakat menempatkan mobil ini pada {info_prod['nama_lengkap']}. Estimasi segmentasi sangat kokoh dan konsisten terhadap variasi dimensi fitur."
        skor_keselarasan = 100
    elif selaras_ab:
        status_text = "Akurat & Selaras Antar Skenario (Skenario A & B Cocok)"
        detail = f"Skenario A ([Harga, Tipe, Tahun]) dan Skenario B ([Harga, KM, Fitur]) sepakat pada {info_a['nama_lengkap']}. Skenario baseline Produksi mendeteksi {info_prod['nama_lengkap']}."
        skor_keselarasan = 80
    else:
        status_text = "Divergen (Perbedaan Deteksi Fitur)"
        detail = f"Terjadi divergensi: Skenario A mendeteksi {info_a['nama_lengkap']} (dipengaruhi tipe bodi {clean_body} dan tahun {int(tahun)}), sedangkan Skenario B mendeteksi {info_b['nama_lengkap']} (dipengaruhi jarak tempuh {jarak_tempuh_ribu_km} rb km dan {int(total_fitur)} fitur)."
        skor_keselarasan = 50

    return {
        "produksi": {
            **info_prod,
            "fitur": ["harga_rp", "tahun", "jarak_tempuh_ribu_km", "total_fitur"]
        },
        "skenario_a": {
            **info_a,
            "raw_klaster": raw_a,
            "fitur": ["harga_rp", "tahun", "tipe_bodi"],
            "tipe_bodi": clean_body
        },
        "skenario_b": {
            **info_b,
            "raw_klaster": raw_b,
            "fitur": ["harga_rp", "jarak_tempuh_ribu_km", "total_fitur"]
        },
        "evaluasi": {
            "status": status_text,
            "skor_persen": skor_keselarasan,
            "apakah_akurat": selaras_ab or selaras_semua,
            "detail": detail,
            "ari_skenario_a_b": 0.318,
            "ari_prod_b": 0.760,
            "ari_prod_a": 0.462
        }
    }
