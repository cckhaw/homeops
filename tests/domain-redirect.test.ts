import { describe, expect, it } from 'vitest';
import { canonicalRedirect } from '@/lib/domain-redirect';

const url = (p: string) => new URL('https://homeops.khaw.cc' + p);
const MAIN = 'https://wodejia.khaw.cc';

describe('canonicalRedirect', () => {
  it('sends the old domain to the main one, keeping path and query', () => {
    expect(canonicalRedirect(url('/faq/troubleshooting?x=1#a'), 'homeops.khaw.cc', MAIN)?.href).toBe('https://wodejia.khaw.cc/faq/troubleshooting?x=1');
    expect(canonicalRedirect(url('/'), 'homeops.khaw.cc', MAIN)?.href).toBe('https://wodejia.khaw.cc/');
    expect(canonicalRedirect(url('/dashboard'), 'HOMEOPS.khaw.cc:443', MAIN)?.href).toBe('https://wodejia.khaw.cc/dashboard');
  });
  it('leaves other hosts alone', () => {
    expect(canonicalRedirect(url('/x'), 'wodejia.khaw.cc', MAIN)).toBeNull();
    expect(canonicalRedirect(url('/x'), 'localhost:3000', MAIN)).toBeNull();
  });
  it('never redirects without a valid, different target (no loops)', () => {
    expect(canonicalRedirect(url('/x'), 'homeops.khaw.cc', undefined)).toBeNull();
    expect(canonicalRedirect(url('/x'), 'homeops.khaw.cc', 'not a url')).toBeNull();
    expect(canonicalRedirect(url('/x'), 'homeops.khaw.cc', 'https://homeops.khaw.cc')).toBeNull();
    expect(canonicalRedirect(url('/x'), 'homeops.khaw.cc', 'ftp://wodejia.khaw.cc')).toBeNull();
  });
});
