import { describe, expect, it } from 'vitest';
import { renderEmail, type EmailOrder } from './emails.ts';
import { DEFAULT_SETTINGS, mergeSettings } from './settings.ts';

const order: EmailOrder = {
  number: 'TG-1234', name: 'Pat <b>', method: 'ship', payMethod: 'venmo',
  lines: [{ name: 'Honey stick', qty: 3, totalCents: 225 }], subtotalCents: 225, shippingCents: 1100, totalCents: 1325,
  shippingQuoteNeeded: false, needsApproval: false, late: false, tracking: '9400', readyWindow: 'Nov 16-18',
};

describe('emails', () => {
  it('the three emails never say "proceeds" and stay unnamed until the charity is confirmed', () => {
    for (const k of ['placed', 'paid', 'ready'] as const) {
      const e = renderEmail(k, order, DEFAULT_SETTINGS);
      expect(`${e.subject} ${e.text}`).not.toMatch(/proceeds/i);
    }
    expect(renderEmail('placed', order, DEFAULT_SETTINGS).text).toContain('named here when confirmed');
    const named = mergeSettings({ charityName: 'Example Shelter' });
    expect(renderEmail('placed', order, named).text).toContain('Example Shelter');
  });
  it('escapes HTML in customer names', () => {
    expect(renderEmail('paid', order, DEFAULT_SETTINGS).html).not.toContain('<b>');
  });
  it('placed email carries payment steps, order number as memo and cutoffs', () => {
    const t = renderEmail('placed', order, DEFAULT_SETTINGS).text;
    expect(t).toContain('Venmo');
    expect(t).toContain('Put TG-1234 in the memo');
    expect(t).toContain('Nov 15');
    expect(t).toContain('Nov 19');
  });
  it('late orders get the Thanksgiving notice', () => {
    expect(renderEmail('placed', { ...order, late: true }, DEFAULT_SETTINGS).text).toMatch(/will not arrive before Thanksgiving/);
  });
});
