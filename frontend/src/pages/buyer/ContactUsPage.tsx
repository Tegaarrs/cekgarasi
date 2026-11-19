import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch } from '@/services/api';

const SHOWROOM_HUBS = [
  { kota: 'Jakarta Selatan', nama: 'Cilandak Hub' },
  { kota: 'Jakarta Pusat', nama: 'Sudirman Experience' },
  { kota: 'Tangerang Selatan', nama: 'BSD City (Serpong Boulevard)' },
  { kota: 'Bekasi', nama: 'Bekasi Barat (Summarecon Station)' },
];

export function ContactUsPage() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [topik, setTopik] = useState('Pertanyaan Katalog & Unit');
  const [pesan, setPesan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [ticketResult, setTicketResult] = useState<{
    kode_tiket: string;
    nama: string;
    email: string;
    topik: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (nama.trim().length < 2) {
      setErrorMessage('Nama lengkap wajib diisi minimal 2 karakter.');
      return;
    }
    if (pesan.trim().length < 10) {
      setErrorMessage('Mohon tulis pesan minimal 10 karakter agar tim kami dapat membantu dengan tepat.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        status: string;
        kode_tiket: string;
        nama: string;
        email: string;
        topik: string;
      }>('/kontak', {
        method: 'POST',
        body: JSON.stringify({
          nama: nama.trim(),
          email: email.trim(),
          topik,
          pesan: pesan.trim(),
        }),
      });
      setTicketResult(res);
      setNama('');
      setEmail('');
      setPesan('');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim pesan. Periksa kembali isian formulir Anda.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6FB] dark:bg-[#0D0D14] text-[#14141F] dark:text-[#E8E8F0] transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-8 max-w-2xl">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#0277BD] dark:text-[#38BDF8]">
            Contact Us
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#14141F] dark:text-white mt-1.5">
            Hubungi Tim CekGarasi
          </h1>
          <p className="text-sm sm:text-base text-[#6B6B80] dark:text-[#A1A1B5] mt-2 leading-relaxed">
            Punya pertanyaan mengenai unit mobil, posisi harga pasar, jadwal uji jalan, atau kendala akun? Kirim pesan melalui formulir ini atau hubungi saluran resmi di bawah.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Contact Info & Showroom Hubs */}
          <aside className="lg:col-span-5 space-y-5">
            <div className="rounded-xl bg-[#063B5D] text-white p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-white/15">
                <span className="w-10 h-10 rounded-full bg-white p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/images/logo.png"
                    alt="Logo CekGarasi"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain rounded-full"
                  />
                </span>
                <div>
                  <div className="text-sm font-extrabold tracking-wider uppercase">
                    Layanan Pembeli CekGarasi
                  </div>
                  <div className="text-xs text-sky-100">
                    Konsultasi unit &amp; dukungan akun
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-sky-300 shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-sky-200 font-medium">Email Layanan</div>
                    <a
                      href="mailto:cs@cekgarasi.id"
                      className="font-semibold text-white hover:text-sky-200 underline-offset-4 hover:underline"
                    >
                      cs@cekgarasi.id
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-sky-300 shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-sky-200 font-medium">Jam Layanan Hub</div>
                    <div className="font-semibold text-white">
                      Senin s.d. Minggu, 09:00 - 17:00 WIB
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/15">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-200 mb-3">
                  Lokasi Hub Mitra Uji Jalan
                </div>
                <ul className="space-y-2.5 text-xs">
                  {SHOWROOM_HUBS.map((hub) => (
                    <li key={hub.nama} className="flex items-start gap-2.5 text-sky-50">
                      <MapPin className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="font-semibold text-white">{hub.kota}:</strong> {hub.nama}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] p-5 flex items-center justify-between gap-3">
              <div className="text-xs text-[#6B6B80] dark:text-[#A1A1B5]">
                Ingin mengenal platform kami lebih lengkap?
              </div>
              <Link
                to="/about-us"
                className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] text-xs font-semibold text-[#0277BD] dark:text-[#38BDF8] hover:bg-slate-50 dark:hover:bg-white/5 inline-flex items-center shrink-0"
              >
                Baca About Us
              </Link>
            </div>
          </aside>

          {/* Right Panel: Interactive Contact Form */}
          <section className="lg:col-span-7 rounded-xl border border-[#E4E4EE] dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] p-6 sm:p-8 shadow-sm">
            {ticketResult ? (
              <div className="py-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-[#14141F] dark:text-white">
                  Pesan Berhasil Diterima
                </h2>
                <p className="text-sm text-[#6B6B80] dark:text-[#A1A1B5] leading-relaxed">
                  Terima kasih, <strong className="text-[#14141F] dark:text-white">{ticketResult.nama}</strong>. Pertanyaan Anda mengenai topik <strong className="text-[#14141F] dark:text-white">{ticketResult.topik}</strong> sudah tercatat dengan nomor referensi <span className="font-mono font-bold text-[#0277BD] dark:text-[#38BDF8]">{ticketResult.kode_tiket}</span>. Balasan akan ditujukan ke <strong className="text-[#14141F] dark:text-white">{ticketResult.email}</strong>.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setTicketResult(null)}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0277BD] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
                  >
                    Kirim Pesan Lain
                  </button>
                  <Link
                    to="/cari"
                    className="min-h-[44px] px-4 py-2 rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] text-xs font-semibold text-[#14141F] dark:text-white inline-flex items-center"
                  >
                    Lihat Katalog Mobil
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 pb-4 border-b border-[#E4E4EE] dark:border-[#2A2A38]">
                  <h2 className="text-lg font-bold text-[#14141F] dark:text-white">
                    Kirim Pesan ke CekGarasi
                  </h2>
                  <p className="text-xs text-[#6B6B80] dark:text-[#A1A1B5] mt-1">
                    Isi detail di bawah agar pertanyaan Anda langsung diarahkan ke tim yang tepat.
                  </p>
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="mb-5 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 px-4 py-3 text-xs font-medium text-rose-900 dark:text-rose-100 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-semibold text-[#14141F] dark:text-slate-200 mb-1.5"
                      >
                        Nama Lengkap
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Nama Anda"
                        className="cg-auth-input w-full min-h-[44px] rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#16161F] px-3.5 py-2.5 text-sm text-[#14141F] dark:text-[#E8E8F0] placeholder-[#6B6B80] dark:placeholder-[#9A9AB0] focus:bg-white dark:focus:bg-[#16161F] focus:border-[#0277BD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0277BD]/30"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-semibold text-[#14141F] dark:text-slate-200 mb-1.5"
                      >
                        Alamat Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="cg-auth-input w-full min-h-[44px] rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#16161F] px-3.5 py-2.5 text-sm text-[#14141F] dark:text-[#E8E8F0] placeholder-[#6B6B80] dark:placeholder-[#9A9AB0] focus:bg-white dark:focus:bg-[#16161F] focus:border-[#0277BD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0277BD]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-topic"
                      className="block text-xs font-semibold text-[#14141F] dark:text-slate-200 mb-1.5"
                    >
                      Topik Pertanyaan
                    </label>
                    <select
                      id="contact-topic"
                      value={topik}
                      onChange={(e) => setTopik(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#16161F] px-3.5 py-2.5 text-sm text-[#14141F] dark:text-[#E8E8F0] focus:bg-white dark:focus:bg-[#16161F] focus:border-[#0277BD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0277BD]/30 cursor-pointer"
                    >
                      <option value="Pertanyaan Katalog & Unit">Pertanyaan Katalog &amp; Unit</option>
                      <option value="Jadwal Test Drive Showroom">Jadwal Test Drive Showroom</option>
                      <option value="Bantuan Akun & Login Pembeli">Bantuan Akun &amp; Login Pembeli</option>
                      <option value="Simulasi Kredit & Harga Pasar">Simulasi Kredit &amp; Harga Pasar</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-semibold text-[#14141F] dark:text-slate-200 mb-1.5"
                    >
                      Pesan Anda
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      value={pesan}
                      onChange={(e) => setPesan(e.target.value)}
                      placeholder="Tuliskan unit mobil yang ingin ditanyakan, hub pilihan, atau kendala akun Anda..."
                      className="w-full rounded-lg border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#16161F] px-3.5 py-2.5 text-sm text-[#14141F] dark:text-[#E8E8F0] placeholder-[#6B6B80] dark:placeholder-[#9A9AB0] focus:bg-white dark:focus:bg-[#16161F] focus:border-[#0277BD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0277BD]/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0277BD] hover:bg-[#0369A1] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                  >
                    {submitting ? (
                      <>
                        <Spinner size={18} />
                        <span>Mengirim Pesan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" aria-hidden="true" />
                        <span>Kirim Pesan</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

