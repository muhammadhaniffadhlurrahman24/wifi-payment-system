"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePayment } from "@/context/payment-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Overview } from "@/components/overview"
import { RecentPayments } from "@/components/recent-payments"
import { PaymentForm } from "@/components/payment-form"
import { CustomerList } from "@/components/customer-list"
import { ExportData } from "@/components/export-data"
import { MonthlySummary } from "@/components/monthly-summary"
import { DebtAccumulator } from "@/components/debt-accumulator"
import { AddCustomerForm } from "@/components/add-customer-form"
import { SuspensionManager } from "@/components/suspension-manager"
import { CustomerManager } from "@/components/customer-manager"
import { UserNav } from "@/components/user-nav"
import { getActiveCustomers, getTotalMonthlyTarget } from "@/lib/data"

export default function Dashboard() {
  const { totalPaid, totalCustomersPaid, totalUnpaid } = usePayment()
  const [activeTab, setActiveTab] = useState("overview")

  const activeCustomers = getActiveCustomers()
  const totalMonthlyTarget = getTotalMonthlyTarget()

  return (
    <DashboardShell>
      <div className="flex justify-between items-center">
        <DashboardHeader heading="Dashboard Pembayaran WiFi" text="Kelola pembayaran internet WiFi pelanggan" />
        <UserNav />
      </div>
      <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Pembayaran</TabsTrigger>
          <TabsTrigger value="customers">Pelanggan</TabsTrigger>
          <TabsTrigger value="customer-manager">Manajemen Pelanggan</TabsTrigger>
          <TabsTrigger value="add-customer">Tambah Pelanggan</TabsTrigger>
          <TabsTrigger value="suspensions">Penangguhan</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pembayaran Bulan Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp {totalPaid.toLocaleString("id-ID")}</div>
                <p className="text-xs text-muted-foreground">Target: Rp {totalMonthlyTarget.toLocaleString("id-ID")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pelanggan Sudah Bayar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomersPaid}</div>
                <p className="text-xs text-muted-foreground">dari {activeCustomers.length} pelanggan aktif</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Belum Bayar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp {totalUnpaid.toLocaleString("id-ID")}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCustomers.length - totalCustomersPaid} pelanggan belum bayar
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <MonthlySummary />
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Pembayaran Terbaru</CardTitle>
              <CardDescription>{totalCustomersPaid} pembayaran bulan ini</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentPayments />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <PaymentForm />
        </TabsContent>
        <TabsContent value="customers" className="space-y-4">
          <CustomerList />
        </TabsContent>
        <TabsContent value="customer-manager" className="space-y-4">
          <CustomerManager />
        </TabsContent>
        <TabsContent value="add-customer" className="space-y-4">
          <AddCustomerForm />
        </TabsContent>
        <TabsContent value="suspensions" className="space-y-4">
          <SuspensionManager />
        </TabsContent>
        <TabsContent value="export" className="space-y-4">
          <ExportData />
          <DebtAccumulator />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
