# CekGarasi - Marketplace Mobil Bekas Indonesia dengan Segmentasi K-Means Nyata

Platform web pasar mobil bekas terintegrasi khusus **Pembeli (Buyer-Only)** di Indonesia, ditenagai oleh model pengelompokan **K-Means clustering** (scikit-learn) objektif berdasarkan usia kendaraan, jarak tempuh, harga pasar riil, dan kelengkapan 11 fitur kendaraan.

---

## 🌟 Fitur Utama

### 1. Portal Pembeli (CekGarasi Buyer)
- **Beranda Interaktif**: Ringkasan 3 segmen pasar mobil bekas dengan statistik median harga, persentase stok, dan penjelasan klaster.
- **Pencarian Cerdas (Smart Search)**: Filter berbasis SQL multi-parameter (merek, model, rentang tahun, rentang harga, transmisi, lokasi, plat).
- **Rekomendasi Pintar (Smart Fallback)**: Jika hasil pencarian spesifik < 10 unit, sistem secara otomatis merekomendasikan unit dari segmen yang paling cocok (*nearest centroid matching*) diurutkan berdasarkan kedekatan tahun & harga.
- **Detail Mobil Komprehensif**: Spesifikasi teknis lengkap, status 11 fitur aktif/nonaktif, komparasi posisi harga terhadap kuartil segmen (Q1, Median, Q3), serta estimasi kalkulator angsuran bulanan (anuitas 8% p.a.).
- **Jadwal Test Drive**: Pengajuan jadwal uji jalan kendaraan dengan pemilihan cabang dealer dan kode booking unik (`TD-YYYYMM-XXXX`).

### 2. Portal Admin Dealer (CekGarasi Dealer)
- **Dashboard KPI Bisnis**: Total stok unit, median harga pasar, prospek test drive aktif, dan skor validasi model K-Means (*Silhouette Score*).
- **Deteksi Anomali Harga**: Peringatan otomatis untuk mobil dengan harga di luar rentang kuartil wajar segmennya (di bawah Q1 atau di atas Q3).
- **Visualisasi Segmentasi Pasar**:
  - Proyeksi Scatter Plot 2 Dimensi PCA (Principal Component Analysis) interaktif.
  - Kurva evaluasi K=2..6 (Elbow Inertia & Silhouette).
  - Simulator eksperimen K *in-memory* non-destruktif.
- **Manajemen Inventori**: Tabel inventori lengkap dengan drawer tambah mobil yang dilengkapi **Live Debounced Segment Predictor** (prediksi segmen live saat mengetik data mobil).
- **Manajemen Leads Test Drive**: Pelacakan status jadwal booking dari pembeli.

### 3. Integrated Web Database Explorer (Akses Basis Data via Web)
- **Akses Langsung via Web**: Tab khusus *"🗄️ Database Explorer"* yang terintegrasi langsung di dalam aplikasi web.
- **Penjelajah 12 Tabel Basis Data**: Membaca tabel `cars`, `segments`, `car_models`, `brands`, `features`, `car_features`, `users`, `test_drives`, `favorites`, `view_history`, `ml_evaluasi_k`, dan `ml_metrik`.
- **Pencarian & Paginasi Real-Time**: Pencarian teks di seluruh kolom, pengurutan (*sorting*) berdasarkan kolom, dan pembagian halaman.
- **Ekspor Data Instan**: Ekspor data tabel ke format **CSV** atau **JSON** dengan 1 klik.
- **Web SQL Console**: Eksekusi query baca (*SELECT / SHOW / EXPLAIN*) langsung dari browser dengan proteksi keamanan dan penghitung waktu eksekusi milidetik.

---

## 🚀 Cara Menjalankan Project

Server backend FastAPI telah dikonfigurasi untuk menyajikan antarmuka frontend secara langsung pada port yang sama:

```powershell
# Jalankan server
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Buka peramban (browser) Anda pada:
- **Aplikasi Web Lengkap**: [http://localhost:8000](http://localhost:8000)
- **Dokumentasi Interaktif API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Dokumentasi Alternatif API (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔑 Akun Demo Siap Pakai

Tersedia tombol **1-Klik Demo Login** pada modal masuk:

| Peran | Email | Kata Sandi |
| :--- | :--- | :--- |
| **Admin Dealer** | `admin@cekgarasi.test` | `adminsecretpassword123` |
| **Pembeli Demo** | `buyer@cekgarasi.test` | `buyersecretpassword123` |
| **Kode OTP Demo** | `123456` | - |

---

## 🧪 Pengujian & Acceptance Checks

Semua 14 pemeriksaan otomatis lulus 100%:

```powershell
# Jalankan suite pengujian lengkap
.\backend\venv\Scripts\python.exe -m pytest backend\tests
```

**Hasil Verifikasi**:
- ✅ **Check 1**: 3 segmen, 13 merek, 59 model, 11 fitur, 609 mobil terverifikasi, COUNT(car_features) == SUM(total_fitur).
- ✅ **Check 2**: Koreksi anomali mileage Ertiga (0.178) & Spresso (0.245).
- ✅ **Check 3**: Nilai rata-rata & skala scaler cocok, 609 dari 609 prediksi klaster identik.
- ✅ **Check 4**: Median harga (Premium Rp 212 Jt, Keluarga Muda Rp 141 Jt, Ekonomis Rp 139 Jt, Keseluruhan Rp 177 Jt).
- ✅ **Check 5**: 5 baris evaluasi K=2..6, Silhouette tertinggi pada K=4 (0.3186), model produksi K=3.
- ✅ **Check 6**: Pencarian Brio 2018-2020 Rp 100-180 Jt menghasilkan ≥ 10 hasil eksak dan segmen cocok Klaster 1.
- ✅ **Check 7**: Pencarian Xpander 2022 max 150 Jt menghasilkan 0 eksak, segmen cocok Klaster 1, dan 10 unit rekomendasi.
- ✅ **Check 8**: Keamanan RBAC (endpoint `/api/admin/*` menolak unauthenticated 401 dan token pembeli 403).
- ✅ **Check 9**: Isolasi eksperimen K in-memory tidak mengubah basis data.
- ✅ **Check 10**: Integritas constraint basis data.
