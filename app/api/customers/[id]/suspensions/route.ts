import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Get all suspensions for a customer
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const suspensions = await prisma.suspension.findMany({
      where: {
        customerId: params.id,
      },
      orderBy: {
        startYear: "desc",
        startMonth: "desc",
      },
    })

    return NextResponse.json(suspensions)
  } catch (error) {
    console.error("Error fetching suspensions:", error)
    return NextResponse.json({ error: "Failed to fetch suspensions" }, { status: 500 })
  }
}

// Create a new suspension
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { startMonth, startYear, endMonth, endYear, reason } = body

    // Validate input
    if (startMonth < 0 || startMonth > 11 || endMonth < 0 || endMonth > 11) {
      return NextResponse.json({ error: "Invalid month values" }, { status: 400 })
    }

    if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 })
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { customerId: params.id },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check for overlapping suspensions
    const overlappingSuspension = await prisma.suspension.findFirst({
      where: {
        customerId: params.id,
        OR: [
          {
            AND: [
              { startYear: { lte: startYear } },
              { endYear: { gte: startYear } },
              {
                OR: [
                  { startMonth: { lte: startMonth } },
                  { endMonth: { gte: startMonth } },
                ],
              },
            ],
          },
          {
            AND: [
              { startYear: { lte: endYear } },
              { endYear: { gte: endYear } },
              {
                OR: [
                  { startMonth: { lte: endMonth } },
                  { endMonth: { gte: endMonth } },
                ],
              },
            ],
          },
        ],
      },
    })

    if (overlappingSuspension) {
      return NextResponse.json({ error: "Suspension period overlaps with existing suspension" }, { status: 400 })
    }

    const suspension = await prisma.suspension.create({
      data: {
        customerId: params.id,
        startMonth,
        startYear,
        endMonth,
        endYear,
        reason,
      },
    })

    return NextResponse.json(suspension)
  } catch (error) {
    console.error("Error creating suspension:", error)
    return NextResponse.json({ error: "Failed to create suspension" }, { status: 500 })
  }
} 