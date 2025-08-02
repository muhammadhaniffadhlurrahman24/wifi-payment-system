import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { customerId: params.id },
      include: {
        payments: {
          orderBy: { date: "desc" },
        },
        suspensions: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, monthlyFee, bandwidth, status, debt, deposit } = body

    const updatedCustomer = await prisma.customer.update({
      where: { customerId: params.id },
      data: {
        name,
        monthlyFee: parseFloat(monthlyFee),
        bandwidth: parseInt(bandwidth),
        status,
        debt: parseFloat(debt),
        deposit: parseFloat(deposit),
      },
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { customerId: params.id },
      include: {
        payments: true,
        suspensions: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check if customer has payments or suspensions
    if (customer.payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with payment history" },
        { status: 400 }
      )
    }

    if (customer.suspensions.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with active suspensions" },
        { status: 400 }
      )
    }

    // Delete the customer
    await prisma.customer.delete({
      where: { customerId: params.id },
    })

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    )
  }
}
