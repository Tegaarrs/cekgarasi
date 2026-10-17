import urllib.request
import urllib.error
import json
import sqlite3
import os

BASE_URL = "http://127.0.0.1:8000"

def post_json(url, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def get_json(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def run_verification():
    print("--- 1. Authenticating as Admin via Real HTTP POST /api/auth/masuk ---")
    status, login_res = post_json(f"{BASE_URL}/api/auth/masuk", {
        "email": "admin@cekgarasi.test",
        "password": "adminsecretpassword123"
    })
    assert status == 200, f"Login failed: {login_res}"
    token = login_res["access_token"]
    print("Logged in successfully. Access token obtained.")

    print("\n--- 2. Snapshot of Existing Database Records Before API Invocations ---")
    db_path = os.path.join(os.path.dirname(__file__), "backend", "data", "cekgarasi.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables_to_check = ["cars", "segments", "car_models", "brands", "features", "users"]
    counts_before = {}
    for tbl in tables_to_check:
        cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
        counts_before[tbl] = cursor.fetchone()[0]
        print(f"Table '{tbl}': {counts_before[tbl]} rows")
        
    cursor.execute("SELECT id, klaster FROM cars")
    cars_klaster_before = cursor.fetchall()
    conn.close()

    print("\n--- 3. Testing POST /api/admin/uji-skenario (In-Memory Experiment) ---")
    for skenario in ["produksi", "A", "B"]:
        status, data = post_json(f"{BASE_URL}/api/admin/uji-skenario", {
            "skenario": skenario,
            "k": 3
        }, token=token)
        assert status == 200, f"POST uji-skenario {skenario} failed: {data}"
        print(f"[{skenario.upper()}] Silhouette={data['silhouette']}, DB={data['davies_bouldin']}, CH={data['calinski_harabasz']}, SilUji={data['silhouette_uji']}, ARI_Rata={data['ari_rata']}, Profiles={len(data['profile'])}")

    print("\n--- 4. Testing GET /api/admin/uji-skenario/ringkasan ---")
    status, ringkasan = get_json(f"{BASE_URL}/api/admin/uji-skenario/ringkasan", token=token)
    assert status == 200, f"GET ringkasan failed: {ringkasan}"

    print("\n--- 5. Evaluating Acceptance Criteria (tolerance 0.005) ---")
    # k=3 silhouette produksi 0.3061, A 0.2865, B 0.3526
    sil_prod = ringkasan["skenario"]["produksi"]["silhouette"]
    sil_a = ringkasan["skenario"]["A"]["silhouette"]
    sil_b = ringkasan["skenario"]["B"]["silhouette"]
    print(f"Silhouette Produksi: {sil_prod} (expected ~0.3061, diff={abs(sil_prod - 0.3061):.5f})")
    print(f"Silhouette A:        {sil_a} (expected ~0.2865, diff={abs(sil_a - 0.2865):.5f})")
    print(f"Silhouette B:        {sil_b} (expected ~0.3526, diff={abs(sil_b - 0.3526):.5f})")
    assert abs(sil_prod - 0.3061) <= 0.005, f"Silhouette produksi out of range: {sil_prod}"
    assert abs(sil_a - 0.2865) <= 0.005, f"Silhouette A out of range: {sil_a}"
    assert abs(sil_b - 0.3526) <= 0.005, f"Silhouette B out of range: {sil_b}"

    # Davies-Bouldin 1.108 / 1.202 / 1.014
    db_prod = ringkasan["skenario"]["produksi"]["davies_bouldin"]
    db_a = ringkasan["skenario"]["A"]["davies_bouldin"]
    db_b = ringkasan["skenario"]["B"]["davies_bouldin"]
    print(f"Davies-Bouldin Produksi: {db_prod} (expected ~1.108, diff={abs(db_prod - 1.108):.5f})")
    print(f"Davies-Bouldin A:        {db_a} (expected ~1.202, diff={abs(db_a - 1.202):.5f})")
    print(f"Davies-Bouldin B:        {db_b} (expected ~1.014, diff={abs(db_b - 1.014):.5f})")
    assert abs(db_prod - 1.108) <= 0.005, f"DB produksi out of range: {db_prod}"
    assert abs(db_a - 1.202) <= 0.005, f"DB A out of range: {db_a}"
    assert abs(db_b - 1.014) <= 0.005, f"DB B out of range: {db_b}"

    # Calinski-Harabasz 284.0 / 257.6 / 329.1
    ch_prod = ringkasan["skenario"]["produksi"]["calinski_harabasz"]
    ch_a = ringkasan["skenario"]["A"]["calinski_harabasz"]
    ch_b = ringkasan["skenario"]["B"]["calinski_harabasz"]
    print(f"Calinski-Harabasz Produksi: {ch_prod} (expected ~284.0, diff={abs(ch_prod - 284.0):.5f})")
    print(f"Calinski-Harabasz A:        {ch_a} (expected ~257.6, diff={abs(ch_a - 257.6):.5f})")
    print(f"Calinski-Harabasz B:        {ch_b} (expected ~329.1, diff={abs(ch_b - 329.1):.5f})")
    assert abs(ch_prod - 284.0) <= 0.5, f"CH produksi out of range: {ch_prod}"
    assert abs(ch_a - 257.6) <= 0.5, f"CH A out of range: {ch_a}"
    assert abs(ch_b - 329.1) <= 0.5, f"CH B out of range: {ch_b}"

    # ARI between scenarios: produksi-B 0.760, produksi-A 0.462, A-B 0.318
    matrix = ringkasan["matrix"]
    ari_pb = matrix["produksi"]["B"]
    ari_pa = matrix["produksi"]["A"]
    ari_ab = matrix["A"]["B"]
    print(f"ARI Produksi-B: {ari_pb} (expected ~0.760, diff={abs(ari_pb - 0.760):.5f})")
    print(f"ARI Produksi-A: {ari_pa} (expected ~0.462, diff={abs(ari_pa - 0.462):.5f})")
    print(f"ARI A-B:        {ari_ab} (expected ~0.318, diff={abs(ari_ab - 0.318):.5f})")
    assert abs(ari_pb - 0.760) <= 0.005, f"ARI produksi-B out of range: {ari_pb}"
    assert abs(ari_pa - 0.462) <= 0.005, f"ARI produksi-A out of range: {ari_pa}"
    assert abs(ari_ab - 0.318) <= 0.005, f"ARI A-B out of range: {ari_ab}"

    print("\n--- 6. Confirming No Row in Any Other Table Changed ---")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    for tbl in tables_to_check:
        cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
        cnt = cursor.fetchone()[0]
        assert cnt == counts_before[tbl], f"Table {tbl} row count changed from {counts_before[tbl]} to {cnt}!"
        print(f"Table '{tbl}' count confirmed untouched: {cnt}")
        
    cursor.execute("SELECT id, klaster FROM cars")
    cars_klaster_after = cursor.fetchall()
    assert cars_klaster_before == cars_klaster_after, "Cars klaster values changed!"
    print("Cars klaster assignments confirmed 100% identical.")

    # Confirm cache in ml_uji_skenario
    cursor.execute("SELECT COUNT(*) FROM ml_uji_skenario")
    cached_count = cursor.fetchone()[0]
    cursor.execute("SELECT nama, k, silhouette, davies_bouldin, calinski_harabasz, ari_rata FROM ml_uji_skenario")
    cached_rows = cursor.fetchall()
    print(f"\nml_uji_skenario records cached ({cached_count}):")
    for r in cached_rows:
        print(f"  - Skenario '{r[0]}' (k={r[1]}): Sil={r[2]}, DB={r[3]}, CH={r[4]}, ARI={r[5]}")
    conn.close()

    print("\n>>> ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY VIA REAL HTTP API! <<<")

if __name__ == "__main__":
    run_verification()
