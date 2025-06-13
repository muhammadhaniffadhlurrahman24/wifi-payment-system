"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { usePayment } from "@/context/payment-context"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, ArrowRight } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function DebtAccumulator() {
  const [isProcessing, setIsProcessing] = useState(false)
  const { accumulateMonthlyDebt, customers, payments } = usePayment()

  // Hitung pelanggan yang belum bayar dengan lebih akurat
  const activeCustomers = customers.filter((c) => c.status === "active")

  // Dapatkan bulan dan tahun saat ini
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Hitung pelanggan yang belum bayar bulan ini
  const unpaidCustomers = activeCustomers.filter((customer) => {
    // Cek apakah sudah ada pembayaran bulan ini
    const hasPaidThisMonth = payments.some((payment) => {
      const paymentDate = new Date(payment.date)
      return (
        payment.customerId === customer.customerId &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      )
    })

    // Pelanggan dianggap belum bayar jika:
    // 1. Tidak ada pembayaran bulan ini, DAN
    // 2. Uang titip tidak cukup untuk menutupi tagihan bulanan
    return !hasPaidThisMonth && customer.deposit < customer.monthlyFee
  })

  const unpaidCount = unpaidCustomers.length

  const handleAccumulateDebt = async () => {
    try {
      toast({
        title: "Memulai akumulasi tagihan...",
        description: "Sedang memproses data tagihan bulanan",
      })

      setIsProcessing(true)
      await accumulateMonthlyDebt()

      toast({
        title: "Akumulasi tagihan berhasil",
        description: `Tagihan bulanan telah diakumulasikan untuk ${unpaidCount} pelanggan yang belum membayar.`,
      })
    } catch (error) {
      console.error("Error accumulating debt:", error)
      toast({
        title: "Gagal mengakumulasi tagihan",
        description: "Terjadi kesalahan saat mengakumulasi tagihan bulanan.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akumulasi Tagihan Bulanan</CardTitle>
        <CardDescription>Akumulasikan tagihan bulanan untuk pelanggan yang belum membayar</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Perhatian</AlertTitle>
          <AlertDescription>
            Fitur ini akan menambahkan tagihan bulanan ke tunggakan untuk semua pelanggan yang belum membayar bulan ini.
            Gunakan fitur ini di akhir bulan setelah semua pembayaran diproses.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Pelanggan Aktif</p>
            <p className="font-medium">{activeCustomers.length} pelanggan</p>
          </div>
          <div>
            <p className="text-muted-foreground">Belum Bayar Bulan Ini</p>
            <p className="font-medium">{unpaidCount} pelanggan</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAccumulateDebt} disabled={isProcessing || unpaidCount === 0} className="w-full gap-2">
          {isProcessing ? "Memproses..." : "Akumulasi Tagihan Bulanan"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
