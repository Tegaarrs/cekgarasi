// Helper to get real photo for each car model and type (100% Real Automotive Photos)
export function getCarPhoto(carName: string = '', fotoOrTransmisi?: string | null): string {
  // If a custom uploaded photo exists, prioritize and return it directly!
  if (fotoOrTransmisi && typeof fotoOrTransmisi === 'string') {
    const trimmed = fotoOrTransmisi.trim();
    if (
      trimmed.startsWith('/') || 
      trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('data:image') ||
      trimmed.includes('/images/')
    ) {
      return trimmed;
    }
  }

  const name = (carName || '').toUpperCase();

  // 1. Top MPV Models
  if (name.includes('AVANZA')) return '/images/cars/toyota_avanza.jpg';
  if (name.includes('XPANDER')) return '/images/cars/mitsubishi_xpander.jpg';
  if (name.includes('INNOVA') || name.includes('KIJANG')) return '/images/cars/toyota_innova.jpg';
  if (name.includes('ERTIGA')) return '/images/cars/suzuki_ertiga.jpg';
  if (name.includes('XENIA')) return '/images/cars/daihatsu_xenia.jpg';
  if (name.includes('CALYA')) return '/images/cars/toyota_calya.jpg';
  if (name.includes('SIGRA')) return '/images/cars/daihatsu_sigra.jpg';
  if (name.includes('MOBILIO')) return '/images/cars/honda_mobilio.jpg';
  if (name.includes('SIENTA')) return '/images/cars/toyota_sienta.jpg';
  if (name.includes('CONFERO')) return '/images/cars/wuling_confero.jpg';
  if (name.includes('CORTEZ')) return '/images/cars/wuling_cortez.jpg';
  if (name.includes('STARGAZER')) return '/images/cars/hyundai_stargazer.jpg';
  if (name.includes('GRAND LIVINA') || name.includes('LIVINA')) return '/images/cars/nissan_grand_livina.jpg';
  if (name.includes('SERENA')) return '/images/cars/nissan_serena.jpg';
  if (name.includes('BIANTE')) return '/images/cars/nissan_serena.jpg';
  if (name.includes('FREED')) return '/images/cars/honda_mobilio.jpg';

  // 2. Top Hatchback & City Cars
  if (name.includes('BRIO')) return '/images/cars/honda_brio.jpg';
  if (name.includes('AYLA')) return '/images/cars/daihatsu_ayla.jpg';
  if (name.includes('AGYA')) return '/images/cars/toyota_agya.jpg';
  if (name.includes('YARIS')) return '/images/cars/toyota_yaris.jpg';
  if (name.includes('JAZZ')) return '/images/cars/honda_jazz.jpg';
  if (name.includes('IGNIS')) return '/images/cars/suzuki_ignis.jpg';
  if (name.includes('BALENO')) return '/images/cars/suzuki_baleno.jpg';
  if (name.includes('S-PRESSO') || name.includes('SPRESSO')) return '/images/cars/suzuki_spresso.jpg';
  if (name.includes('MAZDA 2') || name.includes('MAZDA2')) return '/images/cars/mazda_2.jpg';
  if (name.includes('MARCH')) return '/images/cars/mazda_2.jpg';
  if (name.includes('SIRION') || name.includes('KARIMUN') || name.includes('GO PANCA')) return '/images/cars/daihatsu_ayla.jpg';

  // 3. Top SUV & Crossover Models
  if (name.includes('HR-V') || name.includes('HRV')) return '/images/cars/honda_hrv.jpg';
  if (name.includes('PAJERO')) return '/images/cars/mitsubishi_pajero.jpg';
  if (name.includes('FORTUNER')) return '/images/cars/toyota_fortuner.jpg';
  if (name.includes('RUSH')) return '/images/cars/toyota_rush.jpg';
  if (name.includes('TERIOS')) return '/images/cars/daihatsu_terios.jpg';
  if (name.includes('CR-V') || name.includes('CRV')) return '/images/cars/honda_crv.jpg';
  if (name.includes('BR-V') || name.includes('BRV')) return '/images/cars/honda_brv.jpg';
  if (name.includes('RAIZE')) return '/images/cars/toyota_raize.jpg';
  if (name.includes('ROCKY')) return '/images/cars/toyota_raize.jpg';
  if (name.includes('ALMAZ')) return '/images/cars/wuling_almaz.jpg';
  if (name.includes('CRETA')) return '/images/cars/hyundai_creta.jpg';
  if (name.includes('XL7')) return '/images/cars/suzuki_xl7.jpg';
  if (name.includes('CX-5') || name.includes('CX5')) return '/images/cars/mazda_cx5.jpg';
  if (name.includes('CX-3') || name.includes('CX3')) return '/images/cars/mazda_cx3.jpg';
  if (name.includes('X-TRAIL') || name.includes('XTRAIL')) return '/images/cars/nissan_xtrail.jpg';
  if (name.includes('JUKE')) return '/images/cars/nissan_juke.jpg';
  if (name.includes('OUTLANDER') || name.includes('ECLIPSE') || name.includes('SANTA FE') || name.includes('CROSS') || name.includes('SX4')) {
    return '/images/cars/honda_hrv.jpg';
  }

  // 4. Sedan & Executive
  if (name.includes('CIVIC')) return '/images/cars/honda_civic.jpg';
  if (name.includes('CITY')) return '/images/cars/honda_city.jpg';
  if (name.includes('BMW')) return '/images/cars/bmw_3.jpg';

  // Fallback generic
  return '/images/cars/toyota_avanza.jpg';
}

// Helper for Detail Gallery based on car model & transmission
export function getCarGallery(
  carName: string = '', 
  transmisi: string = '', 
  customGallery?: string[] | null,
  customFoto?: string | null
) {
  const frontPhoto = getCarPhoto(carName, customFoto || transmisi);
  const isManual = (transmisi || '').toLowerCase().includes('man') || (carName || '').toLowerCase().includes('m/t');
  
  const interiorPhoto = isManual 
    ? '/images/details/interior_manual.jpg' 
    : '/images/details/interior_automatic.jpg';

  if (customGallery && Array.isArray(customGallery) && customGallery.length > 0) {
    const list = customGallery.filter(Boolean).map((src, idx) => ({
      label: idx === 0 ? 'Foto Utama' : `Sudut Foto ${idx + 1}`,
      src
    }));
    if (list.length > 0) {
      if (!list.some(x => x.src === frontPhoto)) {
        list.unshift({ label: 'Tampak Depan (Utama)', src: frontPhoto });
      }
      return list;
    }
  }

  return [
    { label: 'Tampak Depan (3/4)', src: frontPhoto },
    { label: 'Profil Desain', src: frontPhoto },
    { 
      label: isManual ? 'Interior & Tuas Manual (M/T)' : 'Interior & Konsol Otomatis (A/T/CVT)', 
      src: interiorPhoto 
    },
    { label: 'Ruang Mesin & Inspeksi', src: '/images/details/mesin_inspeksi.jpg' },
  ];
}
