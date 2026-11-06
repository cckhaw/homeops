import { getBrandMeta, brandUrl } from '@/lib/brand';
import { BRAND_KINDS, BRAND_RULES, type BrandKind } from '@/lib/brand-core';
import PageHeader from '@/components/PageHeader';
import BrandingAdmin, { type BrandCardData } from '@/components/BrandingAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Branding · Admin' };

const FALLBACK: Record<BrandKind, string> = { logo: '/brand/wodejia-logo-horizontal.png', icon: '/brand/icon.svg', share: '/opengraph-image' };
const ACCEPT: Record<BrandKind, string> = { logo: 'image/png,image/svg+xml,image/webp', icon: 'image/png', share: 'image/png' };

export default async function AdminBranding() {
  const meta = await getBrandMeta();
  const cards: BrandCardData[] = BRAND_KINDS.map((kind) => {
    const m = meta[kind];
    return {
      kind,
      label: BRAND_RULES[kind].label,
      help: BRAND_RULES[kind].help,
      accept: ACCEPT[kind],
      fallback: FALLBACK[kind],
      custom: m ? { url: brandUrl(kind, m.rev), bytes: m.bytes, size: m.width && m.height ? `${m.width}×${m.height}` : null, updated: new Date(m.updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' }) + ' SGT' } : null,
    };
  });
  return (
    <>
      <PageHeader title="Branding" subtitle="Change the logo, app icon and social share image. Changes apply to the whole site straight away." />
      <div className="space-y-5">
        {cards.map((c) => <BrandingAdmin key={c.kind} d={c} />)}
      </div>
      <p className="mt-6 px-1 text-[13px] text-secondary">
        The icon is used for the browser tab, the home-screen / app icon and the small logo in the app menu. The logo replaces the full “mark + name” lockup in headers, footers and the sign-in page. Reset any item to return to the built-in Wodejia artwork.
        Blog posts and shared passports still show the built-in mark on their generated share cards.
      </p>
    </>
  );
}
