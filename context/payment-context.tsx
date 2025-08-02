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
  createdAt: Date
  updatedAt: Date
  payments?: Payment[]
  suspensions?: Suspension[]
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

export type Suspension = {
  id: string
  customerId: string
  startMonth: number
  startYear: number
  endMonth: number
  endYear: number
  reason?: string
  createdAt: Date
  updatedAt: Date
}

type PaymentContextType = {
  customers: Customer[]
  payments: Payment[]
  suspensions: Suspension[]
  loading: boolean
  error: string | null
  fetchCustomers: () => Promise<void>
  fetchPayments: () => Promise<void>
  fetchSuspensions: () => Promise<void>
  addPayment: (payment: Omit<Payment, "id" | "paymentId" | "customerName">) => Promise<void>
  updateCustomer: (customerId: string, data: Partial<Customer>) => Promise<void>
  deleteCustomer: (customerId: string) => Promise<void>
  addSuspension: (suspension: Omit<Suspension, "id" | "createdAt" | "updatedAt">) => Promise<void>
  deleteSuspension: (customerId: string, suspensionId: string) => Promise<void>
  isCustomerSuspended: (customer: Customer, month?: number, year?: number) => boolean
  totalPaid: number
  totalUangTitip: number
  totalCustomersPaid: number
  totalCustomersActuallyPaid: number
  totalUnpaid: number
  processPayment: (customerId: string, amount: number, date: Date) => Promise<any>
  accumulateMonthlyDebt: () => Promise<any>
  calculateCurrentBill: (customer: Customer) => number
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined)

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [suspensions, setSuspensions] = useState<Suspension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate derived values for current month only
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Filter payments for current month only
  const currentMonthPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.date)
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
  })

  // Filter active customers and exclude suspended ones
  const activeCustomers = customers.filter((c) => {
    if (c.status !== "active") return false
    // Check if customer is suspended for current month
    const isSuspended = suspensions.some((suspension) => {
      if (suspension.customerId !== c.customerId) return false
      
      // Check if the current month/year falls within the suspension period
      // Jika suspension dimulai di bulan ini, langsung berlaku
      if (currentYear === suspension.startYear && currentMonth === suspension.startMonth) return true
      if (currentYear < suspension.startYear || currentYear > suspension.endYear) return false
      
      if (currentYear === suspension.startYear && currentMonth < suspension.startMonth) return false
      if (currentYear === suspension.endYear && currentMonth > suspension.endMonth) return false
      
      return true
    })
    return !isSuspended
  })
  
  // Get customer IDs who paid in current month
  const currentMonthPaidCustomerIds = new Set(currentMonthPayments.map((p) => p.customerId))

  // Calculate customers who are considered "paid" (either paid this month or have sufficient deposit)
  const customersPaid = activeCustomers.filter((customer) => {
    const hasPaidThisMonth = currentMonthPaidCustomerIds.has(customer.customerId)
    const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
    return hasPaidThisMonth || hasSufficientDeposit
  })

  // Calculate customers who actually paid this month (not using deposit)
  const customersActuallyPaid = activeCustomers.filter((customer) => {
    return currentMonthPaidCustomerIds.has(customer.customerId)
  })

  // Calculate customers who are using deposit (not paid this month but have sufficient deposit)
  const customersUsingDeposit = activeCustomers.filter((customer) => {
    const hasPaidThisMonth = currentMonthPaidCustomerIds.has(customer.customerId)
    const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
    return !hasPaidThisMonth && hasSufficientDeposit
  })

  // Calculate total target (sum of all active customers' monthly fees)
  const totalTarget = activeCustomers.reduce((sum, customer) => sum + customer.monthlyFee, 0)

  // Calculate total paid - hanya dari pembayaran aktual, bukan dari uang titip
  const totalPaid = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Calculate total uang titip (deposit yang digunakan)
  const totalUangTitip = activeCustomers
    .filter((customer) => {
      const hasPaidThisMonth = currentMonthPaidCustomerIds.has(customer.customerId)
      const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
      return !hasPaidThisMonth && hasSufficientDeposit
    })
    .reduce((sum, customer) => sum + customer.monthlyFee, 0)

  // Calculate total unpaid as Target - Terkumpul (pembayaran aktual + uang titip)
  const totalUnpaid = totalTarget - (totalPaid + totalUangTitip)

  const totalCustomersPaid = customersPaid.length
  const totalCustomersActuallyPaid = customersActuallyPaid.length

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

      // Dapatkan bulan saat ini
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      // Dapatkan semua pelanggan aktif (tidak termasuk yang ditangguhkan)
      const activeCustomers = customers.filter((c) => {
        if (c.status !== "active") return false
        
        // Check if customer is suspended for current month
        const isSuspended = suspensions.some((suspension) => {
          if (suspension.customerId !== c.customerId) return false
          
          // Check if the current month/year falls within the suspension period
          // Jika suspension dimulai di bulan ini, langsung berlaku
          if (currentYear === suspension.startYear && currentMonth === suspension.startMonth) return true
          if (currentYear < suspension.startYear || currentYear > suspension.endYear) return false
          
          if (currentYear === suspension.startYear && currentMonth < suspension.startMonth) return false
          if (currentYear === suspension.endYear && currentMonth > suspension.endMonth) return false
          
          return true
        })
        return !isSuspended
      })

      // Untuk setiap pelanggan aktif
      for (const customer of activeCustomers) {
        // Cek apakah pelanggan ditambahkan di bulan ini
        const customerCreatedAt = new Date(customer.createdAt)
        const customerCreatedMonth = customerCreatedAt.getMonth()
        const customerCreatedYear = customerCreatedAt.getFullYear()
        
        // Jika pelanggan ditambahkan di bulan ini, skip debt accumulation
        if (customerCreatedYear === currentYear && customerCreatedMonth === currentMonth) {
          console.log(`Skipping debt accumulation for ${customer.name} - added this month`)
          continue
        }

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

  const deleteCustomer = async (customerId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete customer")
      }

      setCustomers((prev) => prev.filter((c) => c.customerId !== customerId))
      setError(null)
    } catch (err) {
      console.error("Error deleting customer:", err)
      setError(err instanceof Error ? err.message : "Failed to delete customer")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Tambahkan fungsi untuk menghitung tagihan saat ini (termasuk debt dan dikurangi deposit)
  // Tambahkan ini di dalam PaymentProvider

  const calculateCurrentBill = (customer: Customer) => {
    if (customer.status !== "active") return 0
    
    // Check if customer is suspended for current month
    const isSuspended = suspensions.some((suspension) => {
      if (suspension.customerId !== customer.customerId) return false
      
      // Check if the current month/year falls within the suspension period
      // Jika suspension dimulai di bulan ini, langsung berlaku
      if (currentYear === suspension.startYear && currentMonth === suspension.startMonth) return true
      if (currentYear < suspension.startYear || currentYear > suspension.endYear) return false
      
      if (currentYear === suspension.startYear && currentMonth < suspension.startMonth) return false
      if (currentYear === suspension.endYear && currentMonth > suspension.endMonth) return false
      
      return true
    })
    
    // If suspended, only return debt (no monthly fee)
    if (isSuspended) {
      return Math.max(0, customer.debt - customer.deposit)
    }
    
    return Math.max(0, customer.monthlyFee + customer.debt - customer.deposit)
  }

  // Suspension-related functions
  const fetchSuspensions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/suspensions")
      
      if (!response.ok) {
        throw new Error("Failed to fetch suspensions")
      }

      const data = await response.json()
      setSuspensions(data)
      setError(null)
    } catch (err) {
      console.error("Error fetching suspensions:", err)
      setError("Failed to load suspensions")
    } finally {
      setLoading(false)
    }
  }

  const addSuspension = async (suspensionData: Omit<Suspension, "id" | "createdAt" | "updatedAt">) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${suspensionData.customerId}/suspensions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(suspensionData),
      })

      if (!response.ok) {
        throw new Error("Failed to add suspension")
      }

      const newSuspension = await response.json()
      setSuspensions((prev) => [...prev, newSuspension])
      setError(null)
    } catch (err) {
      console.error("Error adding suspension:", err)
      setError("Failed to add suspension")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteSuspension = async (customerId: string, suspensionId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/suspensions/${suspensionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete suspension")
      }

      setSuspensions((prev) => prev.filter((s) => s.id !== suspensionId))
      setError(null)
    } catch (err) {
      console.error("Error deleting suspension:", err)
      setError("Failed to delete suspension")
      throw err
    } finally {
      setLoading(false)
    }
  }

    const isCustomerSuspended = (customer: Customer, month?: number, year?: number) => {
    const targetMonth = month ?? currentMonth
    const targetYear = year ?? currentYear
    
    return suspensions.some((suspension) => {
      if (suspension.customerId !== customer.customerId) return false
      
      // Check if the target month/year falls within the suspension period
      // Jika suspension dimulai di bulan ini, langsung berlaku
      if (targetYear === suspension.startYear && targetMonth === suspension.startMonth) return true
      if (targetYear < suspension.startYear || targetYear > suspension.endYear) return false
      
      if (targetYear === suspension.startYear && targetMonth < suspension.startMonth) return false
      if (targetYear === suspension.endYear && targetMonth > suspension.endMonth) return false
      
      return true
    })
  }

  // Load data on mount
  useEffect(() => {
    fetchCustomers()
    fetchPayments()
    fetchSuspensions()
  }, [])

  // Tambahkan fungsi-fungsi baru ke dalam return value dari context

  return (
    <PaymentContext.Provider
      value={{
        customers,
        payments,
        suspensions,
        loading,
        error,
        fetchCustomers,
        fetchPayments,
        fetchSuspensions,
        addPayment,
        updateCustomer,
        deleteCustomer,
        addSuspension,
        deleteSuspension,
        isCustomerSuspended,
        processPayment,
        accumulateMonthlyDebt,
        calculateCurrentBill,
        totalPaid,
        totalUangTitip,
        totalCustomersPaid,
        totalCustomersActuallyPaid,
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
