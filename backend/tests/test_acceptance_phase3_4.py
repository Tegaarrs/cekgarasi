import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path
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

@pytest.fixture(scope="module")
def buyer_token():
    res = client.post("/api/auth/masuk", json={
        "email": "buyer@cekgarasi.test",
        "password": "buyersecretpassword123"
    })
    assert res.status_code == 200, f"Buyer login failed: {res.text}"
    return res.json()["access_token"]


def test_check_6_brio_query():
    """Check 6: BRIO 2018-2020 100-180jt -> >= 10 results and segmen_cocok == 1."""
    res = client.get("/api/cari", params={
        "model": "BRIO",
        "tahun_min": 2018,
        "tahun_max": 2020,
        "harga_min": 100_000_000,
        "harga_max": 180_000_000
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10, f"Expected >= 10 exact results, got {data['total']}"
    assert data["segmen_cocok"] is not None
    assert data["segmen_cocok"]["id"] == 1, f"Expected segmen_cocok id 1, got {data['segmen_cocok']['id']}"


def test_check_7_xpander_fallback_recommendations():
    """Check 7: XPANDER 2022 max 150jt -> 0 exact results, segmen_cocok == 1,
    and 10 recommendations from that segment."""
    res = client.get("/api/cari", params={
        "model": "XPANDER",
        "tahun_min": 2022,
        "harga_max": 150_000_000
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0, f"Expected 0 exact results, got {data['total']}"
    assert data["segmen_cocok"] is not None
    assert data["segmen_cocok"]["id"] == 1, f"Expected segmen_cocok id 1, got {data['segmen_cocok']['id']}"
    assert len(data["rekomendasi"]) == 10, f"Expected 10 recommendations, got {len(data['rekomendasi'])}"


def test_check_8_admin_role_security(buyer_token, admin_token):
    """Check 8: All /api/admin/* endpoints reject non-admin / buyer token with 403 Forbidden."""
    headers_buyer = {"Authorization": f"Bearer {buyer_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 1. Unauthenticated -> 401
    res_no_auth = client.get("/api/admin/ringkasan")
    assert res_no_auth.status_code == 401

    # 2. Buyer token -> 403 Forbidden
    res_buyer = client.get("/api/admin/ringkasan", headers=headers_buyer)
    assert res_buyer.status_code == 403, f"Expected 403 for buyer, got {res_buyer.status_code}"

    res_buyer_scatter = client.get("/api/admin/scatter", headers=headers_buyer)
    assert res_buyer_scatter.status_code == 403

    res_buyer_eval = client.get("/api/admin/evaluasi", headers=headers_buyer)
    assert res_buyer_eval.status_code == 403

    # 3. Admin token -> 200 OK
    res_admin = client.get("/api/admin/ringkasan", headers=headers_admin)
    assert res_admin.status_code == 200


def test_check_9_isolation_k_experiment(admin_token):
    """Check 9: In-memory K experiment does not change any database table."""
    db = SessionLocal()
    counts_before = {
        "cars": db.query(models.Car).count(),
        "segments": db.query(models.Segment).count(),
        "eval_k": db.query(models.MLEvaluasiK).count(),
        "metrik": db.query(models.MLMetrik).count()
    }
    db.close()

    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/api/admin/eksperimen-k", json={"k": 4}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["k"] == 4
    assert len(data["profiles"]) == 4

    db = SessionLocal()
    counts_after = {
        "cars": db.query(models.Car).count(),
        "segments": db.query(models.Segment).count(),
        "eval_k": db.query(models.MLEvaluasiK).count(),
        "metrik": db.query(models.MLMetrik).count()
    }
    db.close()

    assert counts_before == counts_after, f"Database modified! {counts_before} vs {counts_after}"


def test_database_web_endpoints(admin_token):
    """Test web database explorer endpoints."""
    # Info
    res_info = client.get("/api/database/info")
    assert res_info.status_code == 200
    assert res_info.json()["total_records"] > 600

    # Tables list
    res_tables = client.get("/api/database/tables")
    assert res_tables.status_code == 200
    table_names = [t["table_name"] for t in res_tables.json()]
    assert "cars" in table_names
    assert "segments" in table_names

    # Table cars data
    res_cars = client.get("/api/database/tables/cars?limit=5")
    assert res_cars.status_code == 200
    assert len(res_cars.json()["rows"]) == 5

    # Safe SQL query console
    headers = {"Authorization": f"Bearer {admin_token}"}
    res_q = client.post("/api/database/query", json={
        "query": "SELECT klaster, COUNT(*) as jumlah FROM cars GROUP BY klaster ORDER BY klaster ASC"
    }, headers=headers)
    assert res_q.status_code == 200
    q_data = res_q.json()
    assert len(q_data["rows"]) == 3
