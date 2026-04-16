import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicRoutes = ["/login", "/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    if (isLoggedIn && pathname === "/login") {
      const role = req.auth?.user?.role?.toLowerCase() || "player";
      return NextResponse.redirect(new URL(`/dashboard/${role}`, req.nextUrl));
    }
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    const role = req.auth?.user?.role?.toLowerCase() || "player";
    const allowedPath = `/dashboard/${role}`;

    // Prevent accessing other role dashboards (except admin can access all)
    if (role !== "admin" && !pathname.startsWith(allowedPath)) {
      return NextResponse.redirect(new URL(allowedPath, req.nextUrl));
    }
  }

  // Public API routes (no auth required)
  const publicApiRoutes = ["/api/invites/redeem", "/api/invites", "/api/admin/bootstrap"];
  const isPublicApi = publicApiRoutes.some((r) => pathname.startsWith(r));

  // Protect API routes
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth") && !isPublicApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
