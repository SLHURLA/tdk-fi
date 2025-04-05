import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Define all valid routes
  const publicRoutes = ["/sign-in", "/sign-up", "/otp-signin"];
  const protectedRoutes = ["/tsmgowp"]; // Add all your protected routes here
  const rootRoute = "/";

  // 1. Handle authenticated users
  if (token) {
    // Redirect authenticated users away from auth pages to root
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL(rootRoute, req.url));
    }

    // Allow access to protected routes or root
    if (
      protectedRoutes.some((route) => pathname.startsWith(route)) ||
      pathname === rootRoute
    ) {
      return NextResponse.next();
    }

    // Redirect any other paths to root (including invalid URLs)
    return NextResponse.redirect(new URL(rootRoute, req.url));
  }

  // 2. Handle unauthenticated users
  else {
    // Allow access to public routes or root
    if (
      publicRoutes.some((route) => pathname.startsWith(route)) ||
      pathname === rootRoute
    ) {
      return NextResponse.next();
    }

    // Redirect to sign-in for protected routes
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Redirect any other paths to root (including invalid URLs)
    return NextResponse.redirect(new URL(rootRoute, req.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
