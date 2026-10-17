// Master content file for visitor-facing text (address form: "kamu")
// No claims of warranty, inspection, accuracy, or fictitious benefits.

export const content = {
  brand: {
    name: 'CekGarasi',
    tagline: 'Cek dulu harganya, baru nego',
    description: 'Bandingkan harga mobil bekas dengan mobil sejenis di segmennya, hitung perkiraan cicilan, lalu jadwalkan test drive.',
    altLogo: 'CekGarasi',
  },

  segments: {
    names: {
      0: 'Premium',
      1: 'Keluarga Muda',
      2: 'Ekonomis',
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
    chipLabel: 'Segmen otomatis (K-Means)',
    chipPopover: 'Mobil dikelompokkan otomatis berdasarkan harga, tahun, jarak tempuh, dan jumlah fitur.',
    methodologyTitle: 'Bagaimana segmen ini dibuat?',
    methodologyBody: (total: number | string, silhouetteK3: number | string) =>
      `K-Means (3 segmen) dijalankan sekali pada ${total} mobil, dengan 4 variabel yang sudah diskalakan: harga listing (harga yang ditawarkan, bukan harga transaksi), tahun pembuatan, jarak tempuh (data listing, belum diverifikasi), dan jumlah fitur dari 11 fitur yang tercatat (kamera belakang, sunroof, spion lipat otomatis, rem parkir elektrik, navigasi, kontrol stabilitas, keyless start, mode sport, kamera 360, pintu geser elektrik, cruise control). Segmen tidak diperbarui otomatis. Pemisahan antar segmen sedang (silhouette ${silhouetteK3}), jadi mobil di perbatasan bisa masuk segmen sebelahnya. Segmen menunjukkan kemiripan, bukan penilaian kualitas.`,
  },

  trustStrip: [
    {
      title: 'Harga dibandingkan otomatis',
      desc: 'Tiap mobil dibandingkan dengan mobil sejenis di segmennya.',
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
      desc: 'Tiap mobil dibandingkan dengan mobil sejenis di segmennya.',
    },
    {
      step: 2,
      title: 'Lihat detailnya',
      desc: 'Spesifikasi, fitur, dan posisi harga di segmen.',
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
    segments: 'Segmen',
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
    recommendationCaption: 'Ini mobil di segmen yang sama dan paling dekat dengan harga dan tahun yang kamu cari.',
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
