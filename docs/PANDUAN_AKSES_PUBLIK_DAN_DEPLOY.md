# Panduan Akses Online Publik CekGarasi 🌐

Website CekGarasi Anda kini **bisa diakses oleh semua orang di dunia** (melalui HP, laptop, tablet siapa pun) **tanpa mereka perlu memiliki atau mengunduh folder project Anda**.

Ada dua pilihan cara:
1. **Opsi 1 (Langsung Aktif Sekarang / Real-time Tunneling)**: Membagikan link publik HTTPS yang saat ini sedang aktif dari laptop Anda.
2. **Opsi 2 (Hosting Permanen 24 Jam di Cloud Gratis)**: Menaruh website di cloud hosting (Render.com / Railway / Fly.io) sehingga website tetap hidup 24 jam non-stop meskipun laptop Anda dimatikan.

---

## 🚀 OPSI 1: Link Publik yang Sedang Aktif Saat Ini (Bisa Langsung Dicoba!)

Saat ini, server backend dan **Cloudflare Public Tunnel** berkecepatan tinggi telah dijalankan dan aktif. 

### 🔗 Link Publik Resmi Anda:
👉 **`https://operates-strike-longitude-oliver.trycloudflare.com`**

> **Catatan Penggunaan:**
> * Siapa saja di internet (termasuk di smartphone Android / iPhone) bisa langsung membuka link di atas tanpa instalasi apa pun!
> * Link ini aman dengan protokol **HTTPS resmi dari Cloudflare** (tanpa banner peringatan seperti ngrok).
> * Semua fitur berfungsi penuh: Portal Masuk Pemasaran, Demo Pembeli/Admin, Katalog Mobil dengan Foto, Modal Rincian, Simulasi Kredit, dan Web Database Explorer.

### Cara Menjalankan Ulang Kapan Saja:
Jika laptop Anda pernah dimatikan atau di-restart, Anda cukup melakukan **Double Click** pada file:
📁 **`buka-website-publik.bat`** di folder utama project.
Sistem otomatis menyalakan backend dan membuat link publik baru untuk Anda bagikan.

---

## ☁️ OPSI 2: Deploy Permanen 24 Jam di Cloud (Gratis & Bebas Laptop Mati)

Jika Anda ingin website online selamanya tanpa bergantung pada laptop Anda yang menyala, Anda bisa menggunakan platform **Render.com** (Tersedia Free Tier):

### Langkah Cepat Deploy ke Render.com (Gratis):
1. **Push folder project ke GitHub**:
   ```bash
   git add .
   git commit -m "Siap deploy CekGarasi ke cloud"
   git remote add origin https://github.com/USERNAME-ANDA/cekgarasi.git
   git branch -M main
   git push -u origin main
   ```
2. Buka [https://render.com](https://render.com) dan buat akun gratis (bisa login dengan akun GitHub).
3. Klik **New +** > **Web Service**.
4. Hubungkan dengan repository GitHub `cekgarasi` yang baru saja Anda push.
5. Render akan otomatis mendeteksi file `Dockerfile` dan `render.yaml` yang sudah kami sediakan di dalam project:
   * **Environment**: `Docker`
   * **Region**: `Singapore` (terdekat dan tercepat untuk Indonesia)
   * **Plan**: `Free`
6. Klik **Create Web Service**.
7. Tunggu sekitar 2-3 menit hingga proses build selesai. Render akan memberikan domain permanen gratis, misalnya:
   `https://cekgarasi.onrender.com`

---

## 🐳 OPSI 3: Menjalankan dengan Docker di Server / VPS Sendiri

Jika Anda memiliki server Linux atau VPS (DigitalOcean, AWS, IDCloudHost, Niagahoster):
Cukup jalankan satu perintah:
```bash
docker compose up -d --build
```
Aplikasi CekGarasi akan otomatis terisolasi dalam container dan siap melayani pengunjung di port 8000.
