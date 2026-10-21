export const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export function dollarsToCents(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
