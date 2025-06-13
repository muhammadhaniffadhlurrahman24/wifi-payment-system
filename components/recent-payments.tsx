"use client"

import { usePayment } from "@/context/payment-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function RecentPayments() {
  const { payments } = usePayment()

  // Sort payments by date (newest first) and take the first 5
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  if (recentPayments.length === 0) {
    return <div className="text-center text-muted-foreground py-6">Belum ada pembayaran</div>
  }

  return (
    <div className="space-y-8">
      {recentPayments.map((payment) => {
        const initials = payment.customerName.split(" ")[0].substring(0, 2).toUpperCase()

        return (
          <div key={payment.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{payment.customerName}</p>
              <p className="text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString("id-ID")}</p>
            </div>
            <div className="ml-auto font-medium">+Rp {payment.amount.toLocaleString("id-ID")}</div>
          </div>
        )
      })}
    </div>
  )
}
