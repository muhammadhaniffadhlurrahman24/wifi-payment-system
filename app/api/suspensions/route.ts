import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Get all suspensions
export async function GET() {
  try {
    const suspensions = await prisma.suspension.findMany({
      orderBy: [
        {
          startYear: "desc",
        },
        {
          startMonth: "desc",
        },
      ],
    })

    return NextResponse.json(suspensions)
  } catch (error) {
    console.error("Error fetching suspensions:", error)
    return NextResponse.json({ error: "Failed to fetch suspensions" }, { status: 500 })
  }
} 