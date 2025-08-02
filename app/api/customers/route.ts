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
    const { name, monthlyFee, bandwidth, status } = body

    // Generate sequential customer ID
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { customerId: 'desc' }
    })

    let nextNumber = 1
    if (lastCustomer) {
      // Extract number from last customer ID (e.g., "CUST028" -> 28)
      const lastNumber = parseInt(lastCustomer.customerId.replace('CUST', ''))
      nextNumber = lastNumber + 1
    }

    // Format customer ID with leading zeros (e.g., CUST001, CUST029)
    const customerId = `CUST${nextNumber.toString().padStart(3, '0')}`

    // Pelanggan baru tidak langsung mendapat debt
    // Debt akan diakumulasikan melalui debt accumulation script
    const initialDebt = 0

    const customer = await prisma.customer.create({
      data: {
        customerId,
        name,
        monthlyFee,
        bandwidth: bandwidth || 4, // Default to 4 if not provided
        status,
        debt: initialDebt, // Tagihan bulanan dimulai dari bulan ditambahkan
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
