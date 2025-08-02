"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePayment } from "@/context/payment-context"
import { toast } from "@/hooks/use-toast"
import { Trash2, Users, AlertTriangle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function CustomerManager() {
  const { customers, deleteCustomer, loading } = usePayment()
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    try {
      setDeletingCustomerId(customerId)
      await deleteCustomer(customerId)
      
      toast({
        title: "Berhasil",
        description: `Pelanggan ${customerName} berhasil dihapus`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Gagal menghapus pelanggan"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeletingCustomerId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Aktif</Badge>
      case "inactive":
        return <Badge variant="secondary" className="bg-gray-600">Tidak Aktif</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manajemen Pelanggan
          </CardTitle>
          <CardDescription>
            Kelola data pelanggan, lihat status, dan hapus pelanggan yang tidak diperlukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Tidak ada data pelanggan
              </p>
            ) : (
              <div className="grid gap-4">
                {customers.map((customer) => (
                  <div key={customer.customerId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-sm text-muted-foreground">({customer.customerId})</span>
                        {getStatusBadge(customer.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tarif:</span>
                          <div className="font-medium">{formatCurrency(customer.monthlyFee)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bandwidth:</span>
                          <div className="font-medium">{customer.bandwidth} Mbps</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tunggakan:</span>
                          <div className="font-medium">{formatCurrency(customer.debt)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deposit:</span>
                          <div className="font-medium">{formatCurrency(customer.deposit)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Show warning if customer has debt */}
                      {customer.debt > 0 && (
                        <div className="flex items-center gap-1 text-orange-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Ada tunggakan</span>
                        </div>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={loading || deletingCustomerId === customer.customerId}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            {deletingCustomerId === customer.customerId ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Pelanggan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus pelanggan <strong>{customer.name}</strong>?
                              <br /><br />
                              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                <div className="flex items-center gap-2 text-yellow-800">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="font-medium">Peringatan:</span>
                                </div>
                                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                                  <li>• Pelanggan dengan riwayat pembayaran tidak dapat dihapus</li>
                                  <li>• Pelanggan dengan penangguhan aktif tidak dapat dihapus</li>
                                  <li>• Tindakan ini tidak dapat dibatalkan</li>
                                </ul>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCustomer(customer.customerId, customer.name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 