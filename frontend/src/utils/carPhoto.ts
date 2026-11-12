// Helper foto mobil: eksterior & interior selalu dipetakan per merk + model.
//
// Cara menambah foto baru:
//   1. Simpan eksterior di   frontend/public/images/cars/<key>.jpg      (mis. toyota_agya.jpg)
//   2. Simpan interior di    frontend/public/images/interior/<key>.jpg  (mis. toyota_agya.jpg)
//   3. Tambahkan <key> ke EXTERIOR_AVAILABLE / INTERIOR_AVAILABLE di bawah.
// Selama foto spesifik belum tersedia, eksterior memakai ilustrasi generik sesuai tipe bodi
// (bukan foto merk lain) dan foto interior tidak ditampilkan (bukan interior merk lain).

// [pola nama (huruf besar), key merk_model]. Urutan penting: pola lebih spesifik di atas.
const MODEL_KEYS: Array<[RegExp, string]> = [
  [/XPANDER/, 'mitsubishi_xpander'],
  [/PAJERO/, 'mitsubishi_pajero'],
  [/OUTLANDER/, 'mitsubishi_outlander'],
  [/ECLIPSE/, 'mitsubishi_eclipse'],
  [/\bCOLT\b/, 'mitsubishi_colt'],
  [/AVANZA/, 'toyota_avanza'],
  [/INNOVA|KIJANG/, 'toyota_innova'],
  [/FORTUNER/, 'toyota_fortuner'],
  [/CALYA/, 'toyota_calya'],
  [/SIENTA/, 'toyota_sienta'],
  [/AGYA/, 'toyota_agya'],
  [/YARIS/, 'toyota_yaris'],
  [/RAIZE/, 'toyota_raize'],
  [/RUSH/, 'toyota_rush'],
  [/ROCKY/, 'daihatsu_rocky'],
  [/XENIA/, 'daihatsu_xenia'],
  [/SIGRA/, 'daihatsu_sigra'],
  [/AYLA/, 'daihatsu_ayla'],
  [/SIRION/, 'daihatsu_sirion'],
  [/TERIOS/, 'daihatsu_terios'],
  [/ERTIGA/, 'suzuki_ertiga'],
  [/XL7/, 'suzuki_xl7'],
  [/IGNIS/, 'suzuki_ignis'],
  [/BALENO/, 'suzuki_baleno'],
  [/S-?PRESSO/, 'suzuki_spresso'],
  [/KARIMUN/, 'suzuki_karimun'],
  [/SX4/, 'suzuki_sx4'],
  [/CARRY/, 'suzuki_carry'],
  [/MOBILIO/, 'honda_mobilio'],
  [/FREED/, 'honda_freed'],
  [/BRIO/, 'honda_brio'],
  [/JAZZ/, 'honda_jazz'],
  [/HR-?V/, 'honda_hrv'],
  [/BR-?V/, 'honda_brv'],
  [/CR-?V/, 'honda_crv'],
  [/CIVIC/, 'honda_civic'],
  [/\bCITY\b/, 'honda_city'],
  [/CONFERO/, 'wuling_confero'],
  [/CORTEZ/, 'wuling_cortez'],
  [/ALMAZ/, 'wuling_almaz'],
  [/STARGAZER/, 'hyundai_stargazer'],
  [/CRETA/, 'hyundai_creta'],
  [/SANTA FE/, 'hyundai_santa_fe'],
  [/GRAND LIVINA/, 'nissan_grand_livina'],
  [/LIVINA/, 'nissan_livina'],
  [/SERENA/, 'nissan_serena'],
  [/X-?TRAIL/, 'nissan_xtrail'],
  [/JUKE/, 'nissan_juke'],
  [/MARCH/, 'nissan_march'],
  [/MAZDA ?2/, 'mazda_2'],
  [/CX-?5/, 'mazda_cx5'],
  [/CX-?3/, 'mazda_cx3'],
  [/BIANTE/, 'mazda_biante'],
  [/BMW/, 'bmw_3'],
  [/ECOSPORT/, 'ford_ecosport'],
  [/SPARK/, 'chevrolet_spark'],
  [/GO\+|GO PLUS|GO PANCA/, 'datsun_go_plus'],
  [/\bGO\b/, 'datsun_go'],
  [/\bCROSS\b/, 'datsun_cross'],
];

// Foto eksterior yang SUDAH terverifikasi sesuai merk-model (public/images/cars/<key>.jpg).
// Catatan: file toyota_agya, toyota_calya, toyota_rush, wuling_confero sebelumnya hanya salinan
// dari Ayla, Sigra, Terios, Cortez sehingga tidak dianggap tersedia sampai diganti foto aslinya.
const EXTERIOR_AVAILABLE = new Set<string>([
  'bmw_3', 'daihatsu_ayla', 'daihatsu_sigra', 'daihatsu_terios', 'daihatsu_xenia',
  'honda_brio', 'honda_brv', 'honda_city', 'honda_civic', 'honda_crv', 'honda_hrv',
  'honda_jazz', 'honda_mobilio', 'hyundai_creta', 'hyundai_stargazer',
  'mazda_2', 'mazda_cx3', 'mazda_cx5', 'mitsubishi_pajero', 'mitsubishi_xpander',
  'nissan_grand_livina', 'nissan_juke', 'nissan_serena', 'nissan_xtrail',
  'suzuki_baleno', 'suzuki_ertiga', 'suzuki_ignis', 'suzuki_spresso',
  'toyota_avanza', 'toyota_fortuner', 'toyota_innova', 'toyota_raize',
  'toyota_sienta', 'toyota_yaris', 'wuling_almaz', 'wuling_cortez',
]);

// Foto interior per merk-model (public/images/interior/<key>.jpg). Tambahkan key setelah file ada.
const INTERIOR_AVAILABLE = new Set<string>([]);

// Ilustrasi generik per tipe bodi, dipakai bila foto spesifik model belum tersedia.
const BODY_FALLBACK: Record<string, string> = {
  hatchback: '/images/car_hatchback.jpg',
  mpv: '/images/car_mpv.jpg',
  suv: '/images/car_suv.jpg',
  sedan: '/images/car_sedan.jpg',
};

const BODY_BY_KEY: Record<string, keyof typeof BODY_FALLBACK> = {
  toyota_calya: 'mpv', toyota_agya: 'hatchback', toyota_rush: 'suv', wuling_confero: 'mpv',
  honda_freed: 'mpv', mazda_biante: 'mpv', nissan_livina: 'mpv', nissan_march: 'hatchback',
  daihatsu_rocky: 'suv', daihatsu_sirion: 'hatchback', suzuki_karimun: 'hatchback',
  suzuki_sx4: 'suv', suzuki_carry: 'mpv', suzuki_xl7: 'suv', mitsubishi_outlander: 'suv',
  mitsubishi_eclipse: 'suv', mitsubishi_colt: 'mpv', hyundai_santa_fe: 'suv',
  ford_ecosport: 'suv', chevrolet_spark: 'hatchback', datsun_go: 'hatchback',
  datsun_go_plus: 'mpv', datsun_cross: 'hatchback',
};

/** Kembalikan key merk_model (mis. 'toyota_agya') dari nama mobil, atau null bila tidak dikenali. */
export function getCarModelKey(carName: string = ''): string | null {
  const name = (carName || '').toUpperCase();
  for (const [pattern, key] of MODEL_KEYS) {
    if (pattern.test(name)) return key;
  }
  return null;
}

function isCustomPhoto(value?: string | null): value is string {
  if (!value || typeof value !== 'string') return false;
  const t = value.trim();
  return (
    t.startsWith('/') ||
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('data:image') ||
    t.includes('/images/')
  );
}

// Foto eksterior sesuai merk-model mobil di katalog.
export function getCarPhoto(carName: string = '', fotoOrTransmisi?: string | null): string {
  // Foto unggahan custom diprioritaskan.
  if (isCustomPhoto(fotoOrTransmisi)) return fotoOrTransmisi.trim();

  const key = getCarModelKey(carName);
  if (key && EXTERIOR_AVAILABLE.has(key)) return `/images/cars/${key}.jpg`;
  return BODY_FALLBACK[(key && BODY_BY_KEY[key]) || 'mpv'];
}

// Foto interior sesuai merk-model; null bila belum tersedia (tidak memakai interior merk lain).
export function getCarInteriorPhoto(carName: string = ''): string | null {
  const key = getCarModelKey(carName);
  return key && INTERIOR_AVAILABLE.has(key) ? `/images/interior/${key}.jpg` : null;
}

// Galeri detail berdasarkan merk-model mobil
export function getCarGallery(
  carName: string = '',
  transmisi: string = '',
  customGallery?: string[] | null,
  customFoto?: string | null
) {
  const isManual = (transmisi || '').toLowerCase().includes('man') || (carName || '').toLowerCase().includes('m/t');
  const frontPhoto = getCarPhoto(carName, customFoto);
  const interiorPhoto = getCarInteriorPhoto(carName);
  const interiorLabel = isManual ? 'Interior & Tuas Manual (M/T)' : 'Interior & Konsol (A/T/CVT)';
  const engine = { label: 'Ruang Mesin & Inspeksi', src: '/images/details/mesin_inspeksi.jpg' };

  // Foto interior unggahan admin disimpan di foto_gallery dengan prefix 'interior::'
  const INTERIOR_PREFIX = 'interior::';
  const customInteriors: string[] = [];
  const userPhotos: string[] = [];
  if (isCustomPhoto(customFoto)) userPhotos.push(customFoto.trim());
  if (customGallery && Array.isArray(customGallery)) {
    customGallery.forEach((url) => {
      if (url && typeof url === 'string') {
        const trimmed = url.trim();
        if (trimmed.startsWith(INTERIOR_PREFIX)) {
          const src = trimmed.slice(INTERIOR_PREFIX.length);
          if (src && !customInteriors.includes(src)) customInteriors.push(src);
        } else if (trimmed && !userPhotos.includes(trimmed)) {
          userPhotos.push(trimmed);
        }
      }
    });
  }

  const angleLabels = [
    'Tampak Depan (Utama)',
    'Tampak Samping & Profil',
    'Sudut Belakang & Eksterior',
    'Detail Unit & Aksesoris',
    'Dokumentasi Unit Tambahan',
  ];

  const list: { label: string; src: string }[] =
    userPhotos.length > 0
      ? userPhotos.map((src, idx) => ({ label: angleLabels[idx] || `Sudut Foto ${idx + 1}`, src }))
      : [
          { label: 'Tampak Depan (3/4)', src: frontPhoto },
          { label: 'Profil Desain', src: frontPhoto },
        ];

  if (customInteriors.length > 0) {
    customInteriors.forEach((src, i) =>
      list.push({ label: customInteriors.length > 1 ? `Interior ${i + 1}` : interiorLabel, src })
    );
  } else if (interiorPhoto) {
    list.push({ label: interiorLabel, src: interiorPhoto });
  }
  list.push(engine);
  return list;
}
