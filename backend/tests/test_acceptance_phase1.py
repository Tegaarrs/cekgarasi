import os
import sys
import pytest
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, DBAPIError

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app import models, ml_service

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_check_1_import_counts_and_integrity(db):
    """Check 1: segments=3, brands=13, car_models=59, features=11, cars=609,
    cars per klaster = 258/197/154, lokasi NULL = 52, COUNT(car_features) = SUM(total_fitur)."""
    seg_count = db.query(models.Segment).count()
    assert seg_count == 3, f"Expected 3 segments, got {seg_count}"

    brand_count = db.query(models.Brand).count()
    assert brand_count == 13, f"Expected 13 brands, got {brand_count}"

    model_count = db.query(models.CarModel).count()
    assert model_count == 59, f"Expected 59 car_models, got {model_count}"

    feat_count = db.query(models.Feature).count()
    assert feat_count == 11, f"Expected 11 features, got {feat_count}"

    car_count = db.query(models.Car).count()
    assert car_count == 609, f"Expected 609 cars, got {car_count}"

    k0 = db.query(models.Car).filter(models.Car.klaster == 0).count()
    k1 = db.query(models.Car).filter(models.Car.klaster == 1).count()
    k2 = db.query(models.Car).filter(models.Car.klaster == 2).count()
    assert k0 == 258, f"Expected 258 cars in cluster 0, got {k0}"
    assert k1 == 197, f"Expected 197 cars in cluster 1, got {k1}"
    assert k2 == 154, f"Expected 154 cars in cluster 2, got {k2}"

    null_loc = db.query(models.Car).filter(models.Car.lokasi.is_(None)).count()
    assert null_loc == 52, f"Expected 52 cars with lokasi NULL, got {null_loc}"

    total_cf = db.query(models.CarFeature).count()
    sum_total_fitur = db.execute(text("SELECT SUM(total_fitur) FROM cars")).scalar()
    assert total_cf == sum_total_fitur, f"COUNT(car_features)={total_cf} != SUM(cars.total_fitur)={sum_total_fitur}"

    # Per-car equality
    mismatches = db.execute(text("""
        SELECT c.id, c.total_fitur, COUNT(cf.feature_id) as actual_cf
        FROM cars c
        LEFT JOIN car_features cf ON c.id = cf.car_id
        GROUP BY c.id, c.total_fitur
        HAVING c.total_fitur != COUNT(cf.feature_id)
    """)).fetchall()
    assert len(mismatches) == 0, f"Found {len(mismatches)} cars where total_fitur != count(car_features)"

def test_check_2_mileage_anomaly_correction(db):
    """Check 2: ERTIGA GL 1.5 (2022) has jarak_tempuh_ribu_km 0.178
    and S-PRESSO 1.0 (2023) has 0.245."""
    ertiga = db.query(models.Car).filter(
        models.Car.nama_mobil.like("%ERTIGA GL 1.5%"),
        models.Car.tahun == 2022
    ).first()
    assert ertiga is not None, "Mobil ERTIGA GL 1.5 (2022) tidak ditemukan"
    assert round(float(ertiga.jarak_tempuh_ribu_km), 3) == 0.178, (
        f"Expected ERTIGA mileage 0.178, got {ertiga.jarak_tempuh_ribu_km}"
    )

    spresso = db.query(models.Car).filter(
        models.Car.nama_mobil.like("%S-PRESSO 1.0%"),
        models.Car.tahun == 2023
    ).first()
    assert spresso is not None, "Mobil S-PRESSO 1.0 (2023) tidak ditemukan"
    assert round(float(spresso.jarak_tempuh_ribu_km), 3) == 0.245, (
        f"Expected S-PRESSO mileage 0.245, got {spresso.jarak_tempuh_ribu_km}"
    )

def test_check_3_scaler_and_kmeans_reproducibility(db):
    """Check 3: scaler.mean_ and scale_ match approximate values with tolerance < 0.01,
    and prediksi_segmen reproduces stored klaster for 609 of 609 rows."""
    expected_mean = np.array([2018.049, 60.992, 182977832.512, 1.072])
    expected_scale = np.array([2.028, 31.088, 66827664.187, 0.864])

    np.testing.assert_allclose(ml_service.MEAN, expected_mean, rtol=0.01)
    np.testing.assert_allclose(ml_service.SCALE, expected_scale, rtol=0.01)

    cars = db.query(models.Car).all()
    assert len(cars) == 609
    matches = 0
    for c in cars:
        pred = ml_service.prediksi_segmen(
            c.tahun,
            float(c.jarak_tempuh_ribu_km),
            float(c.harga_rp),
            c.total_fitur
        )
        if pred == c.klaster:
            matches += 1

    assert matches == 609, f"prediksi_segmen matched {matches}/609 cars"

def test_check_4_median_prices(db):
    """Check 4: Median harga per segment is Rp212 jt (Premium), Rp141 jt (Keluarga Muda),
    Rp139 jt (Ekonomis); overall median Rp177 jt."""
    st = ml_service.stats_segmen(db, force_refresh=True)
    assert round(st[0]["median_harga"]) == 212_000_000, f"Expected 212jt for cluster 0, got {st[0]['median_harga']}"
    assert round(st[1]["median_harga"]) == 141_000_000, f"Expected 141jt for cluster 1, got {st[1]['median_harga']}"
    assert round(st[2]["median_harga"]) == 139_000_000, f"Expected 139jt for cluster 2, got {st[2]['median_harga']}"

    all_prices = [float(p[0]) for p in db.query(models.Car.harga_rp).all()]
    overall_median = float(pd.Series(all_prices).median())
    assert round(overall_median) == 177_000_000, f"Expected 177jt overall, got {overall_median}"

def test_check_5_ml_evaluasi_k(db):
    """Check 5: ml_evaluasi_k returns 5 seeded rows, best silhouette at k=4 (0.3186),
    production model is k=3."""
    eval_rows = db.query(models.MLEvaluasiK).order_by(models.MLEvaluasiK.k).all()
    assert len(eval_rows) == 5, f"Expected 5 evaluation rows, got {len(eval_rows)}"

    best_sil_row = max(eval_rows, key=lambda r: float(r.silhouette))
    assert best_sil_row.k == 4, f"Expected best silhouette at k=4, got {best_sil_row.k}"
    assert round(float(best_sil_row.silhouette), 4) == 0.3186

    prod_row = db.query(models.MLEvaluasiK).filter(models.MLEvaluasiK.is_production == 1).first()
    assert prod_row is not None
    assert prod_row.k == 3, f"Production model must be k=3, got {prod_row.k}"

def test_check_10_database_constraints(db):
    """Check 10: Integrity: inserting a car with an unknown klaster or harga_rp <= 0
    is rejected by the database."""
    first_model = db.query(models.CarModel).first()

    # Test unknown klaster (foreign key constraint)
    with pytest.raises((IntegrityError, DBAPIError)):
        bad_car = models.Car(
            nama_mobil="Test Invalid Klaster",
            model_id=first_model.id,
            tahun=2020,
            jarak_tempuh_ribu_km=10.0,
            transmisi="Automatic",
            jenis_plat="ganjil",
            harga_rp=100_000_000,
            klaster=99,  # Non-existent segment
            total_fitur=0
        )
        db.add(bad_car)
        db.commit()
    db.rollback()

    # Test harga_rp <= 0 (check constraint)
    with pytest.raises((IntegrityError, DBAPIError)):
        bad_car_price = models.Car(
            nama_mobil="Test Zero Price",
            model_id=first_model.id,
            tahun=2020,
            jarak_tempuh_ribu_km=10.0,
            transmisi="Automatic",
            jenis_plat="ganjil",
            harga_rp=0,  # Invalid price <= 0
            klaster=1,
            total_fitur=0
        )
        db.add(bad_car_price)
        db.commit()
    db.rollback()

def test_service_level_check_6(db):
    """Service-level Check 6: BRIO 2018-2020 100-180jt -> >= 10 results and segmen_cocok == 1."""
    mid_th, mid_hg = ml_service.preferensi_midpoint(2018, 2020, 100_000_000, 180_000_000)
    matched_seg = ml_service.segmen_cocok(tahun=mid_th, harga_rp=mid_hg)
    assert matched_seg == 1, f"Expected segmen_cocok == 1 (Keluarga Muda), got {matched_seg}"

    q = db.query(models.Car).join(models.CarModel).filter(
        models.CarModel.nama == "BRIO",
        models.Car.tahun >= 2018,
        models.Car.tahun <= 2020,
        models.Car.harga_rp >= 100_000_000,
        models.Car.harga_rp <= 180_000_000,
        models.Car.status == "tayang"
    )
    exact_count = q.count()
    assert exact_count >= 10, f"Expected >= 10 exact results for BRIO query, got {exact_count}"

def test_service_level_check_7(db):
    """Service-level Check 7: XPANDER 2022 max 150jt -> 0 exact results,
    segmen_cocok == 1, and 10 recommendations from that segment."""
    mid_th, mid_hg = ml_service.preferensi_midpoint(tahun_min=2022, harga_max=150_000_000)
    matched_seg = ml_service.segmen_cocok(tahun=mid_th, harga_rp=mid_hg)
    assert matched_seg == 1, f"Expected segmen_cocok == 1, got {matched_seg}"

    q = db.query(models.Car).join(models.CarModel).filter(
        models.CarModel.nama == "XPANDER",
        models.Car.tahun >= 2022,
        models.Car.harga_rp <= 150_000_000,
        models.Car.status == "tayang"
    )
    exact_count = q.count()
    assert exact_count == 0, f"Expected 0 exact results, got {exact_count}"

    # Recommendations from that segment
    seg_cars = db.query(models.Car).filter(
        models.Car.klaster == matched_seg,
        models.Car.status == "tayang"
    ).all()
    df_seg = pd.DataFrame([{
        "id": c.id,
        "tahun": c.tahun,
        "harga_rp": float(c.harga_rp)
    } for c in seg_cars])

    recs = ml_service.rekomendasi(df_seg, mid_th, mid_hg, exclude_ids=[], n=10)
    assert len(recs) == 10, f"Expected 10 recommendations, got {len(recs)}"

def test_service_level_check_9_isolation(db):
    """Service-level Check 9: eksperimen_k(4) changes no row in any table."""
    counts_before = {
        "cars": db.query(models.Car).count(),
        "segments": db.query(models.Segment).count(),
        "eval_k": db.query(models.MLEvaluasiK).count(),
        "metrik": db.query(models.MLMetrik).count()
    }

    res = ml_service.eksperimen_k(4, db)
    assert res["k"] == 4
    assert len(res["profiles"]) == 4

    counts_after = {
        "cars": db.query(models.Car).count(),
        "segments": db.query(models.Segment).count(),
        "eval_k": db.query(models.MLEvaluasiK).count(),
        "metrik": db.query(models.MLMetrik).count()
    }
    assert counts_before == counts_after, f"Counts changed after eksperimen_k: {counts_before} vs {counts_after}"
