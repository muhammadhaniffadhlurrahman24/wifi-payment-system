"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { usePayment } from "@/context/payment-context"
import { toast } from "@/hooks/use-toast"
import { Calendar, X, Plus } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export function SuspensionManager() {
  const { customers, suspensions, addSuspension, deleteSuspension, isCustomerSuspended, fetchSuspensions, fetchCustomers } = usePayment()
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [startMonth, setStartMonth] = useState("")
  const [startYear, setStartYear] = useState("")
  const [endMonth, setEndMonth] = useState("")
  const [endYear, setEndYear] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handleAddSuspension = async () => {
    if (!selectedCustomer || !startMonth || !startYear || !endMonth || !endYear) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await addSuspension({
        customerId: selectedCustomer,
        startMonth: parseInt(startMonth),
        startYear: parseInt(startYear),
        endMonth: parseInt(endMonth),
        endYear: parseInt(endYear),
        reason: reason || undefined,
      })

      toast({
        title: "Berhasil",
        description: "Penangguhan berhasil ditambahkan",
      })

      // Auto refresh data
      setIsRefreshing(true)
      try {
        await Promise.all([
          fetchSuspensions(),
          fetchCustomers()
        ])
        toast({
          title: "Data Diperbarui",
          description: "Data penangguhan dan pelanggan telah diperbarui",
        })
      } catch (error) {
        console.error("Error refreshing data:", error)
        toast({
          title: "Peringatan",
          description: "Data berhasil ditambahkan, tetapi ada masalah saat memperbarui tampilan",
          variant: "destructive",
        })
      } finally {
        setIsRefreshing(false)
      }

      // Reset form
      setSelectedCustomer("")
      setStartMonth("")
      setStartYear("")
      setEndMonth("")
      setEndYear("")
      setReason("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan penangguhan",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSuspension = async (suspensionId: string, customerId: string) => {
    try {
      await deleteSuspension(customerId, suspensionId)
      toast({
        title: "Berhasil",
        description: "Penangguhan berhasil dihapus",
      })

      // Auto refresh data
      setIsRefreshing(true)
      try {
        await Promise.all([
          fetchSuspensions(),
          fetchCustomers()
        ])
        toast({
          title: "Data Diperbarui",
          description: "Data penangguhan dan pelanggan telah diperbarui",
        })
      } catch (error) {
        console.error("Error refreshing data:", error)
        toast({
          title: "Peringatan",
          description: "Data berhasil dihapus, tetapi ada masalah saat memperbarui tampilan",
          variant: "destructive",
        })
      } finally {
        setIsRefreshing(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus penangguhan",
        variant: "destructive",
      })
    }
  }

  const formatSuspensionPeriod = (startMonth: number, startYear: number, endMonth: number, endYear: number) => {
    const start = `${monthNames[startMonth]} ${startYear}`
    const end = `${monthNames[endMonth]} ${endYear}`
    return `${start} - ${end}`
  }

  return (
    <div className="space-y-6">
      {/* Add Suspension Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tambah Penangguhan
          </CardTitle>
          <CardDescription>
            Tambahkan penangguhan untuk pelanggan tertentu pada periode tertentu. 
            Penangguhan akan berlaku langsung di bulan yang dipilih.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Pelanggan</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter(customer => customer.status === "active")
                    .map((customer) => (
                      <SelectItem key={customer.customerId} value={customer.customerId}>
                        {customer.name} ({customer.customerId})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Alasan (Opsional)</Label>
              <Textarea
                id="reason"
                placeholder="Alasan penangguhan..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startMonth">Bulan Mulai</Label>
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startYear">Tahun Mulai</Label>
              <Select value={startYear} onValueChange={setStartYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endMonth">Bulan Selesai</Label>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endYear">Tahun Selesai</Label>
              <Select value={endYear} onValueChange={setEndYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleAddSuspension} 
            disabled={isSubmitting || !selectedCustomer || !startMonth || !startYear || !endMonth || !endYear}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? "Menambahkan..." : "Tambah Penangguhan"}
          </Button>
        </CardContent>
      </Card>

      {/* Current Suspensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Penangguhan Aktif
            {isRefreshing && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span>Memperbarui...</span>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Daftar penangguhan yang sedang berlangsung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspensions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Tidak ada penangguhan aktif
            </p>
          ) : (
            <div className="space-y-3">
              {suspensions.map((suspension) => {
                const customer = customers.find(c => c.customerId === suspension.customerId)
                return (
                  <div key={suspension.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer?.name || suspension.customerId}</span>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Ditangguhkan
                        </Badge>
                        {(() => {
                          const now = new Date()
                          const currentMonth = now.getMonth()
                          const currentYear = now.getFullYear()
                          const isCurrentMonth = currentYear === suspension.startYear && currentMonth === suspension.startMonth
                          return isCurrentMonth ? (
                            <Badge variant="destructive" className="text-xs">
                              Berlaku Bulan Ini
                            </Badge>
                          ) : null
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatSuspensionPeriod(
                          suspension.startMonth,
                          suspension.startYear,
                          suspension.endMonth,
                          suspension.endYear
                        )}
                      </p>
                      {suspension.reason && (
                        <p className="text-sm text-muted-foreground">
                          Alasan: {suspension.reason}
                        </p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isRefreshing}>
                          {isRefreshing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Penangguhan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus penangguhan untuk {customer?.name}?
                            Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSuspension(suspension.id, suspension.customerId)}
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 