import { prisma } from "../lib/db"

async function main() {
  console.log("Menghapus semua data transaksi (payments)...")
  try {
    const result = await prisma.payment.deleteMany()
    console.log(`Berhasil menghapus ${result.count} transaksi.`)
  } catch (error) {
    console.error("Gagal menghapus data transaksi:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 