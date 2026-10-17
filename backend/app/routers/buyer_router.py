import math
import json
import statistics
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from ..db import get_db
from .. import models, schemas, ml_service, auth

router = APIRouter(prefix="/api", tags=["Pembeli"])

SLUG_TO_SEGMEN_ID = {
    "premium": 0,
    "keluarga-muda": 1,
    "ekonomis": 2
}
SEGMEN_ID_TO_SLUG = {
    0: "premium",
    1: "keluarga-muda",
    2: "ekonomis"
}


def _format_car_list_item(car: models.Car, segment_names: dict) -> dict:
    seg_info = segment_names.get(car.klaster, {})
    brand_name = car.car_model.brand.nama if car.car_model and car.car_model.brand else ""
    tipe_bodi_val = car.car_model.tipe_bodi if car.car_model else None
    slug = SEGMEN_ID_TO_SLUG.get(car.klaster, "premium")
    nama_pendek = seg_info.get("nama_pendek", "Premium" if car.klaster == 0 else "Keluarga Muda" if car.klaster == 1 else "Ekonomis")
    return {
        "id": car.id,
        "nama_mobil": car.nama_mobil,
        "merek": brand_name,
        "merk": brand_name,
        "model_mobil": car.car_model.nama if car.car_model else "",
        "tipe_bodi": tipe_bodi_val,
        "tahun": car.tahun,
        "jarak_tempuh_ribu_km": float(car.jarak_tempuh_ribu_km),
        "lokasi": car.lokasi,
        "transmisi": car.transmisi,
        "jenis_plat": car.jenis_plat,
        "tipe_plat": car.jenis_plat,
        "harga_rp": car.harga_rp,
        "cicilan_rp": car.cicilan_rp,
        "angsuran_bulanan_rp": car.cicilan_rp or 0,
        "total_fitur": car.total_fitur,
        "klaster": car.klaster,
        "segmen_id": car.klaster,
        "segmen_slug": slug,
        "slug": slug,
        "segmen_nama": nama_pendek,
        "nama_segmen": nama_pendek,
        "segmen_lengkap": seg_info.get("nama_lengkap", nama_pendek),
        "segmen_pendek": nama_pendek,
        "warna_hex": seg_info.get("warna_hex", "#2557D6"),
        "warna_segmen": seg_info.get("warna_hex", "#2557D6"),
        "status": car.status,
        "foto_url": car.foto_url,
        "foto_gallery": car.foto_gallery if isinstance(car.foto_gallery, list) else (json.loads(car.foto_gallery) if isinstance(car.foto_gallery, str) else [])
    }


@router.get("/segmen")
def get_segments(db: Session = Depends(get_db)):
    segments = db.query(models.Segment).order_by(models.Segment.id.asc()).all()
    stats = ml_service.stats_segmen(db)

    # Global stats
    total_cars = db.query(models.Car).filter(models.Car.status == "tayang").count()
    prices = [c[0] for c in db.query(models.Car.harga_rp).filter(models.Car.status == "tayang").order_by(models.Car.harga_rp.asc()).all()]
    harga_min = int(min(prices)) if prices else 77000000
    harga_max = int(max(prices)) if prices else 542000000
    harga_median = float(statistics.median(prices)) if prices else 177000000.0

    # Get silhouette_k3 from MLEvaluasiK
    eval_k3 = db.query(models.MLEvaluasiK).filter(models.MLEvaluasiK.k == 3).first()
    silhouette_k3 = float(eval_k3.silhouette) if eval_k3 else 0.3061

    # Segment with max count
    max_count = -1
    max_seg_id = 0
    for s in segments:
        st = stats.get(s.id, {})
        c = st.get("count", 0)
        if c > max_count:
            max_count = c
            max_seg_id = s.id

    segment_items = []
    for s in segments:
        st = stats.get(s.id, {})
        cnt = st.get("count", 0)
        share = float(st.get("share", 0.0))
        pct = round(share * 100, 1)

        # Top 3 models with count
        top_models_raw = db.query(
            models.CarModel.nama,
            func.count(models.Car.id).label("cnt")
        ).join(models.Car).filter(
            models.Car.status == "tayang",
            models.Car.klaster == s.id
        ).group_by(models.CarModel.nama).order_by(
            func.count(models.Car.id).desc()
        ).limit(3).all()
        model_teratas = [{"model": tm[0], "count": int(tm[1])} for tm in top_models_raw]

        slug = SEGMEN_ID_TO_SLUG.get(s.id, "premium")
        nama = s.nama_pendek or ("Premium" if s.id == 0 else "Keluarga Muda" if s.id == 1 else "Ekonomis")

        seg_data = {
            "id": s.id,
            "slug": slug,
            "nama": nama,
            "nama_lengkap": s.nama_lengkap,
            "nama_pendek": nama,
            "warna_hex": s.warna_hex,
            "deskripsi": s.deskripsi,
            "jumlah": cnt,
            "count": cnt,
            "persen": pct,
            "share": share,
            "median_harga": float(st.get("median_harga", 0)),
            "q1_harga": float(st.get("q1_harga", 0)),
            "q3_harga": float(st.get("q3_harga", 0)),
            "tahun_median": int(st.get("median_tahun", 2018)),
            "median_tahun": int(st.get("median_tahun", 2018)),
            "km_rata_rata_ribu": round(float(st.get("mean_km", 0)), 1),
            "mean_km": float(st.get("mean_km", 0)),
            "persen_matik": round(float(st.get("share_automatic", 0)) * 100, 1),
            "fitur_rata_rata": round(float(st.get("mean_total_fitur", 0)), 1),
            "mean_total_fitur": float(st.get("mean_total_fitur", 0)),
            "model_teratas": model_teratas,
            "top_3_model": model_teratas,
            "klaster": s.id,
            "terbesar": (s.id == max_seg_id),
            "stats": st
        }
        segment_items.append(seg_data)

    global_data = {
        "total": total_cars,
        "total_mobil": total_cars,
        "harga_min": harga_min,
        "harga_max": harga_max,
        "harga_median": harga_median,
        "silhouette_k3": silhouette_k3
    }

    return {
        "segmen": segment_items,
        "items": segment_items,
        "global": global_data,
        "total": total_cars,
        "total_mobil": total_cars,
        "harga_min": harga_min,
        "harga_max": harga_max,
        "harga_median": harga_median,
        "silhouette_k3": silhouette_k3
    }


@router.get("/segmen/ringkasan")
def get_segment_summary(db: Session = Depends(get_db)):
    segments = db.query(models.Segment).all()
    stats = ml_service.stats_segmen(db)

    result = []
    for s in segments:
        st = (stats.get(s.id) or {}) if stats else {}
        slug = SEGMEN_ID_TO_SLUG.get(s.id, "premium")
        result.append({
            "klaster": s.id,
            "id": s.id,
            "slug": slug,
            "nama_lengkap": s.nama_lengkap,
            "nama_pendek": s.nama_pendek,
            "warna_hex": s.warna_hex,
            "deskripsi": s.deskripsi,
            "count": st.get("count", 0),
            "share": float(st.get("share", 0.0)),
            "median_harga": float(st.get("median_harga", 0)),
            "median_tahun": int(st.get("median_tahun", 2018)),
            "mean_km": float(st.get("mean_km", 0)),
            "mean_total_fitur": float(st.get("mean_total_fitur", 0))
        })
    return result


@router.get("/segmen/sebaran")
def get_segment_scatter(db: Session = Depends(get_db)):
    cars = db.query(
        models.Car.id,
        models.Car.nama_mobil,
        models.Car.tahun,
        models.Car.harga_rp,
        models.Car.klaster
    ).filter(models.Car.status == "tayang").all()

    return [
        {
            "id": c.id,
            "nama_mobil": c.nama_mobil,
            "tahun": c.tahun,
            "harga_rp": c.harga_rp,
            "klaster": c.klaster
        }
        for c in cars
    ]


@router.get("/filter-opsi")
def get_filter_options(db: Session = Depends(get_db)):
    total_cars = db.query(models.Car).filter(models.Car.status == "tayang").count()

    # Models with brand and count
    models_query = db.query(
        models.CarModel.nama.label("model"),
        models.Brand.nama.label("brand"),
        func.count(models.Car.id).label("count")
    ).join(models.Car).join(models.Brand, models.CarModel.brand_id == models.Brand.id).filter(
        models.Car.status == "tayang"
    ).group_by(models.CarModel.nama, models.Brand.nama).order_by(func.count(models.Car.id).desc()).all()

    models_data = [
        {"model": m.model, "brand": m.brand, "count": int(m.count)}
        for m in models_query
    ]

    # Locations with counts grouped
    target_jakarta = ["Jakarta Barat", "Jakarta Pusat", "Jakarta Selatan", "Jakarta Timur", "Jakarta Utara"]
    target_others = ["Bekasi", "Bogor", "Depok", "Tangerang Selatan", "Bandung", "Surabaya", "Malang"]

    loc_counts_raw = dict(
        db.query(models.Car.lokasi, func.count(models.Car.id)).filter(
            models.Car.status == "tayang",
            models.Car.lokasi.isnot(None)
        ).group_by(models.Car.lokasi).all()
    )

    jakarta_group = [
        {"lokasi": loc, "count": loc_counts_raw.get(loc, 0), "group": "Jakarta"}
        for loc in target_jakarta
    ]
    others_group = [
        {"lokasi": loc, "count": loc_counts_raw.get(loc, 0), "group": "Luar Jakarta"}
        for loc in target_others
    ]

    # Transmisi counts
    trans_counts_raw = dict(
        db.query(models.Car.transmisi, func.count(models.Car.id)).filter(
            models.Car.status == "tayang"
        ).group_by(models.Car.transmisi).all()
    )
    transmisi_data = {
        "Automatic": trans_counts_raw.get("Automatic", 0),
        "Manual": trans_counts_raw.get("Manual", 0)
    }

    # Segment counts
    seg_counts_raw = dict(
        db.query(models.Car.klaster, func.count(models.Car.id)).filter(
            models.Car.status == "tayang"
        ).group_by(models.Car.klaster).all()
    )
    segments_db = db.query(models.Segment).order_by(models.Segment.id.asc()).all()
    segment_data = [
        {
            "id": s.id,
            "slug": SEGMEN_ID_TO_SLUG.get(s.id, "premium"),
            "nama": s.nama_pendek,
            "nama_lengkap": s.nama_lengkap,
            "count": seg_counts_raw.get(s.id, 0),
            "warna_hex": s.warna_hex
        }
        for s in segments_db
    ]

    # Price stats
    prices = [c[0] for c in db.query(models.Car.harga_rp).filter(models.Car.status == "tayang").order_by(models.Car.harga_rp.asc()).all()]
    harga_min = int(min(prices)) if prices else 50_000_000
    harga_max = int(max(prices)) if prices else 600_000_000
    harga_median = int(statistics.median(prices)) if prices else 177_000_000

    # Year stats
    years = [c[0] for c in db.query(models.Car.tahun).filter(models.Car.status == "tayang").all()]
    tahun_min = int(min(years)) if years else 2012
    tahun_max = int(max(years)) if years else 2024

    return {
        "total_stok": total_cars,
        "models": models_data,
        "car_models": [m.model for m in models_query],
        "brands": sorted(list({m.brand for m in models_query})),
        "lokasi": {
            "semua": total_cars,
            "jakarta": jakarta_group,
            "luar_jakarta": others_group,
            "all": jakarta_group + others_group
        },
        "locations": sorted(list(loc_counts_raw.keys())),
        "transmisi": transmisi_data,
        "transmissions": ["Automatic", "Manual"],
        "segmen": segment_data,
        "harga": {
            "min": harga_min,
            "max": harga_max,
            "median": harga_median
        },
        "tahun": {
            "min": tahun_min,
            "max": tahun_max
        },
        "price_range": {"min": harga_min, "max": harga_max},
        "year_range": {"min": tahun_min, "max": tahun_max}
    }


def _build_cari_query(
    db: Session,
    q: Optional[str] = None,
    merek: Optional[str] = None,
    merk: Optional[str] = None,
    model: Optional[str] = None,
    tipe_bodi: Optional[str] = None,
    tahun_min: Optional[int] = None,
    tahun_max: Optional[int] = None,
    harga_min: Optional[int] = None,
    harga_max: Optional[int] = None,
    km_max: Optional[float] = None,
    fitur_min: Optional[int] = None,
    transmisi: Optional[str] = None,
    lokasi: Optional[str] = None,
    jenis_plat: Optional[str] = None,
    segmen: Optional[str] = None,
    klaster: Optional[int] = None,
):
    query = db.query(models.Car).join(models.CarModel).join(models.Brand).filter(models.Car.status == "tayang")

    effective_merek = (merek or merk or "").strip()
    if effective_merek:
        query = query.filter(models.Brand.nama.ilike(f"%{effective_merek}%"))

    if q and q.strip():
        tokens = q.strip().split()
        for token in tokens:
            term = f"%{token}%"
            token_filter = or_(
                models.Car.nama_mobil.ilike(term),
                models.Brand.nama.ilike(term),
                models.CarModel.nama.ilike(term)
            )
            query = query.filter(token_filter)

    if model and model.strip():
        models_selected = [m.strip() for m in model.split(",") if m.strip()]
        if len(models_selected) == 1:
            query = query.filter(models.CarModel.nama.ilike(f"%{models_selected[0]}%"))
        elif len(models_selected) > 1:
            query = query.filter(or_(*[models.CarModel.nama.ilike(f"%{m}%") for m in models_selected]))

    if tipe_bodi and tipe_bodi.strip():
        query = query.filter(models.CarModel.tipe_bodi.ilike(tipe_bodi.strip()))

    if tahun_min is not None:
        query = query.filter(models.Car.tahun >= tahun_min)
    if tahun_max is not None:
        query = query.filter(models.Car.tahun <= tahun_max)

    if harga_min is not None:
        query = query.filter(models.Car.harga_rp >= harga_min)
    if harga_max is not None:
        query = query.filter(models.Car.harga_rp <= harga_max)

    if km_max is not None:
        query = query.filter(models.Car.jarak_tempuh_ribu_km <= km_max)

    if fitur_min is not None:
        query = query.filter(models.Car.total_fitur >= fitur_min)

    if transmisi and transmisi.strip():
        trans_list = [t.strip() for t in transmisi.split(",") if t.strip()]
        if len(trans_list) == 1:
            query = query.filter(models.Car.transmisi.ilike(trans_list[0]))
        elif len(trans_list) > 1:
            query = query.filter(or_(*[models.Car.transmisi.ilike(t) for t in trans_list]))

    if lokasi and lokasi.strip():
        loc_list = [l.strip() for l in lokasi.split(",") if l.strip()]
        if loc_list:
            query = query.filter(or_(*[models.Car.lokasi.ilike(f"%{l}%") for l in loc_list]))

    if jenis_plat and jenis_plat.strip():
        query = query.filter(models.Car.jenis_plat == jenis_plat.strip().lower())

    # Segment filter (can be slug or id, or comma-separated list of slugs/ids)
    target_seg_ids = []
    if segmen is not None:
        raw_segs = [s.strip().lower() for s in str(segmen).split(",") if s.strip()]
        for s in raw_segs:
            if s.isdigit():
                target_seg_ids.append(int(s))
            elif s in SLUG_TO_SEGMEN_ID:
                target_seg_ids.append(SLUG_TO_SEGMEN_ID[s])
    if klaster is not None:
        target_seg_ids.append(klaster)

    if target_seg_ids:
        query = query.filter(models.Car.klaster.in_(target_seg_ids))

    return query


@router.get("/cari/hitung")
def count_search_cars(
    q: Optional[str] = None,
    merek: Optional[str] = None,
    merk: Optional[str] = None,
    model: Optional[str] = None,
    tipe_bodi: Optional[str] = None,
    tahun_min: Optional[int] = None,
    tahun_max: Optional[int] = None,
    harga_min: Optional[int] = None,
    harga_max: Optional[int] = None,
    km_max: Optional[float] = None,
    fitur_min: Optional[int] = None,
    transmisi: Optional[str] = None,
    lokasi: Optional[str] = None,
    jenis_plat: Optional[str] = None,
    segmen: Optional[str] = None,
    klaster: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = _build_cari_query(
        db=db,
        q=q,
        merek=merek,
        merk=merk,
        model=model,
        tipe_bodi=tipe_bodi,
        tahun_min=tahun_min,
        tahun_max=tahun_max,
        harga_min=harga_min,
        harga_max=harga_max,
        km_max=km_max,
        fitur_min=fitur_min,
        transmisi=transmisi,
        lokasi=lokasi,
        jenis_plat=jenis_plat,
        segmen=segmen,
        klaster=klaster
    )
    return {"total": query.count()}


@router.post("/uji-komparasi-skenario")
def test_scenario_comparison(
    payload: schemas.UjiKomparasiSkenarioRequest,
    db: Session = Depends(get_db)
):
    return ml_service.prediksi_komparasi_skenario(
        harga_rp=payload.harga_rp,
        tahun=float(payload.tahun),
        jarak_tempuh_ribu_km=payload.jarak_tempuh_ribu_km,
        total_fitur=float(payload.total_fitur),
        tipe_bodi=payload.tipe_bodi,
        db=db
    )


@router.get("/cari")
def search_cars(
    q: Optional[str] = None,
    merek: Optional[str] = None,
    merk: Optional[str] = None,
    model: Optional[str] = None,
    tipe_bodi: Optional[str] = None,
    tahun_min: Optional[int] = None,
    tahun_max: Optional[int] = None,
    harga_min: Optional[int] = None,
    harga_max: Optional[int] = None,
    km_max: Optional[float] = None,
    fitur_min: Optional[int] = None,
    transmisi: Optional[str] = None,
    lokasi: Optional[str] = None,
    jenis_plat: Optional[str] = None,
    segmen: Optional[str] = None,
    klaster: Optional[int] = None,
    urut: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    effective_limit = page_size or limit or 12
    if effective_limit > 100:
        effective_limit = 100
    if effective_limit < 1:
        effective_limit = 12

    query = _build_cari_query(
        db=db,
        q=q,
        merek=merek,
        merk=merk,
        model=model,
        tipe_bodi=tipe_bodi,
        tahun_min=tahun_min,
        tahun_max=tahun_max,
        harga_min=harga_min,
        harga_max=harga_max,
        km_max=km_max,
        fitur_min=fitur_min,
        transmisi=transmisi,
        lokasi=lokasi,
        jenis_plat=jenis_plat,
        segmen=segmen,
        klaster=klaster
    )

    # Sorting
    effective_sort = urut or sort or "sesuai"
    mid_th, mid_hg = ml_service.preferensi_midpoint(tahun_min, tahun_max, harga_min, harga_max)

    if effective_sort in ("harga_asc", "termurah"):
        query = query.order_by(models.Car.harga_rp.asc(), models.Car.id.asc())
    elif effective_sort in ("harga_desc", "termahal"):
        query = query.order_by(models.Car.harga_rp.desc(), models.Car.id.asc())
    elif effective_sort in ("tahun_desc", "terbaru"):
        query = query.order_by(models.Car.tahun.desc(), models.Car.id.asc())
    elif effective_sort in ("km_asc", "km_terendah"):
        query = query.order_by(models.Car.jarak_tempuh_ribu_km.asc(), models.Car.id.asc())
    elif effective_sort == "sesuai":
        if mid_th is not None or mid_hg is not None:
            # Ascending squared z-distance to year and price midpoint
            th_diff = ((models.Car.tahun - mid_th) / ml_service.SCALE[0]) if mid_th is not None else 0
            hg_diff = ((models.Car.harga_rp - mid_hg) / ml_service.SCALE[2]) if mid_hg is not None else 0
            z_dist_sq = (th_diff * th_diff) + (hg_diff * hg_diff)
            query = query.order_by(z_dist_sq.asc(), models.Car.tahun.desc(), models.Car.id.asc())
        else:
            query = query.order_by(models.Car.tahun.desc(), models.Car.id.asc())
    else:
        query = query.order_by(models.Car.id.asc())

    total_exact = query.count()
    offset = (page - 1) * effective_limit
    cars_page = query.offset(offset).limit(effective_limit).all()

    # Pre-cache segment names
    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}
    stats = ml_service.stats_segmen(db)

    # Calculate matched segment using midpoint
    matched_seg_id = ml_service.segmen_cocok(mid_th, mid_hg)
    matched_seg_info = segments.get(matched_seg_id) if matched_seg_id is not None else None
    matched_seg_stats = stats.get(matched_seg_id, {}) if matched_seg_id is not None else {}

    # Recommendations fallback if results < 10
    rekomendasi_list = []
    if total_exact < 10 and matched_seg_id is not None:
        exact_ids = [c.id for c in cars_page]
        seg_cars = db.query(models.Car).join(models.CarModel).join(models.Brand).filter(
            models.Car.klaster == matched_seg_id,
            models.Car.status == "tayang"
        ).all()

        df_seg = pd.DataFrame([{
            "id": c.id,
            "tahun": c.tahun,
            "harga_rp": float(c.harga_rp),
            "car_obj": c
        } for c in seg_cars])

        rec_df = ml_service.rekomendasi(df_seg, mid_th, mid_hg, exclude_ids=exact_ids, n=10)
        for _, r in rec_df.iterrows():
            c_obj = r["car_obj"]
            rekomendasi_list.append(_format_car_list_item(c_obj, segments))

    formatted_items = [_format_car_list_item(c, segments) for c in cars_page]

    # Diagnosis when total == 0
    diagnosis = None
    if total_exact == 0:
        model_name = (model or "").strip()
        model_total = None
        model_tahun_ok = None
        model_harga_ok = None
        harga_termurah_model = None

        if model_name:
            # Model total
            q_m = db.query(models.Car).join(models.CarModel).filter(
                models.Car.status == "tayang",
                models.CarModel.nama.ilike(f"%{model_name}%")
            )
            model_total = q_m.count()

            # Model with year
            q_m_th = q_m
            if tahun_min is not None:
                q_m_th = q_m_th.filter(models.Car.tahun >= tahun_min)
            if tahun_max is not None:
                q_m_th = q_m_th.filter(models.Car.tahun <= tahun_max)
            model_tahun_ok = q_m_th.count()

            # Model with price
            q_m_hg = q_m
            if harga_min is not None:
                q_m_hg = q_m_hg.filter(models.Car.harga_rp >= harga_min)
            if harga_max is not None:
                q_m_hg = q_m_hg.filter(models.Car.harga_rp <= harga_max)
            model_harga_ok = q_m_hg.count()

            # Lowest price for this model
            min_p = db.query(func.min(models.Car.harga_rp)).join(models.CarModel).filter(
                models.Car.status == "tayang",
                models.CarModel.nama.ilike(f"%{model_name}%")
            ).scalar()
            harga_termurah_model = int(min_p) if min_p is not None else None

        # Build single-filter relaxations for saran
        saran_list = []

        # 1. Relax tahun
        if tahun_min is not None or tahun_max is not None:
            c_no_th = _build_cari_query(
                db=db, q=q, merek=merek, merk=merk, model=model, tipe_bodi=tipe_bodi,
                tahun_min=None, tahun_max=None,
                harga_min=harga_min, harga_max=harga_max, km_max=km_max, fitur_min=fitur_min,
                transmisi=transmisi, lokasi=lokasi, jenis_plat=jenis_plat, segmen=segmen, klaster=klaster
            ).count()
            if c_no_th > 0:
                p = {"model": model, "harga_min": harga_min, "harga_max": harga_max, "transmisi": transmisi, "lokasi": lokasi, "segmen": segmen}
                p = {k: v for k, v in p.items() if v is not None}
                saran_list.append({
                    "label": "Hapus batasan tahun",
                    "params": p,
                    "jumlah": c_no_th
                })

        # 2. Relax harga
        if harga_min is not None or harga_max is not None:
            c_no_hg = _build_cari_query(
                db=db, q=q, merek=merek, merk=merk, model=model, tipe_bodi=tipe_bodi,
                tahun_min=tahun_min, tahun_max=tahun_max,
                harga_min=None, harga_max=None, km_max=km_max, fitur_min=fitur_min,
                transmisi=transmisi, lokasi=lokasi, jenis_plat=jenis_plat, segmen=segmen, klaster=klaster
            ).count()
            if c_no_hg > 0:
                p = {"model": model, "tahun_min": tahun_min, "tahun_max": tahun_max, "transmisi": transmisi, "lokasi": lokasi, "segmen": segmen}
                p = {k: v for k, v in p.items() if v is not None}
                saran_list.append({
                    "label": "Hapus batasan harga",
                    "params": p,
                    "jumlah": c_no_hg
                })

        # 3. Relax model
        if model_name:
            c_no_model = _build_cari_query(
                db=db, q=q, merek=merek, merk=merk, model=None, tipe_bodi=tipe_bodi,
                tahun_min=tahun_min, tahun_max=tahun_max,
                harga_min=harga_min, harga_max=harga_max, km_max=km_max, fitur_min=fitur_min,
                transmisi=transmisi, lokasi=lokasi, jenis_plat=jenis_plat, segmen=segmen, klaster=klaster
            ).count()
            if c_no_model > 0:
                p = {"tahun_min": tahun_min, "tahun_max": tahun_max, "harga_min": harga_min, "harga_max": harga_max, "transmisi": transmisi, "lokasi": lokasi, "segmen": segmen}
                p = {k: v for k, v in p.items() if v is not None}
                saran_list.append({
                    "label": "Lihat model lain yang sesuai kriteria",
                    "params": p,
                    "jumlah": c_no_model
                })

        # 4. Relax transmisi
        if transmisi:
            c_no_tr = _build_cari_query(
                db=db, q=q, merek=merek, merk=merk, model=model, tipe_bodi=tipe_bodi,
                tahun_min=tahun_min, tahun_max=tahun_max,
                harga_min=harga_min, harga_max=harga_max, km_max=km_max, fitur_min=fitur_min,
                transmisi=None, lokasi=lokasi, jenis_plat=jenis_plat, segmen=segmen, klaster=klaster
            ).count()
            if c_no_tr > 0:
                p = {"model": model, "tahun_min": tahun_min, "tahun_max": tahun_max, "harga_min": harga_min, "harga_max": harga_max, "lokasi": lokasi, "segmen": segmen}
                p = {k: v for k, v in p.items() if v is not None}
                saran_list.append({
                    "label": "Semua transmisi",
                    "params": p,
                    "jumlah": c_no_tr
                })

        # 5. Relax lokasi
        if lokasi:
            c_no_loc = _build_cari_query(
                db=db, q=q, merek=merek, merk=merk, model=model, tipe_bodi=tipe_bodi,
                tahun_min=tahun_min, tahun_max=tahun_max,
                harga_min=harga_min, harga_max=harga_max, km_max=km_max, fitur_min=fitur_min,
                transmisi=transmisi, lokasi=None, jenis_plat=jenis_plat, segmen=segmen, klaster=klaster
            ).count()
            if c_no_loc > 0:
                p = {"model": model, "tahun_min": tahun_min, "tahun_max": tahun_max, "harga_min": harga_min, "harga_max": harga_max, "transmisi": transmisi, "segmen": segmen}
                p = {k: v for k, v in p.items() if v is not None}
                saran_list.append({
                    "label": "Semua lokasi",
                    "params": p,
                    "jumlah": c_no_loc
                })

        # Sort saran by jumlah descending
        saran_list.sort(key=lambda x: x["jumlah"], reverse=True)

        # If model_total is available, ensure "Lihat semua {model} ({n} unit)" is available
        if model_name and (model_total or 0) > 0:
            if not any(s["params"].get("model") == model_name and len(s["params"]) == 1 for s in saran_list):
                saran_list.append({
                    "label": f"Lihat semua {model_name} ({model_total} unit)",
                    "params": {"model": model_name},
                    "jumlah": model_total
                })

        diagnosis = {
            "model_total": model_total,
            "model_tahun_ok": model_tahun_ok,
            "model_harga_ok": model_harga_ok,
            "harga_termurah_model": harga_termurah_model,
            "saran": saran_list
        }

    seg_slug = SEGMEN_ID_TO_SLUG.get(matched_seg_id, "keluarga-muda") if matched_seg_id is not None else None
    seg_cocok_dict = {
        "id": matched_seg_id,
        "slug": seg_slug,
        "nama": matched_seg_info["nama_pendek"] if matched_seg_info else None,
        "nama_lengkap": matched_seg_info["nama_lengkap"] if matched_seg_info else None,
        "nama_pendek": matched_seg_info["nama_pendek"] if matched_seg_info else None,
        "warna_hex": matched_seg_info["warna_hex"] if matched_seg_info else None,
        "median_harga": float(matched_seg_stats.get("median_harga", 0)),
        "tahun_tipikal": int(matched_seg_stats.get("median_tahun", 2018)),
        "jumlah": int(matched_seg_stats.get("count", 0))
    } if matched_seg_info else None

    return {
        "hasil": formatted_items,
        "items": formatted_items,
        "total": total_exact,
        "page": page,
        "page_size": effective_limit,
        "limit": effective_limit,
        "total_pages": math.ceil(total_exact / effective_limit) if total_exact > 0 else 1,
        "segmen_cocok": seg_cocok_dict,
        "rekomendasi": rekomendasi_list,
        "rekomendasi_alternatif": rekomendasi_list,
        "diagnosis": diagnosis
    }


@router.get("/mobil/{car_id}")
def get_car_detail(car_id: int, db: Session = Depends(get_db)):
    car = db.query(models.Car).join(models.CarModel).join(models.Brand).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Mobil tidak ditemukan.")

    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}
    seg_info = segments.get(car.klaster, {})

    # Features
    all_features = db.query(models.Feature).all()
    active_feat_ids = {cf.feature_id for cf in car.features}

    features_out = []
    for f in all_features:
        features_out.append({
            "id": f.id,
            "kode": f.kode,
            "nama_id": f.nama_id,
            "aktif": f.id in active_feat_ids
        })

    # Segment price position (Q1, Median, Q3)
    pos_harga = ml_service.posisi_harga(db, car.klaster, float(car.harga_rp))

    # Credit simulation (annuity estimation 8% p.a.)
    pokok = float(car.harga_rp) * 0.8  # DP 20%
    bunga_tahunan = 0.08
    r_bulanan = bunga_tahunan / 12.0

    simulasi_cicilan = []
    for tahun in [1, 2, 3, 4, 5]:
        n_bulan = tahun * 12
        cicilan_per_bulan = pokok * (r_bulanan * (1 + r_bulanan) ** n_bulan) / ((1 + r_bulanan) ** n_bulan - 1)
        simulasi_cicilan.append({
            "tenor_tahun": tahun,
            "tenor_bulan": n_bulan,
            "dp_persen": 20,
            "dp_rp": int(float(car.harga_rp) * 0.2),
            "pokok_rp": int(pokok),
            "cicilan_per_bulan": int(round(cicilan_per_bulan)),
            "catatan": "Estimasi bunga anuitas 8% p.a. (Hanya simulasi contoh)"
        })

    # Similar cars from the same segment
    similar_cars_raw = ml_service.mobil_serupa(db, car, n=4)
    similar_cars = [_format_car_list_item(c, segments) for c in similar_cars_raw]

    brand_name = car.car_model.brand.nama if car.car_model and car.car_model.brand else ""
    monthly_est = car.cicilan_rp or (simulasi_cicilan[3]["cicilan_per_bulan"] if simulasi_cicilan else 0)

    return {
        "id": car.id,
        "nama_mobil": car.nama_mobil,
        "merek": brand_name,
        "merk": brand_name,
        "model_mobil": car.car_model.nama if car.car_model else "",
        "tahun": car.tahun,
        "jarak_tempuh_ribu_km": float(car.jarak_tempuh_ribu_km),
        "lokasi": car.lokasi,
        "transmisi": car.transmisi,
        "jenis_plat": car.jenis_plat,
        "tipe_plat": car.jenis_plat,
        "harga_rp": car.harga_rp,
        "cicilan_rp": car.cicilan_rp,
        "angsuran_bulanan_rp": monthly_est,
        "total_fitur": car.total_fitur,
        "klaster": car.klaster,
        "segmen_nama": seg_info.get("nama_lengkap", f"Klaster {car.klaster}"),
        "nama_segmen": seg_info.get("nama_lengkap", f"Klaster {car.klaster}"),
        "segmen_pendek": seg_info.get("nama_pendek", f"K{car.klaster}"),
        "warna_hex": seg_info.get("warna_hex", "#2557D6"),
        "warna_segmen": seg_info.get("warna_hex", "#2557D6"),
        "status": car.status,
        "foto_url": car.foto_url,
        "foto_gallery": car.foto_gallery if isinstance(car.foto_gallery, list) else (json.loads(car.foto_gallery) if isinstance(car.foto_gallery, str) else []),
        "features": features_out,
        "fitur_list": [f["nama_id"] for f in features_out if f["aktif"]],
        "posisi_harga": pos_harga,
        "simulasi_cicilan": simulasi_cicilan,
        "mobil_serupa": similar_cars
    }


@router.get("/rekomendasi/beranda")
def get_homepage_recommendations(
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}

    # Check if user is logged in and has view history
    if current_user:
        last_view = db.query(models.ViewHistory).filter(
            models.ViewHistory.user_id == current_user.id
        ).order_by(models.ViewHistory.viewed_at.desc()).first()

        if last_view and last_view.car:
            last_car = last_view.car
            seg_info = segments.get(last_car.klaster, {})
            seg_name = seg_info.get("nama_pendek", f"Segmen {last_car.klaster}")
            judul = "Mirip dengan yang kamu lihat"
            keterangan = f"Dipilih dari segmen yang sama dengan {last_car.nama_mobil} ({seg_name})"

            seg_cars = db.query(models.Car).join(models.CarModel).join(models.Brand).filter(
                models.Car.klaster == last_car.klaster,
                models.Car.status == "tayang",
                models.Car.id != last_car.id
            ).all()

            df_seg = pd.DataFrame([{
                "id": c.id,
                "tahun": c.tahun,
                "harga_rp": float(c.harga_rp),
                "car_obj": c
            } for c in seg_cars])

            rec_df = ml_service.rekomendasi(
                df_seg,
                float(last_car.tahun),
                float(last_car.harga_rp),
                exclude_ids=[],
                n=8
            )
            items = [_format_car_list_item(r["car_obj"], segments) for _, r in rec_df.iterrows()]
            return {
                "judul": judul,
                "keterangan": keterangan,
                "items": items
            }

    # Guest / Default
    judul = "Pilihan dari tiap segmen"
    keterangan = "Pilihan mobil yang mewakili karakteristik tiap segmen pasar."
    stats = ml_service.stats_segmen(db)

    items = []
    for k in [0, 1, 2]:
        st = stats.get(k, {})
        med_th = float(st.get("median_tahun", 2018))
        med_hg = float(st.get("median_harga", 150000000))

        seg_cars = db.query(models.Car).join(models.CarModel).join(models.Brand).filter(
            models.Car.klaster == k,
            models.Car.status == "tayang"
        ).all()

        df_k = pd.DataFrame([{
            "id": c.id,
            "tahun": c.tahun,
            "harga_rp": float(c.harga_rp),
            "car_obj": c
        } for c in seg_cars])

        rec_k = ml_service.rekomendasi(df_k, med_th, med_hg, exclude_ids=[], n=3)
        for _, r in rec_k.iterrows():
            items.append(_format_car_list_item(r["car_obj"], segments))

    return {
        "judul": judul,
        "keterangan": keterangan,
        "items": items
    }


@router.get("/favorit")
def get_favorites(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    favs = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).order_by(models.Favorite.created_at.desc()).all()
    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}
    items = [_format_car_list_item(f.car, segments) for f in favs if f.car]
    return {
        "items": items,
        "count": len(items)
    }


@router.post("/favorit")
def add_favorite(
    payload: schemas.FavoriteIn,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    car = db.query(models.Car).filter(models.Car.id == payload.car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Mobil tidak ditemukan.")

    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.car_id == payload.car_id
    ).first()

    if not existing:
        fav = models.Favorite(user_id=current_user.id, car_id=payload.car_id)
        db.add(fav)
        db.commit()

    return {"status": "success", "favorited": True, "car_id": payload.car_id}


@router.delete("/favorit/{car_id}")
def remove_favorite(
    car_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.car_id == car_id
    ).first()

    if fav:
        db.delete(fav)
        db.commit()

    return {"status": "success", "favorited": False, "car_id": car_id}


@router.post("/preferensi")
def save_preferences(pref_in: schemas.BuyerPreference, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    mid_th, mid_hg = ml_service.preferensi_midpoint(
        pref_in.tahun_min, None, pref_in.harga_min, pref_in.harga_max
    )
    seg_cocok = ml_service.segmen_cocok(mid_th, mid_hg)

    current_user.pref_tahun_min = pref_in.tahun_min
    current_user.pref_harga_min = pref_in.harga_min
    current_user.pref_harga_max = pref_in.harga_max
    if seg_cocok is not None:
        current_user.segmen_awal_id = seg_cocok

    db.commit()

    seg = db.query(models.Segment).filter(models.Segment.id == seg_cocok).first() if seg_cocok is not None else None
    return {
        "status": "success",
        "segmen_cocok_id": seg_cocok,
        "segmen_nama": seg.nama_lengkap if seg else None,
        "segmen_pendek": seg.nama_pendek if seg else None
    }


@router.post("/test-drive")
def book_test_drive(
    td_in: schemas.TestDriveCreate,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    target_car_id = td_in.car_id or td_in.mobil_id
    if not target_car_id:
        raise HTTPException(status_code=400, detail="ID mobil diperlukan.")

    car = db.query(models.Car).filter(models.Car.id == target_car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Mobil tidak ditemukan.")

    user_id = current_user.id if current_user else None
    if not user_id:
        default_buyer = db.query(models.User).filter(models.User.email == "buyer@cekgarasi.test").first()
        user_id = default_buyer.id if default_buyer else 2

    # Parse date and time if string
    booking_date = td_in.tanggal
    if not booking_date and td_in.tanggal_booking:
        try:
            booking_date = datetime.strptime(td_in.tanggal_booking.strip(), "%Y-%m-%d").date()
        except Exception:
            booking_date = datetime.utcnow().date()
    elif not booking_date:
        booking_date = datetime.utcnow().date()

    booking_time = td_in.jam
    if not booking_time and td_in.jam_booking:
        try:
            booking_time = datetime.strptime(td_in.jam_booking.strip(), "%H:%M").time()
        except Exception:
            booking_time = datetime.strptime("10:00", "%H:%M").time()
    elif not booking_time:
        booking_time = datetime.strptime("10:00", "%H:%M").time()

    # Generate unique test drive booking code TD-YYYYMM-XXXX
    now = datetime.utcnow()
    count_today = db.query(models.TestDrive).count() + 1
    kode = f"TD-{now.strftime('%Y%m')}-{count_today:04d}"

    catatan_full = td_in.catatan or ""
    if td_in.nama_pemesan or td_in.no_telepon:
        catatan_full = f"[Pemesan: {td_in.nama_pemesan or '-'} / {td_in.no_telepon or '-'}] {catatan_full}".strip()

    booking = models.TestDrive(
        kode=kode,
        user_id=user_id,
        car_id=target_car_id,
        tanggal=booking_date,
        jam=booking_time,
        cabang=td_in.cabang or "Jakarta Pusat",
        catatan=catatan_full,
        status="menunggu"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {
        "status": "success",
        "id": booking.id,
        "kode": booking.kode,
        "kode_booking": booking.kode,
        "message": "Jadwal test drive berhasil dibuat."
    }


@router.get("/test-drive/{kode}")
def get_test_drive_by_code(kode: str, db: Session = Depends(get_db)):
    booking = db.query(models.TestDrive).filter(models.TestDrive.kode == kode).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Jadwal test drive tidak ditemukan.")

    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}
    car_formatted = _format_car_list_item(booking.car, segments) if booking.car else None

    # Similar recommendations in the same segment
    similar = []
    if booking.car:
        similar_raw = ml_service.mobil_serupa(db, booking.car, n=4)
        similar = [_format_car_list_item(c, segments) for c in similar_raw]

    return {
        "id": booking.id,
        "kode": booking.kode,
        "tanggal": str(booking.tanggal),
        "jam": str(booking.jam),
        "cabang": booking.cabang,
        "catatan": booking.catatan,
        "status": booking.status,
        "created_at": str(booking.created_at),
        "mobil": car_formatted,
        "pembeli": {
            "nama": booking.user.nama if booking.user else "",
            "email": booking.user.email if booking.user else "",
            "no_hp": booking.user.no_hp if booking.user else ""
        },
        "mobil_serupa": similar
    }
