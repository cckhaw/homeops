export { default } from 'next-auth/middleware';

// Everything under these paths requires a session; /admin is additionally role-checked in its layout.
export const config = { matcher: ['/dashboard/:path*', '/admin/:path*'] };
