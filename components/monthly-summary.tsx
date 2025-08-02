"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { usePayment } from "@/context/payment-context"
import { getActiveCustomers, getTotalMonthlyTarget } from "@/lib/data"

export function MonthlySummary() {
  const { totalPaid, totalUangTitip, totalCustomersPaid } = usePayment()
  const activeCustomers = getActiveCustomers()
  const totalTarget = getTotalMonthlyTarget()
  const progressPercentage = totalTarget > 0 ? (totalPaid / totalTarget) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Bulanan</CardTitle>
        <CardDescription>Progress pembayaran bulan ini</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress Pembayaran</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Terkumpul</p>
            <p className="font-medium">Rp {totalPaid.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Uang Titip</p>
            <p className="font-medium">Rp {totalUangTitip.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Target</p>
            <p className="font-medium">Rp {totalTarget.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Sudah Bayar</p>
            <p className="font-medium">{totalCustomersPaid} pelanggan</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Aktif</p>
            <p className="font-medium">{activeCustomers.length} pelanggan</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
