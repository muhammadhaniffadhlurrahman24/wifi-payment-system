"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePayment } from "@/context/payment-context"
import { toast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Perbarui FormSchema untuk menambahkan validasi amount yang lebih fleksibel
const FormSchema = z.object({
  customer: z.string({
    required_error: "Silakan pilih pelanggan",
  }),
  amount: z.coerce.number().min(1, {
    message: "Nominal harus lebih dari 0",
  }),
  date: z.date({
    required_error: "Tanggal pembayaran diperlukan",
  }),
})

export function PaymentForm() {
  const { customers, processPayment, loading, calculateCurrentBill } = usePayment()
  const [open, setOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: new Date(),
    },
  })

  // Update amount when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const currentBill = calculateCurrentBill(selectedCustomer)
      form.setValue("amount", currentBill)
    }
  }, [selectedCustomer, form, calculateCurrentBill])

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (selectedCustomer) {
      try {
        setIsSubmitting(true)

        // Tampilkan toast saat memulai proses pembayaran
        toast({
          title: "Memproses pembayaran...",
          description: `Sedang memproses pembayaran untuk ${selectedCustomer.name}`,
        })

        const result = await processPayment(selectedCustomer.customerId, data.amount, data.date)

        let message = `Pembayaran untuk ${selectedCustomer.name} sebesar Rp ${data.amount.toLocaleString("id-ID")} telah dicatat.`

        if (result.newDeposit > 0) {
          message += ` Uang titip: Rp ${result.newDeposit.toLocaleString("id-ID")}.`
        }

        if (result.newDebt > 0) {
          message += ` Sisa tagihan: Rp ${result.newDebt.toLocaleString("id-ID")}.`
        }

        toast({
          title: "Pembayaran berhasil dicatat",
          description: message,
        })

        form.reset({
          customer: "",
          amount: undefined,
          date: new Date(),
        })

        setSelectedCustomer(null)
      } catch (error) {
        console.error("Error processing payment:", error)
        toast({
          title: "Gagal mencatat pembayaran",
          description: "Terjadi kesalahan saat mencatat pembayaran. Silakan coba lagi.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const activeCustomers = customers.filter((customer) => customer.status === "active")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Pembayaran</CardTitle>
        <CardDescription>Masukkan data pembayaran pelanggan WiFi</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nama Pelanggan</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? customers.find((customer) => customer.customerId === field.value)?.name
                            : "Pilih pelanggan"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Cari pelanggan..." />
                        <CommandList>
                          <CommandEmpty>Pelanggan tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {activeCustomers.map((customer) => (
                              <CommandItem
                                value={customer.name}
                                key={customer.customerId}
                                onSelect={() => {
                                  form.setValue("customer", customer.customerId)
                                  setSelectedCustomer(customer)
                                  setOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    customer.customerId === field.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>Tarif: Rp {customer.monthlyFee.toLocaleString("id-ID")}</span>
                                    {customer.debt > 0 && (
                                      <span className="text-red-500">
                                        Tunggakan: Rp {customer.debt.toLocaleString("id-ID")}
                                      </span>
                                    )}
                                    {customer.deposit > 0 && (
                                      <span className="text-green-500">
                                        Titipan: Rp {customer.deposit.toLocaleString("id-ID")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Pilih nama pelanggan dari daftar. Nominal akan terisi otomatis sesuai tagihan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCustomer && (
              <div className="rounded-md bg-muted p-4 mb-4">
                <h4 className="font-medium mb-2">Informasi Tagihan</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tarif Bulanan:</span>
                    <span className="float-right font-medium">
                      Rp {selectedCustomer.monthlyFee.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tunggakan:</span>
                    <span className={`float-right font-medium ${selectedCustomer.debt > 0 ? "text-red-500" : ""}`}>
                      Rp {selectedCustomer.debt.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uang Titip:</span>
                    <span className={`float-right font-medium ${selectedCustomer.deposit > 0 ? "text-green-500" : ""}`}>
                      Rp {selectedCustomer.deposit.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Tagihan:</span>
                    <span className="float-right font-medium">
                      Rp {calculateCurrentBill(selectedCustomer).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Nominal Pembayaran
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Anda dapat membayar lebih dari tagihan. Kelebihan akan disimpan sebagai uang titip untuk
                            bulan berikutnya.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">Rp</span>
                      </div>
                      <Input placeholder="100000" className="pl-10" type="number" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Masukkan nominal pembayaran dalam Rupiah. Bayar lebih untuk menyimpan uang titip.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Pembayaran</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Tanggal pembayaran dilakukan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
