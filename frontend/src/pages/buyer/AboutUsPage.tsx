import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  MapPin,
  Clock,
  Scale,
  BarChart3,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '@/services/api';

interface LiveStats {
  total_mobil: number;
}

const HUB_LOCATIONS = [
  {
    kota: 'Jakarta Selatan',
    lokasi: 'Cilandak Hub',
    jadwal: 'Setiap hari, 09:00 - 17:00 WIB',
  },
  {
    kota: 'Jakarta Pusat',
    lokasi: 'Sudirman Experience',
    jadwal: 'Setiap hari, 09:00 - 17:00 WIB',
  },
  {
    kota: 'Tangerang Selatan',
    lokasi: 'BSD City (Serpong Boulevard)',
    jadwal: 'Setiap hari, 09:00 - 17:00 WIB',
  },
  {
    kota: 'Bekasi',
    lokasi: 'Bekasi Barat (Summarecon Station)',
    jadwal: 'Setiap hari, 09:00 - 17:00 WIB',
  },
];

export function AboutUsPage() {
  const shouldReduce = useReducedMotion();
  const [totalCars, setTotalCars] = useState<number>(610);

  useEffect(() => {
    apiFetch<LiveStats>('/segmen')
      .then((res) => {
        if (res && typeof res.total_mobil === 'number' && res.total_mobil > 0) {
          setTotalCars(res.total_mobil);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F6FB] dark:bg-[#0D0D14] text-[#14141F] dark:text-[#E8E8F0] transition-colors duration-200">
      {/* 1. Split Showroom Intro Section */}
      <section className="border-b border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#14151D]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-7 space-y-5"
            >
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#0277BD] dark:text-[#38BDF8]">
                Tentang CekGarasi
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#14141F] dark:text-white leading-tight">
                Membantu Pembeli Menemukan Mobil Bekas dengan Harga yang Masuk Akal
              </h1>
              <p className="text-sm sm:text-base text-[#6B6B80] dark:text-[#A1A1B5] leading-relaxed max-w-2xl">
                CekGarasi hadir untuk menghilangkan kebingungan saat berburu mobil bekas. Daripada menebak apakah harga suatu mobil terlalu mahal, pembeli dapat membandingkan unit dengan mobil sejenis di kelas harga, tahun perakitan, dan jarak tempuh yang setara.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/cari"
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#0277BD] hover:bg-[#0369A1] text-white text-sm font-semibold inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                >
                  Telusuri Katalog Mobil
                </Link>
                <Link
                  to="/contact-us"
                  className="min-h-[44px] px-5 py-2.5 rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] hover:bg-[#EEEDFB] dark:hover:bg-[#22222E] text-sm font-semibold text-[#14141F] dark:text-white inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Hubungi Tim Kami
                </Link>
              </div>
            </motion.div>

            {/* Framed Brand & Car Visual */}
            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#063B5D] text-white shadow-sm">
                <div className="relative h-56 sm:h-64 overflow-hidden">
                  <img
                    src="/images/car_mpv.jpg"
                    alt="Koleksi mobil keluarga CekGarasi"
                    width={1280}
                    height={720}
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#063B5D] via-[#063B5D]/35 to-transparent"
                  />
                </div>
                <div className="p-5 flex items-center gap-4">
                  <span className="w-14 h-14 rounded-full bg-white p-1.5 shrink-0 flex items-center justify-center shadow-sm">
                    <img
                      src="/images/logo.png"
                      alt="Logo CekGarasi"
                      width={48}
                      height={48}
                      className="w-full h-full object-contain rounded-full"
                    />
                  </span>
                  <div>
                    <div className="text-sm font-extrabold tracking-wide uppercase text-white">
                      CekGarasi Indonesia
                    </div>
                    <p className="text-xs text-sky-100 mt-0.5 leading-relaxed">
                      Katalog transparan dengan panduan harga pasar, perbandingan spesifikasi lengkap, dan layanan uji jalan di 4 hub mitra.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verifiable Platform Figures (from real database & codebase) */}
          <div className="mt-10 pt-8 border-t border-[#E4E4EE] dark:border-[#2A2A38] grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] p-4">
              <div className="text-2xl font-extrabold text-[#0277BD] dark:text-[#38BDF8]">
                {totalCars}
              </div>
              <div className="text-xs font-medium text-[#6B6B80] dark:text-[#A1A1B5] mt-1">
                Unit terdaftar di database katalog
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] p-4">
              <div className="text-2xl font-extrabold text-[#14141F] dark:text-white">
                3 Kategori
              </div>
              <div className="text-xs font-medium text-[#6B6B80] dark:text-[#A1A1B5] mt-1">
                Premium, Keluarga Muda, dan Ekonomis
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] p-4">
              <div className="text-2xl font-extrabold text-[#14141F] dark:text-white">
                4 Hub
              </div>
              <div className="text-xs font-medium text-[#6B6B80] dark:text-[#A1A1B5] mt-1">
                Lokasi uji jalan Jabodetabek
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] p-4">
              <div className="text-2xl font-extrabold text-[#14141F] dark:text-white">
                11 Fitur
              </div>
              <div className="text-xs font-medium text-[#6B6B80] dark:text-[#A1A1B5] mt-1">
                Kelengkapan utama dicatat terbuka
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How CekGarasi Works (Varied Editorial Rows) */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0277BD] dark:text-[#38BDF8]">
              Fokus Layanan Kami
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14141F] dark:text-white">
              Dirancang Agar Keputusan Beli Lebih Yakin
            </h2>
            <p className="text-sm text-[#6B6B80] dark:text-[#A1A1B5] leading-relaxed">
              Setiap fitur di CekGarasi dibuat untuk menjawab pertanyaan nyata calon pembeli sebelum datang melihat unit secara langsung.
            </p>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] p-5 sm:p-6 flex items-start gap-4">
              <span className="w-10 h-10 rounded-lg bg-[#063B5D] text-white flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#14141F] dark:text-white">
                  Perbandingan Hingga 4 Mobil Sekaligus
                </h3>
                <p className="text-xs sm:text-sm text-[#6B6B80] dark:text-[#A1A1B5] mt-1 leading-relaxed">
                  Gunakan halaman Bandingkan untuk menjajarkan harga penawaran, tahun pembuatan, odometer, jenis transmisi, serta kelengkapan fitur dari mobil yang Anda incar.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] p-5 sm:p-6 flex items-start gap-4">
              <span className="w-10 h-10 rounded-lg bg-[#0277BD] text-white flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#14141F] dark:text-white">
                  Panduan Posisi Harga Wajar
                </h3>
                <p className="text-xs sm:text-sm text-[#6B6B80] dark:text-[#A1A1B5] mt-1 leading-relaxed">
                  Setiap detail mobil menampilkan perbandingan harga unit terhadap rentang harga pasaran wajar di kelasnya agar Anda tahu apakah penawaran sudah kompetitif.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] p-5 sm:p-6 flex items-start gap-4">
              <span className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#14141F] dark:text-white">
                  Reservasi Uji Jalan di Hub Mitra
                </h3>
                <p className="text-xs sm:text-sm text-[#6B6B80] dark:text-[#A1A1B5] mt-1 leading-relaxed">
                  Setelah menemukan unit yang cocok, Anda bisa memilih hub dan jadwal uji jalan langsung dari aplikasi tanpa perlu formulir rumit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Showroom Partner Hubs */}
      <section className="border-t border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#14151D]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0277BD] dark:text-[#38BDF8]">
                Jaringan Lokasi
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#14141F] dark:text-white mt-1">
                Lokasi Hub Uji Jalan CekGarasi
              </h2>
            </div>
            <Link
              to="/contact-us"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[#063B5D] hover:bg-[#052E49] text-white text-xs font-semibold inline-flex items-center justify-center transition-colors"
            >
              Jadwalkan atau Ajukan Pertanyaan
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HUB_LOCATIONS.map((hub) => (
              <div
                key={hub.lokasi}
                className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] p-5 space-y-2.5"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0277BD] dark:text-[#38BDF8]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{hub.kota}</span>
                </div>
                <div className="text-sm font-bold text-[#14141F] dark:text-white">
                  {hub.lokasi}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6B6B80] dark:text-[#A1A1B5]">
                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{hub.jadwal}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#1A1A24] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0277BD] dark:text-[#38BDF8] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs sm:text-sm text-[#14141F] dark:text-slate-200 leading-relaxed">
                Sudah memiliki akun pembeli CekGarasi? Masuk untuk membuka daftar mobil favorit tersimpan Anda.
              </p>
            </div>
            <Link
              to="/masuk"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0277BD] hover:bg-[#0369A1] text-white text-xs font-semibold inline-flex items-center justify-center shrink-0 transition-colors"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

