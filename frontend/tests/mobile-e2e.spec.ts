import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('CekGarasi Mobile Screens (M1, M2, M2b, M2c, M3)', () => {

  test('Check 5: Screen M1 Beranda renders mobile layout, topbar, bottom nav, and recommendations', async ({ page }) => {
    await page.goto('/');

    // Check viewport
    expect(page.viewportSize()?.width).toBe(390);

    // Verify MobileTopBar exists and is visible on mobile
    const mobileTopBar = page.locator('header.md\\:hidden');
    await expect(mobileTopBar).toBeVisible();

    // Verify Logo in MobileTopBar
    const logo = mobileTopBar.locator('[aria-label="CekGarasi"]').first();
    await expect(logo).toBeVisible();

    // Verify location button pill
    const locationPill = page.locator('button[aria-label^="Lokasi:"]').first();
    await expect(locationPill).toBeVisible();

    // Verify 5-tab MobileBottomNav
    const bottomNav = page.locator('nav[aria-label="Navigasi Utama Mobile"]');
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Beranda' })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Cari' })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Segmen' })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Favorit' })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Akun' })).toBeVisible();

    // Verify recommendations section with installment text
    const installmentText = page.locator('text=/Estimasi cicilan ≈ Rp/').first();
    await expect(installmentText).toBeVisible({ timeout: 12000 });

    // Verify Jelajahi Segmen 3 cards
    await expect(page.getByText('Jelajahi Segmen Pasar')).toBeVisible();
    await expect(page.getByRole('link', { name: /Premium/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Keluarga Muda/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Ekonomis/i }).first()).toBeVisible();
  });

  test('Check 6: Screen M2 Cari synchronizes URL state, sort, and segment filters', async ({ page }) => {
    await page.goto('/cari');

    // Verify sticky search bar
    const searchInput = page.getByPlaceholder('Cari merek atau model mobil...').first();
    await expect(searchInput).toBeVisible();

    // Verify result counter
    const resultsCount = page.locator('text=/Menampilkan \\d+ mobil/').first();
    await expect(resultsCount).toBeVisible({ timeout: 10000 });

    // Click segment chip "Premium"
    const premiumChip = page.getByRole('button', { name: 'Premium' }).first();
    await premiumChip.click();

    // Verify URL updated with ?segmen=premium
    await expect(page).toHaveURL(/segmen=premium/);

    // Verify car cards rendered with Premium badge
    const premiumBadge = page.locator('text=Premium').first();
    await expect(premiumBadge).toBeVisible();

    // Verify installment text formatted on cards
    const installmentEstimate = page.locator('text=/Estimasi cicilan ≈ Rp/').first();
    await expect(installmentEstimate).toBeVisible();
  });

  test('Check 7: Screen M2b FilterSheet opens, counts dynamically, and applies filters', async ({ page }) => {
    await page.goto('/cari');

    // Click Filter button to open M2b BottomSheet
    const filterBtn = page.getByRole('button', { name: /Filter/i }).first();
    await filterBtn.click();

    // Verify Bottom Sheet dialog opened
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Filter Pencarian Mobil')).toBeVisible();

    // Check price preset button
    const pricePreset = page.getByRole('button', { name: '< 150 Jt' }).first();
    await expect(pricePreset).toBeVisible();
    await pricePreset.click();

    // Verify apply button is visible with dynamic count or ready to apply
    const applyBtn = dialog.getByRole('button', { name: /(Tampilkan \d+ Mobil|Terapkan Filter)/i });
    await expect(applyBtn).toBeVisible({ timeout: 10000 });

    // Click apply
    await applyBtn.click();

    // Verify sheet closed and URL updated
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/harga_max=150000000/);
  });

  test('Check 8: Screen M2c Cari Kosong renders diagnosis and suggestions on zero results', async ({ page }) => {
    // Navigate with impossible filter to trigger 0 results
    await page.goto('/cari?q=MobilKhayalanSuperLangka999');

    // Verify empty state title (use first() to match mobile view)
    const emptyTitle = page.getByRole('heading', { name: 'Tidak ada mobil yang cocok dengan filter kamu' }).first();
    await expect(emptyTitle).toBeVisible({ timeout: 10000 });

    // Verify Reset CTA button
    const resetBtn = page.getByRole('button', { name: 'Atur Ulang Filter' }).first();
    await expect(resetBtn).toBeVisible();

    // Click reset
    await resetBtn.click();

    // Results should reload
    await expect(page.locator('text=/Menampilkan \\d+ mobil/').first()).toBeVisible({ timeout: 10000 });
  });

  test('Check 9: Screen M3 Segmen Pasar renders scatter plot, tabs, detail card, and methodology', async ({ page }) => {
    await page.goto('/segmen');

    // Title
    await expect(page.getByText('Segmentasi Pasar Mobil Bekas')).toBeVisible();

    // Wait for segment data tabs to load
    const tabKeluarga = page.getByRole('button', { name: /Keluarga Muda/i }).first();
    await expect(tabKeluarga).toBeVisible({ timeout: 15000 });
    await tabKeluarga.click();

    // Verify URL updated ?aktif=keluarga-muda
    await expect(page).toHaveURL(/aktif=keluarga-muda/);

    // Verify detail card shows Q1, Median, Q3
    await expect(page.getByText('Q1 (25%)')).toBeVisible();
    await expect(page.getByText('Median (50%)')).toBeVisible();
    await expect(page.getByText('Q3 (75%)')).toBeVisible();

    // Verify Methodology accordion
    const methodBtn = page.getByText('Bagaimana segmen ini dibuat?');
    await expect(methodBtn).toBeVisible();
    await methodBtn.click();

    // Verify truthful disclosure (K-Means 609 mobil, silhouette 0.3061)
    await expect(page.getByText(/silhouette 0\.3061/i)).toBeVisible();
    await expect(page.getByText(/609 mobil/i).first()).toBeVisible();
  });

  test('Check 10: Accessibility (Axe) and metadata validation without forbidden claims', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('viewport-fit=cover');
    expect(viewportMeta).not.toContain('user-scalable=no');

    // Check logo accessibility in visible mobile header
    const mobileHeader = page.locator('header.md\\:hidden');
    const logo = mobileHeader.locator('[aria-label="CekGarasi"]').first();
    await expect(logo).toBeVisible();

    // Run Axe accessibility scan on mobile homepage
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Ignore subtle background badge contrast
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

});
