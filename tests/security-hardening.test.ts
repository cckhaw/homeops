import { randomBytes, scryptSync } from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, passwordNeedsRehash, verifyPassword } from '@/lib/security';
import { verifyTurnstile } from '@/lib/turnstile';

describe('password hash upgrade', () => {
  const oldHash = (pw: string) => {
    const salt = randomBytes(16);
    return `scrypt$16384$8$1$${salt.toString('base64')}$${scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('base64')}`;
  };
  it('hashes with N=32768 and does not ask for a re-hash', async () => {
    const h = await hashPassword('a-long-enough-password');
    expect(h.startsWith('scrypt$32768$8$1$')).toBe(true);
    expect(passwordNeedsRehash(h)).toBe(false);
    expect(await verifyPassword('a-long-enough-password', h)).toBe(true);
  });
  it('still verifies a hash made at the old cost, and flags it for re-hashing', async () => {
    const h = oldHash('an-older-password-1');
    expect(await verifyPassword('an-older-password-1', h)).toBe(true);
    expect(await verifyPassword('wrong-password-xyz', h)).toBe(false);
    expect(passwordNeedsRehash(h)).toBe(true);
  });
  it('ignores empty or foreign formats', () => {
    expect(passwordNeedsRehash(null)).toBe(false);
    expect(passwordNeedsRehash('')).toBe(false);
    expect(passwordNeedsRehash('bcrypt$whatever')).toBe(false);
  });
});

describe('Turnstile when Cloudflare is unreachable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const setup = () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', 'site');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  };
  it('fails open by default so forms keep working', async () => {
    setup();
    expect(await verifyTurnstile('token')).toBe(true);
  });
  it('fails closed when asked to (sign-in)', async () => {
    setup();
    expect(await verifyTurnstile('token', '1.2.3.4', { failClosed: true })).toBe(false);
  });
  it('still rejects a missing token, and passes when disabled', async () => {
    setup();
    expect(await verifyTurnstile('', undefined, { failClosed: false })).toBe(false);
    vi.unstubAllEnvs();
    expect(await verifyTurnstile('')).toBe(true);
  });
});
