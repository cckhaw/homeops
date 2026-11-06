import { qrSvg } from '@/lib/qr';

/** A printable sticker: QR code that opens the asset, with its name and make/model underneath. */
export default async function QrLabel({ url, name, detail, big }: { url: string; name: string; detail?: string; big?: boolean }) {
  const svg = await qrSvg(url);
  return (
    <figure className={`label break-inside-avoid rounded-xl border border-black/20 bg-white p-2 text-black ${big ? 'w-64' : 'w-full'}`}>
      <div className="mx-auto aspect-square w-full max-w-[9rem] [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code for ${name}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="mt-1 text-center leading-tight">
        <span className="block truncate text-[13px] font-bold">{name}</span>
        {detail && <span className="block truncate text-[11px] text-black/60">{detail}</span>}
        <span className="block text-[9px] tracking-wide text-black/50">Wodejia · scan to open</span>
      </figcaption>
    </figure>
  );
}
