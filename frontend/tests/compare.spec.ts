import { test, expect } from '@playwright/test';
import { buatRingkasanBanding } from '../src/lib/ringkasanBanding';

test.describe('Phase 4 Acceptance: Compare Feature & Summary', () => {
  test('buatRingkasanBanding calculates comparative highlights correctly without technical terms', () => {
    const mockCars = [
      {
        id: 1,
        nama_mobil: 'Toyota Avanza 1.3 G',
        harga_rp: 180_000_000,
        tahun: 2019,
        jarak_tempuh_ribu_km: 45,
        klaster: 1,
        total_fitur: 8,
      },
      {
        id: 2,
        nama_mobil: 'Honda Brio RS',
        harga_rp: 150_000_000,
        tahun: 2021,
        jarak_tempuh_ribu_km: 25,
        klaster: 2,
        total_fitur: 10,
      },
      {
        id: 3,
        nama_mobil: 'Mitsubishi Xpander Ultimate',
        harga_rp: 230_000_000,
        tahun: 2020,
        jarak_tempuh_ribu_km: 60,
        klaster: 1,
        total_fitur: 14,
      },
    ];

    const res = buatRingkasanBanding(mockCars);
    expect(res).not.toBeNull();
    if (!res) return;

    // Paling hemat: Honda Brio RS (Rp 150 Jt vs 230 Jt = selisih Rp 80 Jt)
    expect(res.palingHemat?.car.id).toBe(2);
    expect(res.palingHemat?.hematRp).toBe(80_000_000);
    expect(res.palingHemat?.text).toContain('Honda Brio RS');

    // Km terendah: Honda Brio RS (25 rb km)
    expect(res.kmTerendah?.car.id).toBe(2);
    expect(res.kmTerendah?.text).toContain('25 rb km');

    // Tahun paling muda: Honda Brio RS (2021)
    expect(res.tahunPalingMuda?.car.id).toBe(2);
    expect(res.tahunPalingMuda?.text).toContain('2021');

    // Fitur terlengkap: Mitsubishi Xpander (14 fitur)
    expect(res.fiturTerlengkap?.car.id).toBe(3);
    expect(res.fiturTerlengkap?.text).toContain('14 fitur');

    // Kesimpulan must NOT contain prohibited technical jargon as whole words
    const prohibitedRegex = /\b(k-means|kmeans|cluster|klaster|machine learning|ai|algoritma|centroid|silhouette|pca)\b/i;
    expect(res.kesimpulan).not.toMatch(prohibitedRegex);
  });

  test('Compare page loads with cars, sliders, and copy button', async ({ page }) => {
    // Mock the bandingkan endpoint
    await page.route('**/api/bandingkan?ids=1,2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            nama_mobil: 'Toyota Avanza 1.3 G',
            tahun: 2019,
            harga_rp: 180_000_000,
            jarak_tempuh_ribu_km: 45,
            lokasi: 'Jakarta Selatan',
            transmisi: 'Manual',
            klaster: 1,
            nama_segmen: 'Keluarga Muda',
            total_fitur: 6,
            features: [
              { id: 1, kode: 'ABS', nama_id: 'Anti-lock Braking System', aktif: true },
              { id: 2, kode: 'AC_DOUBLE', nama_id: 'AC Double Blower', aktif: true },
            ],
            posisi_harga: {
              q1: 160_000_000,
              median: 185_000_000,
              q3: 200_000_000,
              verdict: 'wajar',
              selisih_median_rp: -5_000_000,
            },
          },
          {
            id: 2,
            nama_mobil: 'Honda Brio Satya E',
            tahun: 2021,
            harga_rp: 140_000_000,
            jarak_tempuh_ribu_km: 30,
            lokasi: 'Tangerang',
            transmisi: 'Automatic',
            klaster: 2,
            nama_segmen: 'Ekonomis & Komuter',
            total_fitur: 4,
            features: [
              { id: 1, kode: 'ABS', nama_id: 'Anti-lock Braking System', aktif: true },
              { id: 2, kode: 'AC_DOUBLE', nama_id: 'AC Double Blower', aktif: false },
            ],
            posisi_harga: {
              q1: 130_000_000,
              median: 145_000_000,
              q3: 160_000_000,
              verdict: 'wajar',
              selisih_median_rp: -5_000_000,
            },
          },
        ]),
      });
    });

    await page.goto('/bandingkan?ids=1,2');
    await expect(page.getByRole('heading', { name: 'Bandingkan Mobil' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Toyota Avanza 1.3 G' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Honda Brio Satya E' })).toBeVisible();
    await expect(page.getByText('Ringkasan Perbandingan Pintar')).toBeVisible();
    await expect(page.getByText('Tampilkan hanya perbedaan')).toBeVisible();
  });
});
