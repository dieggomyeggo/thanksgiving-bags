import { describe, expect, it } from 'vitest';
import { normalizeZip, zoneFor } from './zip.ts';

const table = [
  { zip: '50131', zone: 'near' as const },
  { zip: '50010', zone: 'far' as const },
];

describe('zip', () => {
  it('normalizes 5-digit and ZIP+4, rejects junk', () => {
    expect(normalizeZip(' 50131 ')).toBe('50131');
    expect(normalizeZip('50131-1234')).toBe('50131');
    expect(normalizeZip('5013')).toBeNull();
    expect(normalizeZip('abcde')).toBeNull();
    expect(normalizeZip('')).toBeNull();
  });
  it('zones: near, far, out (valid but not on the allowlist), null (invalid)', () => {
    expect(zoneFor('50131', table)).toBe('near');
    expect(zoneFor('50010-9999', table)).toBe('far');
    expect(zoneFor('90210', table)).toBe('out');
    expect(zoneFor('nope', table)).toBeNull();
  });
});
