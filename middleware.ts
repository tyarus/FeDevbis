import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const userCookie = request.cookies.get("auth_user")?.value;
  let user = null;

  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    } catch (e) {
      // Invalid cookie
    }
  }

  const { pathname } = request.nextUrl;

  // Protected routes for sellers only
  const sellerRoutes = ["/seller/dashboard", "/seller/products", "/seller/orders"];
  // Protected routes for buyers only
  const buyerRoutes = ["/dashboard", "/checkout", "/payment"];
  const protectedRoutes = [...sellerRoutes, ...buyerRoutes];

  // If accessing protected route without token
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check role-based access
    if (sellerRoutes.some((route) => pathname.startsWith(route))) {
      if (user?.role !== "seller") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (buyerRoutes.some((route) => pathname.startsWith(route))) {
      if (user?.role !== "buyer") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // If already logged in and trying to access login/register
  if ((pathname === "/login" || pathname === "/register") && token) {
    const redirectUrl = user?.role === "seller" ? "/seller/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
