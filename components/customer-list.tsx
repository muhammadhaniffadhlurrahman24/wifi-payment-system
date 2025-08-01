"use client"

import { useState } from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePayment } from "@/context/payment-context"

type CustomerData = {
  id: string
  customerId: string
  name: string
  monthlyFee: number
  bandwidth: number
  status: "paid" | "unpaid" | "inactive" | "suspended"
  amount: number | null
  paymentDate: Date | null
  debt: number
  deposit: number
}

export function CustomerList() {
  const { customers, payments, loading, isCustomerSuspended } = usePayment()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Prepare customer data with payment status for current month
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const customerData: CustomerData[] = customers.map((customer) => {
    // Find payment for current month only
    const currentMonthPayment = payments.find((p) => {
      const paymentDate = new Date(p.date)
      return (
        p.customerId === customer.customerId &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      )
    })

    // Find the most recent payment for this customer (for deposit users)
    const mostRecentPayment = payments
      .filter((p) => p.customerId === customer.customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    let status: "paid" | "unpaid" | "inactive" | "suspended"
    let paymentDate: Date | null = null
    let amount: number | null = null

    if (customer.status === "inactive") {
      status = "inactive"
    } else if (isCustomerSuspended(customer)) {
      status = "suspended"
    } else {
      // Check if customer has paid this month OR has sufficient deposit
      const hasPaidThisMonth = currentMonthPayment !== undefined
      const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
      
      status = hasPaidThisMonth || hasSufficientDeposit ? "paid" : "unpaid"

      // Set payment date and amount
      if (hasPaidThisMonth) {
        // Customer paid this month
        paymentDate = currentMonthPayment!.date
        amount = currentMonthPayment!.amount
      } else if (hasSufficientDeposit) {
        // Customer using deposit - show most recent payment date or current date
        paymentDate = mostRecentPayment ? mostRecentPayment.date : new Date()
        amount = 0 // Show 0 for deposit users
      }
    }

    return {
      id: customer.id,
      customerId: customer.customerId,
      name: customer.name,
      monthlyFee: customer.monthlyFee,
      bandwidth: customer.bandwidth || 4, // Default to 4 if not set
      status,
      amount,
      paymentDate,
      debt: customer.debt || 0,
      deposit: customer.deposit || 0,
    }
  })

  const columns: ColumnDef<CustomerData>[] = [
    // Kolom yang sudah ada tetap sama
    {
      accessorKey: "customerId",
      header: "ID Pelanggan",
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("customerId")}</div>,
    },
    {
      accessorKey: "name",
      header: "Nama Pelanggan",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "monthlyFee",
      header: "Tarif Bulanan",
      cell: ({ row }) => {
        const fee = row.getValue("monthlyFee") as number
        return fee > 0 ? `Rp ${fee.toLocaleString("id-ID")}` : "Tidak Berlangganan"
      },
    },
    // Tambahkan kolom bandwidth
    {
      accessorKey: "bandwidth",
      header: "Bandwidth",
      cell: ({ row }) => {
        const bandwidth = row.getValue("bandwidth") as number
        return `${bandwidth} Mbps`
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "inactive") {
          return <Badge variant="secondary">Tidak Berlangganan</Badge>
        }
        if (status === "suspended") {
          return <Badge variant="outline" className="text-orange-600 border-orange-600">Ditangguhkan</Badge>
        }
        return (
          <Badge variant={status === "paid" ? "default" : "destructive"}>
            {status === "paid" ? "Sudah Bayar" : "Belum Bayar"}
          </Badge>
        )
      },
    },
    // Tambahkan kolom debt
    {
      accessorKey: "debt",
      header: "Tunggakan",
      cell: ({ row }) => {
        const debt = row.getValue("debt") as number
        return debt > 0 ? (
          <span className="text-red-500">Rp {debt.toLocaleString("id-ID")}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    // Tambahkan kolom deposit
    {
      accessorKey: "deposit",
      header: "Uang Titip",
      cell: ({ row }) => {
        const deposit = row.getValue("deposit") as number
        return deposit > 0 ? (
          <span className="text-green-500">Rp {deposit.toLocaleString("id-ID")}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Total Kewajiban
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const customer = row.original
        const monthlyFee = customer.monthlyFee
        const debt = customer.debt
        const deposit = customer.deposit
        
        // Hitung total kewajiban
        const totalObligation = monthlyFee + debt - deposit
        
        // Jika pelanggan baru (debt sama dengan monthlyFee dan belum ada pembayaran bulan ini)
        const isNewCustomer = debt === monthlyFee && customer.status === "unpaid"
        
        if (totalObligation <= 0) {
          return <span className="text-green-500">Rp 0</span>
        }
        
        return (
          <div>
            <div className="font-medium">Rp {totalObligation.toLocaleString("id-ID")}</div>
            {isNewCustomer && (
              <div className="text-xs text-blue-600">Tagihan bulanan baru</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Tanggal Bayar",
      cell: ({ row }) => {
        const date = row.getValue("paymentDate") as Date | null
        return date ? new Date(date).toLocaleDateString("id-ID") : "-"
      },
    },
  ]

  const table = useReactTable({
    data: customerData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Pelanggan</CardTitle>
        <CardDescription>Daftar pelanggan dan status pembayaran</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
              className="w-full max-w-sm pl-8"
            />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Menampilkan {table.getFilteredRowModel().rows.length} dari {customerData.length} pelanggan
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
