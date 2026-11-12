from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models, auth, bi_service

router = APIRouter(prefix="/api/bi", tags=["Business Intelligence K-Means"])


class SimulasiRequest(BaseModel):
    tahun: float = Field(..., ge=1990, le=2100)
    jarak_tempuh_ribu_km: float = Field(..., ge=0)
    harga_rp: float = Field(..., gt=0)
    total_fitur: float = Field(0, ge=0, le=11)


@router.get("/mobil/{car_id}")
def analisis_mobil(car_id: int, db: Session = Depends(get_db)):
    """Fase 1: posisi harga, kedekatan centroid, dan mobil serupa dalam segmen yang sama."""
    hasil = bi_service.analisis_mobil(db, car_id)
    if not hasil:
        raise HTTPException(status_code=404, detail="Mobil tidak ditemukan.")
    return hasil


@router.get("/dashboard")
def dashboard(
    segmen: Optional[int] = Query(None, ge=0, le=2),
    merek: Optional[str] = None,
    harga_min: Optional[int] = None,
    harga_max: Optional[int] = None,
    tahun_min: Optional[int] = None,
    tahun_max: Optional[int] = None,
    ambang: float = Query(bi_service.AMBANG_PERHATIAN_DEFAULT, ge=5, le=100),
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    """Fase 2: dashboard BI Portal Dealer (admin)."""
    return bi_service.dashboard(db, segmen, merek, harga_min, harga_max, tahun_min, tahun_max, ambang)


@router.get("/metodologi")
def metodologi():
    """Fase 3: hasil evaluasi K-Means yang sudah dihitung offline (tanpa hitung ulang tiap request)."""
    try:
        return bi_service.metodologi()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/bandingkan-segmen")
def bandingkan_segmen(db: Session = Depends(get_db)):
    """Fase 4: perbandingan Premium vs Keluarga Muda vs Ekonomis."""
    return bi_service.bandingkan_segmen(db)


@router.post("/simulasi")
def simulasi(payload: SimulasiRequest, db: Session = Depends(get_db)):
    """Fase 5: simulasi segmen berbasis jarak ke centroid K-Means (scaler produksi)."""
    return bi_service.simulasi(
        db, payload.tahun, payload.jarak_tempuh_ribu_km, payload.harga_rp, payload.total_fitur
    )
