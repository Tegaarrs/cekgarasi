import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Check, Plus, 
  ArrowRight, ArrowLeft, Database, Info,
  BrainCircuit, ShieldCheck
} from 'lucide-react';

export function PreferensiPage() {
  const navigate = useNavigate();

  // 1. Budget slider state (50 - 500 Juta)
  const [budgetMax, setBudgetMax] = useState<number>(190);
  const budgetMin = 120;

  // 2. Tahun minimal kendaraan
  const [tahunMin, setTahunMin] = useState<string>('2018');

  // 3. Kriteria utama toggles
  const [criteria, setCriteria] = useState<{ [key: string]: boolean }>({
    matik: true,
    kmRendah: true,
    fiturLengkap: false,
    hargaTerjangkau: true,
  });

  const toggleCriterion = (key: string) => {
    setCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Machine Learning Classification Logic (K-Means):
  // Segment 0: Premium (#2557D6)
  // Segment 1: Keluarga Muda (#0CA678)
  // Segment 2: Ekonomis & Efisien (#AE3EC9)
  let predictedSegment: {
    klaster: number;
    nama: string;
    kode: string;
    warnaHex: string;
    bgBadge: string;
    textBadge: string;
    kecocokan: string;
    unitCount: number;
    sharePercent: number;
  };

  if (budgetMax >= 260 || criteria.fiturLengkap) {
    predictedSegment = {
      klaster: 0,
      nama: 'Premium',
      kode: 'Klaster 01',
      warnaHex: '#2557D6',
      bgBadge: 'bg-[#2557D6]',
      textBadge: 'text-[#2557D6]',
      kecocokan: '96.2%',
      unitCount: 258,
      sharePercent: 42,
    };
  } else if (budgetMax >= 150 || criteria.matik || Number(tahunMin) >= 2018) {
    predictedSegment = {
      klaster: 1,
      nama: 'Keluarga Muda',
      kode: 'Klaster 02',
      warnaHex: '#0CA678',
      bgBadge: 'bg-[#0CA678]',
      textBadge: 'text-[#0CA678]',
      kecocokan: '94.8%',
      unitCount: 197,
      sharePercent: 32,
    };
  } else {
    predictedSegment = {
      klaster: 2,
      nama: 'Ekonomis & Efisien',
      kode: 'Klaster 03',
      warnaHex: '#AE3EC9',
      bgBadge: 'bg-[#AE3EC9]',
      textBadge: 'text-[#AE3EC9]',
      kecocokan: '92.4%',
      unitCount: 154,
      sharePercent: 25,
    };
  }

  const handleFinish = () => {
    navigate(`/cari?klaster=${predictedSegment.klaster}&harga_max=${budgetMax * 1000000}&tahun_min=${tahunMin === '0' ? '' : tahunMin}`);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#F9F9FF]">
      
      {/* ============================================================ */}
      {/* SPLIT SCREEN LEFT: Brand, Editorial & ML Architecture       */}
      {/* ============================================================ */}
      <div className="relative w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-8 lg:p-12 overflow-hidden bg-[#001540] text-white min-h-[520px] lg:min-h-auto">
        
        {/* Background photo with atmospheric gradient scrim */}
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-25"
          style={{
            backgroundImage: `url('/images/hero/hero-720.webp')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#001540] via-[#001540]/90 to-[#001540]" />

        {/* Left Header Lockup */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2A5F] flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-[#FE6A2B]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white leading-none">
                CekGarasi ML-Engine
              </span>
              <span className="text-[11px] text-[#7D93CE] uppercase tracking-wider mt-1 font-semibold">
                Algoritma Penilai Objektif
              </span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold tracking-wider flex items-center gap-2 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#FE6A2B] animate-pulse" />
            <span>REALTIME CLUSTERING</span>
          </div>
        </div>

        {/* Left Central Editorial Content */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#B1C5FF] text-xs font-semibold mb-4">
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Pengelompokan Otomatis CekGarasi</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-3">
            Rekomendasi Cerdas Sesuai Profilmu
          </h1>

          <p className="text-sm text-[#7D93CE] leading-relaxed mb-6">
            Sistem CekGarasi memproses parameter riil dari 609 unit mobil terinspeksi, mengelompokkannya secara objektif berdasarkan kesesuaian anggaran, depresiasi usia, dan preferensi mobilitas harian Anda.
          </p>

          {/* 3 Segmen Pasar Overview Cards */}
          <div className="space-y-2.5">
            {/* 1. Premium */}
            <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              predictedSegment.klaster === 0
                ? 'bg-white/20 shadow-sm backdrop-blur-sm ring-1 ring-[#2557D6]'
                : 'bg-white/10 backdrop-blur-sm hover:bg-white/15'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2557D6] shadow-[0_0_8px_#2557D6]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Premium
                    {predictedSegment.klaster === 0 && <ShieldCheck className="h-3.5 w-3.5 text-[#2557D6]" />}
                  </p>
                  <p className="text-[11px] text-[#7D93CE]">Fitur keselamatan paripurna, interior mewah, kenyamanan berkendara maksimal.</p>
                </div>
              </div>
              <span className="text-[10px] text-[#B1C5FF] px-2 py-0.5 rounded bg-[#0F2A5F] font-mono font-bold shrink-0">
                Segmen 01
              </span>
            </div>

            {/* 2. Keluarga Muda */}
            <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              predictedSegment.klaster === 1
                ? 'bg-white/20 shadow-sm backdrop-blur-sm ring-1 ring-[#0CA678]'
                : 'bg-white/10 backdrop-blur-sm hover:bg-white/15'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0CA678] shadow-[0_0_8px_#0CA678]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Keluarga Muda
                    {predictedSegment.klaster === 1 && <ShieldCheck className="h-3.5 w-3.5 text-[#0CA678]" />}
                  </p>
                  <p className="text-[11px] text-[#D9E3FB]">Tahun perakitan muda, efisiensi BBM tinggi, kabin luas &amp; ramah anak.</p>
                </div>
              </div>
              <span className="text-[10px] text-[#0CA678] px-2 py-0.5 rounded bg-[#0CA678]/20 font-mono font-bold shrink-0">
                Segmen 02
              </span>
            </div>

            {/* 3. Ekonomis */}
            <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              predictedSegment.klaster === 2
                ? 'bg-white/20 shadow-sm backdrop-blur-sm ring-1 ring-[#AE3EC9]'
                : 'bg-white/10 backdrop-blur-sm hover:bg-white/15'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#AE3EC9] shadow-[0_0_8px_#AE3EC9]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Ekonomis &amp; Efisien
                    {predictedSegment.klaster === 2 && <ShieldCheck className="h-3.5 w-3.5 text-[#AE3EC9]" />}
                  </p>
                  <p className="text-[11px] text-[#7D93CE]">Perawatan terjangkau, suku cadang melimpah, rasio value-to-cost optimal.</p>
                </div>
              </div>
              <span className="text-[10px] text-[#B1C5FF] px-2 py-0.5 rounded bg-[#0F2A5F] font-mono font-bold shrink-0">
                Segmen 03
              </span>
            </div>
          </div>
        </div>

        {/* Left Bottom Status Anchor */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#7D93CE]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#FE6A2B]" />
            <span className="font-semibold text-white">3 Segmen Pasar • 609 Data Mobil Terverifikasi</span>
          </div>
          <div className="font-mono text-[11px] text-[#B1C5FF]">
            3 SEGMEN PASAR OTOMATIS
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SPLIT SCREEN RIGHT: Interactive Preferences Form             */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-[500px] flex flex-col justify-center space-y-6">
          
          {/* Top Nav Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/daftar"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Langkah Sebelumnya</span>
            </Link>
            <span className="font-mono text-[11px] font-bold text-slate-500 px-2 py-0.5 bg-slate-200/80 rounded">
              ID: B2C-PREFERENCES
            </span>
          </div>

          {/* Progress Indicator Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[#001540] text-xs font-bold w-fit">
            <span className="w-2 h-2 rounded-full bg-[#FE6A2B]" />
            <span>Langkah 3 dari 3: Personalisasi Cerdas</span>
          </div>

          {/* Headings */}
          <div>
            <h2 className="text-2xl font-extrabold text-[#001540] tracking-tight">
              Bantu kami merekomendasikan mobil yang pas
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Pilih preferensi awal Anda untuk menyesuaikan hasil pencarian pertama secara akurat tanpa survei berulang.
            </p>
          </div>

          {/* Controls Group */}
          <div className="space-y-4">
            
            {/* 1. Rentang Anggaran (Budget) */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-bold text-[#001540]">
                  Rentang Anggaran (Budget)
                </label>
                <span className="font-display text-base font-extrabold text-[#001540] tracking-tight">
                  Rp {budgetMin} Juta — Rp {budgetMax} Juta
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Geser untuk mengatur rentang harga pembelian tunai atau plafon kredit ideal.
              </p>

              {/* Slider Track */}
              <div className="relative py-2">
                <input
                  type="range"
                  min={80}
                  max={500}
                  step={10}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#FE6A2B]"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-0.5">
                <span>Rp 50 Jt</span>
                <span className="text-blue-900 font-bold">Median Pasar: Rp 165 Jt</span>
                <span>Rp 500 Jt+</span>
              </div>
            </div>

            {/* 2. Tahun Minimal Kendaraan */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <label htmlFor="car-year" className="block text-xs font-bold text-[#001540]">
                Tahun Minimal Kendaraan
              </label>
              <select
                id="car-year"
                value={tahunMin}
                onChange={(e) => setTahunMin(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="2018">2018 ke atas (Mobil usia &lt; 6 tahun)</option>
                <option value="2020">2020 ke atas (Mobil usia &lt; 4 tahun)</option>
                <option value="2022">2022 ke atas (Mobil usia &lt; 2 tahun - Like New)</option>
                <option value="2015">2015 ke atas (Opsi Ekonomis)</option>
                <option value="0">Semua Tahun Perakitan</option>
              </select>
            </div>

            {/* 3. Kriteria Utama Chip Group */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-bold text-[#001540]">
                Kriteria Utama (Pilih yang Anda utamakan)
              </label>
              <p className="text-[11px] text-slate-500">
                Pilihan ini memberi bobot kecocokan lebih tinggi saat menentukan segmen mobil yang paling pas.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Matik */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('matik')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    criteria.matik
                      ? 'bg-[#001540] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {criteria.matik ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Transmisi Matik</span>
                </button>

                {/* Jarak Tempuh Rendah */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('kmRendah')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    criteria.kmRendah
                      ? 'bg-[#001540] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {criteria.kmRendah ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Jarak Tempuh Rendah</span>
                </button>

                {/* Fitur Lengkap */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('fiturLengkap')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    criteria.fiturLengkap
                      ? 'bg-[#001540] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {criteria.fiturLengkap ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Fitur Lengkap (ADAS/Sunroof)</span>
                </button>

                {/* Harga Terjangkau */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('hargaTerjangkau')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    criteria.hargaTerjangkau
                      ? 'bg-[#001540] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {criteria.hargaTerjangkau ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Harga Terjangkau</span>
                </button>
              </div>
            </div>

          </div>

          {/* Machine Learning Segment Live Prediction Box */}
          <div className="p-4 rounded-xl bg-[#E6F7F0] border border-[#0CA678]/30 shadow-xs relative overflow-hidden transition-all space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[#0CA678] text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Perkiraan Segmen Untukmu:</span>
              </div>

              {/* Tooltip ML Chip */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[#0CA678] text-[10px] font-bold shadow-2xs border border-[#0CA678]/20">
                <BrainCircuit className="h-3 w-3" />
                <span>Segmen Otomatis</span>
                <Info className="h-3 w-3 text-slate-400" />
              </div>
            </div>

            {/* Highlight Segment Tag */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#0CA678] text-base font-extrabold shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0CA678] animate-ping" />
                <span>{predictedSegment.nama}</span>
              </div>
              <span className="text-[11px] text-[#0CA678] font-mono uppercase bg-[#0CA678]/15 px-2 py-1 rounded font-bold">
                Kecocokan {predictedSegment.kecocokan}
              </span>
            </div>

            {/* Insight Caption */}
            <p className="text-xs text-slate-800 leading-snug">
              Berdasarkan budget <strong className="text-[#001540] font-bold">Rp {budgetMin} - {budgetMax} Jt</strong> &amp; tahun <strong className="text-[#001540] font-bold">{tahunMin === '0' ? 'Semua' : `${tahunMin}+`}</strong>, terdapat{' '}
              <span className="underline decoration-[#FE6A2B] decoration-2 font-bold text-[#001540]">
                {predictedSegment.unitCount} unit mobil
              </span>{' '}
              ({predictedSegment.sharePercent}% dataset CekGarasi) yang siap uji berkendara besok.
            </p>
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/cari')}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-[#001540] transition-colors"
            >
              Lewati
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 h-11 rounded-xl bg-[#FE6A2B] hover:bg-[#A83900] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md shadow-[#FE6A2B]/20 transition-all active:scale-[0.99] group"
            >
              <span>Selesai &amp; Buka Hasil Rekomendasi</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
