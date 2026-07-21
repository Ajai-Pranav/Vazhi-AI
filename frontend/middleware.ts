/**
 * middleware.ts — Next.js Edge Middleware
 * ────────────────────────────────────────
 * NOTE: Auth is enforced entirely client-side now (see components/RouteGuard.tsx).
 *
 * Why the previous cookie-presence check was removed:
 *   The access_token / refresh_token cookies are set by the FastAPI backend
 *   (Render domain), not by this Next.js app (Vercel domain). Cookies are
 *   scoped per-domain, so this Vercel edge middleware could NEVER see them —
 *   request.cookies.get("access_token") always returned undefined here,
 *   even for a logged-in user, causing every protected-route navigation to
 *   redirect back to /auth/login.
 *
 *   The cookie IS sent correctly on cross-origin fetch() calls made from the
 *   browser to the backend (because credentials: "include" is set on all
 *   API calls) — it just isn't attached to requests made to Vercel itself.
 *
 * This file is kept as a no-op passthrough in case route-level logic
 * (redirects, rewrites, headers) is needed later.
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
