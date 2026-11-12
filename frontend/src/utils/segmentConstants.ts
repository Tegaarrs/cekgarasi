import { Crown, Users, Wallet, LucideIcon } from 'lucide-react';

export interface SegmentMeta {
  klaster: number;
  slug: string;
  nama: string;
  namaLengkap: string;
  deskripsi: string;
  colorHex: string;
  colorHexDark: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: LucideIcon;
}

export const SEGMENTS: Record<number, SegmentMeta> = {
  0: {
    klaster: 0,
    slug: 'premium',
    nama: 'Premium',
    namaLengkap: 'Premium & Eksekutif',
    deskripsi: 'Kendaraan berfitur mewah, prestise tinggi, dan kenyamanan maksimal.',
    colorHex: '#2563EB', // Blue
    colorHexDark: '#60A5FA',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    badgeText: 'text-[#2563EB] dark:text-[#60A5FA]',
    badgeBorder: 'border-blue-500/25 dark:border-blue-400/30',
    icon: Crown,
  },
  1: {
    klaster: 1,
    slug: 'keluarga-muda',
    nama: 'Keluarga Muda',
    namaLengkap: 'Keluarga & Utilitas',
    deskripsi: 'Kabin lega, efisiensi bahan bakar baik, dan kepraktisan harian keluarga.',
    colorHex: '#10B981', // Emerald
    colorHexDark: '#34D399',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeText: 'text-[#059669] dark:text-[#34D399]',
    badgeBorder: 'border-emerald-500/25 dark:border-emerald-400/30',
    icon: Users,
  },
  2: {
    klaster: 2,
    slug: 'ekonomis',
    nama: 'Ekonomis',
    namaLengkap: 'Ekonomis & Praktis',
    deskripsi: 'Biaya kepemilikan terjangkau, lincah bermanuver, dan perawatan mudah.',
    colorHex: '#F59E0B', // Amber
    colorHexDark: '#FBBF24',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    badgeText: 'text-[#D97706] dark:text-[#FBBF24]',
    badgeBorder: 'border-amber-500/25 dark:border-amber-400/30',
    icon: Wallet,
  },
};

export function getSegmentMeta(klaster: number): SegmentMeta {
  return (
    SEGMENTS[klaster] || {
      klaster,
      slug: `segmen-${klaster}`,
      nama: `Segmen ${klaster}`,
      namaLengkap: `Segmen ${klaster}`,
      deskripsi: 'Kelompok mobil berdasarkan analisis K-Means.',
      colorHex: '#2563EB',
      colorHexDark: '#60A5FA',
      badgeBg: 'bg-slate-500/10 dark:bg-slate-500/15',
      badgeText: 'text-slate-700 dark:text-slate-300',
      badgeBorder: 'border-slate-300 dark:border-slate-700',
      icon: Users,
    }
  );
}
