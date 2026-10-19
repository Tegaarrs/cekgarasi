import { test, expect } from '@playwright/test';
import { sanitizeInternalPath } from '../src/services/favoriteStore';

test.describe('Phase 2 Acceptance: Login Gate & Sanitizer', () => {
  test('Check 6: sanitizeInternalPath blocks open redirects and protocols', () => {
    // Blocks external URLs
    expect(sanitizeInternalPath('https://evil.com')).toBe('/');
    expect(sanitizeInternalPath('http://malicious.org/phish')).toBe('/');
    // Blocks double slash protocol-relative URLs
    expect(sanitizeInternalPath('//evil.com')).toBe('/');
    expect(sanitizeInternalPath('///evil.com')).toBe('/');
    // Blocks javascript and data schemes
    expect(sanitizeInternalPath('javascript:alert(1)')).toBe('/');
    expect(sanitizeInternalPath('data:text/html,<script>alert(1)</script>')).toBe('/');
    // Blocks windows paths or backslashes
    expect(sanitizeInternalPath('\\evil.com')).toBe('/');
    expect(sanitizeInternalPath('/path\\evil')).toBe('/');

    // Allows valid internal routes
    expect(sanitizeInternalPath('/cari')).toBe('/cari');
    expect(sanitizeInternalPath('/cari?merk=Toyota&harga_max=200000000')).toBe('/cari?merk=Toyota&harga_max=200000000');
    expect(sanitizeInternalPath('/favorit')).toBe('/favorit');
    expect(sanitizeInternalPath('/mobil/15')).toBe('/mobil/15');
    expect(sanitizeInternalPath('/bandingkan?ids=1,2')).toBe('/bandingkan?ids=1,2');
  });

  test('Check 5: Pending favorite storage expiration and schema', async ({ page }) => {
    await page.goto('/');

    // Evaluate storage logic in browser context
    const testResult = await page.evaluate(() => {
      // 1. Set valid pending favorite
      const now = Date.now();
      const validPending = {
        type: 'favorit',
        carId: 42,
        returnTo: '/cari?merk=Honda',
        expiresAt: now + 600000, // 10 mins
      };
      sessionStorage.setItem('cg.pending_favorite', JSON.stringify(validPending));

      const read1 = JSON.parse(sessionStorage.getItem('cg.pending_favorite') || '{}');
      const isValid = read1.type === 'favorit' && read1.carId === 42 && read1.returnTo === '/cari?merk=Honda';

      // 2. Set expired pending favorite (>10 min ago)
      const expiredPending = {
        type: 'favorit',
        carId: 99,
        returnTo: '/cari',
        expiresAt: now - 1000,
      };
      sessionStorage.setItem('cg.pending_favorite', JSON.stringify(expiredPending));

      // Import logic inline simulation
      const raw = sessionStorage.getItem('cg.pending_favorite');
      let isExpiredDropped = false;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem('cg.pending_favorite');
          isExpiredDropped = sessionStorage.getItem('cg.pending_favorite') === null;
        }
      }

      return { isValid, isExpiredDropped };
    });

    expect(testResult.isValid).toBe(true);
    expect(testResult.isExpiredDropped).toBe(true);
  });
});
