"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { usePayment } from "@/context/payment-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(1, "Nama pelanggan harus diisi"),
  monthlyFee: z.coerce.number().min(0, "Tarif bulanan tidak boleh negatif"),
  bandwidth: z.coerce.number().min(1, "Bandwidth minimal 1 Mbps"),
  status: z.enum(["active", "inactive"]),
})

export function AddCustomerForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { fetchCustomers } = usePayment()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      monthlyFee: 100000,
      bandwidth: 4,
      status: "active" as const,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      // Generate a unique customer ID
      const customerId = `CUST${Date.now().toString().slice(-6)}`

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          customerId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Gagal menambahkan pelanggan")
      }

      toast({
        title: "Pelanggan berhasil ditambahkan",
        description: `${values.name} telah ditambahkan sebagai pelanggan baru`,
      })

      // Reset form
      form.reset({
        name: "",
        monthlyFee: 100000,
        bandwidth: 4,
        status: "active",
      })

      // Refresh customer list
      fetchCustomers()
    } catch (error) {
      console.error("Error adding customer:", error)
      toast({
        title: "Gagal menambahkan pelanggan",
        description: "Terjadi kesalahan saat menambahkan pelanggan baru",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tambah Pelanggan Baru</CardTitle>
        <CardDescription>Masukkan data pelanggan baru untuk ditambahkan ke sistem</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pelanggan</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama Pelanggan" {...field} />
                  </FormControl>
                  <FormDescription>Masukkan nama lengkap pelanggan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarif Bulanan</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">Rp</span>
                      </div>
                      <Input type="number" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>Masukkan tarif bulanan dalam Rupiah</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bandwidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bandwidth</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number.parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bandwidth" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="4">4 Mbps</SelectItem>
                      <SelectItem value="8">8 Mbps</SelectItem>
                      <SelectItem value="10">10 Mbps</SelectItem>
                      <SelectItem value="20">20 Mbps</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Pilih bandwidth internet pelanggan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Status pelanggan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Tambah Pelanggan"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
