import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

// const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isAuthRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/register"

  if (isApiAuthRoute) return NextResponse.next();

  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl))
    return NextResponse.next();
  }

  if (!isLoggedIn) {
     return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // checking role
  const userRole = (req.auth?.user as { role?: string })?.role;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  
  if (isAdminRoute && userRole !== "admin") {
      return NextResponse.redirect(new URL("/", nextUrl))
  }

  return NextResponse.next();
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
