const { prisma } = require("../lib/db.js")

async function main() {
  console.log("Mereset debt dan deposit semua pelanggan...")
  try {
    const result = await prisma.customer.updateMany({
      data: {
        debt: 0,
        deposit: 0,
      },
    })
    console.log(`Berhasil mereset ${result.count} pelanggan.`)
  } catch (error) {
    console.error("Gagal mereset debt/deposit pelanggan:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 