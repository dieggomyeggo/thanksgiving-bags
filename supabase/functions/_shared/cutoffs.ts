import type { Method, Settings } from './types.ts';

const TZ = 'America/Chicago';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Calendar date (YYYY-MM-DD) in Central time. */
export function chicagoDate(now: Date): string {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

function cutoffFor(method: Method, s: Pick<Settings, 'cutoffShip' | 'cutoffLocal'>): string {
  return method === 'ship' ? s.cutoffShip : s.cutoffLocal;
}

export function isLate(method: Method, now: Date, s: Pick<Settings, 'cutoffShip' | 'cutoffLocal'>): boolean {
  return chicagoDate(now) > cutoffFor(method, s);
}

export function orderingOpen(now: Date, s: Pick<Settings, 'orderingCloses'>): boolean {
  return chicagoDate(now) <= s.orderingCloses;
}

export function prettyDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function lateNotice(method: Method, s: Pick<Settings, 'cutoffShip' | 'cutoffLocal'>): string {
  const label = method === 'ship' ? 'shipping' : 'local delivery and pickup';
  return `This order is after the ${prettyDate(cutoffFor(method, s))} ${label} cutoff, so it will not arrive before Thanksgiving. You can still order through the end of the promotion.`;
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function dow(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const FINAL_BATCH = '2026-12-01';

/** Date of the Amway batch an order placed on `placedYmd` goes into. */
export function batchDate(method: Method, placedYmd: string, s: Pick<Settings, 'cutoffShip' | 'cutoffLocal'>): string {
  const cutoff = cutoffFor(method, s);
  if (placedYmd <= cutoff) return addDays(cutoff, 1);
  let d = addDays(placedYmd, 1);
  while (dow(d) !== 1) d = addDays(d, 1); // next Monday strictly after
  return d > FINAL_BATCH ? FINAL_BATCH : d;
}
