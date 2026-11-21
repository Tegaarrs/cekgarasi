import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  Play,
  RefreshCw,
  Search,
  Table,
} from 'lucide-react';

interface TableColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

interface TableMeta {
  table_name: string;
  row_count: number;
  column_count: number;
  columns: TableColumnMeta[];
}

interface TableDataResponse {
  table_name: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

interface SqlResultResponse {
  status?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  elapsed_ms?: number;
}

interface QueryPreset {
  id: string;
  label: string;
  description: string;
  sql: string;
}

const SQL_PRESETS: QueryPreset[] = [
  {
    id: 'cars',
    label: 'Data Mobil',
    description: 'Semua unit mobil bekas di katalog',
    sql: 'SELECT id, nama_mobil, tahun, jarak_tempuh_ribu_km, transmisi, harga_rp, lokasi, klaster, status FROM cars ORDER BY id DESC LIMIT 50;',
  },
  {
    id: 'cars_join',
    label: 'Mobil + Merek & Segmen',
    description: 'Gabungan mobil, merek, model, dan nama segmen',
    sql: 'SELECT c.id, b.nama AS merek, m.nama AS model, c.nama_mobil, c.tahun, c.harga_rp, s.nama_pendek AS segmen, c.lokasi FROM cars c JOIN car_models m ON c.model_id = m.id JOIN brands b ON m.brand_id = b.id JOIN segments s ON c.klaster = s.id ORDER BY c.id DESC LIMIT 50;',
  },
  {
    id: 'users',
    label: 'Data Pengguna',
    description: 'Daftar admin dan pembeli terdaftar',
    sql: 'SELECT id, nama, email, role, kota_domisili, alamat_lengkap, is_active, created_at FROM users ORDER BY id DESC;',
  },
  {
    id: 'test_drives',
    label: 'Jadwal Test Drive',
    description: 'Booking test drive lengkap dengan nama pembeli dan mobil',
    sql: 'SELECT td.id, td.kode, u.nama AS pembeli, u.email, c.nama_mobil, td.tanggal, td.jam, td.cabang, td.status FROM test_drives td JOIN users u ON td.user_id = u.id JOIN cars c ON td.car_id = c.id ORDER BY td.tanggal DESC, td.jam DESC;',
  },
  {
    id: 'favorites',
    label: 'Mobil Favorit',
    description: 'Daftar mobil yang disimpan pembeli',
    sql: 'SELECT f.created_at, u.nama AS pembeli, c.nama_mobil, c.tahun, c.harga_rp, f.catatan FROM favorites f JOIN users u ON f.user_id = u.id JOIN cars c ON f.car_id = c.id ORDER BY f.created_at DESC;',
  },
  {
    id: 'brands_models',
    label: 'Merek & Model',
    description: 'Rekap jumlah unit per merek dan model',
    sql: 'SELECT b.nama AS merek, m.nama AS model, m.tipe_bodi, COUNT(c.id) AS jumlah_unit FROM car_models m JOIN brands b ON m.brand_id = b.id LEFT JOIN cars c ON c.model_id = m.id GROUP BY m.id, b.nama, m.nama, m.tipe_bodi ORDER BY jumlah_unit DESC;',
  },
  {
    id: 'segments',
    label: 'Segmen Pasar',
    description: 'Jumlah mobil dan rata-rata harga tiap klaster',
    sql: 'SELECT s.id AS klaster, s.nama_pendek, s.nama_lengkap, COUNT(c.id) AS total_mobil, ROUND(AVG(c.harga_rp)) AS rata_harga_rp FROM segments s LEFT JOIN cars c ON c.klaster = s.id GROUP BY s.id, s.nama_pendek, s.nama_lengkap ORDER BY s.id;',
  },
  {
    id: 'ml_eval',
    label: 'Evaluasi K-Means',
    description: 'Nilai Inertia dan Silhouette setiap k',
    sql: 'SELECT k, ROUND(inertia, 2) AS inertia, ROUND(silhouette, 4) AS silhouette, is_production, sumber FROM ml_evaluasi_k ORDER BY k;',
  },
  {
    id: 'all_tables',
    label: 'Daftar Semua Tabel',
    description: 'Lihat seluruh nama tabel di database',
    sql: "SELECT name AS nama_tabel FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  },
];

export function DatabaseExplorerPage() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState('');

  const [activeTable, setActiveTable] = useState('cars');
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableError, setTableError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // SQL Console states
  const [sqlQuery, setSqlQuery] = useState(SQL_PRESETS[0].sql);
  const [activePresetId, setActivePresetId] = useState<string>(SQL_PRESETS[0].id);
  const [sqlResult, setSqlResult] = useState<SqlResultResponse | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlError, setSqlError] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Load tables list
  const loadTablesList = useCallback(() => {
    setTablesLoading(true);
    setTablesError('');
    apiFetch<TableMeta[] | { tables?: TableMeta[] }>('/database/tables')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.tables || [];
        setTables(list);
      })
      .catch((err: unknown) => {
        setTablesError(
          err instanceof Error ? err.message : 'Gagal memuat daftar tabel database.'
        );
      })
      .finally(() => setTablesLoading(false));
  }, []);

  useEffect(() => {
    loadTablesList();
  }, [loadTablesList]);

  // Load selected table data
  const loadTableData = useCallback((tbl: string, p = 1, keyword = '') => {
    setLoading(true);
    setTableError('');
    const params = new URLSearchParams({
      page: p.toString(),
      limit: '15',
    });
    if (keyword.trim()) {
      params.append('q', keyword.trim());
    }

    apiFetch<TableDataResponse>(`/database/tables/${tbl}?${params.toString()}`)
      .then((res) => {
        setTableData(res);
        setPage(res.page || 1);
      })
      .catch((err: unknown) => {
        setTableData(null);
        setTableError(
          err instanceof Error ? err.message : `Gagal memuat isi tabel ${tbl}.`
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTableData(activeTable, 1, '');
  }, [activeTable, loadTableData]);

  const executeSql = useCallback(async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) {
      setSqlError('Masukkan kueri SQL SELECT terlebih dahulu.');
      return;
    }

    setSqlError('');
    setSqlRunning(true);
    try {
      const res = await apiFetch<SqlResultResponse>('/database/query', {
        method: 'POST',
        body: JSON.stringify({ query: clean, limit: 200 }),
      });
      setSqlResult(res);
    } catch (err: unknown) {
      setSqlResult(null);
      setSqlError(err instanceof Error ? err.message : 'Query gagal dieksekusi.');
    } finally {
      setSqlRunning(false);
    }
  }, []);

  const handleSelectPreset = (preset: QueryPreset) => {
    setActivePresetId(preset.id);
    setSqlQuery(preset.sql);
    executeSql(preset.sql);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlQuery);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore clipboard failure on insecure origins
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/database/export/${activeTable}?format=${format}`, '_blank', 'noopener,noreferrer');
  };

  const totalPages = tableData?.total_pages || Math.ceil((tableData?.total || 0) / 15) || 1;

  return (
    <div className="min-h-screen bg-transparent py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#2563EB] p-2.5 text-white shrink-0">
              <Database aria-hidden="true" className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Web Database Explorer
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Penjelajahan langsung skema, inspeksi data real-time, dan konsol kueri SQL CekGarasi
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151A2C] hover:bg-slate-50 dark:hover:bg-[#1E253D] px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <Download aria-hidden="true" className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151A2C] hover:bg-slate-50 dark:hover:bg-[#1E253D] px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <Download aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor JSON</span>
          </button>
        </div>
      </div>

      {/* Table Selector Bar */}
      <section aria-label="Daftar Tabel Database" className="space-y-2">
        {tablesError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2"
          >
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{tablesError}</span>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {tablesLoading ? (
            <span className="text-sm text-slate-500 dark:text-slate-400 py-2">
              Memuat daftar tabel database...
            </span>
          ) : (
            tables.map((t) => {
              const isActive = activeTable === t.table_name;
              return (
                <button
                  key={t.table_name}
                  type="button"
                  onClick={() => {
                    setActiveTable(t.table_name);
                    setSearch('');
                  }}
                  className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#2563EB] dark:hover:border-[#60A5FA]'
                  }`}
                >
                  <Table aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-[13px]">{t.table_name}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.row_count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Main Table Inspector */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131726] shadow-sm overflow-hidden transition-colors duration-200">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-base font-bold text-slate-900 dark:text-white">
              Tabel: {activeTable}
            </h2>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              ({tableData?.total ?? 0} total baris)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <label htmlFor="db-table-search" className="sr-only">
                Cari data di tabel {activeTable}
              </label>
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400 pointer-events-none"
              />
              <input
                id="db-table-search"
                type="text"
                value={search}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearch(val);
                  if (val === '') {
                    loadTableData(activeTable, 1, '');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadTableData(activeTable, 1, search);
                }}
                placeholder="Cari data di tabel..."
                className="w-full sm:w-64 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0D111D] py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
              />
            </div>
            <button
              type="button"
              onClick={() => loadTableData(activeTable, 1, search)}
              aria-label="Cari dan muat ulang data tabel"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#1B2238] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#252E4A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {tableError && (
          <div
            role="alert"
            className="m-4 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 p-3.5 text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2"
          >
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{tableError}</span>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-[13px] font-mono">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#0D111D] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase text-xs font-bold">
              <tr>
                {tableData?.columns.map((col) => (
                  <th key={col} className="py-3 px-3.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={tableData?.columns.length || 5}
                    className="py-10 text-center text-sm text-slate-600 dark:text-slate-300 font-sans"
                  >
                    Memuat data tabel {activeTable}...
                  </td>
                </tr>
              ) : tableData?.rows && tableData.rows.length > 0 ? (
                tableData.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    {tableData.columns.map((col) => (
                      <td
                        key={col}
                        className="py-2.5 px-3.5 whitespace-nowrap text-slate-800 dark:text-slate-200 max-w-[280px] truncate"
                        title={
                          row[col] !== null && row[col] !== undefined ? String(row[col]) : 'null'
                        }
                      >
                        {row[col] !== null && row[col] !== undefined ? (
                          String(row[col])
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={tableData?.columns.length || 5}
                    className="py-10 text-center text-sm text-slate-600 dark:text-slate-300 font-sans"
                  >
                    Tidak ada baris data yang cocok di tabel {activeTable}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300 font-sans">
          <span className="font-medium tabular-nums">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => loadTableData(activeTable, page - 1, search)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151A2C] hover:bg-slate-50 dark:hover:bg-[#1E253D] px-3.5 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => loadTableData(activeTable, page + 1, search)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151A2C] hover:bg-slate-50 dark:hover:bg-[#1E253D] px-3.5 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <span>Berikutnya</span>
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* SQL Query Console */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131726] p-5 sm:p-6 shadow-sm space-y-5 font-sans transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Konsol Kueri SQL Terintegrasi (Read-Only)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Pilih template query siap pakai di bawah ini atau tulis query SELECT Anda sendiri.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Hanya mendukung query baca (SELECT / WITH / PRAGMA)
          </span>
        </div>

        {/* One-Click Query Presets */}
        <div className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Template Query Siap Pakai (Klik untuk langsung jalankan)
          </span>
          <div className="flex flex-wrap gap-2">
            {SQL_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.description}
                  onClick={() => handleSelectPreset(preset)}
                  className={`min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    isSelected
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#1B2238] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-[#2563EB] dark:hover:border-[#60A5FA]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SQL Editor */}
        <div>
          <label
            htmlFor="sql-query-editor"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Editor SQL
          </label>
          <textarea
            id="sql-query-editor"
            rows={4}
            value={sqlQuery}
            onChange={(e) => {
              setSqlQuery(e.target.value);
              setActivePresetId('');
            }}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 text-slate-100 font-mono text-sm leading-relaxed p-4 focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
          />
        </div>

        {/* Console Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopySql}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151A2C] hover:bg-slate-50 dark:hover:bg-[#1E253D] px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {copiedSql ? (
              <>
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Query Tersalin</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="h-4 w-4" />
                <span>Salin Query</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => executeSql(sqlQuery)}
            disabled={sqlRunning}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131726]"
          >
            <Play aria-hidden="true" className="h-4 w-4 fill-current" />
            <span>{sqlRunning ? 'Menjalankan...' : 'Jalankan Query'}</span>
          </button>
        </div>

        {/* SQL Error State */}
        {sqlError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 p-4 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
          >
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{sqlError}</span>
          </div>
        )}

        {/* SQL Result Table */}
        {sqlResult && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D111D] p-4 space-y-3 overflow-x-auto">
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                <span>Kueri berhasil dieksekusi ({sqlResult.row_count} baris)</span>
              </span>
              {typeof sqlResult.elapsed_ms === 'number' && (
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {sqlResult.elapsed_ms} ms
                </span>
              )}
            </div>

            {sqlResult.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-[13px] font-mono">
                  <thead className="sticky top-0 bg-slate-200/80 dark:bg-[#151A2C] border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase text-xs">
                    <tr>
                      {sqlResult.columns.map((c) => (
                        <th key={c} className="py-2.5 px-3 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sqlResult.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        {sqlResult.columns.map((c) => (
                          <td
                            key={c}
                            className="py-2 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200 max-w-[280px] truncate"
                            title={row[c] !== null && row[c] !== undefined ? String(row[c]) : 'null'}
                          >
                            {row[c] !== null && row[c] !== undefined ? (
                              String(row[c])
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Query berhasil dijalankan namun tidak mengembalikan baris data.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
