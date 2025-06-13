import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        payments: {
          orderBy: {
            date: "desc",
          },
          take: 1,
        },
      },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerId, name, monthlyFee, status } = body

    const customer = await prisma.customer.create({
      data: {
        customerId,
        name,
        monthlyFee,
        status,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
