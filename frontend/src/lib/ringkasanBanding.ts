export interface CompareCarItem {
  id: number;
  nama_mobil: string;
  harga_rp: number;
  tahun: number;
  jarak_tempuh_ribu_km: number;
  klaster: number;
  nama_segmen?: string;
  total_fitur?: number;
  fitur_list?: string[];
  transmisi?: string;
  lokasi?: string;
}

export interface ComparisonSummary {
  palingHemat?: {
    car: CompareCarItem;
    hematRp: number;
    text: string;
  };
  kmTerendah?: {
    car: CompareCarItem;
    text: string;
  };
  tahunPalingMuda?: {
    car: CompareCarItem;
    text: string;
  };
  fiturTerlengkap?: {
    car: CompareCarItem;
    text: string;
  };
  kesimpulan: string;
}

export function buatRingkasanBanding(cars: CompareCarItem[]): ComparisonSummary | null {
  if (!cars || cars.length < 2) {
    return null;
  }

  // 1. Paling Hemat (harga_rp terendah)
  const sortedByPrice = [...cars].sort((a, b) => a.harga_rp - b.harga_rp);
  const cheapest = sortedByPrice[0];
  const mostExpensive = sortedByPrice[sortedByPrice.length - 1];
  const priceDiff = mostExpensive.harga_rp - cheapest.harga_rp;
  const hematJt = Math.round(priceDiff / 1_000_000);
  const cheapestJt = Math.round(cheapest.harga_rp / 1_000_000);

  const palingHemat = {
    car: cheapest,
    hematRp: priceDiff,
    text:
      hematJt > 0
        ? `Paling hemat: ${cheapest.nama_mobil} (Rp ${cheapestJt} Jt, lebih terjangkau Rp ${hematJt} Jt dari opsi tertinggi)`
        : `Harga setara: ${cheapest.nama_mobil} (Rp ${cheapestJt} Jt)`,
  };

  // 2. Kilometer Terendah
  const sortedByKm = [...cars].sort((a, b) => a.jarak_tempuh_ribu_km - b.jarak_tempuh_ribu_km);
  const lowestKm = sortedByKm[0];
  const kmTerendah = {
    car: lowestKm,
    text: `Jarak tempuh terendah: ${lowestKm.nama_mobil} (${lowestKm.jarak_tempuh_ribu_km} rb km)`,
  };

  // 3. Tahun Paling Muda
  const sortedByYear = [...cars].sort((a, b) => b.tahun - a.tahun);
  const newestYear = sortedByYear[0];
  const tahunPalingMuda = {
    car: newestYear,
    text: `Tahun rakitan terbaru: ${newestYear.nama_mobil} (${newestYear.tahun})`,
  };

  // 4. Fitur Terlengkap
  const sortedByFeatures = [...cars].sort((a, b) => (b.total_fitur ?? 0) - (a.total_fitur ?? 0));
  const mostFeatures = sortedByFeatures[0];
  const fiturTerlengkap =
    (mostFeatures.total_fitur ?? 0) > 0
      ? {
          car: mostFeatures,
          text: `Fitur paling lengkap: ${mostFeatures.nama_mobil} (${mostFeatures.total_fitur} fitur)`,
        }
      : undefined;

  // 5. Kesimpulan rule-based
  let kesimpulan = '';
  if (cheapest.id === lowestKm.id && cheapest.id === newestYear.id) {
    kesimpulan = `${cheapest.nama_mobil} menjadi pilihan terbaik secara menyeluruh dengan harga paling ekonomis, odometer terendah, dan tahun rakitan termuda.`;
  } else if (cheapest.id === lowestKm.id) {
    kesimpulan = `${cheapest.nama_mobil} menawarkan nilai ekonomis tinggi dengan odometer rendah di harga terendah.`;
  } else if (newestYear.id === lowestKm.id) {
    kesimpulan = `${newestYear.nama_mobil} unggul dari segi usia unit dan pemakaian paling minim (${lowestKm.jarak_tempuh_ribu_km} rb km).`;
  } else {
    kesimpulan = `Pilih ${cheapest.nama_mobil} jika fokus pada anggaran hemat, atau pertimbangkan ${newestYear.nama_mobil} untuk usia unit yang lebih segar.`;
  }

  return {
    palingHemat,
    kmTerendah,
    tahunPalingMuda,
    fiturTerlengkap,
    kesimpulan,
  };
}
