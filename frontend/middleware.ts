/**
 * middleware.ts — Next.js Edge Middleware
 * ────────────────────────────────────────
 * Intercepts every incoming request BEFORE any page renders.
 *
 * Protected routes: redirect to /auth/login if access_token cookie is absent.
 * Public routes: always allowed without a cookie.
 *
 * Why edge middleware instead of client-side useEffect guards?
 *   - No "flash" of authenticated layout / dashboard skeleton for unauthenticated users
 *   - Runs on the edge (Vercel) before HTML is streamed — zero client round-trips
 *   - Cannot be bypassed by disabling JavaScript
 *
 * Note: The middleware only checks for cookie *presence* (since it cannot
 * call the backend to validate the JWT on every request without latency cost).
 * The actual JWT validation happens in the FastAPI get_current_user dependency,
 * which will return 401 if the token has expired — triggering a silent refresh
 * or redirect in apiFetch().
 */

import { NextRequest, NextResponse } from "next/server";

// Routes accessible WITHOUT authentication
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-otp",
  "/get-started",
  "/home",
  "/landing",
  "/",         // Landing page (handled separately below)
];

// Static asset prefixes — always allowed
const STATIC_PREFIXES = ["/_next", "/favicon", "/public", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and Next.js internals
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Always allow public routes
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  // Check for access_token cookie (set as HTTP-Only by FastAPI on login/refresh)
  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    // No token present — redirect to login, preserving the intended destination
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie present — allow through (JWT validity is enforced by the backend)
  return NextResponse.next();
}

export const config = {
  /*
   * Match all routes EXCEPT:
   * - Next.js internals (_next/static, _next/image)
   * - favicon
   * - public folder assets
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
