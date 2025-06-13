import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerId, amount, date } = body

    // Generate a unique payment ID
    const paymentId = `PAY${Date.now()}`

    const payment = await prisma.payment.create({
      data: {
        paymentId,
        customerId,
        amount,
        date: new Date(date),
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}
