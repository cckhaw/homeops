/**
 * Next.js calls this for every unhandled server error (route handlers, server components, server actions).
 * Errors are stored in our own database (see lib/errors.ts) — no third-party error service.
 */
export async function onRequestError(
  err: unknown,
  _request: { path: string; method: string },
  context: { routePath: string; routeType: string },
) {
  // The nodejs check must wrap the import itself so the edge bundle never tries to resolve Node-only modules.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recordError } = await import('./lib/errors');
    const e = err as { message?: string; stack?: string; digest?: string };
    await recordError({
      source: 'server',
      route: context.routePath, // the route *pattern* (e.g. /passport/[token]), never the real URL
      message: e?.message ?? String(err),
      stack: e?.stack,
      digest: e?.digest,
    });
  }
}
