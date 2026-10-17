// Unified financial calculations for CekGarasi
// Annuity formula, standard defaults: DP 20%, tenor 48 months (4 years), 8% p.a.

export const DEFAULT_DP_PERCENT = 20;
export const DEFAULT_TENOR_MONTHS = 48;
export const DEFAULT_ANNUAL_RATE = 0.08;

/**
 * Calculates monthly installment using annuity formula.
 * @param priceRp Total listing price in IDR
 * @param dpPercent Down payment percentage (default 20%)
 * @param tenorMonths Loan duration in months (default 48 months)
 * @param annualRate Annual interest rate (default 8% = 0.08)
 * @returns Monthly installment in IDR
 */
export function calculateInstallment(
  priceRp: number,
  dpPercent: number = DEFAULT_DP_PERCENT,
  tenorMonths: number = DEFAULT_TENOR_MONTHS,
  annualRate: number = DEFAULT_ANNUAL_RATE
): number {
  if (priceRp <= 0 || tenorMonths <= 0) return 0;
  const pokok = priceRp * (1 - dpPercent / 100);
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, tenorMonths);
  const monthly = pokok * ((r * factor) / (factor - 1));
  return Math.round(monthly);
}

/**
 * Returns formatted monthly installment string in million IDR (e.g., "2,93 jt").
 */
export function formatInstallmentMillion(priceRp: number): string {
  const monthly = calculateInstallment(priceRp);
  const inMillion = monthly / 1_000_000;
  // Format with Indonesian comma
  return inMillion.toFixed(2).replace('.', ',') + ' jt';
}

/**
 * Returns the standardized estimate string: "Estimasi cicilan ≈ Rp X jt/bln".
 */
export function getEstimatedInstallmentText(priceRp: number): string {
  const formattedMillion = formatInstallmentMillion(priceRp);
  return `Estimasi cicilan ≈ Rp ${formattedMillion}/bln`;
}

/**
 * Formats full Rupiah currency without decimals (e.g. "Rp 150.000.000").
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats price in compact millions (e.g. 150000000 -> "Rp150 jt" or "150 jt").
 */
export function formatJuta(amount: number, withPrefix: boolean = true): string {
  const jt = Math.round(amount / 1_000_000);
  return withPrefix ? `Rp${jt} jt` : `${jt} jt`;
}
