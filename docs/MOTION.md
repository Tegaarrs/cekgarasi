# Dokumentasi Desain Gerak (Motion Specification) — CekGarasi Frontend

Dokumen ini disusun sebagai dokumentasi teknis lapisan *motion* (*frontend only*) untuk platform CekGarasi dalam rangka kelengkapan dokumentasi tugas akhir / tesis antarmuka web modern berbasis AI K-Means.

---

## 1. Prinsip Desain Gerak (*Motion Principles*)

1. **Restraint & Purposeful (Terkendali & Memiliki Tujuan Nyata)**:
   - Satu ide gerak dominan per layar untuk menjaga fokus kognitif pengguna.
   - Animasi hanya diterapkan pada `transform` dan `opacity` (ditambah `pathLength` SVG dan `width` bar indikator). Tidak pernah menganimasikan `width`/`height`/`top`/`left` pada elemen tata letak utama demi mencegah *Cumulative Layout Shift* (Zero CLS).
2. **Speed & Snappiness (Responsif & Cepat)**:
   - Kemunculan elemen (*entrance*): 200–350 ms dengan kurva *ease-out* yang tegas.
   - Interaksi tombol & hover: 120–200 ms berbasis fisika *spring*.
   - Transisi keluar (*exit*): Maksimal 150 ms agar alur pengguna tidak terhambat.
3. **Aksesibilitas Universal (*Reduced Motion First*)**:
   - Seluruh aplikasi dibungkus dalam `<MotionConfig reducedMotion="user">`.
   - Ketika pengguna mengaktifkan mode reduced-motion pada sistem operasinya, seluruh efek translasi, skala, dan rotasi otomatis dinonaktifkan. Nilai counter langsung tampil, dan status perubahan tetap tersampaikan secara visual melalui kontras warna atau opasitas.

---

## 2. Token Desain Gerak (*Motion Design Tokens*)

Diimplementasikan pada `src/lib/motion.ts` menggunakan library `motion` (`"motion/react"`):

| Kategori Token | Nama Token | Nilai / Konfigurasi | Deskripsi Penggunaan |
| :--- | :--- | :--- | :--- |
| **Durasi** | `dur.fast` | `0.15s` (150 ms) | Exit animations, status chip crossfade, micro-state |
| | `dur.base` | `0.28s` (280 ms) | Kemunculan card, form entrance, drawer sliding |
| | `dur.slow` | `0.45s` (450 ms) | Visualisasi hero, diagram garis Recharts, highlight pulse |
| **Kurva Easing** | `ease.out` | `[0.22, 1, 0.36, 1]` | Perlambatan alami (*cubic-bezier*) untuk kemunculan konten |
| | `ease.inOut` | `[0.65, 0, 0.35, 1]` | Kurva transisi keluar halus (*exit transitions*) |
| **Spring Fisika** | `spring.snappy` | `{ stiffness: 420, damping: 32 }` | Hover lift, press tap kartu, active OTP box scale |
| | `spring.soft` | `{ stiffness: 180, damping: 24 }` | Geseran penanda benchmark harga (*price benchmark marker*) |
| **Stagger** | `stagger(0.06)` | `interval: 60ms, delay: 50ms` | Kemunculan bertahap elemen berulang (dibatasi maks 12 item) |

---

## 3. Komponen Motion Reusable (`src/components/motion/`)

* **`<Reveal>`**: Membungkus komponen anak dengan `fadeUp` saat pertama kali memasuki viewport pengguna (`viewport={{ once: true, amount: 0.2 }}`).
* **`<Stagger>` & `<StaggerItem>`**: Mengatur orkestrasi kemunculan kartu atau daftar hingga 12 item pertama (60 ms delay antar anak); item ke-13 dan seterusnya langsung tampil tanpa beban per-elemen.
* **`<PressableCard>`**: Kartu interaktif yang merespons hover dengan sedikit terangkat (`y: -4`, bayangan lembut) dan membal saat ditekan (`scale: 0.98`), mendukung fokus navigasi keyboard (`Tab` + `Enter`).
* **`<AnimatedNumber>`**: Penghitung dinamis (*count-up counter*) untuk metrik KPI dan kalkulator cicilan menggunakan `animate()` dan `tabular-nums`. Otomatis langsung ke nilai akhir saat mode reduced motion aktif.
* **`<PageTransition>`**: Transisi perpindahan halaman halus `<AnimatePresence mode="wait">` berbasis `location.pathname` (opacity 0→1, y 8→0 dalam 200 ms, exit 120 ms) disertai scroll-restoration instan ke posisi atas layar.
* **`<SegmentBadge>`**: Lencana segmen pasar dinamis yang melakukan crossfade saat berganti klaster dan menginterpolasi warna dot indikator.
* **`<AnimatedCheck>`**: Ikon centang sukses yang digambar dari awal menggunakan animasi `pathLength` SVG berurutan.
* **`<Skeleton>`**: Placeholder shimmer berbasis transformasi CSS murni tanpa loop berat Javascript.
* **`<Spinner>`**: Ikon putaran linear untuk indikator tombol saat memproses permintaan API.
* **`<Toast>`**: Notifikasi slide + fade in/out yang dilengkapi atribut aksesibilitas `role="status"` dan `aria-live="polite"`.

---

## 4. Matriks Pemetaan Animasi per Layar (*Screen Motion Matrix*)

| ID Layar | Nama Layar | Elemen yang Dianimasikan | Karakteristik & Parameter Motion |
| :--- | :--- | :--- | :--- |
| **B1** | Masuk (*Login*) | Form Card & Error Banner | Card `fadeUp` (280 ms); jika login gagal card bergetar (*shake*) `x: [0,-8,8,-4,4,0]` (350 ms) & error banner meluncur turun; tombol submit memuat `<Spinner>`. |
| **B2** | Registrasi Pembeli | Password Meter, Steps, OTP | Meter kekuatan password terisi sekuensial; transisi langkah B2a→B2b→B2c meluncur horizontal (`x: 24→0`, 250 ms); kotak OTP aktif berskala 1.04 dan auto-fokus ke kotak berikutnya; kode salah mengguncang baris OTP; B2c menampilkan `<SegmentBadge>` crossfade saat slider anggaran diubah. |
| **B3** | Beranda Pasar | Hero, Segmen, Pilihan Unit | Judul utama muncul kata demi kata (stagger 40 ms); foto hero membesar lambat 1.06→1; kartu segmen memakai `<PressableCard>` dengan bar pangsa pasar terisi dari 0% ke % target (700 ms); popover info K-Means buka via `scaleIn`; unit rekomendasi terstagger. |
| **B4** | Katalog Pencarian | Filter Chips, Hasil, AI Card | Filter chips memakai `<AnimatePresence>` (scale+fade); grid hasil mobil terstagger 12 kartu pertama; kartu insight segmen AI meluncur turun 12px dengan highlight pulse bayangan sekali saat `segmen_cocok` berubah (`aria-live="polite"`). |
| **B5** | Rincian Mobil | Galeri, Tab, Posisi Harga | Foto galeri crossfade (200 ms); garis bawah tab bergeser mulus via `layoutId="tabUnderline"`; penanda posisi harga kuartil meluncur ke titik target dengan `spring.soft` disusul chip verdict; estimasi angsuran memakai `<AnimatedNumber>` (0.4 s) saat slider DP atau tenor digeser. |
| **B6** | Reservasi Test Drive | Form & Ringkasan Unit | Ringkasan mobil meluncur dari kiri (`x: -24→0`), formulir dari kanan (`x: 24→0`); tombol konfirmasi menampilkan `<Spinner>` saat pengiriman data. |
| **B7** | Konfirmasi Sukses | Ikon Centang & Rincian | Animasi garis centang SVG `<AnimatedCheck>`, disusul rincian jadwal yang terstagger berurutan. |
| **A1** | Login Dealer/Admin | Form Card Administrator | Identik dengan B1 (`fadeUp` card, shake saat unauthorized, banner slide down). |
| **A2** | Dashboard Eksekutif | Sidebar, KPI, Scatter PCA | Navigasi sidebar masuk sekali saat muat; kartu KPI memakai `<AnimatedNumber>`; grafik scatter 2D PCA Recharts menggambar titik klaster selama 700 ms; baris inventori masuk bertahap (30 ms) dan bereaksi saat di-hover. |
| **A3** | Evaluasi K-Means | Kurva Elbow & Akordeon | Garis kurva Elbow dan Silhouette digambar dari kiri ke kanan (700 ms); penanda nilai K aktif berdenyut sekali (*pulse*); tombol "Jalankan Ulang" menampilkan skeleton sebelum crossfade hasil; akordeon metodologi berekspansi mulus dengan animasi tinggi terisolasi. |
| **A4** | Manajemen Inventori | Drawer Tambah Unit & Prediksi | Drawer unit meluncur masuk dengan `slideInRight` di atas backdrop transparan 40%; area prediksi live menampilkan `<SegmentBadge>` crossfade dan penanda kuartil `spring.soft`; baris inventori masuk bertahap 30 ms. |
| **A5** | Leads Test Drive | Status Chip & Bar Chart | Saat status pemesanan diubah, chip status crossfade dan baris tabel memancarkan kilatan latar belakang sekali; bar chart per-segmen beranimasi 700 ms. |

---

## 5. Ringkasan Kinerja & Ukuran Bundle Produksi

Berdasarkan hasil kompilasi produksi Vite (`npm run build`):
* **`dist/index.html`**: 1.22 kB (gzip: 0.60 kB)
* **`dist/assets/index-DnxmrOnm.css`**: 39.97 kB (gzip: 7.00 kB)
* **`dist/assets/motion-hodW5Gjz.js`**: 103.91 kB (gzip: 34.78 kB) — *Seluruh modul motion terisolasi bersih*
* **`dist/assets/vendor-DjkR4sws.js`**: 165.45 kB (gzip: 54.14 kB) — *React, ReactDOM, React Router*
* **`dist/assets/index-ZTyVGtna.js`**: 180.05 kB (gzip: 43.64 kB) — *Aplikasi CekGarasi UI & logik*
* **`dist/assets/charts-llEhuBbn.js`**: 406.84 kB (gzip: 110.68 kB) — *Recharts modular*

Semua chunk berada di bawah batas peringatan 500 kB berkat konfigurasi `rollupOptions.output.manualChunks`. Waktu pemuatan awal (*First Contentful Paint*) terjaga optimal < 1 detik.
