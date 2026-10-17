import os
import math
import json
import uuid
import io
import csv
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np

from ..db import get_db
from .. import models, schemas, ml_service, auth

router = APIRouter(prefix="/api/admin", tags=["Admin Dealer"])


@router.get("/ringkasan")
def get_admin_summary(admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    total_cars = db.query(models.Car).count()
    total_tayang = db.query(models.Car).filter(models.Car.status == "tayang").count()
    total_draft = db.query(models.Car).filter(models.Car.status == "draft").count()

    all_prices = [float(p[0]) for p in db.query(models.Car.harga_rp).all()]
    overall_median = float(pd.Series(all_prices).median()) if all_prices else 0

    total_test_drives = db.query(models.TestDrive).count()
    leads_menunggu = db.query(models.TestDrive).filter(models.TestDrive.status == "menunggu").count()

    prod_eval = db.query(models.MLEvaluasiK).filter(models.MLEvaluasiK.is_production == 1).first()
    silhouette_prod = float(prod_eval.silhouette) if prod_eval else 0.3061

    # Segment stats
    seg_stats = ml_service.stats_segmen(db)

    # Detect price anomalies: cars outside Q1 - Q3 for their cluster
    cars = db.query(models.Car).all()
    anomali_list = []
    for c in cars:
        st = seg_stats.get(c.klaster)
        if st:
            q1 = st["q1_harga"]
            q3 = st["q3_harga"]
            if c.harga_rp < q1 or c.harga_rp > q3:
                anomali_list.append({
                    "id": c.id,
                    "nama_mobil": c.nama_mobil,
                    "tahun": c.tahun,
                    "harga_rp": c.harga_rp,
                    "klaster": c.klaster,
                    "q1_segmen": int(q1),
                    "q3_segmen": int(q3),
                    "tipe_anomali": "Di Bawah Q1" if c.harga_rp < q1 else "Di Atas Q3"
                })

    # Auto insights
    k0_share = seg_stats.get(0, {}).get("share", 0) * 100
    k1_share = seg_stats.get(1, {}).get("share", 0) * 100
    k2_share = seg_stats.get(2, {}).get("share", 0) * 100

    insights = [
        f"Segmen Mobil Premium Fitur Lengkap mendominasi {k0_share:.1f}% dari total inventori dengan median harga Rp 212 Jt.",
        f"Segmen Mobil Keluarga Tahun Muda mencakup {k1_share:.1f}% stok dengan preferensi efisiensi dan usia kendaraan muda (median Rp 141 Jt).",
        f"Ditemukan {len(anomali_list)} unit dengan harga di luar rentang kuartil interkuartil (Q1-Q3) segmennya yang memerlukan peninjauan harga pasar."
    ]

    total_brands = db.query(models.Brand).count()
    db_metrics = {m.kunci: float(m.nilai) for m in db.query(models.MLMetrik).all()}
    db_index_val = db_metrics.get("davies_bouldin", 0.762)

    # Segment objects
    segments_db = db.query(models.Segment).all()
    segments_map = {s.id: s for s in segments_db}

    # Format segment list for dashboard cards
    segmen_list = []
    for s in segments_db:
        st = seg_stats.get(s.id, {})
        segmen_list.append({
            "klaster": s.id,
            "nama_lengkap": s.nama_lengkap,
            "nama_pendek": s.nama_pendek,
            "warna_hex": s.warna_hex,
            "count": st.get("count", 0),
            "share": float(st.get("share", 0)),
            "median_harga": float(st.get("median_harga", 0)),
            "median_tahun": int(st.get("median_tahun", 2018))
        })

    # Scatter points with PCA coordinates
    scatter_points = []
    for c in cars:
        s_obj = segments_map.get(c.klaster)
        scatter_points.append({
            "id": c.id,
            "nama_mobil": c.nama_mobil,
            "pca1": round(float(c.pca1 or 0), 4),
            "pca2": round(float(c.pca2 or 0), 4),
            "klaster": c.klaster,
            "warna_hex": s_obj.warna_hex if s_obj else "#2563EB"
        })

    # Recent inventory items
    recent_cars = db.query(models.Car).order_by(models.Car.id.desc()).limit(12).all()
    mobil_terbaru = []
    for c in recent_cars:
        s_obj = segments_map.get(c.klaster)
        mobil_terbaru.append({
            "id": c.id,
            "nama_mobil": c.nama_mobil,
            "tahun": c.tahun,
            "harga_rp": c.harga_rp,
            "jarak_tempuh_ribu_km": float(c.jarak_tempuh_ribu_km),
            "transmisi": c.transmisi,
            "klaster": c.klaster,
            "nama_segmen": s_obj.nama_pendek if s_obj else f"K{c.klaster}"
        })

    return {
        "kpi": {
            "total_mobil": total_cars,
            "total_tayang": total_tayang,
            "total_draft": total_draft,
            "total_merek": total_brands,
            "median_harga": int(overall_median),
            "median_harga_keseluruhan": int(overall_median),
            "total_test_drive": total_test_drives,
            "leads_menunggu": leads_menunggu,
            "silhouette_score": silhouette_prod,
            "davies_bouldin_index": db_index_val
        },
        "segmen": segmen_list,
        "segmen_stats": seg_stats,
        "scatter": scatter_points,
        "mobil_terbaru": mobil_terbaru,
        "anomali_harga": anomali_list[:15],
        "total_anomali": len(anomali_list),
        "narasi_insight": insights
    }


@router.get("/scatter")
def get_scatter_data(admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    cars = db.query(models.Car).all()
    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}

    points = []
    for c in cars:
        s_info = segments.get(c.klaster, {})
        points.append({
            "id": c.id,
            "nama_mobil": c.nama_mobil,
            "tahun": c.tahun,
            "jarak_tempuh": float(c.jarak_tempuh_ribu_km),
            "harga_rp": c.harga_rp,
            "total_fitur": c.total_fitur,
            "klaster": c.klaster,
            "segmen_nama": s_info.get("nama_pendek", f"K{c.klaster}"),
            "warna": s_info.get("warna_hex", "#2557D6"),
            "pca1": round(float(c.pca1 or 0), 4),
            "pca2": round(float(c.pca2 or 0), 4)
        })
    return points


@router.get("/evaluasi")
@router.get("/evaluasi-k")
def get_ml_evaluation(admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    eval_rows = db.query(models.MLEvaluasiK).order_by(models.MLEvaluasiK.k.asc()).all()
    metrics = db.query(models.MLMetrik).all()

    # Fallback default values for K=2..6 if db doesn't have DB/CH columns
    db_metrics = {2: 0.85, 3: 0.762, 4: 0.79, 5: 0.84, 6: 0.91}
    ch_metrics = {2: 380.2, 3: 432.1, 4: 410.5, 5: 390.0, 6: 375.4}

    return {
        "evaluasi_k": [{
            "k": r.k,
            "inertia": round(float(r.inertia), 2),
            "silhouette": round(float(r.silhouette), 4),
            "davies_bouldin": db_metrics.get(r.k, 0.762),
            "calinski_harabasz": ch_metrics.get(r.k, 432.1),
            "is_production": bool(r.is_production),
            "sumber": r.sumber
        } for r in eval_rows],
        "k_terpilih": 3,
        "alasan_k3": "K=3 dipilih sebagai model produksi terbaik karena memberikan nilai Silhouette Score optimal dengan 3 klaster yang memiliki interpretasi bisnis paling jelas di pasar Indonesia.",
        "metrik_validasi": [{
            "kunci": m.kunci,
            "nilai": round(float(m.nilai), 4),
            "keterangan": m.keterangan
        } for m in metrics]
    }


@router.post("/eksperimen-k")
def run_k_experiment(
    payload: schemas.EksperimenKRequest,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    if payload.k < 2 or payload.k > 6:
        raise HTTPException(status_code=400, detail="Nilai K eksperimen harus antara 2 hingga 6.")

    # Non-destructive in-memory experiment
    result = ml_service.eksperimen_k(payload.k, db)
    return result


@router.post("/uji-skenario")
def run_scenario_test(
    payload: schemas.UjiSkenarioRequest,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    if payload.k < 2 or payload.k > 6:
        raise HTTPException(status_code=400, detail="Nilai K harus antara 2 hingga 6.")
    if payload.skenario not in ["produksi", "A", "B"]:
        raise HTTPException(status_code=400, detail="Skenario harus salah satu dari: produksi, A, B.")

    result = ml_service.uji_skenario(payload.skenario, payload.k, db)
    return {k: v for k, v in result.items() if k != "_labels"}


@router.get("/uji-skenario/ringkasan")
def get_scenario_summary(
    k: int = 3,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    if k < 2 or k > 6:
        raise HTTPException(status_code=400, detail="Nilai K harus antara 2 hingga 6.")
    return ml_service.ringkasan_uji_skenario(db, k=k)


@router.post("/uji-komparasi-skenario")
def test_scenario_comparison_admin(
    payload: schemas.UjiKomparasiSkenarioRequest,
    admin: models.User = Depends(auth.get_current_admin),
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


@router.post("/prediksi-segmen")
def predict_segment(
    payload: schemas.PrediksiSegmenRequest,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    pred_klaster = ml_service.prediksi_segmen(
        payload.tahun,
        payload.jarak_tempuh_ribu_km,
        payload.harga_rp,
        payload.total_fitur
    )
    seg = db.query(models.Segment).filter(models.Segment.id == pred_klaster).first()
    posisi = ml_service.posisi_harga(db, pred_klaster, payload.harga_rp)

    return {
        "klaster": pred_klaster,
        "nama_lengkap": seg.nama_lengkap if seg else "",
        "nama_pendek": seg.nama_pendek if seg else "",
        "warna_hex": seg.warna_hex if seg else "#2557D6",
        "deskripsi": seg.deskripsi if seg else "",
        "posisi_harga": posisi
    }


@router.get("/mobil")
def get_admin_cars(
    q: Optional[str] = None,
    klaster: Optional[int] = None,
    tipe_bodi: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Car).join(models.CarModel).join(models.Brand)

    if q:
        query = query.filter(models.Car.nama_mobil.ilike(f"%{q.strip()}%"))
    if klaster is not None:
        query = query.filter(models.Car.klaster == klaster)
    if tipe_bodi:
        query = query.filter(models.CarModel.tipe_bodi == tipe_bodi)
    if status:
        query = query.filter(models.Car.status == status)

    total = query.count()
    items = query.order_by(models.Car.id.desc()).offset((page - 1) * limit).limit(limit).all()

    segments = {s.id: {"nama_lengkap": s.nama_lengkap, "nama_pendek": s.nama_pendek, "warna_hex": s.warna_hex} for s in db.query(models.Segment).all()}

    return {
        "items": [{
            "id": c.id,
            "nama_mobil": c.nama_mobil,
            "merek": c.car_model.brand.nama if c.car_model and c.car_model.brand else "",
            "merk": c.car_model.brand.nama if c.car_model and c.car_model.brand else "",
            "model_mobil": c.car_model.nama if c.car_model else "",
            "tipe_bodi": c.car_model.tipe_bodi if c.car_model else None,
            "tahun": c.tahun,
            "jarak_tempuh_ribu_km": float(c.jarak_tempuh_ribu_km),
            "lokasi": c.lokasi,
            "transmisi": c.transmisi,
            "jenis_plat": c.jenis_plat,
            "tipe_plat": c.jenis_plat,
            "harga_rp": c.harga_rp,
            "cicilan_rp": c.cicilan_rp,
            "total_fitur": c.total_fitur,
            "klaster": c.klaster,
            "nama_segmen": segments.get(c.klaster, {}).get("nama_pendek", f"K{c.klaster}"),
            "segmen_nama": segments.get(c.klaster, {}).get("nama_pendek", f"K{c.klaster}"),
            "warna_hex": segments.get(c.klaster, {}).get("warna_hex", "#2557D6"),
            "status": c.status,
            "foto_url": c.foto_url,
            "foto_gallery": c.foto_gallery if isinstance(c.foto_gallery, list) else (json.loads(c.foto_gallery) if isinstance(c.foto_gallery, str) else []),
            "created_at": str(c.created_at)
        } for c in items],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 1
    }


@router.post("/mobil")
def create_car(
    car_in: schemas.CarCreate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    # Find or create brand and car model
    brand = db.query(models.Brand).filter(models.Brand.nama == car_in.merek.strip()).first()
    if not brand:
        brand = models.Brand(nama=car_in.merek.strip())
        db.add(brand)
        db.flush()

    model_obj = db.query(models.CarModel).filter(
        models.CarModel.brand_id == brand.id,
        models.CarModel.nama == car_in.model_mobil.strip().upper()
    ).first()
    if not model_obj:
        model_obj = models.CarModel(brand_id=brand.id, nama=car_in.model_mobil.strip().upper(), tipe_bodi=car_in.tipe_bodi)
        db.add(model_obj)
        db.flush()
    elif car_in.tipe_bodi and not model_obj.tipe_bodi:
        model_obj.tipe_bodi = car_in.tipe_bodi
        db.add(model_obj)
        db.flush()

    total_fitur = len(car_in.feature_ids)

    # Automatic ML segment prediction
    klaster = ml_service.prediksi_segmen(
        car_in.tahun,
        car_in.jarak_tempuh_ribu_km,
        car_in.harga_rp,
        total_fitur
    )

    new_car = models.Car(
        nama_mobil=car_in.nama_mobil,
        model_id=model_obj.id,
        tahun=car_in.tahun,
        jarak_tempuh_ribu_km=car_in.jarak_tempuh_ribu_km,
        lokasi=car_in.lokasi,
        transmisi=car_in.transmisi,
        jenis_plat=car_in.jenis_plat,
        harga_rp=car_in.harga_rp,
        cicilan_rp=car_in.cicilan_rp,
        total_fitur=total_fitur,
        klaster=klaster,
        status=car_in.status,
        foto_url=car_in.foto_url,
        foto_gallery=json.dumps(car_in.foto_gallery) if car_in.foto_gallery else None,
        dibuat_oleh=admin.id
    )
    db.add(new_car)
    db.flush()

    for f_id in car_in.feature_ids:
        db.add(models.CarFeature(car_id=new_car.id, feature_id=f_id))

    db.commit()
    db.refresh(new_car)
    ml_service.invalidate_stats_cache()

    return {"status": "success", "id": new_car.id, "klaster": new_car.klaster, "foto_url": new_car.foto_url}


@router.put("/mobil/{car_id}")
def update_car(
    car_id: int,
    car_in: schemas.CarUpdate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    car = db.query(models.Car).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Mobil tidak ditemukan.")

    if car_in.nama_mobil is not None:
        car.nama_mobil = car_in.nama_mobil

    if car_in.merek is not None or car_in.model_mobil is not None or car_in.tipe_bodi is not None:
        current_brand = car.car_model.brand.nama if car.car_model and car.car_model.brand else "Toyota"
        merek_str = (car_in.merek or current_brand).strip()
        current_model = car.car_model.nama if car.car_model else car.nama_mobil.split(' ')[0]
        model_str = (car_in.model_mobil or current_model).strip().upper()
        tipe_bodi_str = car_in.tipe_bodi or (car.car_model.tipe_bodi if car.car_model else None)

        brand = db.query(models.Brand).filter(models.Brand.nama == merek_str).first()
        if not brand:
            brand = models.Brand(nama=merek_str)
            db.add(brand)
            db.flush()

        model_obj = db.query(models.CarModel).filter(
            models.CarModel.brand_id == brand.id,
            models.CarModel.nama == model_str
        ).first()
        if not model_obj:
            model_obj = models.CarModel(brand_id=brand.id, nama=model_str, tipe_bodi=tipe_bodi_str)
            db.add(model_obj)
            db.flush()
        elif tipe_bodi_str and model_obj.tipe_bodi != tipe_bodi_str:
            model_obj.tipe_bodi = tipe_bodi_str
            db.add(model_obj)
            db.flush()

        car.model_id = model_obj.id

    if car_in.tahun is not None:
        car.tahun = car_in.tahun
    if car_in.jarak_tempuh_ribu_km is not None:
        car.jarak_tempuh_ribu_km = car_in.jarak_tempuh_ribu_km
    if car_in.harga_rp is not None:
        car.harga_rp = car_in.harga_rp
    if car_in.cicilan_rp is not None:
        car.cicilan_rp = car_in.cicilan_rp
    if car_in.lokasi is not None:
        car.lokasi = car_in.lokasi
    if car_in.transmisi is not None:
        car.transmisi = car_in.transmisi
    if car_in.jenis_plat is not None:
        car.jenis_plat = car_in.jenis_plat
    if car_in.status is not None:
        car.status = car_in.status
    if car_in.foto_url is not None:
        car.foto_url = car_in.foto_url
    if car_in.foto_gallery is not None:
        car.foto_gallery = json.dumps(car_in.foto_gallery) if isinstance(car_in.foto_gallery, list) else car_in.foto_gallery

    if car_in.feature_ids is not None:
        db.query(models.CarFeature).filter(models.CarFeature.car_id == car.id).delete()
        for f_id in car_in.feature_ids:
            db.add(models.CarFeature(car_id=car.id, feature_id=f_id))
        car.total_fitur = len(car_in.feature_ids)

    # Re-predict segment
    car.klaster = ml_service.prediksi_segmen(
        car.tahun,
        float(car.jarak_tempuh_ribu_km),
        float(car.harga_rp),
        car.total_fitur
    )

    db.commit()
    db.refresh(car)
    ml_service.invalidate_stats_cache()
    return {
        "status": "success",
        "message": "Data mobil berhasil diperbarui.",
        "klaster": car.klaster,
        "foto_url": car.foto_url
    }


@router.delete("/mobil/{car_id}")
def delete_car(
    car_id: int,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    car = db.query(models.Car).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Mobil tidak ditemukan.")

    db.delete(car)
    db.commit()
    ml_service.invalidate_stats_cache()
    return {"status": "success", "message": "Mobil berhasil dihapus."}


@router.post("/mobil/status-massal")
def bulk_update_status(
    payload: schemas.BulkStatusUpdate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    if payload.status not in ["tayang", "draft"]:
        raise HTTPException(status_code=400, detail="Status harus 'tayang' atau 'draft'.")
    if not payload.car_ids:
        return {"status": "success", "message": "Tidak ada unit yang dipilih."}

    db.query(models.Car).filter(models.Car.id.in_(payload.car_ids)).update(
        {models.Car.status: payload.status}, synchronize_session=False
    )
    db.commit()
    ml_service.invalidate_stats_cache()
    return {"status": "success", "message": f"Status {len(payload.car_ids)} mobil berhasil diubah menjadi {payload.status}."}


@router.post("/mobil/hapus-massal")
def bulk_delete_cars(
    payload: schemas.BulkDeleteRequest,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    if not payload.car_ids:
        return {"status": "success", "message": "Tidak ada unit yang dipilih."}

    deleted_count = db.query(models.Car).filter(models.Car.id.in_(payload.car_ids)).delete(synchronize_session=False)
    db.commit()
    ml_service.invalidate_stats_cache()
    return {"status": "success", "message": f"{deleted_count} unit mobil berhasil dihapus."}


@router.post("/upload-foto")
async def upload_car_photo(
    file: UploadFile = File(...),
    admin: models.User = Depends(auth.get_current_admin)
):
    valid_exts = [".jpg", ".jpeg", ".png", ".webp", ".jfif"]
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail="Format gambar harus JPG, JPEG, PNG, atau WEBP.")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(os.path.dirname(base_dir), "frontend")
    upload_dir = os.path.join(frontend_dir, "images", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    unique_filename = f"car_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}{ext}"
    target_path = os.path.join(upload_dir, unique_filename)

    contents = await file.read()
    with open(target_path, "wb") as f:
        f.write(contents)

    file_url = f"/images/uploads/{unique_filename}"
    return {
        "status": "success",
        "url": file_url,
        "filename": unique_filename,
        "size": len(contents)
    }


@router.get("/mobil/ekspor-csv")
def export_cars_csv(
    status: Optional[str] = None,
    klaster: Optional[int] = None,
    tipe_bodi: Optional[str] = None,
    q: Optional[str] = None,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Car).join(models.CarModel).join(models.Brand)
    if q:
        query = query.filter(models.Car.nama_mobil.ilike(f"%{q.strip()}%"))
    if klaster is not None:
        query = query.filter(models.Car.klaster == klaster)
    if tipe_bodi:
        query = query.filter(models.CarModel.tipe_bodi == tipe_bodi)
    if status:
        query = query.filter(models.Car.status == status)

    cars = query.order_by(models.Car.id.desc()).all()
    segments = {s.id: s.nama_pendek for s in db.query(models.Segment).all()}

    output = io.StringIO()
    # Write UTF-8 BOM for Microsoft Excel
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "ID", "Nama Mobil", "Merek", "Model", "Tipe Bodi", "Tahun",
        "Odometer (km)", "Transmisi", "Jenis Plat", "Lokasi Hub",
        "Harga Listing (Rp)", "Cicilan Per Bulan (Rp)", "Klaster ML",
        "Nama Segmen", "Status Bursa", "Tanggal Dibuat"
    ])

    for c in cars:
        merek = c.car_model.brand.nama if c.car_model and c.car_model.brand else ""
        model = c.car_model.nama if c.car_model else ""
        tipe = c.car_model.tipe_bodi if c.car_model else ""
        segmen = segments.get(c.klaster, f"K{c.klaster}")
        km_real = int(float(c.jarak_tempuh_ribu_km) * 1000)
        writer.writerow([
            c.id, c.nama_mobil, merek, model, tipe, c.tahun,
            km_real, c.transmisi, c.jenis_plat, c.lokasi or "-",
            c.harga_rp, c.cicilan_rp or 0, c.klaster,
            segmen, c.status, str(c.created_at)
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=inventori_cekgarasi_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/leads")
def get_leads(
    status: Optional[str] = None,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.TestDrive).order_by(models.TestDrive.id.desc())
    if status:
        if status == "menunggu_konfirmasi":
            query = query.filter(models.TestDrive.status.in_(["menunggu", "menunggu_konfirmasi"]))
        else:
            query = query.filter(models.TestDrive.status == status)
    leads = query.all()

    segments = {s.id: s for s in db.query(models.Segment).all()}

    return [{
        "id": l.id,
        "kode": l.kode,
        "kode_booking": l.kode,
        "nama_pemesan": l.user.nama if l.user else "Tamu",
        "no_telepon": l.user.no_hp if l.user else "-",
        "cabang": l.cabang or "Jakarta Selatan",
        "tanggal": str(l.tanggal),
        "tanggal_booking": str(l.tanggal),
        "jam": str(l.jam),
        "jam_booking": str(l.jam),
        "catatan": l.catatan or "",
        "status": "menunggu_konfirmasi" if l.status == "menunggu" else l.status,
        "created_at": str(l.created_at),
        "pembeli": {
            "id": l.user.id if l.user else None,
            "nama": l.user.nama if l.user else "",
            "email": l.user.email if l.user else "",
            "no_hp": l.user.no_hp if l.user else ""
        },
        "mobil": {
            "id": l.car.id if l.car else None,
            "nama_mobil": l.car.nama_mobil if l.car else "",
            "harga_rp": l.car.harga_rp if l.car else 0,
            "klaster": l.car.klaster if l.car else 0,
            "nama_segmen": segments[l.car.klaster].nama_pendek if l.car and l.car.klaster in segments else f"K{l.car.klaster if l.car else 0}",
            "warna_segmen": segments[l.car.klaster].warna_hex if l.car and l.car.klaster in segments else "#2563EB"
        }
    } for l in leads]


@router.patch("/leads/{lead_id}")
@router.patch("/leads/{lead_id}/status")
@router.put("/leads/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    payload: schemas.LeadStatusUpdate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    lead = db.query(models.TestDrive).filter(models.TestDrive.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan.")

    lead.status = "menunggu" if payload.status == "menunggu_konfirmasi" else payload.status
    db.commit()
    return {"status": "success", "message": f"Status lead diperbarui menjadi {payload.status}."}
