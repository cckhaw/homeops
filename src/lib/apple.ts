import 'server-only';
import { createPrivateKey, sign } from 'crypto';

/** Sign in with Apple is active only when all four values are configured. */
export const appleConfigured = () => !!(process.env.APPLE_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);

/** Accepts the .p8 contents with real newlines, escaped "\n", or no BEGIN/END lines. */
export function normalizePrivateKey(raw: string): string {
  const body = raw.replace(/\\n/g, '\n').trim();
  if (body.includes('BEGIN PRIVATE KEY')) return body;
  return `-----BEGIN PRIVATE KEY-----\n${body.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? ''}\n-----END PRIVATE KEY-----`;
}

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url');

/**
 * Apple does not use a static client secret: it is a short-lived ES256 JWT signed with your .p8 key (max 6 months).
 * We generate one at start-up, so there is nothing to renew by hand.
 */
export function createAppleClientSecret(opts: { clientId: string; teamId: string; keyId: string; privateKey: string; nowMs?: number; ttlDays?: number }): string {
  const iat = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  const exp = iat + Math.min(opts.ttlDays ?? 150, 180) * 86_400;
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: opts.keyId, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: opts.teamId, iat, exp, aud: 'https://appleid.apple.com', sub: opts.clientId }));
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key: createPrivateKey(normalizePrivateKey(opts.privateKey)), dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64url(signature)}`;
}

export function appleClientSecretFromEnv(): string {
  return createAppleClientSecret({
    clientId: process.env.APPLE_ID!,
    teamId: process.env.APPLE_TEAM_ID!,
    keyId: process.env.APPLE_KEY_ID!,
    privateKey: process.env.APPLE_PRIVATE_KEY!,
  });
}
