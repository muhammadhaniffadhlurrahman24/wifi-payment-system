import { prisma } from "@/lib/db"
import { customerList } from "@/lib/data"

// Data bandwidth untuk setiap pelanggan
const bandwidthData: { [key: string]: number } = {
  "PUNGKY 06": 8,
  "SUBCHAN 06": 10,
  "PURWANTI 06": 10,
  "BERBUDI 06": 10,
  "HERI 06": 8,
  "TONI 06": 10,
  "BIK 10": 10,
  "BUDI 06": 10,
  "AMAT 08": 4,
  "HARTO 06": 4,
  "VENTIKA 08": 4,
  "PRAS 08": 4,
  "MUGI 08": 4,
  "WIJI 08": 4,
  "JUNET 06": 4,
  "SATRIO 10": 4,
  "IWAN 06": 4,
  "AGUNG 03": 4,
  "KOKO 04": 10,
  "HADI 04": 4,
  "FAJAR 06": 4,
  "DJOKO 06": 10,
  "IWAN O8": 4,
  "EDO 11": 10,
  "INDRA 12": 4,
  "RAFI 12": 4,
  "LUSI 12": 10,
  "LULUS 03": 10,
}

async function main() {
  console.log("Seeding MongoDB database...")

  try {
    // Delete existing data
    await prisma.payment.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()

    // Create admin user
    await prisma.user.create({
      data: {
        username: "admin",
        password: "admin111111",
      },
    })
    console.log("Admin user created successfully!")

    // Create customers with bandwidth
    for (const customer of customerList) {
      await prisma.customer.create({
        data: {
          customerId: customer.customerId,
          name: customer.name,
          monthlyFee: customer.monthlyFee,
          bandwidth: bandwidthData[customer.name] || 4, // Default to 4 if not found
          status: customer.status,
        },
      })
    }

    console.log("MongoDB database seeded successfully!")
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
