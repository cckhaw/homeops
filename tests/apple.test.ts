import { generateKeyPairSync, verify } from 'crypto';
import { describe, expect, it } from 'vitest';
import { createAppleClientSecret, normalizePrivateKey } from '@/lib/apple';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const decode = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString());

describe('Apple client secret', () => {
  const now = Date.UTC(2026, 10, 5);
  const jwt = createAppleClientSecret({ clientId: 'cc.khaw.homeops.web', teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: pem, nowMs: now });
  const [h, p, sig] = jwt.split('.');

  it('has the header and claims Apple requires', () => {
    expect(decode(h)).toMatchObject({ alg: 'ES256', kid: 'KEY1234567' });
    expect(decode(p)).toMatchObject({ iss: 'TEAM123456', sub: 'cc.khaw.homeops.web', aud: 'https://appleid.apple.com', iat: now / 1000 });
  });
  it('expires within Apple\'s 6-month limit', () => {
    const { iat, exp } = decode(p);
    expect(exp - iat).toBeLessThanOrEqual(15_777_000);
    expect(exp).toBeGreaterThan(iat);
    const long = createAppleClientSecret({ clientId: 'a', teamId: 'b', keyId: 'c', privateKey: pem, nowMs: now, ttlDays: 400 });
    expect(decode(long.split('.')[1]).exp - now / 1000).toBeLessThanOrEqual(15_777_000);
  });
  it('carries a valid raw (r||s) ES256 signature', () => {
    expect(Buffer.from(sig, 'base64url')).toHaveLength(64);
    expect(verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'))).toBe(true);
  });
  it('rejects a tampered token', () => {
    expect(verify('sha256', Buffer.from(`${h}.${p}x`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'))).toBe(false);
  });
});

describe('private key formats', () => {
  it('accepts escaped newlines, bare base64 and the full PEM', () => {
    const bare = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
    const escaped = pem.replace(/\n/g, '\\n');
    for (const variant of [pem, escaped, bare]) {
      expect(() => createAppleClientSecret({ clientId: 'a', teamId: 'b', keyId: 'c', privateKey: variant })).not.toThrow();
    }
    expect(normalizePrivateKey(bare)).toContain('BEGIN PRIVATE KEY');
  });
});
