"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

// Perbarui tipe Customer untuk menambahkan field bandwidth
export type Customer = {
  id: string
  customerId: string
  name: string
  monthlyFee: number
  bandwidth: number
  status: string
  debt: number
  deposit: number
  payments?: Payment[]
}

export type Payment = {
  id: string
  paymentId: string
  customerId: string
  customerName?: string
  amount: number
  date: Date
  status?: "paid" | "unpaid"
  customer?: Customer
}

type PaymentContextType = {
  customers: Customer[]
  payments: Payment[]
  loading: boolean
  error: string | null
  fetchCustomers: () => Promise<void>
  fetchPayments: () => Promise<void>
  addPayment: (payment: Omit<Payment, "id" | "paymentId" | "customerName">) => Promise<void>
  updateCustomer: (customerId: string, data: Partial<Customer>) => Promise<void>
  totalPaid: number
  totalCustomersPaid: number
  totalUnpaid: number
  processPayment: (customerId: string, amount: number, date: Date) => Promise<any>
  accumulateMonthlyDebt: () => Promise<any>
  calculateCurrentBill: (customer: Customer) => number
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined)

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate derived values
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)

  const activeCustomers = customers.filter((c) => c.status === "active")
  const paidCustomerIds = new Set(payments.map((p) => p.customerId))

  const totalUnpaid = activeCustomers
    .filter((customer) => !paidCustomerIds.has(customer.customerId))
    .reduce((sum, customer) => sum + customer.monthlyFee, 0)

  const totalCustomersPaid = activeCustomers.filter((customer) => paidCustomerIds.has(customer.customerId)).length

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/customers")

      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }

      const data = await response.json()
      setCustomers(data)
      setError(null)
    } catch (err) {
      console.error("Error fetching customers:", err)
      setError("Failed to load customers. Using local data instead.")
      // Fallback to local data
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/payments")

      if (!response.ok) {
        throw new Error("Failed to fetch payments")
      }

      const data = await response.json()

      // Format the payments
      const formattedPayments = data.map((payment: any) => ({
        ...payment,
        date: new Date(payment.date),
        customerName: payment.customer?.name,
      }))

      setPayments(formattedPayments)
      setError(null)
    } catch (err) {
      console.error("Error fetching payments:", err)
      setError("Failed to load payments. Using local data instead.")
      // Fallback to local data from localStorage
      const savedPayments = localStorage.getItem("wifi-payments")
      if (savedPayments) {
        try {
          const parsedPayments = JSON.parse(savedPayments)
          const formattedPayments = parsedPayments.map((p: any) => ({
            ...p,
            date: new Date(p.date),
          }))
          setPayments(formattedPayments)
        } catch (error) {
          console.error("Error loading payments from localStorage:", error)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const addPayment = async (paymentData: Omit<Payment, "id" | "paymentId" | "customerName">) => {
    try {
      setLoading(true)
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        throw new Error("Failed to add payment")
      }

      const newPayment = await response.json()

      // Format the payment
      const formattedPayment = {
        ...newPayment,
        date: new Date(newPayment.date),
        customerName: newPayment.customer?.name,
      }

      setPayments((prev) => [...prev, formattedPayment])

      // Also save to localStorage as backup
      localStorage.setItem("wifi-payments", JSON.stringify([...payments, formattedPayment]))

      setError(null)
    } catch (err) {
      console.error("Error adding payment:", err)
      setError("Failed to add payment. Saving locally instead.")

      // Fallback to local storage
      const customer = customers.find((c) => c.customerId === paymentData.customerId)
      const localPayment = {
        id: Date.now().toString(),
        paymentId: `PAY${Date.now()}`,
        ...paymentData,
        customerName: customer?.name || "Unknown",
      }

      setPayments((prev) => [...prev, localPayment])
      localStorage.setItem("wifi-payments", JSON.stringify([...payments, localPayment]))
    } finally {
      setLoading(false)
    }
  }

  // Tambahkan fungsi untuk menangani pembayaran dengan debt dan deposit
  // Tambahkan ini setelah fungsi addPayment

  // Perbaiki fungsi processPayment untuk menangani uang titip dengan benar
  const processPayment = async (customerId: string, amount: number, date: Date) => {
    try {
      setLoading(true)

      // Dapatkan data customer
      const customer = customers.find((c) => c.customerId === customerId)
      if (!customer) throw new Error("Customer not found")

      // Hitung total tagihan (monthly fee + debt)
      const totalBill = customer.monthlyFee + customer.debt

      // Hitung sisa setelah dikurangi deposit yang ada
      const remainingBill = Math.max(0, totalBill - customer.deposit)

      // Hitung deposit baru
      let newDeposit = 0
      let newDebt = 0

      if (amount + customer.deposit >= totalBill) {
        // Jika pembayaran + deposit cukup untuk bayar semua
        newDeposit = amount + customer.deposit - totalBill
        newDebt = 0
      } else {
        // Jika pembayaran + deposit tidak cukup
        newDebt = totalBill - (amount + customer.deposit)
        newDeposit = 0
      }

      // Update customer dengan debt dan deposit baru
      await updateCustomer(customerId, {
        debt: newDebt,
        deposit: newDeposit,
      })

      // Tambahkan pembayaran ke database
      await addPayment({
        customerId,
        amount,
        date,
      })

      // Refresh data setelah pembayaran
      await fetchCustomers()
      await fetchPayments()

      return {
        success: true,
        paidAmount: amount,
        newDebt,
        newDeposit,
      }
    } catch (err) {
      console.error("Error processing payment:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Tambahkan fungsi untuk menangani akumulasi tagihan bulanan
  // Perbarui fungsi ini di dalam PaymentProvider

  const accumulateMonthlyDebt = async () => {
    try {
      setLoading(true)

      // Dapatkan semua pelanggan aktif
      const activeCustomers = customers.filter((c) => c.status === "active")

      // Dapatkan bulan saat ini
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      // Untuk setiap pelanggan aktif
      for (const customer of activeCustomers) {
        // Cek apakah sudah bayar bulan ini
        const hasPaidThisMonth = payments.some((p) => {
          const paymentDate = new Date(p.date)
          return (
            p.customerId === customer.customerId &&
            paymentDate.getMonth() === currentMonth &&
            paymentDate.getFullYear() === currentYear
          )
        })

        // Jika belum bayar dan uang titip tidak cukup, tambahkan ke debt
        if (!hasPaidThisMonth && customer.deposit < customer.monthlyFee) {
          // Hitung sisa yang harus dibayar setelah dikurangi deposit
          const remainingFee = Math.max(0, customer.monthlyFee - customer.deposit)

          // Tambahkan ke debt dan reset deposit jika ada
          const newDebt = customer.debt + remainingFee
          const newDeposit = Math.max(0, customer.deposit - customer.monthlyFee)

          // Update customer dengan debt dan deposit baru
          await updateCustomer(customer.customerId, {
            debt: newDebt,
            deposit: newDeposit,
          })
        }
      }

      // Refresh data setelah selesai
      await fetchCustomers()

      return { success: true }
    } catch (err) {
      console.error("Error accumulating debt:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Perbarui fungsi updateCustomer untuk menangani debt dan deposit

  const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update customer")
      }

      const updatedCustomer = await response.json()

      setCustomers((prev) =>
        prev.map((customer) => (customer.customerId === customerId ? { ...customer, ...updatedCustomer } : customer)),
      )

      setError(null)
    } catch (err) {
      console.error("Error updating customer:", err)
      setError("Failed to update customer")

      // Optimistic update
      setCustomers((prev) =>
        prev.map((customer) => (customer.customerId === customerId ? { ...customer, ...data } : customer)),
      )
    } finally {
      setLoading(false)
    }
  }

  // Tambahkan fungsi untuk menghitung tagihan saat ini (termasuk debt dan dikurangi deposit)
  // Tambahkan ini di dalam PaymentProvider

  const calculateCurrentBill = (customer: Customer) => {
    if (customer.status !== "active") return 0
    return Math.max(0, customer.monthlyFee + customer.debt - customer.deposit)
  }

  // Load data on mount
  useEffect(() => {
    fetchCustomers()
    fetchPayments()
  }, [])

  // Tambahkan fungsi-fungsi baru ke dalam return value dari context

  return (
    <PaymentContext.Provider
      value={{
        customers,
        payments,
        loading,
        error,
        fetchCustomers,
        fetchPayments,
        addPayment,
        updateCustomer,
        processPayment,
        accumulateMonthlyDebt,
        calculateCurrentBill,
        totalPaid,
        totalCustomersPaid,
        totalUnpaid,
      }}
    >
      {children}
    </PaymentContext.Provider>
  )
}

export function usePayment() {
  const context = useContext(PaymentContext)
  if (context === undefined) {
    throw new Error("usePayment must be used within a PaymentProvider")
  }
  return context
}
