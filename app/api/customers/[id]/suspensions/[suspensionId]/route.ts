import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Delete a specific suspension
export async function DELETE(
  request: Request, 
  { params }: { params: { id: string; suspensionId: string } }
) {
  try {
    const suspension = await prisma.suspension.delete({
      where: {
        id: params.suspensionId,
        customerId: params.id,
      },
    })

    return NextResponse.json({ message: "Suspension deleted successfully" })
  } catch (error) {
    console.error("Error deleting suspension:", error)
    return NextResponse.json({ error: "Failed to delete suspension" }, { status: 500 })
  }
} 