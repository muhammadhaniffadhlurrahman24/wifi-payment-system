import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth-token")?.value
  const isAuthenticated = authToken === "authenticated"
  const isLoginPage = request.nextUrl.pathname === "/login"

  // Jika user belum login dan mencoba mengakses halaman selain login
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Jika user sudah login dan mencoba mengakses halaman login
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

// Konfigurasi path mana saja yang akan diproteksi
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
