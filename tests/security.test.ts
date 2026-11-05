import { describe, expect, it } from 'vitest';
import {
  base32Encode, decryptSecret, encryptSecret, generateRecoveryCodes, generateTotpSecret, hashCode, hashPassword, hotp,
  passwordPolicyError, safeEqual, sign, verifyPassword, verifyTotp,
} from '@/lib/security';

describe('password policy', () => {
  it('requires at least 12 characters', () => {
    expect(passwordPolicyError('short-pass1')).toMatch(/at least 12/);
    expect(passwordPolicyError('exactly12chr')).toBeNull();
  });
  it('rejects very long, trivial and e-mail-derived passwords', () => {
    expect(passwordPolicyError('x'.repeat(129))).toMatch(/at most/);
    expect(passwordPolicyError('aaaaaaaaaaaaaaaa')).toMatch(/too easy/);
    expect(passwordPolicyError('password1234')).toMatch(/too easy/);
    expect(passwordPolicyError('my-jonathan-secret', 'jonathan@example.com')).toMatch(/e-mail/);
  });
  it('accepts a passphrase', () => {
    expect(passwordPolicyError('correct horse battery staple', 'a@b.co')).toBeNull();
  });
});

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const h = await hashPassword('correct horse battery staple');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(h).not.toContain('correct horse');
    expect(await verifyPassword('correct horse battery staple', h)).toBe(true);
    expect(await verifyPassword('correct horse battery stapl3', h)).toBe(false);
  });
  it('salts every hash', async () => {
    expect(await hashPassword('same password here!')).not.toBe(await hashPassword('same password here!'));
  });
  it('fails safely for missing or malformed hashes', async () => {
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });
});

describe('TOTP (RFC 6238)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it('matches the RFC 6238 SHA-1 test vectors', () => {
    expect(hotp(secret, Math.floor(59 / 30))).toBe('287082');
    expect(hotp(secret, Math.floor(1111111109 / 30))).toBe('081804');
    expect(hotp(secret, Math.floor(2000000000 / 30))).toBe('279037');
  });
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30_000);
  it('accepts the current code and ±1 step of clock drift, but not more', () => {
    const s = generateTotpSecret();
    expect(verifyTotp(s, hotp(s, step), null, now)).toBe(step);
    expect(verifyTotp(s, hotp(s, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(s, hotp(s, step + 1), null, now)).toBe(step + 1);
    expect(verifyTotp(s, hotp(s, step - 3), null, now)).toBeNull();
  });
  it('blocks replay of an already-used step', () => {
    const s = generateTotpSecret();
    expect(verifyTotp(s, hotp(s, step), step, now)).toBeNull();
  });
  it('rejects malformed codes', () => {
    const s = generateTotpSecret();
    expect(verifyTotp(s, '12345', null, now)).toBeNull();
    expect(verifyTotp(s, 'abcdef', null, now)).toBeNull();
  });
});

describe('secret encryption', () => {
  it('round-trips and never repeats ciphertext', () => {
    const a = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(a)).toBe('JBSWY3DPEHPK3PXP');
    expect(encryptSecret('JBSWY3DPEHPK3PXP')).not.toBe(a);
  });
  it('detects tampering', () => {
    const buf = Buffer.from(encryptSecret('secret'), 'base64');
    buf[buf.length - 1] ^= 1;
    expect(() => decryptSecret(buf.toString('base64'))).toThrow();
  });
});

describe('recovery codes & signatures', () => {
  it('issues 8 unique single-use codes whose hashes match', () => {
    const { plain, hashes } = generateRecoveryCodes();
    expect(plain).toHaveLength(8);
    expect(new Set(plain).size).toBe(8);
    expect(hashes).toEqual(plain.map(hashCode));
    expect(hashCode(plain[0].toUpperCase().replace('-', ' '))).toBe(hashes[0]); // forgiving about case and separators
  });
  it('signs deterministically and compares in constant time', () => {
    expect(sign('a')).toBe(sign('a'));
    expect(sign('a')).not.toBe(sign('b'));
    expect(safeEqual(sign('a'), sign('a'))).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
