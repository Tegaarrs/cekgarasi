// Buyer Platform Logic
class BuyerPlatform {
  constructor() {
    this.currentFilters = {
      q: "",
      merek: "",
      model: "",
      tahun_min: "",
      tahun_max: "",
      harga_min: "",
      harga_max: "",
      transmisi: "",
      lokasi: "",
      jenis_plat: "",
      klaster: "",
      sort: "termurah",
      page: 1,
      limit: 12
    };
    this.segments = [];
    this.filterOptions = null;
  }

  async init() {
    await this.loadSegments();
    await this.loadFilterOptions();
    await this.loadHomepageRecommendations();
    await this.searchCars();
    this.setupListeners();
  }

  async loadSegments() {
    try {
      this.segments = await window.api.getSegments();
      const container = document.getElementById("segments-cards-container");
      if (!container) return;

      container.innerHTML = this.segments.map(s => {
        const stats = s.stats || {};
        const medianPriceJt = stats.median_harga ? (stats.median_harga / 1_000_000).toFixed(0) : "0";
        const sharePct = stats.share ? (stats.share * 100).toFixed(1) : "0";

        return `
          <div class="segment-card seg-${s.id}" onclick="window.buyerPlatform.filterBySegment(${s.id})">
            <div class="segment-header">
              <span class="badge badge-seg-${s.id}">Klaster ${s.id}</span>
              <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">${sharePct}% Stok</span>
            </div>
            <div class="segment-name">${s.nama_lengkap}</div>
            <div class="segment-desc">${s.deskripsi || ""}</div>
            <div class="segment-stats-grid">
              <div>
                <div class="stat-item-label">Median Harga</div>
                <div class="stat-item-val" style="color:${s.warna_hex};">Rp ${medianPriceJt} Jt</div>
              </div>
              <div>
                <div class="stat-item-label">Jumlah Unit</div>
                <div class="stat-item-val">${stats.count || 0} Mobil</div>
              </div>
              <div>
                <div class="stat-item-label">Median Tahun</div>
                <div class="stat-item-val">${stats.median_tahun || "-"}</div>
              </div>
              <div>
                <div class="stat-item-label">Transmisi AT</div>
                <div class="stat-item-val">${stats.share_automatic ? (stats.share_automatic * 100).toFixed(0) : 0}%</div>
              </div>
            </div>
            <button class="btn btn-outline btn-block btn-sm" style="color:${s.warna_hex}; border-color:${s.warna_hex};">
              Lihat Mobil Segmen Ini →
            </button>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("Gagal memuat segmen:", err);
    }
  }

  async loadFilterOptions() {
    try {
      this.filterOptions = await window.api.getFilterOptions();
      
      const brandSelect = document.getElementById("filter-brand");
      if (brandSelect && this.filterOptions.brands) {
        brandSelect.innerHTML = `<option value="">Semua Merek</option>` +
          this.filterOptions.brands.map(b => `<option value="${b}">${b}</option>`).join("");
      }

      const modelSelect = document.getElementById("filter-model");
      if (modelSelect && this.filterOptions.car_models) {
        modelSelect.innerHTML = `<option value="">Semua Model</option>` +
          this.filterOptions.car_models.map(m => `<option value="${m}">${m}</option>`).join("");
      }

      const locationSelect = document.getElementById("filter-location");
      if (locationSelect && this.filterOptions.locations) {
        locationSelect.innerHTML = `<option value="">Semua Lokasi</option>` +
          this.filterOptions.locations.map(l => `<option value="${l}">${l}</option>`).join("");
      }
    } catch (err) {
      console.error("Gagal memuat opsi filter:", err);
    }
  }

  async loadHomepageRecommendations() {
    try {
      const recs = await window.api.getHomepageRecommendations();
      const container = document.getElementById("home-featured-cars");
      if (!container) return;

      let allCars = [];
      Object.values(recs).forEach(list => {
        allCars = allCars.concat(list);
      });

      // Show top 6
      container.innerHTML = allCars.slice(0, 8).map(c => this.renderCarCard(c)).join("");
    } catch (err) {
      console.error("Gagal memuat rekomendasi beranda:", err);
    }
  }

  filterBySegment(segmentId) {
    this.currentFilters.klaster = segmentId;
    this.currentFilters.page = 1;
    window.app.navigatePage("cari");
    this.searchCars();
  }

  async searchCars() {
    const grid = document.getElementById("cars-results-grid");
    const infoHeader = document.getElementById("search-results-info");
    const fallbackBox = document.getElementById("recommendations-fallback-box");

    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
        <div class="spinner"></div>
        <p style="margin-top:0.75rem;">Mencari mobil yang sesuai...</p>
      </div>
    `;

    try {
      const data = await window.api.searchCars(this.currentFilters);

      if (infoHeader) {
        infoHeader.innerHTML = `
          <div>
            Ditemukan <strong>${data.total}</strong> mobil sesuai kriteria pencarian Anda
          </div>
        `;
      }

      if (data.items.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:3rem; background:white; border-radius:var(--radius-md); border:1px dashed var(--border);">
            <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>
            <h3 style="color:var(--text-main); margin-bottom:0.25rem;">Tidak Ada Mobil Eksak Ditemukan</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">Coba sesuaikan filter pencarian atau budget Anda.</p>
          </div>
        `;
      } else {
        grid.innerHTML = data.items.map(c => this.renderCarCard(c)).join("");
      }

      // Check 6 & 7: Fallback recommendations from matched segment
      if (fallbackBox) {
        if (data.total < 10 && data.segmen_cocok && data.rekomendasi && data.rekomendasi.length > 0) {
          fallbackBox.style.display = "block";
          fallbackBox.innerHTML = `
            <div style="background:white; border-radius:var(--radius-lg); border:2px solid ${data.segmen_cocok.warna_hex || 'var(--primary)'}; padding:1.5rem; margin-top:2rem; box-shadow:var(--shadow-md);">
              <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
                <span class="badge" style="background:${data.segmen_cocok.warna_hex}; color:white; font-size:0.85rem; padding:0.35rem 0.75rem;">
                  🤖 Rekomendasi ML CekGarasi
                </span>
                <span style="font-size:1.15rem; font-weight:700; color:var(--text-main);">
                  Segmen Cocok: ${data.segmen_cocok.nama_lengkap}
                </span>
              </div>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.25rem;">
                Berdasarkan rentang tahun dan harga yang Anda pilih, profil kendaraan berikut paling sesuai dengan kebutuhan Anda:
              </p>
              <div class="cars-grid" style="margin-bottom:0;">
                ${data.rekomendasi.map(c => this.renderCarCard(c)).join("")}
              </div>
            </div>
          `;
        } else {
          fallbackBox.style.display = "none";
          fallbackBox.innerHTML = "";
        }
      }

      // Render pagination
      this.renderPagination(data);
    } catch (err) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--accent-red);">
          Gagal mencari mobil: ${err.message}
        </div>
      `;
    }
  }

  getCarPhoto(car) {
    const name = (car.nama_mobil || car.model_mobil || "").toUpperCase();
    if (name.includes("BRIO") || name.includes("AGYA") || name.includes("AYLA") || name.includes("YARIS") || name.includes("IGNIS") || name.includes("BALENO") || name.includes("SIRION") || name.includes("MARCH") || name.includes("SPARK") || name.includes("KARIMUN") || name.includes("GO") || name.includes("S-PRESSO")) {
      return "images/car_hatchback.jpg";
    }
    if (name.includes("AVANZA") || name.includes("XPANDER") || name.includes("ERTIGA") || name.includes("INNOVA") || name.includes("MOBILIO") || name.includes("CALYA") || name.includes("SIGRA") || name.includes("SIENTA") || name.includes("LIVINA") || name.includes("CORTEZ") || name.includes("CONFERO") || name.includes("FREED") || name.includes("SERENA") || name.includes("BIANTE")) {
      return "images/car_mpv.jpg";
    }
    if (name.includes("HR-V") || name.includes("CR-V") || name.includes("FORTUNER") || name.includes("PAJERO") || name.includes("TERIOS") || name.includes("RUSH") || name.includes("OUTLANDER") || name.includes("ALMAZ") || name.includes("CRETA") || name.includes("CX-5") || name.includes("CX-3") || name.includes("ECLIPSE") || name.includes("ROCKY") || name.includes("RAIZE") || name.includes("SANTA FE") || name.includes("X-TRAIL") || name.includes("SX4") || name.includes("JUKE") || name.includes("STARGAZER")) {
      return "images/car_suv.jpg";
    }
    if (name.includes("BMW") || name.includes("CIVIC") || name.includes("CITY") || name.includes("SEDAN")) {
      return "images/car_sedan.jpg";
    }
    if (car.klaster === 0) return "images/car_suv.jpg";
    if (car.klaster === 1) return "images/car_mpv.jpg";
    return "images/car_hatchback.jpg";
  }

  renderCarCard(car) {
    const cicilanJt = car.cicilan_rp ? (car.cicilan_rp / 1_000_000).toFixed(1) : "-";
    const hargaJt = (car.harga_rp / 1_000_000).toFixed(0);
    const photoUrl = this.getCarPhoto(car);

    return `
      <div class="car-card">
        <div class="car-visual" style="background-image: url('${photoUrl}'); background-size: cover; background-position: center; height: 180px;">
          <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(15,23,42,0.65) 0%, transparent 60%);"></div>
          <span class="car-badge-cluster badge badge-seg-${car.klaster}" style="box-shadow:0 2px 6px rgba(0,0,0,0.3);">${car.segmen_pendek}</span>
          <span style="position:absolute; bottom:0.6rem; right:0.75rem; color:white; font-size:0.75rem; font-weight:600; text-shadow:0 1px 3px rgba(0,0,0,0.8);">
            📷 Foto Terverifikasi
          </span>
        </div>
        <div class="car-body">
          <div class="car-title" title="${car.nama_mobil}">${car.nama_mobil}</div>
          <div class="car-specs">
            <span class="car-spec-pill">📅 ${car.tahun}</span>
            <span class="car-spec-pill">🛣️ ${car.jarak_tempuh_ribu_km} rb km</span>
            <span class="car-spec-pill">⚙️ ${car.transmisi}</span>
            <span class="car-spec-pill">📍 ${car.lokasi || "Jabodetabek"}</span>
          </div>
          <div class="car-pricing">
            <div>
              <div class="car-price-val">Rp ${hargaJt} Jt</div>
              <div class="car-cicilan-est">Cicilan est. Rp ${cicilanJt} Jt/bln</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.buyerPlatform.openCarDetail(${car.id})">
              Lihat Rincian
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderPagination(data) {
    const container = document.getElementById("search-pagination");
    if (!container) return;

    if (data.total_pages <= 1) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:center; gap:0.5rem; margin-top:2rem;">
        <button class="btn btn-secondary btn-sm" ${this.currentFilters.page <= 1 ? 'disabled' : ''} onclick="window.buyerPlatform.changeSearchPage(${this.currentFilters.page - 1})">← Sebelumnya</button>
        <span style="display:flex; align-items:center; padding:0 1rem; font-size:0.9rem; font-weight:600;">Halaman ${this.currentFilters.page} dari ${data.total_pages}</span>
        <button class="btn btn-secondary btn-sm" ${this.currentFilters.page >= data.total_pages ? 'disabled' : ''} onclick="window.buyerPlatform.changeSearchPage(${this.currentFilters.page + 1})">Berikutnya →</button>
      </div>
    `;
  }

  changeSearchPage(page) {
    this.currentFilters.page = page;
    this.searchCars();
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  async openCarDetail(carId) {
    const modal = document.getElementById("car-detail-modal");
    const content = document.getElementById("car-detail-content");
    if (!modal || !content) return;

    content.innerHTML = `<div style="text-align:center; padding:3rem;"><div class="spinner"></div><p>Memuat rincian mobil...</p></div>`;
    modal.classList.add("open");

    try {
      const car = await window.api.getCarDetail(carId);

      const hargaJt = (car.harga_rp / 1_000_000).toFixed(0);
      const cicilanJt = car.cicilan_rp ? (car.cicilan_rp / 1_000_000).toFixed(1) : "-";
      const pos = car.posisi_harga || {};
      const mainPhoto = this.getCarPhoto(car);

      content.innerHTML = `
        <!-- Galeri Foto Mobil -->
        <div style="position:relative; border-radius:var(--radius-md); overflow:hidden; margin-bottom:1.5rem; box-shadow:var(--shadow-md);">
          <img 
            id="detail-main-img" 
            src="${mainPhoto}" 
            alt="${car.nama_mobil}" 
            style="width:100%; height:320px; object-fit:cover; display:block;"
          />
          <div style="position:absolute; bottom:0; inset-inline:0; padding:1.25rem; background:linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%); display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <span class="badge badge-seg-${car.klaster}" style="margin-bottom:0.4rem;">${car.segmen_nama}</span>
              <h2 style="font-size:1.6rem; color:white; margin:0;">${car.nama_mobil}</h2>
              <div style="font-size:0.85rem; color:#CBD5E1; margin-top:0.25rem;">
                Tahun ${car.tahun} • ${car.jarak_tempuh_ribu_km} rb km • ${car.transmisi} • Plat ${car.jenis_plat.toUpperCase()}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.8rem; font-weight:800; color:#60A5FA; font-family:'Outfit', sans-serif;">
                Rp ${hargaJt} Jt
              </div>
              <div style="font-size:0.8rem; color:#E2E8F0;">
                Est. cicilan Rp ${cicilanJt} Jt/bln
              </div>
            </div>
          </div>
        </div>

        <!-- Thumbnail Galeri Sudut Pengambilan Gambar -->
        <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem;">
          <div style="flex:1; height:70px; border-radius:var(--radius-sm); overflow:hidden; border:2px solid var(--primary); cursor:pointer;" onclick="document.getElementById('detail-main-img').src='${mainPhoto}'">
            <img src="${mainPhoto}" style="width:100%; height:100%; object-fit:cover;" alt="Tampak Depan" />
          </div>
          <div style="flex:1; height:70px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--border); cursor:pointer;" onclick="document.getElementById('detail-main-img').src='images/showroom_hero.jpg'">
            <img src="images/showroom_hero.jpg" style="width:100%; height:100%; object-fit:cover;" alt="Showroom" />
          </div>
          <div style="flex:1; height:70px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--border); cursor:pointer;" onclick="document.getElementById('detail-main-img').src='images/car_sedan.jpg'">
            <img src="images/car_sedan.jpg" style="width:100%; height:100%; object-fit:cover;" alt="Profil Samping" />
          </div>
          <div style="flex:1; height:70px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--border); cursor:pointer;" onclick="document.getElementById('detail-main-img').src='images/car_suv.jpg'">
            <img src="images/car_suv.jpg" style="width:100%; height:100%; object-fit:cover;" alt="Detail Mesin" />
          </div>
        </div>

        <!-- Spesifikasi Rinci -->
        <h4 style="font-size:1rem; margin-bottom:0.75rem;">Spesifikasi Kendaraan</h4>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.75rem; background:var(--bg-page); padding:1rem; border-radius:var(--radius-sm); margin-bottom:1.5rem;">
          <div><span style="font-size:0.75rem; color:var(--text-muted);">Merek & Model</span><div style="font-weight:700;">${car.merek} ${car.model_mobil}</div></div>
          <div><span style="font-size:0.75rem; color:var(--text-muted);">Tahun</span><div style="font-weight:700;">${car.tahun}</div></div>
          <div><span style="font-size:0.75rem; color:var(--text-muted);">Jarak Tempuh</span><div style="font-weight:700;">${car.jarak_tempuh_ribu_km} rb km</div></div>
          <div><span style="font-size:0.75rem; color:var(--text-muted);">Transmisi & Plat</span><div style="font-weight:700;">${car.transmisi} (Plat ${car.jenis_plat.toUpperCase()})</div></div>
        </div>

        <!-- 11 Fitur Kendaraan -->
        <h4 style="font-size:1rem; margin-bottom:0.75rem;">Kelengkapan 11 Fitur Inspeksi (${car.total_fitur} Fitur Aktif)</h4>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem;">
          ${(car.features || []).map(f => `
            <span class="badge ${f.aktif ? 'badge-tayang' : 'badge-draft'}" style="font-size:0.85rem; padding:0.4rem 0.75rem;">
              ${f.aktif ? '✓' : '✗'} ${f.nama_id}
            </span>
          `).join("")}
        </div>

        <!-- Posisi Harga Segmen (Q1 / Median / Q3) -->
        <h4 style="font-size:1rem; margin-bottom:0.75rem;">Analisis Nilai Pasar di Segmen ${car.segmen_pendek}</h4>
        <div style="background:#F1F5F9; padding:1.25rem; border-radius:var(--radius-sm); margin-bottom:1.5rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.5rem;">
            <span>Kuartil 1 (Q1): <strong>Rp ${((pos.q1 || 0) / 1_000_000).toFixed(0)} Jt</strong></span>
            <span style="font-weight:700; color:var(--primary);">Median Segmen: Rp ${((pos.median || 0) / 1_000_000).toFixed(0)} Jt</span>
            <span>Kuartil 3 (Q3): <strong>Rp ${((pos.q3 || 0) / 1_000_000).toFixed(0)} Jt</strong></span>
          </div>
          <div style="font-size:0.9rem; color:var(--text-main); font-weight:600;">
            Status Harga Unit: <span style="color:var(--primary);">${pos.kategori || "-"}</span> (${pos.selisih_persen_vs_median > 0 ? '+' : ''}${pos.selisih_persen_vs_median?.toFixed(1)}% terhadap median pasar)
          </div>
        </div>

        <!-- Simulasi Kredit -->
        <h4 style="font-size:1rem; margin-bottom:0.75rem;">Simulasi Angsuran Bulanan (Estimasi Anuitas 8% p.a., DP 20%)</h4>
        <div class="data-table-container" style="margin-bottom:1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tenor</th>
                <th>DP 20%</th>
                <th>Pokok Pembiayaan</th>
                <th>Estimasi Angsuran</th>
              </tr>
            </thead>
            <tbody>
              ${(car.simulasi_cicilan || []).map(s => `
                <tr>
                  <td><strong>${s.tenor_tahun} Tahun</strong> (${s.tenor_bulan} bln)</td>
                  <td>Rp ${(s.dp_rp / 1_000_000).toFixed(1)} Jt</td>
                  <td>Rp ${(s.pokok_rp / 1_000_000).toFixed(1)} Jt</td>
                  <td style="color:var(--primary); font-weight:700;">Rp ${(s.cicilan_per_bulan / 1_000_000).toFixed(2)} Jt / bln</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <!-- Tombol Aksi -->
        <div style="display:flex; gap:1rem; justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="document.getElementById('car-detail-modal').classList.remove('open')">
            Tutup
          </button>
          <button class="btn btn-primary btn-lg" onclick="window.buyerPlatform.openBookingTestDrive(${car.id}, '${car.nama_mobil}')">
            🚗 Jadwalkan Test Drive Gratis
          </button>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color:var(--accent-red); padding:2rem;">Gagal memuat rincian mobil: ${err.message}</div>`;
    }
  }

  openBookingTestDrive(carId, carName) {
    document.getElementById('car-detail-modal').classList.remove('open');
    const modal = document.getElementById("booking-modal");
    if (!modal) return;

    document.getElementById("booking-car-id").value = carId;
    document.getElementById("booking-car-name").innerText = carName;

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("booking-date").value = tomorrow.toISOString().split("T")[0];

    modal.classList.add("open");
  }

  async submitTestDriveBooking(e) {
    e.preventDefault();
    const carId = parseInt(document.getElementById("booking-car-id").value, 10);
    const dateVal = document.getElementById("booking-date").value;
    const timeVal = document.getElementById("booking-time").value;
    const branchVal = document.getElementById("booking-branch").value;
    const notesVal = document.getElementById("booking-notes").value;

    try {
      const res = await window.api.bookTestDrive({
        car_id: carId,
        tanggal: dateVal,
        jam: timeVal + ":00",
        cabang: branchVal,
        catatan: notesVal
      });

      document.getElementById("booking-modal").classList.remove("open");
      window.app.showToast(`Test drive berhasil diajukan! Kode registrasi: ${res.kode}`, "success");
      
      // Show confirmation dialog
      alert(`Jadwal Test Drive Berhasil Dibuat!\n\nKode Registrasi: ${res.kode}\nCabang: ${branchVal}\nTanggal: ${dateVal} Pukul ${timeVal}\n\nTim dealer CekGarasi kami akan segera menghubungi Anda.`);
    } catch (err) {
      window.app.showToast(err.message, "error");
    }
  }

  setupListeners() {
    // Quick search from Hero
    const heroBtn = document.getElementById("btn-hero-search");
    if (heroBtn) {
      heroBtn.addEventListener("click", () => {
        const query = document.getElementById("hero-search-query")?.value || "";
        const brand = document.getElementById("hero-search-brand")?.value || "";
        const maxPrice = document.getElementById("hero-search-price")?.value || "";

        this.currentFilters.q = query;
        this.currentFilters.merek = brand;
        this.currentFilters.harga_max = maxPrice ? parseInt(maxPrice, 10) * 1_000_000 : "";
        this.currentFilters.page = 1;

        window.app.navigatePage("cari");
        this.searchCars();
      });
    }

    // Main search filters change
    const applyFiltersBtn = document.getElementById("btn-apply-filters");
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", () => {
        this.currentFilters.q = document.getElementById("filter-query")?.value || "";
        this.currentFilters.merek = document.getElementById("filter-brand")?.value || "";
        this.currentFilters.model = document.getElementById("filter-model")?.value || "";
        this.currentFilters.transmisi = document.getElementById("filter-transmission")?.value || "";
        this.currentFilters.lokasi = document.getElementById("filter-location")?.value || "";
        this.currentFilters.sort = document.getElementById("filter-sort")?.value || "termurah";

        const thMin = document.getElementById("filter-year-min")?.value;
        const thMax = document.getElementById("filter-year-max")?.value;
        const hgMin = document.getElementById("filter-price-min")?.value;
        const hgMax = document.getElementById("filter-price-max")?.value;

        this.currentFilters.tahun_min = thMin ? parseInt(thMin, 10) : "";
        this.currentFilters.tahun_max = thMax ? parseInt(thMax, 10) : "";
        this.currentFilters.harga_min = hgMin ? parseInt(hgMin, 10) * 1_000_000 : "";
        this.currentFilters.harga_max = hgMax ? parseInt(hgMax, 10) * 1_000_000 : "";
        this.currentFilters.page = 1;

        this.searchCars();
      });
    }

    // Reset filters
    const resetFiltersBtn = document.getElementById("btn-reset-filters");
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        this.currentFilters = {
          q: "",
          merek: "",
          model: "",
          tahun_min: "",
          tahun_max: "",
          harga_min: "",
          harga_max: "",
          transmisi: "",
          lokasi: "",
          jenis_plat: "",
          klaster: "",
          sort: "termurah",
          page: 1,
          limit: 12
        };

        if (document.getElementById("filter-query")) document.getElementById("filter-query").value = "";
        if (document.getElementById("filter-brand")) document.getElementById("filter-brand").value = "";
        if (document.getElementById("filter-model")) document.getElementById("filter-model").value = "";
        if (document.getElementById("filter-transmission")) document.getElementById("filter-transmission").value = "";
        if (document.getElementById("filter-location")) document.getElementById("filter-location").value = "";
        if (document.getElementById("filter-year-min")) document.getElementById("filter-year-min").value = "";
        if (document.getElementById("filter-year-max")) document.getElementById("filter-year-max").value = "";
        if (document.getElementById("filter-price-min")) document.getElementById("filter-price-min").value = "";
        if (document.getElementById("filter-price-max")) document.getElementById("filter-price-max").value = "";

        this.searchCars();
      });
    }

    // Booking form submit
    const bookingForm = document.getElementById("form-booking-testdrive");
    if (bookingForm) {
      bookingForm.addEventListener("submit", (e) => this.submitTestDriveBooking(e));
    }
  }
}

window.buyerPlatform = new BuyerPlatform();
