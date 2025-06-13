"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { usePayment } from "@/context/payment-context"

export function SetupDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const { fetchCustomers, fetchPayments } = usePayment()

  const setupDatabase = async () => {
    try {
      setIsLoading(true)

      toast({
        title: "Memulai inisialisasi database...",
        description: "Sedang memproses data awal",
      })

      const response = await fetch("/api/setup")
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Database berhasil diinisialisasi",
          description: `${data.customersCount} pelanggan telah ditambahkan ke database.`,
        })

        // Refresh data
        await fetchCustomers()
        await fetchPayments()
      } else {
        throw new Error(data.error || "Failed to set up database")
      }
    } catch (error) {
      console.error("Error setting up database:", error)
      toast({
        title: "Gagal menginisialisasi database",
        description: "Terjadi kesalahan saat menginisialisasi database.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Database</CardTitle>
        <CardDescription>Inisialisasi database dengan data pelanggan</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Klik tombol di bawah untuk menginisialisasi database dengan data pelanggan. Ini hanya perlu dilakukan sekali
          saat pertama kali menggunakan aplikasi.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => {
            toast({
              title: "Memulai setup database...",
              description: "Mempersiapkan inisialisasi database",
            })
            setTimeout(setupDatabase, 500)
          }}
          disabled={isLoading}
        >
          {isLoading ? "Menginisialisasi..." : "Inisialisasi Database"}
        </Button>
      </CardFooter>
    </Card>
  )
}
