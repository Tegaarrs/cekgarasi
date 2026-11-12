import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';
import { apiFetch } from '@/services/api';
import { 
  Clock, Phone, MapPin, RefreshCw, Filter, Search, CheckCircle2, 
  XCircle, Calendar, Car, Plus, ExternalLink, 
  Check, Copy, Sparkles, Layers, X
} from 'lucide-react';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Skeleton } from '@/components/motion/Skeleton';

export interface LeadItem {
  id: number;
  kode_booking: string;
  nama_pemesan: string;
  no_telepon: string;
  cabang: string;
  tanggal_booking: string;
  jam_booking: string;
  catatan?: string;
  status: 'menunggu_konfirmasi' | 'terkonfirmasi' | 'selesai' | 'dibatalkan';
  mobil?: {
    id?: number;
    nama_mobil: string;
    harga_rp?: number;
    klaster: number;
    nama_segmen: string;
    warna_segmen: string;
  };
}

const SEGMEN_CONFIG = [
  { klaster: 0, label: 'Segmen 0 (Premium)', short: 'Premium', fill: '#2557D6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { klaster: 1, label: 'Segmen 1 (Keluarga)', short: 'Keluarga', fill: '#0CA678', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { klaster: 2, label: 'Segmen 2 (Ekonomis)', short: 'Ekonomis', fill: '#AE3EC9', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
];

export function AdminLeadsPage() {
  const shouldReduce = useReducedMotion();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filters
  const [selectedSegmenFilter, setSelectedSegmenFilter] = useState<number | 'semua'>('semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredBarKlaster, setHoveredBarKlaster] = useState<number | null>(null);

  // Modal Tambah Leads Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    nama_pemesan: '',
    no_telepon: '',
    cabang: 'CekGarasi Jakarta Selatan',
    tanggal_booking: new Date().toISOString().split('T')[0],
    jam_booking: '10:00',
    klaster: 1,
    nama_mobil: 'Toyota Avanza G 1.5 2022',
    catatan: 'Permintaan uji jalan langsung di showroom',
  });

  const loadLeads = () => {
    setLoading(true);
    apiFetch<LeadItem[]>('/admin/leads')
      .then((res) => {
        setLeads(res || []);
      })
      .catch(() => {
        setLeads([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleStatusChange = async (id: number, nextStatus: 'menunggu_konfirmasi' | 'terkonfirmasi' | 'selesai' | 'dibatalkan') => {
    try {
      await apiFetch(`/admin/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }).catch(() => {});

      setLeads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      );

      if (!shouldReduce) {
        setHighlightedRowId(id);
        setTimeout(() => setHighlightedRowId(null), 1200);
      }
    } catch {
      // Ignored for demo
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    const config = SEGMEN_CONFIG.find((c) => c.klaster === newLeadForm.klaster) || SEGMEN_CONFIG[1];
    const newLead: LeadItem = {
      id: Date.now(),
      kode_booking: `TD-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      nama_pemesan: newLeadForm.nama_pemesan || 'Tamu Showroom',
      no_telepon: newLeadForm.no_telepon || '081234567890',
      cabang: newLeadForm.cabang,
      tanggal_booking: newLeadForm.tanggal_booking,
      jam_booking: newLeadForm.jam_booking,
      catatan: newLeadForm.catatan,
      status: 'menunggu_konfirmasi',
      mobil: {
        nama_mobil: newLeadForm.nama_mobil,
        klaster: newLeadForm.klaster,
        nama_segmen: config.short,
        warna_segmen: config.fill,
      },
    };

    setLeads((prev) => [newLead, ...prev]);
    setIsAddModalOpen(false);
    setNewLeadForm({
      nama_pemesan: '',
      no_telepon: '',
      cabang: 'CekGarasi Jakarta Selatan',
      tanggal_booking: new Date().toISOString().split('T')[0],
      jam_booking: '10:00',
      klaster: 1,
      nama_mobil: 'Toyota Avanza G 1.5 2022',
      catatan: 'Permintaan uji jalan langsung di showroom',
    });
  };

  // 100% Real Synchronized Segment Distribution Data from Actual Leads
  const segmentLeadCounts = useMemo(() => {
    const total = leads.length;
    return SEGMEN_CONFIG.map((conf) => {
      const count = leads.filter((l) => (l.mobil?.klaster ?? -1) === conf.klaster).length;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      return {
        klaster: conf.klaster,
        segmen: conf.label,
        short: conf.short,
        count: count,
        percentage: percentage,
        fill: conf.fill,
      };
    });
  }, [leads]);

  // Status Metrics Breakdown
  const totalLeads = leads.length;
  const menungguCount = leads.filter((l) => l.status === 'menunggu_konfirmasi' || l.status === ('menunggu' as any)).length;
  const terkonfirmasiCount = leads.filter((l) => l.status === 'terkonfirmasi').length;
  const selesaiCount = leads.filter((l) => l.status === 'selesai').length;
  const dibatalkanCount = leads.filter((l) => l.status === 'dibatalkan').length;

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Filter by Segmen
      if (selectedSegmenFilter !== 'semua' && lead.mobil?.klaster !== selectedSegmenFilter) {
        return false;
      }
      // Filter by Status
      if (selectedStatusFilter !== 'semua') {
        if (selectedStatusFilter === 'menunggu_konfirmasi') {
          if (lead.status !== 'menunggu_konfirmasi' && lead.status !== ('menunggu' as any)) return false;
        } else if (lead.status !== selectedStatusFilter) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nama = lead.nama_pemesan.toLowerCase();
        const kode = lead.kode_booking.toLowerCase();
        const mobil = (lead.mobil?.nama_mobil || '').toLowerCase();
        const cabang = lead.cabang.toLowerCase();
        const hp = lead.no_telepon.toLowerCase();
        return nama.includes(query) || kode.includes(query) || mobil.includes(query) || cabang.includes(query) || hp.includes(query);
      }
      return true;
    });
  }, [leads, selectedSegmenFilter, selectedStatusFilter, searchQuery]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">
              Manajemen Leads & Reservasi Test Drive
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-300 shadow-xs">
              <Car className="h-3.5 w-3.5 text-blue-600" />
              {totalLeads} Permintaan Terdaftar
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 max-w-2xl">
            Konfirmasi jadwal uji jalan pembeli, pantau minat segmen K-Means secara real-time, dan hubungi calon konsumen showroom secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLeads}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 shadow-sm transition-all disabled:opacity-60"
            title="Segarkan data dari server"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Catat Uji Jalan</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards (5 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Permintaan</span>
            <Layers className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="font-display text-2xl font-black text-slate-900 mt-1">
            <AnimatedNumber value={totalLeads} duration={0.4} />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">100% sinkron pendaftar</span>
        </div>

        {/* Menunggu Konfirmasi */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold uppercase tracking-wider">
            <span>Menunggu Respon</span>
            {menungguCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <div className="font-display text-2xl font-black text-amber-700 mt-1">
            <AnimatedNumber value={menungguCount} duration={0.4} />
          </div>
          <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">Butuh konfirmasi jadwal</span>
        </div>

        {/* Terkonfirmasi */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider">
            <span>Terkonfirmasi</span>
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="font-display text-2xl font-black text-blue-700 mt-1">
            <AnimatedNumber value={terkonfirmasiCount} duration={0.4} />
          </div>
          <span className="text-[10px] text-blue-600 mt-0.5 block">Jadwal telah dikunci</span>
        </div>

        {/* Selesai */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
            <span>Selesai Uji</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="font-display text-2xl font-black text-emerald-700 mt-1">
            <AnimatedNumber value={selesaiCount} duration={0.4} />
          </div>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Tahap negosiasi / SPK</span>
        </div>

        {/* Dibatalkan */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold uppercase tracking-wider">
            <span>Batal / Reschedule</span>
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="font-display text-2xl font-black text-rose-700 mt-1">
            <AnimatedNumber value={dibatalkanCount} duration={0.4} />
          </div>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Jadwal dibatalkan</span>
        </div>
      </div>

      {/* Visualisasi Grafik Distribusi Minat Segmen K-Means (100% Akurat dengan Data Pendaftar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Bar Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
                  Distribusi Reservasi Test Drive per Segmen Mobil
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisasi minat aktual pendaftar uji jalan berdasarkan klaster K-Means. <strong>Klik salah satu bar</strong> untuk memfilter daftar pemesan di bawah.
                </p>
              </div>

              {selectedSegmenFilter !== 'semua' && (
                <button
                  onClick={() => setSelectedSegmenFilter('semua')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
                >
                  <span>Reset Filter Segmen</span>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
              <span>
                Data terhubung 1:1 dengan pendaftar di bawah. Total: <strong>{totalLeads} pemesan terdaftar</strong>.
              </span>
            </div>
          </div>

          <div className="h-64 w-full mt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton height={200} width="90%" />
              </div>
            ) : totalLeads === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl">
                <Car className="h-10 w-10 text-slate-300 mb-2" />
                <h4 className="font-bold text-slate-700 text-sm">Belum Ada Pendaftar Uji Jalan</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Grafik distribusi akan otomatis muncul begitu calon pembeli mengajukan reservasi test drive melalui katalog.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                >
                  + Tambah Pendaftar Pertama
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentLeadCounts} margin={{ top: 15, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis 
                    dataKey="segmen" 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                  />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    allowDecimals={false} 
                    tick={{ fill: '#475569' }} 
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const item = payload[0].payload;
                      const isFilterActive = selectedSegmenFilter === item.klaster;
                      return (
                        <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-1.5 min-w-[210px]">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <span className="font-extrabold text-slate-900">{item.segmen}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {item.percentage}% Total
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Jumlah Pendaftar:</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">{item.count} calon pembeli</span>
                          </div>
                          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-50">
                            {isFilterActive ? 'Sedang memfilter tabel di bawah' : 'Klik bar untuk memfilter tabel pendaftar'}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Total Reservasi"
                    radius={[8, 8, 0, 0]} 
                    isAnimationActive={!shouldReduce}
                    animationDuration={600}
                    onClick={(entry) => {
                      if (entry && typeof entry.klaster === 'number') {
                        setSelectedSegmenFilter(selectedSegmenFilter === entry.klaster ? 'semua' : entry.klaster);
                      }
                    }}
                  >
                    {segmentLeadCounts.map((entry) => {
                      const isSelected = selectedSegmenFilter === entry.klaster;
                      const isHovered = hoveredBarKlaster === entry.klaster;
                      const isDimmed = selectedSegmenFilter !== 'semua' && !isSelected;
                      return (
                        <Cell 
                          key={`cell-${entry.klaster}`} 
                          fill={entry.fill}
                          fillOpacity={isDimmed && !isHovered ? 0.3 : 1.0}
                          stroke={isSelected ? '#0F172A' : isHovered ? '#475569' : undefined}
                          strokeWidth={isSelected ? 3 : isHovered ? 1.5 : 0}
                          className="cursor-pointer transition-all duration-200 hover:brightness-110"
                          onMouseEnter={() => setHoveredBarKlaster(entry.klaster)}
                          onMouseLeave={() => setHoveredBarKlaster(null)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Segment Summary Footer */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 mt-3 text-center">
            {segmentLeadCounts.map((s) => (
              <button
                key={`footer-${s.klaster}`}
                onClick={() => setSelectedSegmenFilter(selectedSegmenFilter === s.klaster ? 'semua' : s.klaster)}
                className={`p-2 rounded-xl transition-all border ${
                  selectedSegmenFilter === s.klaster 
                    ? 'border-slate-800 bg-slate-50 shadow-xs ring-1 ring-slate-800' 
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 block truncate">{s.short}</span>
                <span className="font-mono text-base font-black text-slate-900 block">{s.count} Unit</span>
                <span className="text-[10px] text-slate-400 font-semibold">{s.percentage}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Funnel & Showroom Operational Insight */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Progres Konfirmasi & Pipeline Leads
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tingkat konversi permintaan uji jalan calon pembeli
            </p>

            <div className="mt-5 space-y-4">
              {/* Progress 1: Menunggu */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Menunggu Konfirmasi
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {menungguCount} ({totalLeads > 0 ? Math.round((menungguCount / totalLeads) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalLeads > 0 ? (menungguCount / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Progress 2: Terkonfirmasi */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Terkonfirmasi (Jadwal Siap)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {terkonfirmasiCount} ({totalLeads > 0 ? Math.round((terkonfirmasiCount / totalLeads) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${totalLeads > 0 ? (terkonfirmasiCount / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Progress 3: Selesai */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Selesai Uji Jalan
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {selesaiCount} ({totalLeads > 0 ? Math.round((selesaiCount / totalLeads) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${totalLeads > 0 ? (selesaiCount / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Progress 4: Dibatalkan */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Batal / Reschedule
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {dibatalkanCount} ({totalLeads > 0 ? Math.round((dibatalkanCount / totalLeads) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalLeads > 0 ? (dibatalkanCount / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 mt-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Insight Showroom Dealer
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {segmentLeadCounts[1].count >= segmentLeadCounts[0].count && segmentLeadCounts[1].count >= segmentLeadCounts[2].count ? (
                <>Minat tertinggi saat ini didominasi oleh <strong>Segmen 1 (Keluarga)</strong> ({segmentLeadCounts[1].percentage}%). Pastikan ketersediaan unit MPV/SUV ber-AC prima dan 7-seater siap di cabang.</>
              ) : (
                <>Permintaan uji jalan terdistribusi secara seimbang antar segmen klaster K-Means.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Leads Table Container with Search & Filters */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-5 sm:p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Daftar Permintaan Uji Jalan</span>
                <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5">
                  {filteredLeads.length} dari {totalLeads} Calon Pembeli
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfirmasi jadwal, periksa preferensi mobil, dan hubungi calon pembeli langsung via WhatsApp
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, mobil, cabang..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Filter Segmen */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Segmen:
              </span>
              <button
                onClick={() => setSelectedSegmenFilter('semua')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedSegmenFilter === 'semua'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({totalLeads})
              </button>
              {SEGMEN_CONFIG.map((conf) => {
                const count = leads.filter((l) => l.mobil?.klaster === conf.klaster).length;
                const isSelected = selectedSegmenFilter === conf.klaster;
                return (
                  <button
                    key={`filter-seg-${conf.klaster}`}
                    onClick={() => setSelectedSegmenFilter(isSelected ? 'semua' : conf.klaster)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${conf.bg} ${conf.text} border ${conf.border} shadow-xs font-extrabold ring-1 ring-current`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: conf.fill }} />
                    <span>{conf.short} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'menunggu_konfirmasi', label: 'Menunggu' },
                { id: 'terkonfirmasi', label: 'Terkonfirmasi' },
                { id: 'selesai', label: 'Selesai' },
                { id: 'dibatalkan', label: 'Batal' },
              ].map((st) => (
                <button
                  key={`filter-st-${st.id}`}
                  onClick={() => setSelectedStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedStatusFilter === st.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Kode Booking</th>
                <th className="py-3.5 px-5">Calon Pembeli</th>
                <th className="py-3.5 px-5">Mobil & Segmen K-Means</th>
                <th className="py-3.5 px-5">Jadwal & Cabang</th>
                <th className="py-3.5 px-5">Catatan Khusus</th>
                <th className="py-3.5 px-5">Status & Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-5"><Skeleton height={16} width={80} /></td>
                    <td className="py-4 px-5"><Skeleton height={20} width={130} /></td>
                    <td className="py-4 px-5"><Skeleton height={20} width={150} /></td>
                    <td className="py-4 px-5"><Skeleton height={16} width={120} /></td>
                    <td className="py-4 px-5"><Skeleton height={14} width={140} /></td>
                    <td className="py-4 px-5"><Skeleton height={24} width={100} /></td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Car className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <span className="font-bold text-slate-600 block text-sm">Tidak ada pendaftar yang cocok dengan filter</span>
                    <span className="text-xs text-slate-400 block mt-1">Coba ubah kata kunci pencarian atau reset filter segmen/status</span>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isHighlighted = highlightedRowId === lead.id;
                  const segmen = SEGMEN_CONFIG.find((c) => c.klaster === lead.mobil?.klaster) || SEGMEN_CONFIG[1];
                  const cleanPhone = (lead.no_telepon || '').replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
                  const waMessage = encodeURIComponent(
                    `Halo Kak ${lead.nama_pemesan}, kami dari Dealer CekGarasi ingin mengonfirmasi jadwal Uji Jalan (Test Drive) untuk mobil ${lead.mobil?.nama_mobil || 'pilihan Anda'} dengan Kode Booking ${lead.kode_booking} pada tanggal ${lead.tanggal_booking} jam ${lead.jam_booking} di ${lead.cabang}. Apakah jadwal ini sudah sesuai? Terima kasih.`
                  );

                  return (
                    <motion.tr
                      key={lead.id}
                      animate={
                        isHighlighted && !shouldReduce
                          ? { backgroundColor: ['rgba(37,99,235,0.18)', 'rgba(37,99,235,0.06)', 'rgba(255,255,255,1)'] }
                          : { backgroundColor: 'rgba(255,255,255,1)' }
                      }
                      transition={{ duration: 1.0 }}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. Kode Booking */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 font-mono font-extrabold text-blue-700">
                          <span>{lead.kode_booking}</span>
                          <button
                            onClick={() => copyToClipboard(lead.kode_booking)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                            title="Salin kode booking"
                          >
                            {copiedCode === lead.kode_booking ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Calon Pembeli */}
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 text-sm">{lead.nama_pemesan}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {lead.no_telepon}
                          </span>
                          {lead.no_telepon && (
                            <a
                              href={`https://wa.me/${waPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                              title="Buka WhatsApp untuk konfirmasi"
                            >
                              <span>WA</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 3. Mobil & Segmen */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{lead.mobil?.nama_mobil || 'Unit CekGarasi'}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span 
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold border shadow-2xs"
                            style={{ 
                              backgroundColor: `${segmen.fill}15`, 
                              borderColor: `${segmen.fill}40`, 
                              color: segmen.fill 
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segmen.fill }} />
                            {lead.mobil?.nama_segmen || segmen.short}
                          </span>
                        </div>
                      </td>

                      {/* 4. Jadwal & Cabang */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          <span>{lead.tanggal_booking}</span>
                          <span className="text-slate-400">|</span>
                          <span>{lead.jam_booking} WIB</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{lead.cabang}</span>
                        </div>
                      </td>

                      {/* 5. Catatan Khusus */}
                      <td className="py-4 px-5">
                        <div className="max-w-[200px] text-[11px] text-slate-600 leading-relaxed italic bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                          {lead.catatan || 'Tidak ada catatan tambahan dari pemesan.'}
                        </div>
                      </td>

                      {/* 6. Status & Tindakan Admin */}
                      <td className="py-4 px-5">
                        <div className="space-y-2">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={lead.status}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border shadow-xs ${
                                lead.status === 'selesai'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : lead.status === 'terkonfirmasi'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : lead.status === 'dibatalkan'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {lead.status === 'selesai' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : lead.status === 'terkonfirmasi' ? (
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                              ) : lead.status === 'dibatalkan' ? (
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                              )}
                              <span>
                                {lead.status === 'selesai'
                                  ? 'Selesai Uji'
                                  : lead.status === 'terkonfirmasi'
                                  ? 'Terkonfirmasi'
                                  : lead.status === 'dibatalkan'
                                  ? 'Dibatalkan'
                                  : 'Menunggu'}
                              </span>
                            </motion.span>
                          </AnimatePresence>

                          {/* Quick Status Select Dropdown */}
                          <div>
                            <select
                              value={lead.status === ('menunggu' as any) ? 'menunggu_konfirmasi' : lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value as any)}
                              className="w-full rounded-xl border border-slate-300 bg-white py-1 px-2 text-[11px] font-bold text-slate-700 shadow-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
                              <option value="terkonfirmasi">Terkonfirmasi (Jadwal Cocok)</option>
                              <option value="selesai">Selesai (Sudah Hadir)</option>
                              <option value="dibatalkan">Batalkan Reservasi</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Uji Jalan Manual */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">Catat Reservasi Uji Jalan</h3>
                    <p className="text-xs text-slate-500">Pendaftaran calon pembeli langsung di showroom</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateManualLead} className="space-y-4 pt-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Calon Pembeli *</label>
                    <input
                      type="text"
                      required
                      value={newLeadForm.nama_pemesan}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, nama_pemesan: e.target.value })}
                      placeholder="Contoh: Rian Ardiansyah"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">No. WhatsApp / Telepon *</label>
                    <input
                      type="tel"
                      required
                      value={newLeadForm.no_telepon}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, no_telepon: e.target.value })}
                      placeholder="Contoh: 081234567890"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobil yang Ingin Dicoba *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.nama_mobil}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, nama_mobil: e.target.value })}
                    placeholder="Contoh: Honda HR-V E 1.5 2021"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Segmen Mobil (K-Means)</label>
                    <select
                      value={newLeadForm.klaster}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, klaster: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>Segmen 0 (Premium & Eksekutif)</option>
                      <option value={1}>Segmen 1 (Keluarga & Utility)</option>
                      <option value={2}>Segmen 2 (Ekonomis & Praktis)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cabang Showroom</label>
                    <select
                      value={newLeadForm.cabang}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, cabang: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="CekGarasi Jakarta Selatan">CekGarasi Jakarta Selatan</option>
                      <option value="CekGarasi Tangerang BSD">CekGarasi Tangerang BSD</option>
                      <option value="CekGarasi Bekasi Barat">CekGarasi Bekasi Barat</option>
                      <option value="CekGarasi Depok Margonda">CekGarasi Depok Margonda</option>
                      <option value="CekGarasi Surabaya Barat">CekGarasi Surabaya Barat</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Booking</label>
                    <input
                      type="date"
                      value={newLeadForm.tanggal_booking}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, tanggal_booking: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jam Uji Jalan</label>
                    <input
                      type="time"
                      value={newLeadForm.jam_booking}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, jam_booking: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Kebutuhan Calon Pembeli</label>
                  <textarea
                    rows={2}
                    value={newLeadForm.catatan}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, catatan: e.target.value })}
                    placeholder="Contoh: Bawa keluarga 4 orang, ingin coba tanjakan..."
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-md"
                  >
                    Simpan Reservasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
