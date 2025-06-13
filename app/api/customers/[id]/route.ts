import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        customerId: params.id,
      },
      include: {
        payments: {
          orderBy: {
            date: "desc",
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, monthlyFee, status, debt, deposit } = body

    const customer = await prisma.customer.update({
      where: {
        customerId: params.id,
      },
      data: {
        name,
        monthlyFee,
        status,
        debt,
        deposit,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.customer.delete({
      where: {
        customerId: params.id,
      },
    })

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
