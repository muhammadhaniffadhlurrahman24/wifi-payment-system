import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const payment = await prisma.payment.findUnique({
      where: {
        paymentId: params.id,
      },
      include: {
        customer: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error fetching payment:", error)
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { customerId, amount, date } = body

    const payment = await prisma.payment.update({
      where: {
        paymentId: params.id,
      },
      data: {
        customerId,
        amount,
        date: new Date(date),
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error updating payment:", error)
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.payment.delete({
      where: {
        paymentId: params.id,
      },
    })

    return NextResponse.json({ message: "Payment deleted successfully" })
  } catch (error) {
    console.error("Error deleting payment:", error)
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 })
  }
}
