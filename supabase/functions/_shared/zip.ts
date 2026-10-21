import type { ZipRow } from './types.ts';

export function normalizeZip(raw: string | null | undefined): string | null {
  const m = /^\s*(\d{5})(?:-\d{4})?\s*$/.exec(raw ?? '');
  return m ? m[1] : null;
}

/** 'near' | 'far' from the allowlist, 'out' for a valid ZIP not on it, null when the ZIP is malformed. */
export function zoneFor(raw: string | null | undefined, table: ZipRow[]): 'near' | 'far' | 'out' | null {
  const z = normalizeZip(raw);
  if (!z) return null;
  return table.find((r) => r.zip === z)?.zone ?? 'out';
}
