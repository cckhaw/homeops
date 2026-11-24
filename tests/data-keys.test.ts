import { afterEach, describe, expect, it, vi } from 'vitest';
import { dataKeys, decryptSecret, encryptSecret, secretNeedsReencrypt } from '@/lib/security';

const K1 = 'k1:first-key-at-least-16-chars';
const K2 = 'k2:second-key-at-least-16-chars';

describe('versioned encryption keys', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('without DATA_KEYS it uses the original format and never asks for re-encryption', () => {
    const blob = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(blob.startsWith('v2.')).toBe(false);
    expect(decryptSecret(blob)).toBe('JBSWY3DPEHPK3PXP');
    expect(secretNeedsReencrypt(blob)).toBe(false);
  });

  it('with DATA_KEYS new data carries the key id and round-trips', () => {
    vi.stubEnv('DATA_KEYS', K1);
    const blob = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(blob.startsWith('v2.k1.')).toBe(true);
    expect(decryptSecret(blob)).toBe('JBSWY3DPEHPK3PXP');
    expect(secretNeedsReencrypt(blob)).toBe(false);
  });

  it('data written before DATA_KEYS was set still decrypts, and is flagged to move', () => {
    const legacy = encryptSecret('LEGACYSECRET');
    vi.stubEnv('DATA_KEYS', K1);
    expect(decryptSecret(legacy)).toBe('LEGACYSECRET');
    expect(secretNeedsReencrypt(legacy)).toBe(true);
  });

  it('rotates: the newest key encrypts, older keys still decrypt until removed', () => {
    vi.stubEnv('DATA_KEYS', K1);
    const old = encryptSecret('ROTATEME');
    vi.stubEnv('DATA_KEYS', `${K2},${K1}`);
    expect(decryptSecret(old)).toBe('ROTATEME');
    expect(secretNeedsReencrypt(old)).toBe(true);
    const fresh = encryptSecret('ROTATEME');
    expect(fresh.startsWith('v2.k2.')).toBe(true);
    expect(secretNeedsReencrypt(fresh)).toBe(false);
    // once k1 is dropped, only data still on k1 is lost, so it must be re-encrypted before that
    vi.stubEnv('DATA_KEYS', K2);
    expect(decryptSecret(fresh)).toBe('ROTATEME');
    expect(() => decryptSecret(old)).toThrow(/no longer configured/);
  });

  it('rotating the login secret no longer breaks data under a DATA_KEYS key', () => {
    vi.stubEnv('DATA_KEYS', K1);
    const blob = encryptSecret('STABLE');
    vi.stubEnv('NEXTAUTH_SECRET', 'a-completely-different-login-secret');
    expect(decryptSecret(blob)).toBe('STABLE');
  });

  it('rejects malformed settings instead of silently weakening encryption', () => {
    expect(() => dataKeys('nocolon')).toThrow(/DATA_KEYS/);
    expect(() => dataKeys('k1:short')).toThrow(/DATA_KEYS/);
    expect(() => dataKeys('BAD ID:long-enough-secret-value')).toThrow(/DATA_KEYS/);
    expect(dataKeys('')).toEqual([]);
    expect(dataKeys(`${K2}, ${K1}`).map((k) => k.id)).toEqual(['k2', 'k1']);
  });

  it('detects tampering', () => {
    vi.stubEnv('DATA_KEYS', K1);
    const blob = encryptSecret('TAMPER');
    const parts = blob.split('.');
    const raw = Buffer.from(parts[2], 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => decryptSecret(`v2.k1.${raw.toString('base64')}`)).toThrow();
  });
});
