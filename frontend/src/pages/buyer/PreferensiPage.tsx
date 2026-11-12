import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Check, Plus, 
  ArrowRight, ArrowLeft, Database,
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
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-50 dark:bg-[#0B132B] transition-colors duration-200">
      
      {/* ============================================================ */}
      {/* SPLIT SCREEN LEFT: Brand, Editorial & ML Architecture       */}
      {/* ============================================================ */}
      <div className="relative w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-8 lg:p-12 overflow-hidden bg-[#0B192C] text-white min-h-[520px] lg:min-h-auto border-r border-slate-800">
        
        {/* Background photo with atmospheric gradient scrim */}
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-20"
          style={{
            backgroundImage: `url('/images/hero/hero-720.webp')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B192C] via-[#0B192C]/90 to-[#0B192C]" />

        {/* Left Header Lockup */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white leading-none">
                CekGarasi ML-Engine
              </span>
              <span className="text-[11px] text-blue-300 uppercase tracking-wider mt-1 font-semibold">
                Algoritma Penilai Objektif
              </span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold tracking-wider flex items-center gap-2 backdrop-blur-sm border border-blue-400/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>REALTIME CLUSTERING</span>
          </div>
        </div>

        {/* Left Central Editorial Content */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-semibold mb-4 border border-white/10">
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Pengelompokan Otomatis K-Means</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-3">
            Rekomendasi Cerdas Sesuai Profil Anda
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Sistem CekGarasi memproses parameter riil dari 610 unit mobil, mengelompokkannya secara objektif berdasarkan kesesuaian anggaran, usia kendaraan, dan kebutuhan mobilitas Anda.
          </p>

          {/* 3 Segmen Pasar Overview Cards */}
          <div className="space-y-2.5">
            {/* 1. Premium */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
              predictedSegment.klaster === 0
                ? 'bg-blue-600/25 border border-blue-500 shadow-md backdrop-blur-sm'
                : 'bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] shadow-[0_0_8px_#1D4ED8]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Premium
                    {predictedSegment.klaster === 0 && <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />}
                  </p>
                  <p className="text-[11px] text-slate-300">Fitur keselamatan paripurna, kenyamanan berkendara mewah dan performa tinggi.</p>
                </div>
              </div>
              <span className="text-[10px] text-blue-300 px-2 py-0.5 rounded bg-blue-950/80 font-mono font-bold shrink-0 border border-blue-800">
                Segmen 01
              </span>
            </div>

            {/* 2. Keluarga Muda */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
              predictedSegment.klaster === 1
                ? 'bg-emerald-600/25 border border-emerald-500 shadow-md backdrop-blur-sm'
                : 'bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Keluarga Muda
                    {predictedSegment.klaster === 1 && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                  </p>
                  <p className="text-[11px] text-slate-300">Tahun perakitan muda, efisiensi BBM tinggi, kabin lapang dan ramah keluarga.</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 font-mono font-bold shrink-0 border border-emerald-800">
                Segmen 02
              </span>
            </div>

            {/* 3. Ekonomis */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
              predictedSegment.klaster === 2
                ? 'bg-purple-600/25 border border-purple-500 shadow-md backdrop-blur-sm'
                : 'bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] shadow-[0_0_8px_#7C3AED]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Ekonomis
                    {predictedSegment.klaster === 2 && <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />}
                  </p>
                  <p className="text-[11px] text-slate-300">Perawatan terjangkau, suku cadang melimpah, rasio nilai-terhadap-biaya optimal.</p>
                </div>
              </div>
              <span className="text-[10px] text-purple-300 px-2 py-0.5 rounded bg-purple-950/80 font-mono font-bold shrink-0 border border-purple-800">
                Segmen 03
              </span>
            </div>
          </div>
        </div>

        {/* Left Bottom Status Anchor */}
        <div className="relative z-10 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="font-semibold text-white">3 Segmen Pasar • 610 Data Mobil Terverifikasi</span>
          </div>
          <div className="font-mono text-[11px] text-blue-300">
            KLUSTERISASI K-MEANS
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
              to="/cari"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Katalog</span>
            </Link>
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1 bg-slate-200/80 dark:bg-slate-800 rounded-lg">
              K-MEANS PREFERENCES
            </span>
          </div>

          {/* Progress Indicator Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-bold w-fit">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            <span>Personalisasi Segmen Cerdas</span>
          </div>

          {/* Headings */}
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Bantu Kami Menemukan Mobil yang Tepat
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Atur anggaran dan kriteria utama Anda untuk mencocokkan segmen K-Means yang paling relevan.
            </p>
          </div>

          {/* Controls Group */}
          <div className="space-y-4">
            
            {/* 1. Rentang Anggaran (Budget) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E172A] border border-slate-200/90 dark:border-slate-800 shadow-soft dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rentang Anggaran (Budget)
                </label>
                <span className="font-display text-base font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                  Rp {budgetMin} Juta — Rp {budgetMax} Juta
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Geser untuk mengatur batas atas budget pembelian Anda.
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
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold pt-0.5">
                <span>Rp 80 Jt</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">Pilihan Saat Ini: Rp {budgetMax} Jt</span>
                <span>Rp 500 Jt+</span>
              </div>
            </div>

            {/* 2. Tahun Minimal Kendaraan */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E172A] border border-slate-200/90 dark:border-slate-800 shadow-soft dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2">
              <label htmlFor="car-year" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Tahun Minimal Kendaraan
              </label>
              <select
                id="car-year"
                value={tahunMin}
                onChange={(e) => setTahunMin(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="2018" className="bg-white dark:bg-slate-900">2018 ke atas (Mobil usia &lt; 6 tahun)</option>
                <option value="2020" className="bg-white dark:bg-slate-900">2020 ke atas (Mobil usia &lt; 4 tahun)</option>
                <option value="2022" className="bg-white dark:bg-slate-900">2022 ke atas (Mobil usia &lt; 2 tahun - Kondisi Baru)</option>
                <option value="2015" className="bg-white dark:bg-slate-900">2015 ke atas (Opsi Ekonomis)</option>
                <option value="0" className="bg-white dark:bg-slate-900">Semua Tahun Perakitan</option>
              </select>
            </div>

            {/* 3. Kriteria Utama Chip Group */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E172A] border border-slate-200/90 dark:border-slate-800 shadow-soft dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Kriteria Utama Pilihan Anda
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilihan kriteria membantu menentukan klaster segmen yang paling relevan.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Matik */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('matik')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    criteria.matik
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {criteria.matik ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Transmisi Otomatis</span>
                </button>

                {/* Jarak Tempuh Rendah */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('kmRendah')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    criteria.kmRendah
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {criteria.kmRendah ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Odometer Rendah</span>
                </button>

                {/* Fitur Lengkap */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('fiturLengkap')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    criteria.fiturLengkap
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {criteria.fiturLengkap ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Fitur Lengkap (Sunroof / Sensor)</span>
                </button>

                {/* Harga Terjangkau */}
                <button
                  type="button"
                  onClick={() => toggleCriterion('hargaTerjangkau')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    criteria.hargaTerjangkau
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {criteria.hargaTerjangkau ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                  <span>Harga Kompetitif</span>
                </button>
              </div>
            </div>

          </div>

          {/* Machine Learning Segment Live Prediction Box */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0E172A] border-2 border-blue-500/70 dark:border-blue-400/70 shadow-soft dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Prediksi Segmen K-Means:</span>
              </div>

              {/* Tooltip ML Chip */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                <BrainCircuit className="h-3 w-3" />
                <span>Klaster K-Means</span>
              </div>
            </div>

            {/* Highlight Segment Tag */}
            <div className="flex items-center gap-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-white text-base font-extrabold shadow-sm"
                style={{ backgroundColor: predictedSegment.warnaHex }}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>{predictedSegment.nama}</span>
              </div>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-mono uppercase bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-lg font-bold border border-blue-200 dark:border-blue-800">
                Kecocokan {predictedSegment.kecocokan}
              </span>
            </div>

            {/* Insight Caption */}
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Berdasarkan budget <strong className="text-slate-900 dark:text-white font-bold">Rp {budgetMin} - {budgetMax} Jt</strong> &amp; tahun <strong className="text-slate-900 dark:text-white font-bold">{tahunMin === '0' ? 'Semua' : `${tahunMin}+`}</strong>, terdapat{' '}
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                {predictedSegment.unitCount} unit mobil
              </span>{' '}
              ({predictedSegment.sharePercent}% dari dataset 610 mobil) yang siap ditelusuri.
            </p>
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/cari')}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Lewati
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] group cursor-pointer"
            >
              <span>Buka Hasil Rekomendasi Mobil</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
