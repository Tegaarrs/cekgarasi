import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import SessionLocal
from app import models, ml_service

client = TestClient(app)


@pytest.fixture
def buyer_token():
    res = client.post("/api/auth/login", json={
        "email": "buyer@cekgarasi.test",
        "password": "buyersecretpassword123"
    })
    if res.status_code != 200:
        res = client.post("/api/auth/masuk", json={
            "email": "buyer@cekgarasi.test",
            "password": "buyersecretpassword123"
        })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture
def another_buyer_token():
    res = client.post("/api/auth/login", json={
        "email": "siti.rahmawati@gmail.com",
        "password": "password123"
    })
    if res.status_code != 200:
        res = client.post("/api/auth/masuk", json={
            "email": "siti.rahmawati@gmail.com",
            "password": "password123"
        })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_acceptance_check_1_compare_10_1_2():
    """Acceptance Check 1:
    Compare ids 10, 1, 2:
      - sorotan.harga = [2] (82 jt)
      - sorotan.tahun = [10] (2021)
      - sorotan.km = [1] (AYLA X, 10.508 rb km)
      - sorotan.fitur = [10] (2 fitur)
      - The three cars are in three different segments, and summary says they come from different segments.
    """
    res = client.get("/api/bandingkan?ids=10,1,2")
    assert res.status_code == 200, res.text
    data = res.json()

    assert "cars" in data
    assert len(data["cars"]) == 3

    sorotan = data["sorotan"]
    assert sorotan["harga"] == [2], f"Expected sorotan.harga=[2], got {sorotan['harga']}"
    assert sorotan["tahun"] == [10], f"Expected sorotan.tahun=[10], got {sorotan['tahun']}"
    assert sorotan["km"] == [1], f"Expected sorotan.km=[1], got {sorotan['km']}"
    assert sorotan["fitur"] == [10], f"Expected sorotan.fitur=[10], got {sorotan['fitur']}"

    # Verify 3 different segments
    car_clusters = [c["mobil"]["klaster"] for c in data["cars"]]
    assert len(set(car_clusters)) == 3, f"Expected 3 different clusters, got {car_clusters}"

    # Verify summary mentions different segments
    assert "segmen berbeda" in data["hubungan_segmen"].lower()


def test_acceptance_check_2_favorites_summary_9_520_43(buyer_token):
    """Acceptance Check 2:
    Favorites of ids 9, 520, 43 (three BRIO SATYA E 1.2 2019, Keluarga Muda):
      - ringkasan has jumlah 3
      - harga_min 140.000.000
      - harga_max 142.000.000
      - harga_median 141.000.000
      - tahun_median 2019
      - segmen_dominan Keluarga Muda at 100%
    """
    headers = {"Authorization": f"Bearer {buyer_token}"}

    # Clear previous favorites of buyer
    fav_ids_res = client.get("/api/favorit/ids", headers=headers)
    assert fav_ids_res.status_code == 200
    for cid in fav_ids_res.json():
        client.delete(f"/api/favorit/{cid}", headers=headers)

    # Add 9, 520, 43
    for cid in [9, 520, 43]:
        r = client.post("/api/favorit", json={"car_id": cid}, headers=headers)
        assert r.status_code == 200

    res = client.get("/api/favorit/ringkasan", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["jumlah"] == 3
    assert data["harga_min"] == 140_000_000
    assert data["harga_max"] == 142_000_000
    assert data["harga_median"] == 141_000_000
    assert data["tahun_median"] == 2019
    assert data["segmen_dominan"]["nama"] == "Keluarga Muda"
    assert data["segmen_dominan"]["persen"] == 100.0


def test_acceptance_check_3_favorites_recommendations(buyer_token):
    """Acceptance Check 3:
    For favorites (9, 520, 43):
      - /api/favorit/rekomendasi returns at most 8 cars
      - none of them a favorite
      - the first items are Keluarga Muda
      - every "alasan" is TRUE against its mobil_acuan
    """
    headers = {"Authorization": f"Bearer {buyer_token}"}
    db = SessionLocal()
    acuan_cars = {cid: db.query(models.Car).filter(models.Car.id == cid).first() for cid in [9, 520, 43]}

    res = client.get("/api/favorit/rekomendasi?n=8", headers=headers)
    assert res.status_code == 200, res.text
    recs = res.json()

    assert len(recs) <= 8
    assert len(recs) > 0

    # None of them is a favorite
    rec_ids = [r["mobil"]["id"] for r in recs]
    assert not any(cid in [9, 520, 43] for cid in rec_ids)

    # First item is Keluarga Muda
    assert recs[0]["mobil"]["segmen_nama"] == "Keluarga Muda"

    # Verify each alasan against its mobil_acuan
    for item in recs:
        car_rec = item["mobil"]
        c_harga = car_rec["harga_rp"]
        c_tahun = car_rec["tahun"]
        c_km = car_rec["jarak_tempuh_ribu_km"]
        c_fitur = car_rec["total_fitur"]

        for reason in item["alasan"]:
            acuan_id = reason["mobil_acuan_id"]
            acuan = acuan_cars[acuan_id]
            assert acuan is not None

            kode = reason["kode"]
            nilai = reason["nilai"]

            if kode == "lebih_murah":
                diff = acuan.harga_rp - c_harga
                assert diff >= 5_000_000
                assert nilai == diff
            elif kode == "lebih_baru":
                diff = c_tahun - acuan.tahun
                assert diff >= 1
                assert nilai == diff
            elif kode == "km_lebih_rendah":
                diff = float(acuan.jarak_tempuh_ribu_km) - float(c_km)
                assert diff >= 5.0
                assert abs(nilai - diff) < 0.15
            elif kode == "fitur_lebih_banyak":
                diff = c_fitur - acuan.total_fitur
                assert diff >= 1
                assert nilai == diff

    db.close()


def test_acceptance_check_4_cheaper_alternatives_car_83():
    """Acceptance Check 4:
    /api/mobil/83/alternatif-hemat (AYLA R 1.2 2019, Rp117 jt, Keluarga Muda):
      - pool of eligible cars has 20 members in DB
      - response has 3 items
      - each has same segment, harga < Rp111.15 jt, |tahun - 2019| <= 1, not id 83
    """
    db = SessionLocal()
    car83 = db.query(models.Car).filter(models.Car.id == 83).first()
    assert car83 is not None
    assert car83.harga_rp == 117_000_000
    assert car83.tahun == 2019
    assert car83.klaster == 1

    cutoff = 0.95 * car83.harga_rp
    eligible_count = db.query(models.Car).filter(
        models.Car.status == "tayang",
        models.Car.klaster == car83.klaster,
        models.Car.harga_rp < cutoff,
        models.Car.tahun >= car83.tahun - 1,
        models.Car.tahun <= car83.tahun + 1,
        models.Car.id != 83
    ).count()
    assert eligible_count == 20, f"Expected 20 eligible cars, got {eligible_count}"
    db.close()

    res = client.get("/api/mobil/83/alternatif-hemat")
    assert res.status_code == 200, res.text
    data = res.json()

    assert len(data) == 3
    for item in data:
        m = item["mobil"]
        assert m["id"] != 83
        assert m["klaster"] == 1
        assert m["harga_rp"] < 111_150_000
        assert abs(m["tahun"] - 2019) <= 1
        assert item["hemat_rp"] == 117_000_000 - m["harga_rp"]


def test_acceptance_check_7_security_and_note_isolation(buyer_token, another_buyer_token):
    """Acceptance Check 7:
    - 401 for all /api/favorit* without login
    - User cannot read or edit another user's note (403/404)
    """
    # 1. Test 401 unauthenticated
    assert client.get("/api/favorit").status_code == 401
    assert client.get("/api/favorit/ids").status_code == 401
    assert client.get("/api/favorit/ringkasan").status_code == 401
    assert client.get("/api/favorit/rekomendasi").status_code == 401
    assert client.post("/api/favorit", json={"car_id": 1}).status_code == 401
    assert client.put("/api/favorit/1/catatan", json={"catatan": "test"}).status_code == 401
    assert client.delete("/api/favorit/1").status_code == 401

    # 2. Test note isolation between users
    headers_a = {"Authorization": f"Bearer {buyer_token}"}
    headers_b = {"Authorization": f"Bearer {another_buyer_token}"}

    # User A adds car 2 and sets private note
    client.post("/api/favorit", json={"car_id": 2}, headers=headers_a)
    put_a = client.put("/api/favorit/2/catatan", json={"catatan": "Catatan Rahasia User A"}, headers=headers_a)
    assert put_a.status_code == 200

    # User B has NOT favorited car 2 -> trying to edit car 2 note returns 404
    client.delete("/api/favorit/2", headers=headers_b)
    put_b = client.put("/api/favorit/2/catatan", json={"catatan": "Hacked by User B"}, headers=headers_b)
    assert put_b.status_code == 404

    # User B favorites list does not expose User A's note
    favs_b = client.get("/api/favorit", headers=headers_b).json()
    assert not any(f.get("catatan") == "Catatan Rahasia User A" for f in favs_b)

    # When User B favorites car 2, User B gets their own empty note, not User A's note
    client.post("/api/favorit", json={"car_id": 2}, headers=headers_b)
    favs_b_after = client.get("/api/favorit", headers=headers_b).json()
    car2_b = next(f for f in favs_b_after if f["id"] == 2 or f["car"]["id"] == 2)
    assert car2_b["catatan"] is None


def test_favorit_sorting_and_compare_validation(buyer_token):
    """Test favorit urut parameter and bandingkan validations."""
    headers = {"Authorization": f"Bearer {buyer_token}"}

    # Add cars 1, 2, 10
    for cid in [1, 2, 10]:
        client.post("/api/favorit", json={"car_id": cid}, headers=headers)

    # urut=harga_asc
    res_asc = client.get("/api/favorit?urut=harga_asc", headers=headers)
    assert res_asc.status_code == 200
    prices = [item["car"]["harga_rp"] for item in res_asc.json()]
    assert prices == sorted(prices)

    # urut=harga_desc
    res_desc = client.get("/api/favorit?urut=harga_desc", headers=headers)
    assert res_desc.status_code == 200
    prices_desc = [item["car"]["harga_rp"] for item in res_desc.json()]
    assert prices_desc == sorted(prices_desc, reverse=True)

    # Bandingkan validations
    assert client.get("/api/bandingkan?ids=1").status_code == 400
    assert client.get("/api/bandingkan?ids=1,2,3,4,5").status_code == 400
    assert client.get("/api/bandingkan?ids=99999,1").status_code == 400


def test_similar_cars_endpoint():
    """Test public GET /api/mobil/{id}/serupa?n=6&exclude=1,2"""
    res = client.get("/api/mobil/10/serupa?n=4&exclude=10,12")
    assert res.status_code == 200, res.text
    cars = res.json()
    assert len(cars) <= 4
    # All in same segment (klaster 0 = Premium)
    for c in cars:
        assert c["id"] not in [10, 12]
        assert c["klaster"] == 0
