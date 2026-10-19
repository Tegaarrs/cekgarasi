import { test, expect } from '@playwright/test';

test.describe('Phase 3 Acceptance: Favorit Page', () => {
  test('Check 1: Guest is redirected from /favorit to /masuk?next=/favorit', async ({ page }) => {
    // Clear tokens/storage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try navigating to /favorit
    await page.goto('/favorit');
    await expect(page).toHaveURL(/\/masuk\?next=(%2F|\/)favorit/);
  });

  test('Check 2: Favorit page empty state elements when user has no favorites', async ({ page }) => {
    await page.goto('/');
    // Set a dummy logged-in buyer token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('cekgarasi_token', 'mock-buyer-token');
      localStorage.setItem(
        'cekgarasi_user',
        JSON.stringify({ id: 1, nama: 'Pembeli Uji', email: 'pembeli@cekgarasi.id', role: 'buyer' })
      );
    });

    // Mock the backend API responses
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
    await expect(page.getByText('Belum ada mobil yang kamu simpan')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jelajahi Katalog Mobil' })).toBeVisible();
  });
});
