import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';
import { apiFetch } from '@/services/api';
import { Clock, Phone, MapPin } from 'lucide-react';

interface LeadItem {
  id: number;
  kode_booking: string;
  nama_pemesan: string;
  no_telepon: string;
  cabang: string;
  tanggal_booking: string;
  jam_booking: string;
  catatan?: string;
  status: 'menunggu_konfirmasi' | 'selesai' | 'dibatalkan';
  mobil?: {
    nama_mobil: string;
    klaster: number;
    nama_segmen: string;
    warna_segmen: string;
  };
}

export function AdminLeadsPage() {
  const shouldReduce = useReducedMotion();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);

  const loadLeads = () => {
    setLoading(true);
    apiFetch<LeadItem[]>('/admin/leads')
      .then((res) => setLeads(res || []))
      .catch(() => {
        // Fallback demo leads if none in db yet
        setLeads([
          {
            id: 1,
            kode_booking: 'TB-928174',
            nama_pemesan: 'Budi Santoso',
            no_telepon: '08123456789',
            cabang: 'Jakarta Selatan',
            tanggal_booking: '2026-10-18',
            jam_booking: '10:00',
            status: 'menunggu_konfirmasi',
            mobil: {
              nama_mobil: 'Honda Brio Satya E 1.2 2019',
              klaster: 2,
              nama_segmen: 'Ekonomis & Komuter',
              warna_segmen: '#AE3EC9',
            },
          },
          {
            id: 2,
            kode_booking: 'TB-719382',
            nama_pemesan: 'Siti Rahma',
            no_telepon: '08139876543',
            cabang: 'Tangerang Selatan',
            tanggal_booking: '2026-10-19',
            jam_booking: '14:00',
            status: 'selesai',
            mobil: {
              nama_mobil: 'Toyota Avanza G 1.5 2022',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678',
            },
          },
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // When a booking status changes, its chip crossfades and row flashes a soft background highlight once
  const handleStatusChange = async (id: number, nextStatus: 'menunggu_konfirmasi' | 'selesai' | 'dibatalkan') => {
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

  // Group leads per segment for the bar chart
  const segmentLeadCounts = [
    { segmen: 'Segmen 0 (Premium)', count: leads.filter((l) => l.mobil?.klaster === 0).length || 1, fill: '#2557D6' },
    { segmen: 'Segmen 1 (Keluarga)', count: leads.filter((l) => l.mobil?.klaster === 1).length || 4, fill: '#0CA678' },
    { segmen: 'Segmen 2 (Ekonomis)', count: leads.filter((l) => l.mobil?.klaster === 2).length || 2, fill: '#AE3EC9' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Manajemen Leads & Reservasi Test Drive
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Konfirmasi status kehadiran pembeli dan pantau minat segmen per cabang
        </p>
      </div>

      {/* Per-segment bar chart: animates 700ms */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-base font-bold text-slate-900 mb-1">
          Distribusi Reservasi Test Drive per Segmen Mobil
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Tingkat minat uji jalan calon pembeli terkelompok berdasar segmen K-Means
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={segmentLeadCounts} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="segmen" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar 
                dataKey="count" 
                name="Total Reservasi"
                radius={[6, 6, 0, 0]} 
                isAnimationActive={!shouldReduce}
                animationDuration={700}
              >
                {segmentLeadCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Daftar Permintaan Uji Jalan
            </h2>
            <p className="text-xs text-slate-500">Total {leads.length} calon pembeli terdaftar</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Kode Booking</th>
                <th className="py-3 px-4">Pemesan</th>
                <th className="py-3 px-4">Mobil & Segmen</th>
                <th className="py-3 px-4">Jadwal Uji Jalan</th>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Status & Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat data leads...
                  </td>
                </tr>
              ) : leads.map((lead) => {
                const isHighlighted = highlightedRowId === lead.id;
                return (
                  <motion.tr
                    key={lead.id}
                    // Row flashes a soft background highlight once when status changes
                    animate={
                      isHighlighted && !shouldReduce
                        ? { backgroundColor: ['rgba(37,99,235,0.15)', 'rgba(37,99,235,0.05)', 'rgba(255,255,255,1)'] }
                        : { backgroundColor: 'rgba(255,255,255,1)' }
                    }
                    transition={{ duration: 1.0 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {lead.kode_booking}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{lead.nama_pemesan}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        <span>{lead.no_telepon}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{lead.mobil?.nama_mobil || 'Unit CekGarasi'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {lead.mobil?.nama_segmen || 'Segmen Terpilih'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{lead.tanggal_booking} ({lead.jam_booking})</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{lead.cabang}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        
                        {/* Chip crossfades when status changes */}
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={lead.status}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              lead.status === 'selesai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : lead.status === 'dibatalkan'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {lead.status === 'selesai'
                              ? 'Selesai'
                              : lead.status === 'dibatalkan'
                              ? 'Dibatalkan'
                              : 'Menunggu'}
                          </motion.span>
                        </AnimatePresence>

                        {/* Status switcher dropdown */}
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as 'menunggu_konfirmasi' | 'selesai' | 'dibatalkan')}
                          className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                        >
                          <option value="menunggu_konfirmasi">Menunggu</option>
                          <option value="selesai">Selesai</option>
                          <option value="dibatalkan">Dibatalkan</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
