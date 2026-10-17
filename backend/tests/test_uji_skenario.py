import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import SessionLocal
from app import models

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/auth/masuk", json={
        "email": "admin@cekgarasi.test",
        "password": "adminsecretpassword123"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


def test_uji_skenario_endpoints_and_acceptance(admin_token):
    db = SessionLocal()
    # Record initial counts and hashes/data of other tables
    initial_cars_count = db.query(models.Car).count()
    initial_segments_count = db.query(models.Segment).count()
    initial_models_count = db.query(models.CarModel).count()
    initial_brands_count = db.query(models.Brand).count()
    initial_features_count = db.query(models.Feature).count()
    initial_users_count = db.query(models.User).count()
    
    # Also inspect cars klaster column values snapshot
    cars_snapshot = [(c.id, c.klaster) for c in db.query(models.Car.id, models.Car.klaster).all()]
    db.close()

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Test POST /api/admin/uji-skenario for each scenario
    res_prod = client.post("/api/admin/uji-skenario", json={"skenario": "produksi", "k": 3}, headers=headers)
    assert res_prod.status_code == 200, res_prod.text
    prod_data = res_prod.json()
    assert abs(prod_data["silhouette"] - 0.3061) <= 0.005
    assert abs(prod_data["davies_bouldin"] - 1.108) <= 0.005
    assert abs(prod_data["calinski_harabasz"] - 284.0) <= 0.5
    assert "silhouette_uji" in prod_data
    assert "ari_rata" in prod_data
    assert "ari_min" in prod_data
    assert len(prod_data["profile"]) == 3
    for p in prod_data["profile"]:
        assert "count" in p
        assert "median_price" in p
        assert "median_year" in p
        assert "median_mileage" in p
        assert "mean_total_fitur" in p
        assert "top_2_tipe_bodi" in p

    res_a = client.post("/api/admin/uji-skenario", json={"skenario": "A", "k": 3}, headers=headers)
    assert res_a.status_code == 200, res_a.text
    a_data = res_a.json()
    assert abs(a_data["silhouette"] - 0.2865) <= 0.005
    assert abs(a_data["davies_bouldin"] - 1.202) <= 0.005
    assert abs(a_data["calinski_harabasz"] - 257.6) <= 0.5

    res_b = client.post("/api/admin/uji-skenario", json={"skenario": "B", "k": 3}, headers=headers)
    assert res_b.status_code == 200, res_b.text
    b_data = res_b.json()
    assert abs(b_data["silhouette"] - 0.3526) <= 0.005
    assert abs(b_data["davies_bouldin"] - 1.014) <= 0.005
    assert abs(b_data["calinski_harabasz"] - 329.1) <= 0.5

    # 2. Test GET /api/admin/uji-skenario/ringkasan
    res_ringkasan = client.get("/api/admin/uji-skenario/ringkasan", headers=headers)
    assert res_ringkasan.status_code == 200, res_ringkasan.text
    ringkasan_data = res_ringkasan.json()

    assert "skenario" in ringkasan_data
    assert "matrix" in ringkasan_data
    matrix = ringkasan_data["matrix"]
    
    # Check pairwise ARI acceptance criteria
    # produksi-B: 0.760, produksi-A: 0.462, A-B: 0.318
    assert abs(matrix["produksi"]["B"] - 0.760) <= 0.005
    assert abs(matrix["produksi"]["A"] - 0.462) <= 0.005
    assert abs(matrix["A"]["B"] - 0.318) <= 0.005

    # 3. Confirm NO ROW in other tables changed
    db = SessionLocal()
    assert db.query(models.Car).count() == initial_cars_count
    assert db.query(models.Segment).count() == initial_segments_count
    assert db.query(models.CarModel).count() == initial_models_count
    assert db.query(models.Brand).count() == initial_brands_count
    assert db.query(models.Feature).count() == initial_features_count
    assert db.query(models.User).count() == initial_users_count

    # Check car klaster values untouched
    after_cars = [(c.id, c.klaster) for c in db.query(models.Car.id, models.Car.klaster).all()]
    assert cars_snapshot == after_cars

    # Check ml_uji_skenario has records cached
    cached_count = db.query(models.MLUjiSkenario).count()
    assert cached_count >= 3
    db.close()


def test_uji_komparasi_skenario_endpoint(admin_token):
    # Test public buyer endpoint
    res_buyer = client.post("/api/uji-komparasi-skenario", json={
        "harga_rp": 185000000,
        "tahun": 2020,
        "jarak_tempuh_ribu_km": 35,
        "total_fitur": 3,
        "tipe_bodi": "MPV"
    })
    assert res_buyer.status_code == 200, res_buyer.text
    data = res_buyer.json()
    assert "produksi" in data
    assert "skenario_a" in data
    assert "skenario_b" in data
    assert "evaluasi" in data
    assert data["produksi"]["klaster"] in (0, 1, 2)
    assert data["skenario_a"]["klaster"] in (0, 1, 2)
    assert data["skenario_b"]["klaster"] in (0, 1, 2)
    assert "apakah_akurat" in data["evaluasi"]
    assert "status" in data["evaluasi"]
    assert "skor_persen" in data["evaluasi"]

    # Test admin endpoint with authorization
    headers = {"Authorization": f"Bearer {admin_token}"}
    res_admin = client.post("/api/admin/uji-komparasi-skenario", json={
        "harga_rp": 450000000,
        "tahun": 2022,
        "jarak_tempuh_ribu_km": 15,
        "total_fitur": 7,
        "tipe_bodi": "SUV"
    }, headers=headers)
    assert res_admin.status_code == 200, res_admin.text
    admin_data = res_admin.json()
    assert admin_data["produksi"]["klaster"] == 0  # Premium
    assert admin_data["evaluasi"]["apakah_akurat"] is True

    # Test buyer search filtering by tipe_bodi
    res_search = client.get("/api/cari?tipe_bodi=MPV")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data["items"]) > 0
    for item in search_data["items"]:
        if item.get("tipe_bodi"):
            assert item["tipe_bodi"] == "MPV"
