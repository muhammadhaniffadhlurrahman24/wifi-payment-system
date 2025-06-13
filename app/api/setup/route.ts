import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { customerList } from "@/lib/data"

export async function GET() {
  try {
    // Check if we already have customers
    const existingCustomers = await prisma.customer.count()

    if (existingCustomers > 0) {
      return NextResponse.json({
        message: "Database already initialized",
        customersCount: existingCustomers,
      })
    }

    // Initialize the database with our customer data
    for (const customer of customerList) {
      await prisma.customer.create({
        data: {
          customerId: customer.customerId,
          name: customer.name,
          monthlyFee: customer.monthlyFee,
          status: customer.status,
          debt: 0,
          deposit: 0,
        },
      })
    }

    return NextResponse.json({
      message: "Database initialized successfully",
      customersCount: customerList.length,
    })
  } catch (error) {
    console.error("Error setting up database:", error)
    return NextResponse.json({ error: "Failed to set up database" }, { status: 500 })
  }
}
