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
  const { customers, payments, loading } = usePayment()
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

  // Helper function to calculate remaining deposit after applying to previous months
  const calculateRemainingDeposit = (customer: any, targetYear: number, targetMonth: number) => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Jika target bulan adalah bulan saat ini atau bulan sebelumnya, gunakan deposit saat ini
    if (targetYear < currentYear || (targetYear === currentYear && targetMonth <= currentMonth)) {
      return customer.deposit || 0
    }

    // Hitung berapa bulan ke depan dari bulan saat ini
    const monthsAhead = (targetYear - currentYear) * 12 + (targetMonth - currentMonth)

    // Mulai dengan deposit saat ini
    let remainingDeposit = customer.deposit || 0

    // Kurangi deposit untuk setiap bulan antara bulan saat ini dan target bulan
    for (let i = 1; i <= monthsAhead; i++) {
      // Jika deposit masih cukup untuk menutupi biaya bulanan
      if (remainingDeposit >= customer.monthlyFee) {
        remainingDeposit -= customer.monthlyFee
      } else {
        // Deposit tidak cukup untuk bulan ini
        remainingDeposit = 0
        break
      }
    }

    return remainingDeposit
  }

  // Helper function to create sheet data for a specific month
  const createMonthSheetData = (year: number, month: number) => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    const monthPayments = getPaymentsForMonth(year, month)
    const paidCustomerIds = new Set(monthPayments.map((p) => p.customerId))

    return customers.map((customer, index) => {
      const payment = monthPayments.find((p) => p.customerId === customer.customerId)

      // Tentukan apakah ini bulan saat ini, bulan depan, atau bulan lainnya
      const isCurrentMonth = year === currentYear && month === currentMonth
      const isNextMonth =
        (year === currentYear && month === currentMonth + 1) ||
        (year === currentYear + 1 && currentMonth === 11 && month === 0)
      const isFutureMonth = year > currentYear || (year === currentYear && month > currentMonth)

      let status = ""
      let tanggalBayar = ""
      let nominal = 0

      // Hitung uang titip yang tersisa untuk bulan ini
      let uangTitip = 0

      if (isCurrentMonth) {
        // Untuk bulan saat ini, gunakan nilai deposit saat ini
        uangTitip = customer.deposit || 0
      } else if (isFutureMonth) {
        // Untuk bulan mendatang, hitung sisa deposit setelah digunakan untuk bulan-bulan sebelumnya
        uangTitip = calculateRemainingDeposit(customer, year, month)
      }

      if (customer.status === "inactive") {
        status = "Tidak Berlangganan"
      } else {
        // Cek apakah sudah ada pembayaran aktual
        const hasActualPayment = payment !== undefined

        if (hasActualPayment) {
          // Ada pembayaran aktual
          status = "Sudah Bayar"
          tanggalBayar = format(new Date(payment.date), "dd/MM/yyyy")
          nominal = payment.amount
        } else if (isFutureMonth && uangTitip >= customer.monthlyFee) {
          // Bulan mendatang dan ada uang titip yang cukup
          status = "Sudah Bayar (Uang Titip)"
          tanggalBayar = "Auto (Uang Titip)"
          nominal = customer.monthlyFee
        } else {
          // Belum bayar
          status = "Belum Bayar"
          tanggalBayar = ""
          nominal = 0
        }
      }

      // Hitung Total Kewajiban Bayar
      const tunggakan = customer.debt || 0
      const tarifBulanan = customer.monthlyFee || 0
      const totalKewajiban = Math.max(0, tarifBulanan + tunggakan - uangTitip)

      // Determine row style based on customer status and debt
      let rowStyle = "DataStyle"
      if (customer.status === "inactive") {
        rowStyle = "InactiveStyle" // Red background for inactive customers
      } else if (tunggakan > 0) {
        rowStyle = "DebtStyle" // Yellow background for customers with debt
      }

      return {
        no: index + 1,
        nama: customer.name,
        tarif: customer.monthlyFee,
        bandwidth: customer.bandwidth || 4, // Default to 4 if not set
        tunggakan: tunggakan,
        uangTitip: uangTitip,
        totalKewajiban: totalKewajiban,
        status: status,
        tanggal: tanggalBayar,
        nominal: nominal,
        rowStyle: rowStyle, // Add row style information
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
 </Styles>
`

      // Create summary worksheet
      const summaryData = []
      for (let month = 0; month < 12; month++) {
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
  <Row ss:Height="25">
   <Cell ss:MergeAcross="9" ss:StyleID="TitleStyle">
    <Data ss:Type="String">NSMediaLink</Data>
   </Cell>
  </Row>
  <Row ss:Height="25">
   <Cell ss:MergeAcross="9" ss:StyleID="TitleStyle">
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
   <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Nominal</Data></Cell>
  </Row>`

        monthData.forEach((row) => {
          const stylePrefix = row.rowStyle
          const numberStylePrefix =
            row.rowStyle === "DataStyle"
              ? "NumberStyle"
              : row.rowStyle === "DebtStyle"
                ? "NumberDebtStyle"
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
      <Cell ss:StyleID="${numberStylePrefix}"><Data ss:Type="Number">${row.nominal}</Data></Cell>
    </Row>`
        })

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

        // Cek apakah ada pembayaran untuk bulan depan
        const nextMonthPayment = payments.find((p) => {
          const paymentDate = new Date(p.date)
          return (
            p.customerId === customer.customerId &&
            paymentDate.getMonth() === nextMonth &&
            paymentDate.getFullYear() === nextMonthYear
          )
        })

        let status = ""
        let tanggalBayar = ""
        let nominal = 0
        const uangTitip = customer.deposit || 0
        let nextMonthStatus = ""

        // Hitung uang titip untuk bulan depan
        const nextMonthDeposit = uangTitip >= customer.monthlyFee ? uangTitip - customer.monthlyFee : 0

        // Hitung uang titip untuk bulan setelah bulan depan
        const twoMonthsAheadDeposit =
          nextMonthDeposit >= customer.monthlyFee ? nextMonthDeposit - customer.monthlyFee : 0

        if (customer.status === "inactive") {
          status = "Tidak Berlangganan"
          nextMonthStatus = "Tidak Berlangganan"
        } else {
          // Status bulan ini
          if (payment) {
            status = "Sudah Bayar"
            tanggalBayar = format(new Date(payment.date), "dd/MM/yyyy")
            nominal = payment.amount
          } else {
            status = "Belum Bayar"
          }

          // Status bulan depan
          if (nextMonthPayment) {
            nextMonthStatus = "Sudah Bayar"
          } else if (uangTitip >= customer.monthlyFee) {
            nextMonthStatus = "Sudah Bayar (Uang Titip)"
          } else {
            nextMonthStatus = "Belum Bayar"
          }
        }

        // Hitung Total Kewajiban Bayar
        const tunggakan = customer.debt || 0
        const tarifBulanan = customer.monthlyFee || 0
        const totalKewajiban = Math.max(0, tarifBulanan + tunggakan - uangTitip)

        return {
          No: index + 1,
          Nama: customer.name,
          "Tarif Bulanan": customer.monthlyFee > 0 ? `Rp ${customer.monthlyFee.toLocaleString("id-ID")}` : "Rp 0",
          Bandwidth: `${customer.bandwidth || 4} Mbps`,
          Tunggakan: customer.debt > 0 ? `Rp ${customer.debt.toLocaleString("id-ID")}` : "Rp 0",
          "Uang Titip": uangTitip > 0 ? `Rp ${uangTitip.toLocaleString("id-ID")}` : "Rp 0",
          "Total Kewajiban Bayar": totalKewajiban > 0 ? `Rp ${totalKewajiban.toLocaleString("id-ID")}` : "Rp 0",
          "Status Bulan Ini": status,
          "Status Bulan Depan": nextMonthStatus,
          "Status 2 Bulan Depan":
            customer.status === "inactive"
              ? "Tidak Berlangganan"
              : twoMonthsAheadDeposit >= customer.monthlyFee
                ? "Sudah Bayar (Uang Titip)"
                : "Belum Bayar",
          "Tanggal Bayar": tanggalBayar || "-",
          Nominal: payment ? `Rp ${payment.amount.toLocaleString("id-ID")}` : "Rp 0",
        }
      })

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
        .col-nominal { width: 100px; }
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
            <th class="col-status">Status Bulan Ini</th>
            <th class="col-status">Status Bulan Depan</th>
            <th class="col-status">Status 2 Bulan Depan</th>
            <th class="col-tanggal">Tanggal Bayar</th>
            <th class="currency col-nominal">Nominal</th>
          </tr>
        </thead>
        <tbody>
`

      data.forEach((row) => {
        // Determine row class based on customer status and debt
        let rowClass = ""
        if (row["Status Bulan Ini"] === "Tidak Berlangganan") {
          rowClass = "inactive-row"
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
      <td>${row["Status Bulan Ini"]}</td>
      <td>${row["Status Bulan Depan"]}</td>
      <td>${row["Status 2 Bulan Depan"]}</td>
      <td>${row["Tanggal Bayar"]}</td>
      <td class="currency">${row.Nominal}</td>
    </tr>
  `
      })

      htmlContent += `
          </tbody>
        </table>
        
        <script>
          // Script untuk memastikan Excel melakukan autofit pada kolom
          window.onload = function() {
            try {
              // Mencoba mengakses Excel ActiveX object (hanya bekerja di IE dengan Excel terinstall)
              var excel = new ActiveXObject("Excel.Application");
              excel.visible = true;
              var book = excel.Workbooks.Add();
              excel.DisplayAlerts = false;
              
              // Autofit semua kolom
              var sheet = book.ActiveSheet;
              sheet.Columns.AutoFit();
            } catch(e) {
              // Jika gagal, tidak perlu melakukan apa-apa
              // Excel biasanya akan melakukan autofit secara otomatis
            }
          }
        </script>
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

  // Calculate summary statistics
  const currentYear = new Date().getFullYear()
  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.status === "active").length
  const paidCustomers = customers.filter((c) => payments.some((p) => p.customerId === c.customerId)).length
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)

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
                    Status Bulan Ini, Status Bulan Depan, Status 2 Bulan Depan, Tanggal Bayar, Nominal
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
