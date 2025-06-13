import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Cek apakah user ada
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    })

    // Jika user tidak ditemukan atau password salah
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 })
    }

    // Set cookie untuk autentikasi
    const cookieStore = cookies()
    cookieStore.set("auth-token", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat login" }, { status: 500 })
  }
}
