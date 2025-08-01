const { prisma } = require("../lib/db.js")

async function main() {
  console.log("Menjalankan akumulasi tunggakan (debt) untuk semua pelanggan aktif...")
  try {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Ambil semua pelanggan aktif
    const customers = await prisma.customer.findMany({
      where: { status: "active" },
    })

    let updatedCount = 0

    for (const customer of customers) {
      // Cek apakah sudah ada pembayaran bulan ini
      const payments = await prisma.payment.findMany({
        where: {
          customerId: customer.customerId,
        },
      })
      const hasPaidThisMonth = payments.some((p) => {
        const paymentDate = new Date(p.date)
        return (
          paymentDate.getMonth() === currentMonth &&
          paymentDate.getFullYear() === currentYear
        )
      })

      // Jika belum bayar dan deposit tidak cukup, tambahkan ke debt
      if (!hasPaidThisMonth && customer.deposit < customer.monthlyFee) {
        const remainingFee = Math.max(0, customer.monthlyFee - customer.deposit)
        const newDebt = customer.debt + remainingFee
        const newDeposit = Math.max(0, customer.deposit - customer.monthlyFee)
        await prisma.customer.update({
          where: { customerId: customer.customerId },
          data: {
            debt: newDebt,
            deposit: newDeposit,
          },
        })
        updatedCount++
      }
    }

    console.log(`Akumulasi selesai. ${updatedCount} pelanggan terkena tunggakan.`)
  } catch (error) {
    console.error("Gagal akumulasi tunggakan:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 