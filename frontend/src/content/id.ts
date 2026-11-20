// Master content file for visitor-facing text (address form: "kamu")
// No claims of warranty, inspection, accuracy, or fictitious benefits.

export const content = {
  brand: {
    name: 'CekGarasi',
    tagline: 'Cek dulu harganya, baru nego',
    description: 'Bandingkan harga mobil bekas dengan unit sekelas di pasaran, hitung perkiraan cicilan, lalu jadwalkan test drive.',
    altLogo: 'CekGarasi',
  },

  segments: {
    names: {
      0: 'Premium & SUV',
      1: 'Keluarga & MPV',
      2: 'Hemat & Harian',
    } as Record<number, string>,
    slugs: {
      0: 'premium',
      1: 'keluarga-muda',
      2: 'ekonomis',
    } as Record<number, string>,
    colors: {
      0: '#2557D6',
      1: '#0CA678',
      2: '#AE3EC9',
    } as Record<number, string>,
    chipLabel: 'Panduan Kategori Kelas Mobil',
    chipPopover: 'Mobil dikelompokkan berdasarkan kisaran harga, tahun rakitan, kilometer, dan kelengkapan fitur untuk memudahkan perbandingan.',
    methodologyTitle: 'Bagaimana CekGarasi mengelompokkan kategori harga?',
    methodologyBody: (total: number | string) =>
      `Seluruh ${total} unit mobil dikelompokkan ke dalam 3 kelas pasar utama berdasarkan 4 hal utama: harga penawaran showroom, tahun pembuatan, jarak tempuh pemakaian, dan kelengkapan 11 fitur penting (kamera belakang, sunroof, spion lipat otomatis, rem parkir elektrik, navigasi, kontrol stabilitas, keyless start, mode sport, kamera 360, pintu geser elektrik, cruise control) agar perbandingan antar unit lebih adil dan relevan.`,
  },

  trustStrip: [
    {
      title: 'Harga dibandingkan otomatis',
      desc: 'Tiap mobil dibandingkan dengan unit sekelas di harga pasaran wajarnya.',
    },
    {
      title: 'Cicilan bisa dihitung',
      desc: 'Perkiraan cicilan bulanan, atur DP dan tenor secara transparan.',
    },
    {
      title: 'Test drive online',
      desc: 'Pilih jadwal tanggal dan jam langsung di platform.',
    },
  ],

  howToBuySteps: [
    {
      step: 1,
      title: 'Bandingkan harga',
      desc: 'Tiap mobil dibandingkan dengan unit sekelas di pasaran.',
    },
    {
      step: 2,
      title: 'Lihat detailnya',
      desc: 'Spesifikasi, kelengkapan fitur, dan posisi harga pasaran wajar.',
    },
    {
      step: 3,
      title: 'Hitung cicilan',
      desc: 'Perkiraan cicilan bulanan, atur DP dan tenor.',
    },
    {
      step: 4,
      title: 'Jadwalkan test drive',
      desc: 'Pilih tanggal dan jam, konfirmasi online.',
    },
  ],

  navigation: {
    home: 'Beranda',
    search: 'Cari',
    segments: 'Bandingkan',
    favorites: 'Favorit',
    account: 'Akun',
    login: 'Masuk',
  },

  search: {
    placeholder: 'Cari merek atau model mobil...',
    resultsCount: (count: number) => `Menampilkan ${count} mobil`,
    sortLabel: 'Urutkan',
    sortOptions: [
      { value: 'sesuai', label: 'Paling sesuai' },
      { value: 'harga_asc', label: 'Harga terendah' },
      { value: 'harga_desc', label: 'Harga tertinggi' },
      { value: 'tahun_desc', label: 'Tahun terbaru' },
      { value: 'km_asc', label: 'Jarak tempuh terendah' },
    ],
    emptyTitle: 'Tidak ada mobil yang cocok dengan filter kamu',
    emptyResetCta: 'Atur Ulang Filter',
    loadMore: 'Muat lebih banyak',
    recommendationCaption: 'Pilihan mobil di kategori harga yang sama dan paling dekat dengan kriteria yang kamu cari.',
  },

  finance: {
    installmentLabel: (formattedPrice: string) => `Estimasi cicilan ≈ Rp ${formattedPrice}/bln`,
    priceNote: 'Harga yang ditawarkan (listing)',
  },

  auth: {
    guestFavoriteSheetTitle: 'Masuk untuk menyimpan favorit',
    guestFavoriteSheetDesc: 'Simpan mobil pilihan kamu agar mudah ditemukan kembali di semua perangkat.',
    loginCta: 'Masuk ke Akun',
  },
};
