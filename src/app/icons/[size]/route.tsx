import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET(_: Request, { params }: { params: { size: string } }) {
  const size = [180, 192, 512].includes(Number(params.size)) ? Number(params.size) : 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg,#2997ff,#0058d0)',
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
