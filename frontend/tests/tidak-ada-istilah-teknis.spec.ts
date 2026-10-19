import { test, expect } from '@playwright/test';

test.describe('Phase 5 Acceptance: Tidak Ada Istilah Teknis pada Tampilan Pembeli', () => {
  const PROHIBITED_REGEX = /\b(k-means|kmeans|machine\s+learning|klaster|centroid|silhouette|pca|model\s+prediksi|algoritma)\b/i;

  const buyerRoutes = [
    '/',
    '/cari',
    '/segmen',
    '/welcome',
    '/masuk',
    '/daftar',
    '/preferensi',
  ];

  for (const route of buyerRoutes) {
    test(`Halaman pembeli ${route} bebas dari istilah teknis machine learning`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Extract all rendered text from the main document body
      const text = await page.evaluate(() => {
        // Exclude script and style tags
        const clone = document.body.cloneNode(true) as HTMLElement;
        const toRemove = clone.querySelectorAll('script, style, noscript');
        toRemove.forEach((el) => el.remove());
        return clone.innerText || '';
      });

      const match = text.match(PROHIBITED_REGEX);
      expect(
        match,
        `Ditemukan istilah teknis "${match?.[0]}" pada halaman pembeli ${route}`
      ).toBeNull();
    });
  }

  test('Halaman /bandingkan dan /favorit bebas dari istilah teknis', async ({ page }) => {
    // Test /favorit with mock auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('cekgarasi_token', 'mock-buyer-token');
      localStorage.setItem(
        'cekgarasi_user',
        JSON.stringify({ id: 1, nama: 'Pembeli Uji', email: 'pembeli@cekgarasi.id', role: 'buyer' })
      );
    });

    await page.route('**/api/favorit?urut=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/favorit/ringkasan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jumlah: 0,
          harga_min: 0,
          harga_max: 0,
          harga_median: 0,
          tahun_median: 0,
          km_rata_rata_ribu: 0,
          sebaran_segmen: [],
        }),
      });
    });

    await page.route('**/api/favorit/rekomendasi*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/favorit');
    await page.waitForLoadState('networkidle');
    const favText = await page.evaluate(() => document.body.innerText || '');
    expect(favText.match(PROHIBITED_REGEX)).toBeNull();

    // Test /bandingkan
    await page.route('**/api/bandingkan?ids=*', async (route) => {
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
    await page.waitForLoadState('networkidle');
    const compText = await page.evaluate(() => document.body.innerText || '');
    expect(compText.match(PROHIBITED_REGEX)).toBeNull();
  });
});
