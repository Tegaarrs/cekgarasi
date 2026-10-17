// Database Explorer Logic
class DatabaseExplorer {
  constructor() {
    this.currentTable = "cars";
    this.currentPage = 1;
    this.limit = 25;
    this.searchQuery = "";
    this.sortBy = "id";
    this.sortDir = "asc";
    this.tables = [];
  }

  async init() {
    await this.loadDbInfo();
    await this.loadTablesList();
    await this.loadCurrentTable();
    this.setupListeners();
  }

  async loadDbInfo() {
    try {
      const info = await window.api.getDbInfo();
      const infoContainer = document.getElementById("db-info-stats");
      if (infoContainer) {
        infoContainer.innerHTML = `
          <div class="db-stat-chip">
            <div style="font-size:0.75rem; text-transform:uppercase; opacity:0.8;">Dialek Database</div>
            <div style="font-weight:800; font-size:1.15rem; color:#A78BFA;">${info.dialect}</div>
          </div>
          <div class="db-stat-chip">
            <div style="font-size:0.75rem; text-transform:uppercase; opacity:0.8;">Total Tabel</div>
            <div style="font-weight:800; font-size:1.15rem;">${info.total_tables}</div>
          </div>
          <div class="db-stat-chip">
            <div style="font-size:0.75rem; text-transform:uppercase; opacity:0.8;">Total Baris Data</div>
            <div style="font-weight:800; font-size:1.15rem; color:#34D399;">${info.total_records.toLocaleString("id-ID")}</div>
          </div>
          <div class="db-stat-chip">
            <div style="font-size:0.75rem; text-transform:uppercase; opacity:0.8;">Status Koneksi</div>
            <div style="font-weight:800; font-size:1.15rem; color:#38BDF8;">● Aktif Terhubung</div>
          </div>
        `;
      }
    } catch (err) {
      console.error("Gagal memuat info DB:", err);
    }
  }

  async loadTablesList() {
    try {
      this.tables = await window.api.getDbTables();
      const tabsContainer = document.getElementById("db-table-tabs");
      if (!tabsContainer) return;

      tabsContainer.innerHTML = this.tables.map(t => `
        <button class="db-tab-btn ${t.table_name === this.currentTable ? 'active' : ''}" data-table="${t.table_name}">
          📁 ${t.table_name} <span class="badge ${t.table_name === this.currentTable ? 'badge-info' : ''}" style="margin-left:0.35rem; font-size:0.7rem;">${t.row_count}</span>
        </button>
      `).join("");

      tabsContainer.querySelectorAll(".db-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.currentTable = btn.getAttribute("data-table");
          this.currentPage = 1;
          this.searchQuery = "";
          this.sortBy = "";
          tabsContainer.querySelectorAll(".db-tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.loadCurrentTable();
        });
      });
    } catch (err) {
      console.error("Gagal memuat daftar tabel:", err);
    }
  }

  async loadCurrentTable() {
    const tableContainer = document.getElementById("db-data-view");
    if (!tableContainer) return;

    tableContainer.innerHTML = `
      <div style="text-align:center; padding:3rem; color:var(--text-muted);">
        <div class="spinner" style="margin-bottom:0.75rem;"></div>
        <div>Memuat data tabel <strong>${this.currentTable}</strong>...</div>
      </div>
    `;

    try {
      const data = await window.api.getTableData(this.currentTable, {
        page: this.currentPage,
        limit: this.limit,
        q: this.searchQuery,
        sort_by: this.sortBy,
        sort_dir: this.sortDir
      });

      this.renderTableData(data);
    } catch (err) {
      tableContainer.innerHTML = `
        <div style="padding:2rem; text-align:center; color:var(--accent-red);">
          Gagal mengambil data tabel: ${err.message}
        </div>
      `;
    }
  }

  renderTableData(data) {
    const tableContainer = document.getElementById("db-data-view");
    if (!tableContainer) return;

    const currentTableMeta = this.tables.find(t => t.table_name === this.currentTable);
    const columns = data.columns || [];
    const rows = data.rows || [];

    let thHtml = columns.map(c => {
      const isSorted = this.sortBy === c;
      const arrow = isSorted ? (this.sortDir === "asc" ? "▲" : "▼") : "";
      return `
        <th style="cursor:pointer;" onclick="window.dbExplorer.handleSort('${c}')">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <span>${c}</span>
            <span style="font-size:0.7rem; color:var(--primary);">${arrow}</span>
          </div>
        </th>
      `;
    }).join("");

    let trHtml = "";
    if (rows.length === 0) {
      trHtml = `<tr><td colspan="${columns.length}" style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada baris data ditemukan.</td></tr>`;
    } else {
      trHtml = rows.map(r => {
        const tds = columns.map(c => {
          let val = r[c];
          if (val === null || val === undefined) {
            return `<td style="color:var(--text-light); font-style:italic;">NULL</td>`;
          }
          if (typeof val === "boolean") {
            return `<td><span class="badge ${val ? 'badge-tayang' : 'badge-draft'}">${val ? 'TRUE' : 'FALSE'}</span></td>`;
          }
          if (typeof val === "object") {
            return `<td><code>${JSON.stringify(val)}</code></td>`;
          }
          // Highlight primary keys or special fields
          if (c === "id") {
            return `<td style="font-weight:700; color:var(--primary);">${val}</td>`;
          }
          if (c === "klaster") {
            const badgeClass = `badge-seg-${val}`;
            return `<td><span class="badge ${badgeClass}">Klaster ${val}</span></td>`;
          }
          if (c.includes("harga") && typeof val === "number") {
            return `<td style="font-weight:600;">Rp ${val.toLocaleString("id-ID")}</td>`;
          }
          return `<td>${String(val)}</td>`;
        }).join("");
        return `<tr>${tds}</tr>`;
      }).join("");
    }

    tableContainer.innerHTML = `
      <div class="db-toolbar">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <h3 style="font-size:1.15rem; color:var(--text-main); margin:0;">Tabel: <span style="color:var(--primary);">${this.currentTable}</span></h3>
          <span class="badge badge-info">${data.total} baris total</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <input 
            type="text" 
            id="db-search-input" 
            class="form-control" 
            placeholder="Cari dalam tabel..." 
            value="${this.searchQuery}" 
            style="width:220px; padding:0.4rem 0.75rem; font-size:0.85rem;"
          />
          <select id="db-limit-select" class="form-control" style="width:auto; padding:0.4rem 0.75rem; font-size:0.85rem;">
            <option value="10" ${this.limit === 10 ? 'selected' : ''}>10 / hal</option>
            <option value="25" ${this.limit === 25 ? 'selected' : ''}>25 / hal</option>
            <option value="50" ${this.limit === 50 ? 'selected' : ''}>50 / hal</option>
            <option value="100" ${this.limit === 100 ? 'selected' : ''}>100 / hal</option>
          </select>
          <a href="/api/database/export/${this.currentTable}?format=csv" target="_blank" class="btn btn-secondary btn-sm" download>
            📥 Ekspor CSV
          </a>
          <a href="/api/database/export/${this.currentTable}?format=json" target="_blank" class="btn btn-secondary btn-sm" download>
            📥 Ekspor JSON
          </a>
        </div>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr>${thHtml}</tr></thead>
          <tbody>${trHtml}</tbody>
        </table>
      </div>
      <div style="padding:0.75rem 1.25rem; background:#F8FAFC; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
        <div style="font-size:0.85rem; color:var(--text-muted);">
          Menampilkan baris ${rows.length > 0 ? (this.currentPage - 1) * this.limit + 1 : 0} - ${(this.currentPage - 1) * this.limit + rows.length} dari ${data.total}
        </div>
        <div style="display:flex; gap:0.35rem;">
          <button class="btn btn-secondary btn-sm" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="window.dbExplorer.changePage(${this.currentPage - 1})">← Sebelumnya</button>
          <span style="display:flex; align-items:center; padding:0 0.75rem; font-size:0.85rem; font-weight:600;">Hal ${this.currentPage} / ${data.total_pages}</span>
          <button class="btn btn-secondary btn-sm" ${this.currentPage >= data.total_pages ? 'disabled' : ''} onclick="window.dbExplorer.changePage(${this.currentPage + 1})">Berikutnya →</button>
        </div>
      </div>
    `;

    // Bind search and limit listeners
    const searchInput = document.getElementById("db-search-input");
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.trim();
          this.currentPage = 1;
          this.loadCurrentTable();
        }, 400);
      });
    }

    const limitSelect = document.getElementById("db-limit-select");
    if (limitSelect) {
      limitSelect.addEventListener("change", (e) => {
        this.limit = parseInt(e.target.value, 10);
        this.currentPage = 1;
        this.loadCurrentTable();
      });
    }
  }

  handleSort(columnName) {
    if (this.sortBy === columnName) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
    } else {
      this.sortBy = columnName;
      this.sortDir = "asc";
    }
    this.loadCurrentTable();
  }

  changePage(newPage) {
    this.currentPage = newPage;
    this.loadCurrentTable();
  }

  setupListeners() {
    // SQL Console execution
    const runSqlBtn = document.getElementById("btn-run-sql");
    const sqlTextarea = document.getElementById("sql-query-input");
    const sqlResultsBox = document.getElementById("sql-results-container");

    if (runSqlBtn && sqlTextarea) {
      runSqlBtn.addEventListener("click", async () => {
        const query = sqlTextarea.value.trim();
        if (!query) {
          window.app.showToast("Silakan tulis query SQL terlebih dahulu.", "error");
          return;
        }

        runSqlBtn.disabled = true;
        runSqlBtn.innerText = "Mengeksekusi...";
        sqlResultsBox.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-light);">Menjalankan query...</div>`;

        try {
          // If not logged in as admin, check token
          const data = await window.api.executeSqlQuery(query, 100);
          this.renderSqlResults(data, sqlResultsBox);
          window.app.showToast(`Query berhasil dieksekusi (${data.elapsed_ms} ms)`, "success");
        } catch (err) {
          sqlResultsBox.innerHTML = `
            <div style="background:#450A0A; border:1px solid #7F1D1D; color:#FCA5A5; padding:1rem; border-radius:var(--radius-sm); font-family:monospace; font-size:0.85rem;">
              <strong>Error SQL:</strong> ${err.message}
            </div>
          `;
          window.app.showToast(err.message, "error");
        } finally {
          runSqlBtn.disabled = false;
          runSqlBtn.innerText = "⚡ Jalankan Query";
        }
      });
    }

    // Preset query chips
    document.querySelectorAll(".sql-preset-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const query = chip.getAttribute("data-query");
        if (sqlTextarea && query) {
          sqlTextarea.value = query;
          if (runSqlBtn) runSqlBtn.click();
        }
      });
    });
  }

  renderSqlResults(data, container) {
    if (!data.rows || data.rows.length === 0) {
      container.innerHTML = `
        <div style="padding:1.5rem; text-align:center; color:#94A3B8; background:#0F172A; border-radius:var(--radius-sm);">
          Query menghasilkan 0 baris (${data.elapsed_ms} ms).
        </div>
      `;
      return;
    }

    const columns = data.columns || Object.keys(data.rows[0] || {});
    const ths = columns.map(c => `<th>${c}</th>`).join("");
    const trs = data.rows.map(r => {
      const tds = columns.map(c => `<td>${r[c] !== null ? r[c] : '<span style="color:#64748B;">NULL</span>'}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");

    container.innerHTML = `
      <div style="margin-bottom:0.5rem; display:flex; justify-content:space-between; font-size:0.8rem; color:#94A3B8;">
        <span>Hasil: <strong>${data.row_count} baris</strong></span>
        <span>Waktu Eksekusi: <strong>${data.elapsed_ms} ms</strong></span>
      </div>
      <div class="data-table-container" style="background:#0F172A; border:1px solid #334155; border-radius:var(--radius-sm);">
        <table class="data-table" style="color:#E2E8F0;">
          <thead><tr style="background:#1E293B; color:#94A3B8;">${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
    `;
  }
}

window.dbExplorer = new DatabaseExplorer();
