"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { usePayment } from "@/context/payment-context"

export function Overview() {
  const { payments } = usePayment()
  const [data, setData] = useState<{ name: string; total: number }[]>([])

  useEffect(() => {
    // Group payments by month
    const monthlyData: Record<string, number> = {}

    // Initialize with last 6 months
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthYear = `${d.toLocaleString("id-ID", { month: "short" })} ${d.getFullYear()}`
      monthlyData[monthYear] = 0
    }

    // Add payment data
    payments.forEach((payment) => {
      const date = new Date(payment.date)
      const monthYear = `${date.toLocaleString("id-ID", { month: "short" })} ${date.getFullYear()}`

      if (monthlyData[monthYear] !== undefined) {
        monthlyData[monthYear] += payment.amount
      }
    })

    // Convert to array for chart
    const chartData = Object.entries(monthlyData).map(([name, total]) => ({
      name,
      total,
    }))

    setData(chartData)
  }, [payments])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `Rp${value.toLocaleString("id-ID")}`}
        />
        <Tooltip
          formatter={(value: number) => [`Rp${value.toLocaleString("id-ID")}`, "Total"]}
          labelFormatter={(label) => `Bulan: ${label}`}
        />
        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}
