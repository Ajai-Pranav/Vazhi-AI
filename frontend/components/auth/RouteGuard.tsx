"use client";

/**
 * RouteGuard.tsx — Client-side auth guard
 * ────────────────────────────────────────
 * Replaces the old edge-middleware cookie check, which could never work
 * because the auth cookies are set on the Render backend's domain, not
 * on this Vercel frontend's domain (cookies are scoped per-domain).
 *
 * AuthProvider (lib/auth.tsx) already calls GET /auth/me on mount using
 * credentials: "include" — that request DOES carry the cookie correctly,
 * since it's a direct cross-origin fetch to the backend. This component
 * just reacts to the resulting `user` / `loading` state and redirects
 * unauthenticated users away from protected routes.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

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
  "/",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait until /auth/me (+ silent refresh) has resolved
    if (isPublicPath(pathname)) return;

    if (!user) {
      const redirectTarget = encodeURIComponent(pathname);
      router.replace(`/auth/login?redirect=${redirectTarget}`);
    }
  }, [user, loading, pathname, router]);

  // On protected routes, avoid flashing authenticated content while we
  // don't yet know the auth state (or right before the redirect fires).
  if (!isPublicPath(pathname) && (loading || !user)) {
    return null;
  }

  return <>{children}</>;
}
