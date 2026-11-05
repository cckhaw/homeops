export const dynamic = 'force-dynamic';

/**
 * Apple asks you to host a verification file at /.well-known/apple-developer-domainassociation.txt (see the rewrite in
 * next.config.js). Paste the file's contents into the APPLE_DOMAIN_ASSOCIATION environment variable.
 */
export function GET() {
  const body = process.env.APPLE_DOMAIN_ASSOCIATION;
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
