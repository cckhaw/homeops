import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET is not set');
  return s;
}

// ---------------------------------------------------------------- Passwords

export const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const COMMON = new Set(
  ['password1234', 'passwordpassword', '123456789012', '1234567890123', 'qwertyuiop12', 'letmein12345', 'iloveyou1234', 'welcome12345', 'admin1234567', 'homeopshomeops'],
);

/** Returns an error message, or null if the password satisfies the policy (min 12 characters). */
export function passwordPolicyError(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return 'That password is too easy to guess.';
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return 'Your password should not contain your e-mail name.';
  return null;
}

// OWASP: N of 32768 (32 MiB at r=8) or more. The cost is stored inside every hash, so raising it only needs a re-hash at the next sign-in.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** True when a stored hash was made with a lower cost (or another format) than today's, so it should be re-hashed after a correct sign-in. */
export function passwordNeedsRehash(stored: string | null | undefined): boolean {
  const parts = (stored ?? '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  return +parts[1] < SCRYPT.N || +parts[2] < SCRYPT.r || +parts[3] < SCRYPT.p;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // Always do the work so "no such user" and "wrong password" take similar time.
  const parts = (stored ?? '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    await scrypt(password.normalize('NFKC'), Buffer.alloc(16), 64, SCRYPT);
    return false;
  }
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------- Encryption (for the TOTP secret)
//
// Keys are versioned so they can be rotated without locking anyone out of two-factor sign-in.
//  - DATA_KEYS (optional): comma-separated "id:secret" pairs, e.g. "k2:long-random-string,k1:older-string". The FIRST pair encrypts new data;
//    every pair can decrypt, so an old key stays listed until all data has moved off it (it moves at each user's next 2FA sign-in).
//    Ids are short names ([a-z0-9_-]); secrets should be 32+ random characters.
//  - Without DATA_KEYS, data is encrypted with a key derived from NEXTAUTH_SECRET (the original "legacy" format), which still always decrypts.
// New ciphertext looks like "v2.<id>.<base64>"; the legacy format has no prefix.

const KEY_ID = /^[a-z0-9_-]{1,16}$/;

/** Parses DATA_KEYS into [{ id, key }], newest first. Throws on a malformed entry so a typo cannot silently weaken encryption. */
export function dataKeys(raw: string | undefined = process.env.DATA_KEYS): { id: string; key: Buffer }[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((pair) => {
    const i = pair.indexOf(':');
    const id = pair.slice(0, i).trim(), sec = pair.slice(i + 1).trim();
    if (i < 1 || !KEY_ID.test(id) || sec.length < 16) throw new Error('DATA_KEYS must look like "id:secret" (id of a-z, 0-9, _ or -; secret of at least 16 characters)');
    return { id, key: createHash('sha256').update(`wodejia-data-key:${id}:${sec}`).digest() };
  });
}

const legacyKey = () => createHash('sha256').update(`homeops-secrets:${secret()}`).digest();

function seal(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

function unseal(b64: string, key: Buffer): string {
  const buf = Buffer.from(b64, 'base64');
  const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

export function encryptSecret(plain: string): string {
  const [current] = dataKeys();
  return current ? `v2.${current.id}.${seal(plain, current.key)}` : seal(plain, legacyKey());
}

export function decryptSecret(blob: string): string {
  if (blob.startsWith('v2.')) {
    const [, id, ...rest] = blob.split('.');
    const k = dataKeys().find((x) => x.id === id);
    if (!k) throw new Error(`The encryption key "${id}" is no longer configured (DATA_KEYS)`);
    return unseal(rest.join('.'), k.key);
  }
  return unseal(blob, legacyKey());
}

/** True when a stored secret is not under the current key (a legacy blob once DATA_KEYS is set, or an older key id), so it should be re-encrypted. */
export function secretNeedsReencrypt(blob: string | null | undefined): boolean {
  if (!blob) return false;
  const [current] = dataKeys();
  if (!current) return false;
  return !blob.startsWith(`v2.${current.id}.`);
}

// ---------------------------------------------------------------- TOTP (RFC 6238: SHA-1, 6 digits, 30 s)

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of str.replace(/=+$/, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function hotp(secretB32: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', base32Decode(secretB32)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

/** Returns the matched time-step (to store against replay) or null. Allows ±1 step of clock drift. */
export function verifyTotp(secretB32: string, token: string, lastStep?: number | null, now = Date.now()): number | null {
  const t = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(t)) return null;
  const current = Math.floor(now / 30_000);
  for (const w of [0, -1, 1]) {
    const step = current + w;
    if (lastStep != null && step <= lastStep) continue;
    const expected = Buffer.from(hotp(secretB32, step));
    if (timingSafeEqual(expected, Buffer.from(t))) return step;
  }
  return null;
}

export function totpUri(secretB32: string, email: string): string {
  return `otpauth://totp/Wodejia:${encodeURIComponent(email)}?secret=${secretB32}&issuer=Wodejia&algorithm=SHA1&digits=6&period=30`;
}

// ---------------------------------------------------------------- Recovery codes

export const hashCode = (code: string) => createHash('sha256').update(`rc:${code.replace(/[\s-]/g, '').toLowerCase()}`).digest('hex');

/** 8 single-use codes like "a1b2c-d3e4f". Returns plain codes (show once) and their hashes (store). */
export function generateRecoveryCodes(n = 8): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: n }, () => {
    const h = randomBytes(5).toString('hex');
    return `${h.slice(0, 5)}-${h.slice(5)}`;
  });
  return { plain, hashes: plain.map(hashCode) };
}

// ---------------------------------------------------------------- Signed values (passport unlock cookie)

export function sign(value: string): string {
  return createHmac('sha256', secret()).update(`sign:${value}`).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
