import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '@/services/api';
import { 
  Database, Table, Play, Download, RefreshCw, 
  Search, ChevronLeft, ChevronRight, CheckCircle2 
} from 'lucide-react';

interface TableMeta {
  name: string;
  count: number;
}

interface TableDataResponse {
  table: string;
  total: number;
  page: number;
  limit: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

export function DatabaseExplorerPage() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [activeTable, setActiveTable] = useState('cars');
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  // SQL Console states
  const [sqlQuery, setSqlQuery] = useState('SELECT id, nama_mobil, tahun, harga_rp, klaster FROM cars LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: Record<string, unknown>[]; row_count: number } | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlError, setSqlError] = useState('');

  // Load tables list
  useEffect(() => {
    apiFetch<{ tables: TableMeta[] }>('/database/tables')
      .then((res) => {
        setTables(res.tables || []);
      })
      .catch(() => {});
  }, []);

  // Load selected table data
  const loadTableData = useCallback((tbl: string, p = 1, q = search) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: p.toString(),
      limit: '15',
    });
    if (q) params.append('search', q);

    apiFetch<TableDataResponse>(`/database/table/${tbl}?${params.toString()}`)
      .then((res) => {
        setTableData(res);
        setPage(res.page || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    loadTableData(activeTable, 1, '');
  }, [activeTable, loadTableData]);

  const handleRunSql = async () => {
    setSqlError('');
    setSqlRunning(true);
    try {
      const res = await apiFetch<{ columns: string[]; rows: Record<string, unknown>[]; row_count: number }>('/database/query', {
        method: 'POST',
        body: JSON.stringify({ query: sqlQuery }),
      });
      setSqlResult(res);
    } catch (err: unknown) {
      setSqlError(err instanceof Error ? err.message : 'Query gagal dieksekusi.');
    } finally {
      setSqlRunning(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/database/export/${activeTable}?format=${format}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <Database className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Web Database Explorer
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Penjelajahan langsung skema, inspeksi data real-time, dan konsol SQL query CekGarasi
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => handleExport('csv')}
            whileHover={{ y: -1.5, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-liquid-secondary liquid-shine inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ekspor CSV</span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleExport('json')}
            whileHover={{ y: -1.5, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-liquid-secondary liquid-shine inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor JSON</span>
          </motion.button>
        </div>
      </div>

      {/* Table Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tables.map((t) => (
          <motion.button
            key={t.name}
            onClick={() => {
              setActiveTable(t.name);
              setSearch('');
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className={`btn-liquid-tab liquid-shine flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTable === t.name
                ? 'btn-liquid-primary'
                : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>{t.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeTable === t.name ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
            }`}>
              {t.count}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Main Table View */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-soft dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
        
        {/* Table Top Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">Tabel: {activeTable}</span>
            <span className="text-xs text-slate-400">({tableData?.total ?? 0} total baris)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadTableData(activeTable, 1, search);
                }}
                placeholder="Cari data di tabel..."
                className="w-48 sm:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => loadTableData(activeTable, 1, search)}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              title="Cari / Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto max-h-[440px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                {tableData?.columns.map((col) => (
                  <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={tableData?.columns.length || 5} className="py-8 text-center text-slate-400 font-sans">
                    Memuat data tabel {activeTable}...
                  </td>
                </tr>
              ) : tableData?.rows && tableData.rows.length > 0 ? (
                tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
                    {tableData.columns.map((col) => (
                      <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableData?.columns.length || 5} className="py-8 text-center text-slate-400 font-sans">
                    Tidak ada baris data yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-sans">
          <span>
            Halaman {page} dari {Math.ceil((tableData?.total || 0) / 15) || 1}
          </span>
          <div className="flex gap-2">
            <motion.button
              type="button"
              disabled={page <= 1}
              onClick={() => loadTableData(activeTable, page - 1, search)}
              whileHover={page <= 1 ? {} : { scale: 1.04 }}
              whileTap={page <= 1 ? {} : { scale: 0.96 }}
              className="btn-liquid-secondary liquid-shine inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </motion.button>
            <motion.button
              type="button"
              disabled={page >= Math.ceil((tableData?.total || 0) / 15)}
              onClick={() => loadTableData(activeTable, page + 1, search)}
              whileHover={page >= Math.ceil((tableData?.total || 0) / 15) ? {} : { scale: 1.04 }}
              whileTap={page >= Math.ceil((tableData?.total || 0) / 15) ? {} : { scale: 0.96 }}
              className="btn-liquid-secondary liquid-shine inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold disabled:opacity-40 cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* SQL Query Console */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-5 shadow-soft dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse" />
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Konsol Kueri SQL Terintegrasi (Read-Only)
            </h2>
          </div>
          <span className="text-[10px] text-slate-400">Hanya mendukung query SELECT demi keamanan</span>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 font-mono text-xs p-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            Contoh: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">SELECT id, nama_mobil, harga_rp FROM cars WHERE klaster=0 LIMIT 5;</code>
          </span>
          <motion.button
            type="button"
            onClick={handleRunSql}
            disabled={sqlRunning}
            whileHover={{ y: -1.5, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-liquid-success liquid-shine inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{sqlRunning ? 'Menjalankan...' : 'Jalankan Query'}</span>
          </motion.button>
        </div>

        {sqlError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {sqlError}
          </div>
        )}

        {sqlResult && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 overflow-x-auto text-xs font-mono">
            <div className="text-[11px] font-bold text-emerald-700 font-sans mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Kueri berhasil dieksekusi ({sqlResult.row_count} baris):</span>
            </div>
            <table className="w-full text-left text-[11px]">
              <thead className="border-b border-slate-300 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  {sqlResult.columns.map((c) => (
                    <th key={c} className="py-1 px-2 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sqlResult.rows.map((row, idx) => (
                  <tr key={idx}>
                    {sqlResult.columns.map((c) => (
                      <td key={c} className="py-1 px-2 whitespace-nowrap text-slate-800">
                        {String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
