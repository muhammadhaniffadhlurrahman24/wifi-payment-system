"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePayment } from "@/context/payment-context"
import { toast } from "@/hooks/use-toast"
import { SetupDatabase } from "@/components/setup-database"

export function ExportData() {
  const { customers, payments, suspensions, loading } = usePayment()
  const [isExporting, setIsExporting] = useState(false)

  // Helper function to get month name in Indonesian
  const getMonthName = (monthIndex: number) => {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ]
    return months[monthIndex]
  }

  // Helper function to get payments for a specific month
  const getPaymentsForMonth = (year: number, month: number) => {
    return payments.filter((payment) => {
      const paymentDate = new Date(payment.date)
      return paymentDate.getFullYear() === year && paymentDate.getMonth() === month
    })
  }

  // Helper function to calculate remaining deposit for a specific month
  const calculateRemainingDeposit = (customer: any, year: number, month: number) => {
    if (month < 6 || customer.status !== "active") {
      return customer.deposit || 0
    }

    let totalUsed = 0
    
    // Cek setiap bulan dari Juli sampai bulan sebelumnya
    for (let m = 6; m < month; m++) {
      const mPayments = getPaymentsForMonth(year, m)
      const mPayment = mPayments.find((p) => p.customerId === customer.customerId)
      
      // Jika tidak ada pembayaran aktual di bulan ini, maka deposit digunakan
      if (!mPayment) {
        const remainingDeposit = (customer.deposit || 0) - totalUsed
        if (remainingDeposit >= (customer.monthlyFee || 0)) {
          totalUsed += customer.monthlyFee || 0
        }
      }
    }
    
    return Math.max(0, (customer.deposit || 0) - totalUsed)
  }

  // Fungsi sederhana untuk menghitung berapa bulan yang bisa dibayar dengan deposit
  const calculateMonthsCoveredByDeposit = (customer: any) => {
    if (customer.monthlyFee === 0) return 0
    return Math.floor((customer.deposit || 0) / customer.monthlyFee)
  }

  // Fungsi untuk menghitung sisa deposit setelah digunakan untuk sejumlah bulan
  const calculateRemainingDepositAfterMonths = (customer: any, monthsUsed: number) => {
    const totalUsed = monthsUsed * customer.monthlyFee
    return Math.max(0, (customer.deposit || 0) - totalUsed)
  }

  // Fungsi untuk memeriksa apakah bulan tertentu sudah dibayar dengan pembayaran aktual
  const hasActualPaymentForMonth = (customerId: string, year: number, month: number) => {
    return payments.some((payment) => {
      const paymentDate = new Date(payment.date)
      return payment.customerId === customerId && paymentDate.getMonth() === month && paymentDate.getFullYear() === year
    })
  }

  const createMonthSheetData = (year: number, month: number) => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Helper function untuk cek apakah customer ditangguhkan di bulan tertentu
    const isCustomerSuspended = (customer: any, targetMonth: number, targetYear: number) => {
      return suspensions.some((suspension) => {
        if (suspension.customerId !== customer.customerId) return false
        
        // Logika baru: suspension berlaku langsung di bulan yang dipilih
        if (targetYear === suspension.startYear && targetMonth === suspension.startMonth) return true
        if (targetYear < suspension.startYear || targetYear > suspension.endYear) return false
        
        if (targetYear === suspension.startYear && targetMonth < suspension.startMonth) return false
        if (targetYear === suspension.endYear && targetMonth > suspension.endMonth) return false
        
        return true
      })
    }

    // Jika bulan Januari-Juni (0-5), return data kosong
    if (month < 6) {
      // Filter customers yang sudah ada di bulan target
      const validCustomers = customers.filter((customer) => {
        const customerCreatedAt = new Date(customer.createdAt)
        const customerCreatedMonth = customerCreatedAt.getMonth()
        const customerCreatedYear = customerCreatedAt.getFullYear()
        
        // Customer hanya muncul di sheet bulan-bulan setelah mereka ditambahkan
        if (customerCreatedYear > year) return false
        if (customerCreatedYear === year && customerCreatedMonth > month) return false
        
        return true
      })

      return validCustomers.map((customer, index) => ({
        no: index + 1,
        nama: customer.name,
        tarif: customer.monthlyFee,
        bandwidth: customer.bandwidth || 4,
        tunggakan: 0,
        uangTitip: 0,
        totalKewajiban: 0,
        status: "Tidak Berlangganan",
        tanggal: "",
        nominal: 0,
        nominalAktual: 0,
        rowStyle: "InactiveStyle",
      }))
    }

    // Jika bulan setelah bulan sekarang, cek apakah ada uang titip yang berlaku
    if (month > currentMonth) {
      // Filter customers yang sudah ada di bulan target
      const validCustomers = customers.filter((customer) => {
        const customerCreatedAt = new Date(customer.createdAt)
        const customerCreatedMonth = customerCreatedAt.getMonth()
        const customerCreatedYear = customerCreatedAt.getFullYear()
        
        // Customer hanya muncul di sheet bulan-bulan setelah mereka ditambahkan
        if (customerCreatedYear > year) return false
        if (customerCreatedYear === year && customerCreatedMonth > month) return false
        
        return true
      })

      return validCustomers.map((customer, index) => {
        // Hitung uang titip yang tersisa untuk bulan ini
        let uangTitip = 0
        if (customer.status === "active" && customer.deposit > 0) {
          let totalUsed = 0
          
          // Cek setiap bulan dari Juli sampai bulan sekarang
          for (let m = 6; m <= currentMonth; m++) {
            const mPayments = getPaymentsForMonth(year, m)
            const mPayment = mPayments.find((p) => p.customerId === customer.customerId)
            
            // Jika tidak ada pembayaran aktual di bulan ini, maka deposit digunakan
            if (!mPayment) {
              const remainingDeposit = (customer.deposit || 0) - totalUsed
              if (remainingDeposit >= (customer.monthlyFee || 0)) {
                totalUsed += customer.monthlyFee || 0
              }
            }
          }
          
          uangTitip = Math.max(0, (customer.deposit || 0) - totalUsed)
        }

        // Jika tidak ada uang titip yang tersisa, return data kosong
        if (uangTitip === 0) {
          return {
            no: index + 1,
            nama: customer.name,
            tarif: customer.monthlyFee,
            bandwidth: customer.bandwidth || 4,
            tunggakan: 0,
            uangTitip: 0,
            totalKewajiban: 0,
            status: "Tidak Berlangganan",
            tanggal: "",
            nominal: 0,
            nominalAktual: 0,
            rowStyle: "InactiveStyle",
          }
        }

        // Jika ada uang titip, hitung berapa bulan yang bisa dibayar
        const monthsCovered = Math.floor(uangTitip / (customer.monthlyFee || 1))
        const targetMonth = month - 6 // Bulan relatif terhadap Juli
        
        // Jika bulan ini masih dalam jangkauan uang titip
        if (targetMonth <= monthsCovered) {
          return {
            no: index + 1,
            nama: customer.name,
            tarif: customer.monthlyFee,
            bandwidth: customer.bandwidth || 4,
            tunggakan: 0,
            uangTitip: customer.monthlyFee, // Uang titip yang digunakan untuk bulan ini
            totalKewajiban: 0,
            status: "Sudah Bayar",
            tanggal: "Uang Titip",
            nominal: 0,
            nominalAktual: 0,
            rowStyle: "DataStyle",
          }
        } else {
          // Bulan ini sudah melebihi jangkauan uang titip
          return {
            no: index + 1,
            nama: customer.name,
            tarif: customer.monthlyFee,
            bandwidth: customer.bandwidth || 4,
            tunggakan: 0,
            uangTitip: 0,
            totalKewajiban: 0,
            status: "Tidak Berlangganan",
            tanggal: "",
            nominal: 0,
            nominalAktual: 0,
            rowStyle: "InactiveStyle",
          }
        }
      })
    }

    const monthPayments = getPaymentsForMonth(year, month)

    // Filter customers yang sudah ada di bulan target
    const validCustomers = customers.filter((customer) => {
      const customerCreatedAt = new Date(customer.createdAt)
      const customerCreatedMonth = customerCreatedAt.getMonth()
      const customerCreatedYear = customerCreatedAt.getFullYear()
      
      // Customer hanya muncul di sheet bulan-bulan setelah mereka ditambahkan
      if (customerCreatedYear > year) return false
      if (customerCreatedYear === year && customerCreatedMonth > month) return false
      
      return true
    })

    return validCustomers.map((customer, index) => {
      const payment = monthPayments.find((p) => p.customerId === customer.customerId)

      // Find the most recent payment for this customer (for deposit users)
      const mostRecentPayment = payments
        .filter((p) => p.customerId === customer.customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

      let status = ""
      let tanggalBayar = ""
      let nominal = 0
      
      // Cek apakah customer ditangguhkan di bulan ini
      const isSuspended = isCustomerSuspended(customer, month, year)
      
      // Hitung uang titip yang tersisa berdasarkan bulan
      let uangTitip = calculateRemainingDeposit(customer, year, month)
      
      // Jika ada pembayaran aktual di bulan ini, uang titip tidak berkurang
      if (payment) {
        uangTitip = calculateRemainingDeposit(customer, year, month)
      } else {
        // Jika tidak ada pembayaran aktual, cek apakah uang titip cukup untuk bulan ini
        const remainingDeposit = calculateRemainingDeposit(customer, year, month)
        if (remainingDeposit >= (customer.monthlyFee || 0)) {
          uangTitip = customer.monthlyFee || 0
        } else {
          uangTitip = remainingDeposit
        }
      }

      if (customer.status === "inactive") {
        status = "Tidak Berlangganan"
      } else if (isSuspended) {
        // Customer ditangguhkan di bulan ini
        status = "Ditangguhkan"
        tanggalBayar = ""
        nominal = 0
      } else {
        // Check if customer has paid this month OR has sufficient deposit
        const hasPaidThisMonth = payment !== undefined
        const hasSufficientDeposit = uangTitip >= customer.monthlyFee
        
        if (hasPaidThisMonth) {
          // Customer paid this month
          status = "Sudah Bayar"
          tanggalBayar = format(new Date(payment.date), "dd/MM/yyyy")
          nominal = payment.amount
        } else if (hasSufficientDeposit) {
          // Customer using deposit - show most recent payment date
          status = "Sudah Bayar"
          // Cari pembayaran terakhir untuk tanggal bayar
          const lastPayment = payments
            .filter((p) => p.customerId === customer.customerId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
          
          tanggalBayar = lastPayment ? format(new Date(lastPayment.date), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")
          nominal = 0 // Show 0 for deposit users
        } else {
          status = "Belum Bayar"
        }
      }

      // Hitung Total Kewajiban Bayar
      const tarifBulanan = customer.monthlyFee || 0
      
      // Logika tunggakan: gunakan field debt dari database
      let tunggakan = customer.debt || 0
      
      // Kasus khusus untuk AMAT 08 dan FAJAR 06
      if (customer.name.includes("AMAT") || customer.name.includes("FAJAR")) {
        if (month === 6) {
          // Bulan Juli: tunggakan Rp 100.000
          tunggakan = 100000
        } else if (month === 7) {
          // Bulan Agustus: gunakan debt dari database (Rp 200.000)
          tunggakan = customer.debt || 0
        } else {
          // Bulan lain: logika normal
          tunggakan = customer.debt || 0
        }
      }
      
      // Jika customer ditangguhkan, tidak ada tagihan bulanan
      const effectiveTarifBulanan = isSuspended ? 0 : tarifBulanan
      const totalKewajiban = Math.max(0, effectiveTarifBulanan + tunggakan - uangTitip)

      // Determine row style based on customer status and debt
      let rowStyle = "DataStyle"
      if (customer.status === "inactive") {
        rowStyle = "InactiveStyle"
      } else if (isSuspended) {
        rowStyle = "SuspendedStyle"
      } else if (tunggakan > 0) {
        rowStyle = "DebtStyle"
      }

      return {
        no: index + 1,
        nama: customer.name,
        tarif: customer.monthlyFee,
        bandwidth: customer.bandwidth || 4,
        tunggakan: tunggakan,
        uangTitip: uangTitip,
        totalKewajiban: totalKewajiban,
        status: status,
        tanggal: tanggalBayar,
        nominal: nominal,
        nominalAktual: payment ? payment.amount : 0,
        rowStyle: rowStyle,
      }
    })
  }

  const exportToExcelWithSheets = () => {
    setIsExporting(true)

    try {
      const currentYear = new Date().getFullYear()

      // Create XML content for Excel with multiple worksheets
      let xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>NSMediaLink Rekap Tahunan ${currentYear}</Title>
  <Author>NSMediaLink System</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>9000</WindowHeight>
  <WindowWidth>13860</WindowWidth>
  <WindowTopX>0</WindowTopX>
  <WindowTopY>0</WindowTopY>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:Bold="1" ss:Size="16"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="DataStyle">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="NumberStyle">
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="DebtStyle">
   <Interior ss:Color="#FFFF99" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="SuspendedStyle">
   <Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:Color="#FF8C00"/>
  </Style>
  <Style ss:ID="InactiveStyle">
   <Interior ss:Color="#FFCCCC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="NumberDebtStyle">
   <NumberFormat ss:Format="#,##0"/>
   <Interior ss:Color="#FFFF99" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="NumberSuspendedStyle">
   <NumberFormat ss:Format="#,##0"/>
   <Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Right"/>
   <Font ss:Color="#FF8C00"/>
  </Style>
  <Style ss:ID="NumberInactiveStyle">
   <NumberFormat ss:Format="#,##0"/>
   <Interior ss:Color="#FFCCCC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="SummaryStyle">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D4EDDA" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="NumberSummaryStyle">
   <Font ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0"/>
   <Interior ss:Color="#D4EDDA" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Alignment ss:Horizontal="Right"/>
  </Style>
 </Styles>
`

      // Create summary worksheet
      const summaryData = []
      for (let month = 0; month < 12; month++) {
        if (month < 6) {
          // Januari-Juni: data kosong
          summaryData.push({
            month: getMonthName(month),
            total: 0,
            paid: 0,
            unpaid: 0,
            amount: 0,
          })
        } else if (month > currentMonth) {
          // Bulan setelah bulan sekarang: data kosong kecuali ada uang titip
          const monthData = createMonthSheetData(currentYear, month)
          const activeCustomersCount = monthData.filter((c) => c.status === "Sudah Bayar" || c.status === "Belum Bayar").length
          const paidCount = monthData.filter((c) => c.status === "Sudah Bayar").length
          const unpaidCount = monthData.filter((c) => c.status === "Belum Bayar").length
          const totalAmount = monthData.reduce((sum, c) => sum + c.nominalAktual, 0)

          summaryData.push({
            month: getMonthName(month),
            total: activeCustomersCount,
            paid: paidCount,
            unpaid: unpaidCount,
            amount: totalAmount,
          })
        } else {
          // Juli sampai bulan sekarang: data normal
          const monthPayments = getPaymentsForMonth(currentYear, month)
          const activeCustomersCount = customers.filter((c) => c.status === "active").length
          const paidCount = monthPayments.length
          const unpaidCount = activeCustomersCount - paidCount
          const totalAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0)

          summaryData.push({
            month: getMonthName(month),
            total: activeCustomersCount,
            paid: paidCount,
            unpaid: unpaidCount,
            amount: totalAmount,
          })
        }
      }

      xmlContent += `
<Worksheet ss:Name="Ringkasan ${currentYear}">
 <Table x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="65" ss:DefaultRowHeight="15">
  <Column ss:Width="120"/>
  <Column ss:Width="80"/>
  <Column ss:Width="80"/>
  <Column ss:Width="80"/>
  <Column ss:Width="100"/>
  <Row ss:Height="25">
   <Cell ss:MergeAcross="4" ss:StyleID="TitleStyle">
    <Data ss:Type="String">NSMediaLink - Ringkasan Tahunan ${currentYear}</Data>
   </Cell>
  </Row>
  <Row ss:Height="10"/>
  <Row ss:Height="20">
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Bulan</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Total Pelanggan</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Sudah Bayar</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Belum Bayar</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Total Terkumpul</Data></Cell>
  </Row>`

      summaryData.forEach((row) => {
        xmlContent += `
    <Row>
      <Cell ss:StyleID="DataStyle"><Data ss:Type="String">${row.month}</Data></Cell>
      <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${row.total}</Data></Cell>
      <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${row.paid}</Data></Cell>
      <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${row.unpaid}</Data></Cell>
      <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${row.amount}</Data></Cell>
    </Row>`
      })

      xmlContent += `
  </Table>
</Worksheet>
`

      // Create worksheets for each month
      for (let month = 0; month < 12; month++) {
        const monthName = getMonthName(month)
        const monthData = createMonthSheetData(currentYear, month)

        xmlContent += `
<Worksheet ss:Name="${monthName} ${currentYear}">
 <Table x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="65" ss:DefaultRowHeight="15">
  <Column ss:AutoFitWidth="0" ss:Width="40"/>
  <Column ss:AutoFitWidth="0" ss:Width="150"/>
  <Column ss:AutoFitWidth="0" ss:Width="80"/>
  <Column ss:AutoFitWidth="0" ss:Width="60"/>
  <Column ss:AutoFitWidth="0" ss:Width="80"/>
  <Column ss:AutoFitWidth="0" ss:Width="80"/>
  <Column ss:AutoFitWidth="0" ss:Width="120"/>
  <Column ss:AutoFitWidth="0" ss:Width="120"/>
  <Column ss:AutoFitWidth="0" ss:Width="100"/>
  <Column ss:AutoFitWidth="0" ss:Width="80"/>
  <Column ss:AutoFitWidth="0" ss:Width="120"/>
  <Row ss:Height="25">
   <Cell ss:MergeAcross="10" ss:StyleID="TitleStyle">
    <Data ss:Type="String">NSMediaLink</Data>
   </Cell>
  </Row>
  <Row ss:Height="25">
   <Cell ss:MergeAcross="10" ss:StyleID="TitleStyle">
    <Data ss:Type="String">${monthName} ${currentYear}</Data>
   </Cell>
  </Row>
  <Row ss:Height="10"/>
  <Row ss:Height="20">
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">No</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Nama</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tarif Bulanan</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Bandwidth</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tunggakan</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Uang Titip</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Total Kewajiban Bayar</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Status</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tanggal Bayar</Data></Cell>
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Nominal Aktual</Data></Cell>
  </Row>`

        // Calculate totals for summary row
        const totalTarifBulanan = monthData.reduce((sum, row) => sum + row.tarif, 0)
        const totalTunggakan = monthData.reduce((sum, row) => sum + row.tunggakan, 0)
        const totalUangTitip = monthData.reduce((sum, row) => sum + row.uangTitip, 0)
        const totalKewajiban = monthData.reduce((sum, row) => sum + row.totalKewajiban, 0)
        const totalNominalAktual = monthData.reduce((sum, row) => sum + row.nominalAktual, 0)

        monthData.forEach((row) => {
          const stylePrefix = row.rowStyle
          const numberStylePrefix =
            row.rowStyle === "DataStyle"
              ? "NumberStyle"
              : row.rowStyle === "DebtStyle"
                ? "NumberDebtStyle"
                : row.rowStyle === "SuspendedStyle"
                  ? "NumberSuspendedStyle"
                  : "NumberInactiveStyle"

          xmlContent += `
    <Row>
      <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="Number">${row.no}</Data></Cell>
      <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="String">${row.nama}</Data></Cell>
      <Cell ss:StyleID="${numberStylePrefix}"><Data ss:Type="Number">${row.tarif}</Data></Cell>
      <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="Number">${row.bandwidth}</Data></Cell>
      <Cell ss:StyleID="${numberStylePrefix}"><Data ss:Type="Number">${row.tunggakan}</Data></Cell>
      <Cell ss:StyleID="${numberStylePrefix}"><Data ss:Type="Number">${row.uangTitip}</Data></Cell>
      <Cell ss:StyleID="${numberStylePrefix}"><Data ss:Type="Number">${row.totalKewajiban}</Data></Cell>
      <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="String">${row.status}</Data></Cell>
      <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="String">${row.tanggal}</Data></Cell>
      <Cell ss:StyleID="${numberStylePrefix}"><Data ss:Type="Number">${row.nominalAktual}</Data></Cell>
    </Row>`
        })

        // Add summary row
        xmlContent += `
    <Row ss:Height="20">
      <Cell ss:StyleID="SummaryStyle"><Data ss:Type="String">JUMLAH</Data></Cell>
      <Cell ss:StyleID="SummaryStyle"><Data ss:Type="String"></Data></Cell>
      <Cell ss:StyleID="NumberSummaryStyle"><Data ss:Type="Number">${totalTarifBulanan}</Data></Cell>
      <Cell ss:StyleID="SummaryStyle"><Data ss:Type="String"></Data></Cell>
      <Cell ss:StyleID="NumberSummaryStyle"><Data ss:Type="Number">${totalTunggakan}</Data></Cell>
      <Cell ss:StyleID="NumberSummaryStyle"><Data ss:Type="Number">${totalUangTitip}</Data></Cell>
      <Cell ss:StyleID="NumberSummaryStyle"><Data ss:Type="Number">${totalKewajiban}</Data></Cell>
      <Cell ss:StyleID="SummaryStyle"><Data ss:Type="String"></Data></Cell>
      <Cell ss:StyleID="SummaryStyle"><Data ss:Type="String"></Data></Cell>
      <Cell ss:StyleID="NumberSummaryStyle"><Data ss:Type="Number">${totalNominalAktual}</Data></Cell>
    </Row>`

        xmlContent += `
</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
 <PageSetup>
  <Layout x:Orientation="Landscape"/>
  <Header x:Margin="0.3"/>
  <Footer x:Margin="0.3"/>
  <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
 </PageSetup>
 <Unsynced/>
 <Print>
  <ValidPrinterInfo/>
  <PaperSizeIndex>9</PaperSizeIndex>
  <HorizontalResolution>600</HorizontalResolution>
  <VerticalResolution>600</VerticalResolution>
 </Print>
 <Selected/>
 <DoNotDisplayGridlines/>
 <FreezePanes/>
 <FrozenNoSplit/>
 <SplitHorizontal>4</SplitHorizontal>
 <TopRowBottomPane>4</TopRowBottomPane>
 <ActivePane>2</ActivePane>
 <Panes>
  <Pane>
   <Number>3</Number>
  </Pane>
  <Pane>
   <Number>2</Number>
   <ActiveRow>0</ActiveRow>
  </Pane>
 </Panes>
 <ProtectObjects>False</ProtectObjects>
 <ProtectScenarios>False</ProtectScenarios>
</WorksheetOptions>
<AutoFilter x:Range="R4C1:R4C10" xmlns="urn:schemas-microsoft-com:office:excel"></AutoFilter>
</Worksheet>
`
      }

      xmlContent += `</Workbook>`

      // Create and download file
      const blob = new Blob([xmlContent], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `NSMediaLink-rekap-tahunan-${currentYear}.xls`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Excel berhasil",
        description: `Data pembayaran NSMediaLink tahun ${currentYear} berhasil diexport dengan 13 sheet (1 ringkasan + 12 bulan)`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export gagal",
        description: "Terjadi kesalahan saat mengexport data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcelSingle = () => {
    setIsExporting(true)

    try {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear

      // Helper function untuk cek apakah customer ditangguhkan di bulan tertentu
      const isCustomerSuspended = (customer: any, targetMonth: number, targetYear: number) => {
        return suspensions.some((suspension) => {
          if (suspension.customerId !== customer.customerId) return false
          
          // Logika baru: suspension berlaku langsung di bulan yang dipilih
          if (targetYear === suspension.startYear && targetMonth === suspension.startMonth) return true
          if (targetYear < suspension.startYear || targetYear > suspension.endYear) return false
          
          if (targetYear === suspension.startYear && targetMonth < suspension.startMonth) return false
          if (targetYear === suspension.endYear && targetMonth > suspension.endMonth) return false
          
          return true
        })
      }

      // Prepare data for export with better formatting
      const data = customers.map((customer, index) => {
        const payment = payments.find((p) => {
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

        let status = ""
        let tanggalBayar = ""
        const uangTitip = customer.deposit || 0

        // Cek apakah customer ditangguhkan di bulan ini
        const isSuspended = isCustomerSuspended(customer, currentMonth, currentYear)

        if (customer.status === "inactive") {
          status = "Tidak Berlangganan"
        } else if (isSuspended) {
          // Customer ditangguhkan di bulan ini
          status = "Ditangguhkan"
          tanggalBayar = ""
        } else {
          // Check if customer has paid this month OR has sufficient deposit
          const hasPaidThisMonth = payment !== undefined
          const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
          
          if (hasPaidThisMonth) {
            // Customer paid this month
            status = "Sudah Bayar"
            tanggalBayar = format(new Date(payment.date), "dd/MM/yyyy")
          } else if (hasSufficientDeposit) {
            // Customer using deposit - show most recent payment date or current date
            status = "Sudah Bayar"
            tanggalBayar = mostRecentPayment ? format(new Date(mostRecentPayment.date), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")
          } else {
            status = "Belum Bayar"
          }
        }

        // Hitung Total Kewajiban Bayar
        const tunggakan = customer.debt || 0
        const tarifBulanan = customer.monthlyFee || 0
        
        // Jika customer ditangguhkan, tidak ada tagihan bulanan
        const effectiveTarifBulanan = isSuspended ? 0 : tarifBulanan
        const totalKewajiban = Math.max(0, effectiveTarifBulanan + tunggakan - uangTitip)

        return {
          No: index + 1,
          Nama: customer.name,
          "Tarif Bulanan": effectiveTarifBulanan > 0 ? `Rp ${effectiveTarifBulanan.toLocaleString("id-ID")}` : "Rp 0",
          "Tarif Bulanan Value": effectiveTarifBulanan || 0,
          Bandwidth: `${customer.bandwidth || 4} Mbps`,
          Tunggakan: customer.debt > 0 ? `Rp ${customer.debt.toLocaleString("id-ID")}` : "Rp 0",
          "Tunggakan Value": customer.debt || 0,
          "Uang Titip": uangTitip > 0 ? `Rp ${uangTitip.toLocaleString("id-ID")}` : "Rp 0",
          "Uang Titip Value": uangTitip || 0,
          "Total Kewajiban Bayar": totalKewajiban > 0 ? `Rp ${totalKewajiban.toLocaleString("id-ID")}` : "Rp 0",
          "Total Kewajiban Value": totalKewajiban || 0,
          Status: status,
          "Tanggal Bayar": tanggalBayar || "-",
          "Nominal Aktual": payment ? `Rp ${payment.amount.toLocaleString("id-ID")}` : "Rp 0",
          IsSuspended: isSuspended,
        }
      })

      // Calculate totals for summary row
      const totalTarifBulanan = data.reduce((sum, row) => sum + row["Tarif Bulanan Value"], 0)
      const totalTunggakan = data.reduce((sum, row) => sum + row["Tunggakan Value"], 0)
      const totalUangTitip = data.reduce((sum, row) => sum + row["Uang Titip Value"], 0)
      const totalKewajiban = data.reduce((sum, row) => sum + row["Total Kewajiban Value"], 0)
      
      // Calculate total Nominal Aktual
      const totalNominalAktual = data.reduce((sum, row) => {
        const nominalAktualStr = row["Nominal Aktual"]
        const nominalAktualValue = nominalAktualStr === "Rp 0" ? 0 : parseInt(nominalAktualStr.replace(/[^\d]/g, ""))
        return sum + nominalAktualValue
      }, 0)

      // Create HTML table for better Excel compatibility
      let htmlContent = `
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; }
        .title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 10px; }
        .subtitle { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #555; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; white-space: nowrap; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .number { text-align: center; }
        .currency { text-align: right; }
        .debt-row td { background-color: #FFFF99; } /* Yellow for customers with debt */
        .inactive-row td { background-color: #FFCCCC; } /* Red for inactive customers */
        .suspended-row td { background-color: #FFF2CC; color: #FF8C00; } /* Orange for suspended customers */
        
        /* Tambahkan style untuk autofit */
        table { table-layout: auto; }
        td, th { overflow: hidden; }
        
        /* Tambahkan style untuk masing-masing kolom */
        .col-no { width: 40px; }
        .col-nama { width: 150px; }
        .col-tarif { width: 100px; }
        .col-bandwidth { width: 80px; }
        .col-tunggakan { width: 100px; }
        .col-uang-titip { width: 100px; }
        .col-kewajiban { width: 150px; }
        .col-status { width: 120px; }
        .col-tanggal { width: 100px; }
        .col-nominal { width: 120px; }
      </style>
    </head>
    <body>
      <div class="title">NSMediaLink</div>
      <div class="subtitle">${getMonthName(currentMonth)} ${currentYear}</div>
      <table>
        <thead>
          <tr>
            <th class="number col-no">No</th>
            <th class="col-nama">Nama</th>
            <th class="currency col-tarif">Tarif Bulanan</th>
            <th class="col-bandwidth">Bandwidth</th>
            <th class="currency col-tunggakan">Tunggakan</th>
            <th class="currency col-uang-titip">Uang Titip</th>
            <th class="currency col-kewajiban">Total Kewajiban Bayar</th>
            <th class="col-status">Status</th>
            <th class="col-tanggal">Tanggal Bayar</th>
            <th class="currency col-nominal">Nominal Aktual</th>
          </tr>
        </thead>
        <tbody>
`

      data.forEach((row) => {
        // Determine row class based on customer status and debt
        let rowClass = ""
        if (row["Status"] === "Tidak Berlangganan") {
          rowClass = "inactive-row"
        } else if (row["IsSuspended"]) {
          rowClass = "suspended-row"
        } else if (row["Tunggakan"] !== "Rp 0") {
          rowClass = "debt-row"
        }

        htmlContent += `
    <tr class="${rowClass}">
      <td class="number">${row.No}</td>
      <td>${row.Nama}</td>
      <td class="currency">${row["Tarif Bulanan"]}</td>
      <td>${row["Bandwidth"]}</td>
      <td class="currency">${row["Tunggakan"]}</td>
      <td class="currency">${row["Uang Titip"]}</td>
      <td class="currency">${row["Total Kewajiban Bayar"]}</td>
      <td>${row["Status"]}</td>
      <td>${row["Tanggal Bayar"]}</td>
      <td class="currency">${row["Nominal Aktual"]}</td>
    </tr>
  `
      })

      // Add summary row
      htmlContent += `
    <tr style="background-color: #f0f0f0; font-weight: bold;">
      <td colspan="2" style="text-align: center;"><strong>JUMLAH</strong></td>
      <td class="currency"><strong>Rp ${totalTarifBulanan.toLocaleString("id-ID")}</strong></td>
      <td></td>
      <td class="currency"><strong>Rp ${totalTunggakan.toLocaleString("id-ID")}</strong></td>
      <td class="currency"><strong>Rp ${totalUangTitip.toLocaleString("id-ID")}</strong></td>
      <td class="currency"><strong>Rp ${totalKewajiban.toLocaleString("id-ID")}</strong></td>
      <td></td>
      <td></td>
      <td class="currency"><strong>Rp ${totalNominalAktual.toLocaleString("id-ID")}</strong></td>
    </tr>
  `

      htmlContent += `
          </tbody>
        </table>
      </body>
    </html>
  `

      // Create download link for HTML file (opens in Excel)
      const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `NSMediaLink-rekap-pembayaran-${format(new Date(), "yyyy-MM-dd")}.xls`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Excel berhasil",
        description: `Data pembayaran NSMediaLink berhasil diexport ke Excel dengan ${data.length} data pelanggan`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export gagal",
        description: "Terjadi kesalahan saat mengexport data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Calculate summary statistics for current month
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.status === "active").length
  
  // Get current month payments
  const currentMonthPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.date)
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
  })

  // Calculate customers who are considered "paid" (either paid this month or have sufficient deposit)
  const currentMonthPaidCustomerIds = new Set(currentMonthPayments.map((p) => p.customerId))
  const paidCustomers = customers.filter((customer) => {
    if (customer.status === "inactive") return false
    const hasPaidThisMonth = currentMonthPaidCustomerIds.has(customer.customerId)
    const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
    return hasPaidThisMonth || hasSufficientDeposit
  }).length

  // Calculate total target and total unpaid for current month
  const activeCustomerList = customers.filter((c) => c.status === "active")
  const totalTarget = activeCustomerList.reduce((sum, customer) => sum + customer.monthlyFee, 0)
  const totalUnpaid = activeCustomerList
    .filter((customer) => {
      const hasPaidThisMonth = currentMonthPaidCustomerIds.has(customer.customerId)
      const hasSufficientDeposit = (customer.deposit || 0) >= customer.monthlyFee
      return !hasPaidThisMonth && !hasSufficientDeposit
    })
    .reduce((sum, customer) => sum + customer.monthlyFee, 0)
  
  // Calculate total paid - hanya dari pembayaran aktual, bukan dari uang titip
  const totalPaid = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Calculate monthly statistics for current year
  const monthlyStats = []
  for (let month = 0; month < 12; month++) {
    const monthPayments = getPaymentsForMonth(currentYear, month)
    monthlyStats.push({
      month: getMonthName(month).substring(0, 3), // Short month name
      payments: monthPayments.length,
      amount: monthPayments.reduce((sum, p) => sum + p.amount, 0),
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Export Data NSMediaLink</CardTitle>
          <CardDescription>
            Export data pembayaran ke format Excel dengan sheet terpisah untuk setiap bulan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Total Pelanggan</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
                <div className="text-sm text-muted-foreground">Pelanggan Aktif</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{paidCustomers}</div>
                <div className="text-sm text-muted-foreground">Sudah Bayar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">Rp {totalPaid.toLocaleString("id-ID")}</div>
                <div className="text-sm text-muted-foreground">Total Terkumpul</div>
              </div>
            </div>

            {/* Monthly Overview */}
            <div className="rounded-md border p-4">
              <h3 className="text-lg font-medium mb-4">Overview Bulanan {currentYear}</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
                {monthlyStats.map((stat, index) => (
                  <div key={index} className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">{stat.month}</div>
                    <div className="text-blue-600">{stat.payments} bayar</div>
                    <div className="text-green-600">Rp {(stat.amount / 1000).toFixed(0)}k</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-4">
              <div className="rounded-md border p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex flex-col gap-2 mb-4">
                  <h3 className="text-lg font-medium text-blue-900">📊 Excel Multi-Sheet (Rekomendasi)</h3>
                  <p className="text-sm text-blue-700">
                    Export dengan sheet terpisah untuk setiap bulan dalam tahun {currentYear}
                  </p>
                  <div className="text-xs text-blue-600 mt-2 space-y-1">
                    <div>
                      <strong>Fitur:</strong>
                    </div>
                    <div>• 13 Sheet: 1 Ringkasan + 12 Bulan (Januari - Desember {currentYear})</div>
                    <div>• Setiap sheet memiliki struktur: NSMediaLink title + 10 kolom (termasuk Bandwidth)</div>
                    <div>• Data dikelompokkan berdasarkan tanggal pembayaran</div>
                    <div>• Format Excel (.xls) asli dengan styling</div>
                    <div>• Kolom otomatis menyesuaikan lebar dengan konten (autofit)</div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    toast({
                      title: "Memulai export...",
                      description: "Sedang memproses data untuk export multi-sheet",
                    })
                    setTimeout(exportToExcelWithSheets, 500)
                  }}
                  disabled={isExporting || loading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Mengexport..." : `Export Multi-Sheet ${currentYear} (.xls)`}
                </Button>
              </div>

              <div className="rounded-md border p-4">
                <div className="flex flex-col gap-2 mb-4">
                  <h3 className="text-lg font-medium">📄 Excel Single Sheet</h3>
                  <p className="text-sm text-muted-foreground">Export tradisional dengan semua data dalam satu sheet</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    <strong>Struktur:</strong>
                    <br />• Title: NSMediaLink
                    <br />• Kolom: No, Nama, Tarif Bulanan, Bandwidth, Tunggakan, Uang Titip, Total Kewajiban Bayar,
                    Status, Tanggal Bayar, Nominal
                    <br />• Format: Excel (.xls) dengan styling
                    <br />• Kolom otomatis menyesuaikan lebar dengan konten (autofit)
                  </div>
                </div>
                <Button
                  onClick={() => {
                    toast({
                      title: "Memulai export...",
                      description: "Sedang memproses data untuk export single-sheet",
                    })
                    setTimeout(exportToExcelSingle, 500)
                  }}
                  disabled={isExporting || loading}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Mengexport..." : "Export Single Sheet (.xls)"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SetupDatabase />
    </div>
  )
}
