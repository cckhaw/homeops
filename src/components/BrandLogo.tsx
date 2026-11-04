'use client';

import { useState } from 'react';
import { brandDomain, logoUrl } from '@/lib/brands';
import { cn } from '@/lib/utils';

/** Brand logo tile (e.g. the LG logo for an LG product), with a letter monogram fallback. */
export default function BrandLogo({ make, size = 44, className }: { make: string | null | undefined; size?: number; className?: string }) {
  const domain = brandDomain(make);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const label = (make ?? '?').trim()[0]?.toUpperCase() ?? '?';
  const dim = { width: size, height: size };

  return (
    <span
      className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/10', className)}
      style={dim}
      role="img"
      aria-label={make ? `${make} logo` : 'No brand'}
    >
      {/* The monogram is always rendered underneath, so there is never a blank tile while the logo loads or if it fails. */}
      <span className="font-bold text-neutral-500" style={{ fontSize: size * 0.42 }}>{label}</span>
      {domain && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl(domain, size > 48 ? 128 : 64)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn('absolute inset-0 m-auto bg-white object-contain transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
          style={{ width: size * 0.64, height: size * 0.64 }}
        />
      )}
    </span>
  );
}
