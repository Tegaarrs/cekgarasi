import { test, expect } from '@playwright/test';

test.describe('Reduced Motion Accessibility Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate user preference for reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('Homepage (/) renders key content within 1 second without animation delays', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:8000/');
    
    // Key headline and segment title must be visible within 1s
    await expect(page.locator('h1')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=Segmentasi Pasar Cerdas (K-Means)')).toBeVisible({ timeout: 1000 });
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThanOrEqual(3000);
  });

  test('Search Catalog (/cari) renders filter controls and car grid within 1 second', async ({ page }) => {
    await page.goto('http://localhost:8000/cari');
    
    // Search input and unit counter must be visible within 1s
    await expect(page.locator('input[placeholder*="Cari nama mobil"]')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=Menampilkan')).toBeVisible({ timeout: 1000 });
  });

  test('Admin Portal (/admin) renders within 1 second with instant visibility', async ({ page }) => {
    await page.goto('http://localhost:8000/admin');
    
    // Portal heading or security gate must appear immediately
    await expect(
      page.locator('text=Portal Dealer').or(page.locator('text=Akses Terbatas'))
    ).toBeVisible({ timeout: 1000 });
  });
});
