// Admin Dealer Platform Logic
class AdminPlatform {
  constructor() {
    this.summaryData = null;
    this.scatterData = null;
    this.evalData = null;
    this.carsData = null;
    this.leadsData = null;
    this.currentCarPage = 1;
  }

  async init() {
    // Only fetch if admin token exists
    if (!window.api.token) {
      return;
    }
    await this.loadSummary();
    await this.loadSegmentation();
    await this.loadInventory();
    await this.loadLeads();
    this.setupListeners();
  }

  async loadSummary() {
    try {
      this.summaryData = await window.api.getAdminSummary();
      const kpi = this.summaryData.kpi || {};

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };

      setVal("admin-kpi-total-mobil", kpi.total_mobil || 0);
      setVal("admin-kpi-tayang", kpi.total_tayang || 0);
      setVal("admin-kpi-median-harga", `Rp ${(kpi.median_harga / 1_000_000).toFixed(0)} Jt`);
      setVal("admin-kpi-testdrive", kpi.total_test_drive || 0);
      setVal("admin-kpi-leads-menunggu", kpi.leads_menunggu || 0);
      setVal("admin-kpi-silhouette", kpi.silhouette_score ? kpi.silhouette_score.toFixed(4) : "-");

      // Narasi insights
      const insightsContainer = document.getElementById("admin-insights-container");
      if (insightsContainer && this.summaryData.narasi_insight) {
        insightsContainer.innerHTML = this.summaryData.narasi_insight.map(txt => `
          <div style="background:white; border-left:4px solid var(--primary); padding:0.85rem 1.25rem; border-radius:var(--radius-sm); margin-bottom:0.75rem; box-shadow:var(--shadow-sm); font-size:0.9rem;">
            💡 ${txt}
          </div>
        `).join("");
      }

      // Anomali harga table
      const anomaliContainer = document.getElementById("admin-anomali-tbody");
      if (anomaliContainer && this.summaryData.anomali_harga) {
        anomaliContainer.innerHTML = this.summaryData.anomali_harga.map(a => `
          <tr>
            <td><strong>${a.nama_mobil}</strong> (${a.tahun})</td>
            <td><span class="badge badge-seg-${a.klaster}">Klaster ${a.klaster}</span></td>
            <td style="font-weight:700; color:var(--accent-red);">Rp ${(a.harga_rp / 1_000_000).toFixed(0)} Jt</td>
            <td>Rp ${(a.q1_segmen / 1_000_000).toFixed(0)} Jt - Rp ${(a.q3_segmen / 1_000_000).toFixed(0)} Jt</td>
            <td><span class="badge badge-draft">${a.tipe_anomali}</span></td>
          </tr>
        `).join("");
      }
    } catch (err) {
      console.error("Gagal memuat ringkasan admin:", err);
    }
  }

  async loadSegmentation() {
    try {
      this.scatterData = await window.api.getScatterData();
      this.evalData = await window.api.getMlEvaluation();

      this.renderPcaScatterPlot(this.scatterData);
      this.renderEvaluationTable(this.evalData);
    } catch (err) {
      console.error("Gagal memuat segmentasi admin:", err);
    }
  }

  renderPcaScatterPlot(points) {
    const container = document.getElementById("pca-scatter-container");
    if (!container || !points || points.length === 0) return;

    // SVG scatter plot dimensions
    const width = 640;
    const height = 360;
    const padding = 40;

    const xs = points.map(p => p.pca1);
    const ys = points.map(p => p.pca2);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const scaleX = val => padding + ((val - minX) / (maxX - minX)) * (width - 2 * padding);
    const scaleY = val => height - padding - ((val - minY) / (maxY - minY)) * (height - 2 * padding);

    const dots = points.map(p => {
      const cx = scaleX(p.pca1).toFixed(1);
      const cy = scaleY(p.pca2).toFixed(1);
      const tooltip = `${p.nama_mobil} (${p.tahun}) - Rp ${(p.harga_rp / 1_000_000).toFixed(0)}Jt | ${p.segmen_nama}`;
      return `
        <circle 
          cx="${cx}" 
          cy="${cy}" 
          r="4.5" 
          fill="${p.warna}" 
          opacity="0.75" 
          stroke="#FFFFFF" 
          stroke-width="0.8"
          style="cursor:pointer; transition:all 0.15s ease;"
          onmouseover="this.setAttribute('r', '8'); this.setAttribute('opacity', '1'); document.getElementById('scatter-tooltip').innerText = '${tooltip}';"
          onmouseout="this.setAttribute('r', '4.5'); this.setAttribute('opacity', '0.75');"
        />
      `;
    }).join("");

    container.innerHTML = `
      <div style="position:relative; background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <h4 style="font-size:1rem; color:var(--text-main);">Proyeksi PCA (2 Komponen) - 609 Mobil</h4>
          <div style="display:flex; gap:0.75rem; font-size:0.75rem;">
            <span style="display:flex; align-items:center; gap:0.3rem;"><span style="width:10px; height:10px; border-radius:50%; background:var(--seg-0);"></span> Premium</span>
            <span style="display:flex; align-items:center; gap:0.3rem;"><span style="width:10px; height:10px; border-radius:50%; background:var(--seg-1);"></span> Keluarga Muda</span>
            <span style="display:flex; align-items:center; gap:0.3rem;"><span style="width:10px; height:10px; border-radius:50%; background:var(--seg-2);"></span> Ekonomis</span>
          </div>
        </div>
        <div id="scatter-tooltip" style="min-height:1.4rem; font-size:0.8rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem;">
          Arahkan kursor pada titik untuk melihat rincian mobil
        </div>
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; background:#F8FAFC; border-radius:var(--radius-sm);">
          <!-- Axis lines -->
          <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#CBD5E1" stroke-width="1.5"/>
          <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#CBD5E1" stroke-width="1.5"/>
          <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#64748B">PCA Komponen 1 (Dimensi Utama)</text>
          <text x="15" y="${height / 2}" text-anchor="middle" font-size="11" fill="#64748B" transform="rotate(-90 15 ${height / 2})">PCA Komponen 2</text>
          ${dots}
        </svg>
      </div>
    `;
  }

  renderEvaluationTable(evalData) {
    const tbody = document.getElementById("admin-eval-tbody");
    if (!tbody || !evalData || !evalData.evaluasi_k) return;

    tbody.innerHTML = evalData.evaluasi_k.map(row => `
      <tr style="${row.is_production ? 'background:#EFF6FF; font-weight:700;' : ''}">
        <td><strong>K = ${row.k}</strong></td>
        <td>${row.inertia.toFixed(2)}</td>
        <td style="color:${row.silhouette >= 0.31 ? 'var(--accent-green)' : 'var(--text-main)'}; font-weight:700;">
          ${row.silhouette.toFixed(4)}
        </td>
        <td>
          ${row.is_production ? '<span class="badge badge-tayang">★ Model Produksi (Aktif)</span>' : '<span class="badge badge-draft">Kandidat Evaluasi</span>'}
        </td>
      </tr>
    `).join("");
  }

  async runExperiment(k) {
    const resultBox = document.getElementById("experiment-result-box");
    if (!resultBox) return;

    resultBox.innerHTML = `<div style="text-align:center; padding:1.5rem;"><div class="spinner"></div><p>Menjalankan eksperimen in-memory K=${k}...</p></div>`;

    try {
      const res = await window.api.runKExperiment(k);
      resultBox.innerHTML = `
        <div style="background:white; border:2px solid var(--primary); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h4 style="color:var(--primary); margin:0;">Hasil Simulasi K = ${res.k} (In-Memory, Tidak Mengubah Database)</h4>
            <span class="badge badge-info">Silhouette Score: ${res.silhouette.toFixed(4)}</span>
          </div>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Klaster</th>
                  <th>Jumlah Unit</th>
                  <th>Share</th>
                  <th>Median Harga</th>
                  <th>Median Tahun</th>
                  <th>Rata-rata KM</th>
                  <th>Rata-rata Fitur</th>
                </tr>
              </thead>
              <tbody>
                ${(res.profiles || []).map(p => `
                  <tr>
                    <td><strong>Klaster ${p.klaster}</strong></td>
                    <td>${p.count} Mobil</td>
                    <td>${(p.share * 100).toFixed(1)}%</td>
                    <td style="font-weight:700;">Rp ${(p.median_harga / 1_000_000).toFixed(0)} Jt</td>
                    <td>${p.median_tahun}</td>
                    <td>${p.mean_km.toFixed(1)} rb km</td>
                    <td>${p.mean_total_fitur.toFixed(1)} fitur</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
      window.app.showToast(`Simulasi K=${k} selesai (Silhouette: ${res.silhouette.toFixed(4)})`, "success");
    } catch (err) {
      resultBox.innerHTML = `<div style="color:var(--accent-red); padding:1rem;">Gagal menjalankan eksperimen: ${err.message}</div>`;
    }
  }

  async loadInventory() {
    const tbody = document.getElementById("admin-inventory-tbody");
    if (!tbody) return;

    try {
      const data = await window.api.getAdminCars({ page: this.currentCarPage, limit: 15 });
      this.carsData = data;

      tbody.innerHTML = (data.items || []).map(c => `
        <tr>
          <td><strong>#${c.id}</strong></td>
          <td><strong>${c.nama_mobil}</strong></td>
          <td>${c.tahun}</td>
          <td>${c.jarak_tempuh_ribu_km} rb km</td>
          <td style="font-weight:700;">Rp ${(c.harga_rp / 1_000_000).toFixed(0)} Jt</td>
          <td><span class="badge badge-seg-${c.klaster}">${c.segmen_nama}</span></td>
          <td><span class="badge ${c.status === 'tayang' ? 'badge-tayang' : 'badge-draft'}">${c.status}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.adminPlatform.deleteCar(${c.id})">Hapus</button>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      console.error("Gagal memuat inventori admin:", err);
    }
  }

  async deleteCar(carId) {
    if (!confirm(`Hapus mobil #${carId} dari database?`)) return;
    try {
      await window.api.deleteCar(carId);
      window.app.showToast("Mobil berhasil dihapus.", "success");
      await this.loadInventory();
      await this.loadSummary();
    } catch (err) {
      window.app.showToast(err.message, "error");
    }
  }

  async loadLeads() {
    const tbody = document.getElementById("admin-leads-tbody");
    if (!tbody) return;

    try {
      const leads = await window.api.getLeads();
      this.leadsData = leads;

      if (leads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada jadwal test drive yang diajukan.</td></tr>`;
        return;
      }

      tbody.innerHTML = leads.map(l => `
        <tr>
          <td><strong>${l.kode}</strong></td>
          <td>
            <div><strong>${l.pembeli.nama || "-"}</strong></div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${l.pembeli.no_hp || l.pembeli.email || ""}</div>
          </td>
          <td>${l.mobil.nama_mobil || "-"}</td>
          <td>${l.tanggal} Pukul ${l.jam}</td>
          <td>${l.cabang}</td>
          <td>
            <select class="form-control" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:auto;" onchange="window.adminPlatform.updateLeadStatus(${l.id}, this.value)">
              <option value="menunggu" ${l.status === 'menunggu' ? 'selected' : ''}>Menunggu</option>
              <option value="terkonfirmasi" ${l.status === 'terkonfirmasi' ? 'selected' : ''}>Terkonfirmasi</option>
              <option value="selesai" ${l.status === 'selesai' ? 'selected' : ''}>Selesai</option>
              <option value="dibatalkan" ${l.status === 'dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
            </select>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      console.error("Gagal memuat leads admin:", err);
    }
  }

  async updateLeadStatus(leadId, status) {
    try {
      await window.api.updateLeadStatus(leadId, status);
      window.app.showToast(`Status lead berhasil diperbarui menjadi ${status}.`, "success");
    } catch (err) {
      window.app.showToast(err.message, "error");
    }
  }

  setupListeners() {
    // Simulator K buttons
    document.querySelectorAll(".btn-simulasi-k").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = parseInt(btn.getAttribute("data-k"), 10);
        this.runExperiment(k);
      });
    });

    // Modal Tambah Mobil & Live Segment Predictor
    const btnOpenAddCar = document.getElementById("btn-open-add-car");
    const modalAddCar = document.getElementById("modal-add-car");
    if (btnOpenAddCar && modalAddCar) {
      btnOpenAddCar.addEventListener("click", () => {
        modalAddCar.classList.add("open");
      });
    }

    // Live segment prediction on input change
    const predictInputs = ["newcar-tahun", "newcar-km", "newcar-harga"];
    let predictDebounce;
    predictInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => {
          clearTimeout(predictDebounce);
          predictDebounce = setTimeout(() => this.triggerLivePrediction(), 300);
        });
      }
    });

    document.querySelectorAll(".newcar-feature-chk").forEach(chk => {
      chk.addEventListener("change", () => {
        clearTimeout(predictDebounce);
        predictDebounce = setTimeout(() => this.triggerLivePrediction(), 300);
      });
    });

    // Form Tambah Mobil Submit
    const formAddCar = document.getElementById("form-add-car");
    if (formAddCar) {
      formAddCar.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nama = document.getElementById("newcar-nama").value.trim();
        const merek = document.getElementById("newcar-merek").value.trim();
        const model = document.getElementById("newcar-model").value.trim();
        const tahun = parseInt(document.getElementById("newcar-tahun").value, 10);
        const km = parseFloat(document.getElementById("newcar-km").value);
        const harga = parseInt(document.getElementById("newcar-harga").value, 10);
        const transmisi = document.getElementById("newcar-transmisi").value;
        const plat = document.getElementById("newcar-plat").value;
        const lokasi = document.getElementById("newcar-lokasi").value.trim();

        const activeFeatures = [];
        document.querySelectorAll(".newcar-feature-chk:checked").forEach(chk => {
          activeFeatures.push(parseInt(chk.value, 10));
        });

        try {
          const res = await window.api.createCar({
            nama_mobil: nama,
            merek: merek,
            model_mobil: model,
            tahun: tahun,
            jarak_tempuh_ribu_km: km,
            lokasi: lokasi || null,
            transmisi: transmisi,
            jenis_plat: plat,
            harga_rp: harga,
            feature_ids: activeFeatures,
            status: "tayang"
          });

          modalAddCar.classList.remove("open");
          window.app.showToast(`Mobil berhasil ditambahkan! Masuk ke Klaster ${res.klaster}`, "success");
          formAddCar.reset();
          await this.loadInventory();
          await this.loadSummary();
        } catch (err) {
          window.app.showToast(err.message, "error");
        }
      });
    }
  }

  async triggerLivePrediction() {
    const tahun = parseInt(document.getElementById("newcar-tahun")?.value || "2020", 10);
    const km = parseFloat(document.getElementById("newcar-km")?.value || "50");
    const harga = parseInt(document.getElementById("newcar-harga")?.value || "150000000", 10);
    const totalFitur = document.querySelectorAll(".newcar-feature-chk:checked").length;

    const previewBox = document.getElementById("live-prediction-result");
    if (!previewBox) return;

    try {
      const pred = await window.api.predictSegment({
        tahun,
        jarak_tempuh_ribu_km: km,
        harga_rp: harga,
        total_fitur: totalFitur
      });

      previewBox.innerHTML = `
        <div style="background:var(--bg-page); border:1px solid ${pred.warna_hex}; padding:0.75rem 1rem; border-radius:var(--radius-sm); margin-top:0.75rem;">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Prediksi Otomatis K-Means:</div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
            <span class="badge" style="background:${pred.warna_hex}; color:white;">Klaster ${pred.klaster}</span>
            <strong style="color:var(--text-main); font-size:0.95rem;">${pred.nama_lengkap}</strong>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.35rem;">
            Posisi harga: <strong>${pred.posisi_harga?.kategori || "-"}</strong>
          </div>
        </div>
      `;
    } catch (err) {
      console.error("Live predict error:", err);
    }
  }
}

window.adminPlatform = new AdminPlatform();
