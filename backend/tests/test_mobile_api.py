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
def buyer_token():
    res = client.post("/api/auth/masuk", json={
        "email": "buyer@cekgarasi.test",
        "password": "buyersecretpassword123"
    })
    assert res.status_code == 200, f"Buyer login failed: {res.text}"
    return res.json()["access_token"]


def test_check_1_api_segmen():
    """Acceptance Check 1:
    /api/segmen: counts 258 / 197 / 154 (42% / 32% / 25%);
    median harga Rp212 / 141 / 139 jt;
    Q1-Q3 about 197-255 / 119-164 / 116-169 jt;
    median tahun 2019 / 2019 / 2016;
    mean mileage about 57 / 39 / 95 rb km;
    matik about 91% / 53% / 70%;
    mean features about 1.8 / 0.4 / 0.7;
    global median Rp177 jt, min Rp77 jt, max Rp542 jt;
    terbesar = Premium;
    silhouette_k3 = 0.3061.
    """
    res = client.get("/api/segmen")
    assert res.status_code == 200, res.text
    data = res.json()

    # Verify global statistics
    assert data["total"] == 609
    assert data["harga_min"] == 77_000_000
    assert data["harga_max"] == 542_000_000
    assert abs(data["harga_median"] - 177_000_000) < 1_000_000
    assert abs(data["silhouette_k3"] - 0.3061) <= 0.001

    seg_items = {s["id"]: s for s in data["segmen"]}
    assert len(seg_items) == 3

    # Segment 0: Premium
    s0 = seg_items[0]
    assert s0["slug"] == "premium"
    assert s0["nama"] == "Premium"
    assert s0["jumlah"] == 258
    assert abs(s0["persen"] - 42.4) <= 1.0
    assert abs(s0["median_harga"] - 212_000_000) <= 2_000_000
    assert abs(s0["q1_harga"] - 197_000_000) <= 2_000_000
    assert abs(s0["q3_harga"] - 255_000_000) <= 2_000_000
    assert s0["tahun_median"] == 2019
    assert abs(s0["km_rata_rata_ribu"] - 57.0) <= 2.0
    assert abs(s0["persen_matik"] - 91.0) <= 2.0
    assert abs(s0["fitur_rata_rata"] - 1.8) <= 0.2
    assert s0["terbesar"] is True

    # Segment 1: Keluarga Muda
    s1 = seg_items[1]
    assert s1["slug"] == "keluarga-muda"
    assert s1["nama"] == "Keluarga Muda"
    assert s1["jumlah"] == 197
    assert abs(s1["persen"] - 32.3) <= 1.0
    assert abs(s1["median_harga"] - 141_000_000) <= 2_000_000
    assert abs(s1["q1_harga"] - 119_000_000) <= 2_000_000
    assert abs(s1["q3_harga"] - 164_000_000) <= 2_000_000
    assert s1["tahun_median"] == 2019
    assert abs(s1["km_rata_rata_ribu"] - 39.0) <= 2.0
    assert abs(s1["persen_matik"] - 53.0) <= 2.0
    assert abs(s1["fitur_rata_rata"] - 0.4) <= 0.2
    assert s1["terbesar"] is False

    # Segment 2: Ekonomis
    s2 = seg_items[2]
    assert s2["slug"] == "ekonomis"
    assert s2["nama"] == "Ekonomis"
    assert s2["jumlah"] == 154
    assert abs(s2["persen"] - 25.3) <= 1.0
    assert abs(s2["median_harga"] - 139_000_000) <= 2_000_000
    assert abs(s2["q1_harga"] - 116_000_000) <= 2_000_000
    assert abs(s2["q3_harga"] - 169_000_000) <= 2_000_000
    assert s2["tahun_median"] == 2016
    assert abs(s2["km_rata_rata_ribu"] - 95.0) <= 2.0
    assert abs(s2["persen_matik"] - 70.0) <= 2.0
    assert abs(s2["fitur_rata_rata"] - 0.7) <= 0.2
    assert s2["terbesar"] is False

    # Top models
    assert len(s0["model_teratas"]) == 3
    assert len(s1["model_teratas"]) == 3
    assert len(s2["model_teratas"]) == 3


def test_check_2_cari_keluarga_muda():
    """Acceptance Check 2:
    /api/cari?segmen=keluarga-muda&tahun_min=2019&harga_max=175000000 -> total 95 (not 10).
    """
    res = client.get("/api/cari", params={
        "segmen": "keluarga-muda",
        "tahun_min": 2019,
        "harga_max": 175_000_000
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 95, f"Expected 95 exact results, got {data['total']}"
    assert len(data["hasil"]) == 12, f"Expected default page_size 12, got {len(data['hasil'])}"


def test_check_3_cari_brio():
    """Acceptance Check 3:
    /api/cari?model=BRIO&tahun_min=2018&tahun_max=2020&harga_min=100000000&harga_max=180000000
    -> total 49 and segmen_cocok = Keluarga Muda.
    """
    res = client.get("/api/cari", params={
        "model": "BRIO",
        "tahun_min": 2018,
        "tahun_max": 2020,
        "harga_min": 100_000_000,
        "harga_max": 180_000_000
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 49, f"Expected 49 exact results, got {data['total']}"
    assert data["segmen_cocok"] is not None
    assert data["segmen_cocok"]["id"] == 1
    assert data["segmen_cocok"]["nama"] == "Keluarga Muda"


def test_check_4_cari_xpander_diagnosis():
    """Acceptance Check 4:
    /api/cari?model=XPANDER&tahun_min=2022&harga_max=150000000 -> total 0;
    diagnosis.model_total = 52, model_tahun_ok = 0, harga_termurah_model about Rp191 jt;
    10 recommendations from Keluarga Muda; the M2c screen shows these real numbers.
    """
    res = client.get("/api/cari", params={
        "model": "XPANDER",
        "tahun_min": 2022,
        "harga_max": 150_000_000
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 0, f"Expected 0 exact results, got {data['total']}"
    assert data["segmen_cocok"] is not None
    assert data["segmen_cocok"]["id"] == 1
    assert len(data["rekomendasi"]) == 10

    # Diagnosis validation
    assert "diagnosis" in data and data["diagnosis"] is not None
    diag = data["diagnosis"]
    assert diag["model_total"] == 52, f"Expected model_total 52, got {diag['model_total']}"
    assert diag["model_tahun_ok"] == 0, f"Expected model_tahun_ok 0, got {diag['model_tahun_ok']}"
    assert abs(diag["harga_termurah_model"] - 191_000_000) <= 1_000_000
    assert len(diag["saran"]) > 0


def test_b1_cari_free_text_and_locations():
    """B1: Tokenized search & comma-separated locations."""
    # Test tokenized search across brand, model, car name
    res = client.get("/api/cari", params={"q": "Honda Brio E"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for car in data["hasil"]:
        assert "honda" in (car["merek"] + " " + car["nama_mobil"]).lower()

    # Test comma-separated lokasi
    res_loc = client.get("/api/cari", params={"lokasi": "Jakarta Selatan,Bekasi"})
    assert res_loc.status_code == 200
    data_loc = res_loc.json()
    assert data_loc["total"] > 0
    for car in data_loc["hasil"]:
        assert car["lokasi"] in ("Jakarta Selatan", "Bekasi")


def test_b1_cari_sorting_options():
    """B1: urut sorting: harga_asc, harga_desc, tahun_desc, km_asc, sesuai."""
    # harga_asc
    res_asc = client.get("/api/cari", params={"urut": "harga_asc", "page_size": 5})
    assert res_asc.status_code == 200
    prices = [c["harga_rp"] for c in res_asc.json()["hasil"]]
    assert prices == sorted(prices)

    # harga_desc
    res_desc = client.get("/api/cari", params={"urut": "harga_desc", "page_size": 5})
    assert res_desc.status_code == 200
    prices_desc = [c["harga_rp"] for c in res_desc.json()["hasil"]]
    assert prices_desc == sorted(prices_desc, reverse=True)

    # km_asc
    res_km = client.get("/api/cari", params={"urut": "km_asc", "page_size": 5})
    assert res_km.status_code == 200
    kms = [c["jarak_tempuh_ribu_km"] for c in res_km.json()["hasil"]]
    assert kms == sorted(kms)

    # sesuai with midpoint
    res_sesuai = client.get("/api/cari", params={"tahun_min": 2019, "harga_max": 200_000_000, "urut": "sesuai"})
    assert res_sesuai.status_code == 200
    assert len(res_sesuai.json()["hasil"]) > 0


def test_b2_cari_hitung():
    """B2: GET /api/cari/hitung returns only {total} matching /api/cari."""
    params = {"segmen": "keluarga-muda", "tahun_min": 2019, "harga_max": 175_000_000}
    res_full = client.get("/api/cari", params=params)
    res_count = client.get("/api/cari/hitung", params=params)

    assert res_count.status_code == 200
    assert res_count.json()["total"] == res_full.json()["total"] == 95


def test_b3_filter_opsi():
    """B3: GET /api/filter-opsi includes grouped locations, model counts, etc."""
    res = client.get("/api/filter-opsi")
    assert res.status_code == 200
    data = res.json()

    assert data["total_stok"] == 609
    assert len(data["models"]) >= 50
    assert "lokasi" in data
    assert data["lokasi"]["semua"] == 609
    assert len(data["lokasi"]["jakarta"]) == 5
    assert len(data["lokasi"]["luar_jakarta"]) == 7

    assert "Automatic" in data["transmisi"]
    assert "Manual" in data["transmisi"]
    assert data["transmisi"]["Automatic"] + data["transmisi"]["Manual"] == 609

    assert data["harga"]["min"] == 77_000_000
    assert data["harga"]["max"] == 542_000_000
    assert data["tahun"]["min"] == 2010
    assert data["tahun"]["max"] == 2023


def test_b5_segmen_sebaran():
    """B5: GET /api/segmen/sebaran returns all 609 published cars."""
    res = client.get("/api/segmen/sebaran")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 609
    for item in items[:10]:
        assert "id" in item
        assert "nama_mobil" in item
        assert "tahun" in item
        assert "harga_rp" in item
        assert "klaster" in item


def test_b6_rekomendasi_beranda():
    """B6: GET /api/rekomendasi/beranda returns balanced items for guests."""
    res = client.get("/api/rekomendasi/beranda")
    assert res.status_code == 200
    data = res.json()
    assert "judul" in data
    assert "keterangan" in data
    assert "items" in data
    assert len(data["items"]) >= 6

    # Verify representations from all segments
    klasters = {c["klaster"] for c in data["items"]}
    assert klasters == {0, 1, 2}


def test_b7_favorit_flow(buyer_token):
    """B7: GET, POST, DELETE /api/favorit with authentication."""
    headers = {"Authorization": f"Bearer {buyer_token}"}

    # 1. Initially get favorites
    res_init = client.get("/api/favorit", headers=headers)
    assert res_init.status_code == 200
    init_count = res_init.json()["count"]

    # 2. Add car 1 to favorites
    res_add = client.post("/api/favorit", json={"car_id": 1}, headers=headers)
    assert res_add.status_code == 200
    assert res_add.json()["favorited"] is True

    # 3. Check favorites list incremented
    res_after = client.get("/api/favorit", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["count"] == init_count + 1
    assert any(c["id"] == 1 for c in res_after.json()["items"])

    # 4. Remove car 1 from favorites
    res_del = client.delete("/api/favorit/1", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["favorited"] is False

    # 5. Check count restored
    res_final = client.get("/api/favorit", headers=headers)
    assert res_final.status_code == 200
    assert res_final.json()["count"] == init_count
