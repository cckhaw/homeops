'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/app/error-actions';

// Last-resort boundary: replaces the root layout, so it brings its own <html>, <body> and inline styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!error.digest) void reportClientError(error.message, window.location.pathname);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, Arial, sans-serif', background: '#f5f5f7', color: '#1d1d1f', textAlign: 'center' }}>
        <main>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ color: '#6e6e73', margin: '0 0 20px' }}>HomeOps hit an unexpected problem. Your data is safe.</p>
          <button onClick={reset} style={{ minHeight: 44, padding: '0 22px', border: 0, borderRadius: 12, background: '#0e7fae', color: '#fff', fontSize: 17, fontWeight: 600 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
