import { describe, expect, it } from 'vitest';
import { buildClaim, claimStatus, claimWarnings, longDate, mailtoLink, type ClaimInput } from '@/lib/claim-core';
import { cleanLabel, cleanReceipt, labelSummary } from '@/lib/ocr-core';

const base: ClaimInput = {
  homeAddress: '12 Jalan Test, Singapore',
  asset: { name: 'Living room aircon', make: 'Daikin', model: 'FTKM25', serialNumber: 'G123456', installDate: '2025-03-09', warrantyExpiry: '2027-03-09', priceLabel: 'SGD 1,299.00' },
  issue: 'It blows warm air and leaks water.',
  issueSince: '2026-11-01',
  resolution: 'repair',
  contact: { name: 'Una Tan', phone: '+65 9123 4567', email: 'una@example.com' },
  attachments: { receipt: true, manual: false, photo: true },
  today: '2026-11-10',
};

describe('warranty claim letter', () => {
  it('formats dates unambiguously', () => {
    expect(longDate('2026-03-09')).toBe('9 Mar 2026');
    expect(longDate(null)).toBe('');
    expect(longDate('nonsense')).toBe('');
  });
  it('builds subject and body with the item facts', () => {
    const { subject, body } = buildClaim(base);
    expect(subject).toBe('Warranty claim: Daikin FTKM25 (serial G123456)');
    expect(body).toContain('Dear Daikin Customer Support,');
    expect(body).toContain('Serial number: G123456');
    expect(body).toContain('Warranty valid until: 9 Mar 2027');
    expect(body).toContain('It blows warm air and leaks water.');
    expect(body).toContain('First noticed: 1 Nov 2026');
    expect(body).toContain('I would like the product repaired under warranty.');
    expect(body).toContain('my receipt / proof of purchase, a photo of the product');
    expect(body).toContain('Phone: +65 9123 4567');
    expect(body).not.toMatch(/\n{3,}/);
  });
  it('leaves out what it does not know', () => {
    const { subject, body } = buildClaim({ ...base, asset: { name: 'Kettle' }, issueSince: '', contact: {}, homeAddress: null, attachments: { receipt: false, manual: false, photo: false } });
    expect(subject).toBe('Warranty claim: Kettle');
    expect(body).toContain('Dear Customer Support,');
    expect(body).not.toContain('Serial number');
    expect(body).not.toContain('Warranty valid until');
    expect(body).not.toContain('First noticed');
    expect(body).toContain('I can provide further details on request.');
  });
  it('changes tone when the warranty has ended', () => {
    const { body } = buildClaim({ ...base, asset: { ...base.asset, warrantyExpiry: '2026-01-01' } });
    expect(body).toContain('I understand the warranty period has ended');
    expect(body).toContain('1 Jan 2026 (expired)');
  });
  it('reports warranty status', () => {
    expect(claimStatus('2026-11-10', '2026-11-10')).toEqual({ state: 'active', daysLeft: 0 });
    expect(claimStatus('2026-11-09', '2026-11-10').state).toBe('expired');
    expect(claimStatus(null, '2026-11-10').state).toBe('none');
  });
  it('lists the things to fix before sending', () => {
    expect(claimWarnings({ asset: base.asset, attachments: base.attachments, today: base.today, issue: 'x' })).toEqual([]);
    const w = claimWarnings({ asset: { name: 'x', warrantyExpiry: '2020-01-01' }, attachments: { receipt: false, manual: false, photo: false }, today: base.today, issue: '' });
    expect(w).toHaveLength(4);
    expect(w.join(' ')).toMatch(/ended/);
    expect(w.join(' ')).toMatch(/serial/i);
    expect(w.join(' ')).toMatch(/receipt/i);
    expect(w.join(' ')).toMatch(/fault/i);
  });
  it('keeps mailto links short enough for mail apps', () => {
    const link = mailtoLink('support@brand.com', 'Subject here', 'x'.repeat(6000));
    expect(link.length).toBeLessThan(2400);
    expect(link.startsWith('mailto:support%40brand.com?subject=')).toBe(true);
    expect(decodeURIComponent(link)).toContain('Message shortened');
    expect(mailtoLink('', 'S', 'short body')).toBe('mailto:?subject=S&body=short%20body');
  });
});

describe('scan result cleaning', () => {
  it('cleans label reads', () => {
    expect(cleanLabel({ name: ' Inverter aircon ', category: 'Air Conditioner', make: 'Daikin', model: 'MODEL: FTKM25VAVMV', serialNumber: 'S/N G123456', manufactureDate: '2024-05' })).toEqual({
      name: 'Inverter aircon', category: 'Air Conditioner', make: 'Daikin', model: 'FTKM25VAVMV', serialNumber: 'G123456', manufactureDate: '2024-05',
    });
  });
  it('rejects junk: long sentences, bad categories, impossible dates', () => {
    const r = cleanLabel({ model: 'This appliance is a very long free text sentence that is not a model number at all', serialNumber: '   ', category: 'Spaceship', manufactureDate: '2099-13' });
    expect(r.model).toBeNull();
    expect(r.serialNumber).toBeNull();
    expect(r.category).toBeNull();
    expect(r.manufactureDate).toBeNull();
    expect(cleanLabel({ manufactureDate: '2023' }).manufactureDate).toBe('2023');
    expect(cleanLabel({ manufactureDate: '1850-01' }).manufactureDate).toBeNull();
    expect(cleanLabel({}).make).toBeNull();
  });
  it('summarises a label read', () => {
    expect(labelSummary(cleanLabel({ make: 'LG', model: 'F2514', serialNumber: '911KW00123', manufactureDate: '2021-09' }))).toBe('Read the brand, model and serial number (made 2021-09). Please check them against the sticker.');
    expect(labelSummary(cleanLabel({ model: 'ABC123' }))).toBe('Read the model. Please check them against the sticker.');
    expect(labelSummary(cleanLabel({}))).toBe('');
  });
  it('still cleans receipts as before', () => {
    const r = cleanReceipt({ name: 'Fridge', purchaseDate: '2026-01-31', warrantyMonths: 1, total: 899, make: 'LG' });
    expect(r.warrantyExpiry).toBe('2026-02-28');
    expect(r.total).toBe(899);
    expect(cleanReceipt({ purchaseDate: 'x', warrantyMonths: 12 }).warrantyExpiry).toBeNull();
  });
});
