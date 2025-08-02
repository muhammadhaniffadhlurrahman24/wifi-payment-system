# Export Excel dengan Suspension

## Perubahan Export Excel

Export Excel telah dimodifikasi untuk mengikuti logika suspension yang baru - **berlaku langsung di bulan yang dipilih**.

## Logika Baru di Export Excel

### 1. Status Pelanggan
- **Pelanggan Aktif**: Status "Sudah Bayar", "Belum Bayar", atau "Tidak Berlangganan"
- **Pelanggan Ditangguhkan**: Status **"Ditangguhkan"**

### 2. Perhitungan Tagihan
- **Pelanggan Aktif**: Tagihan = Tarif Bulanan + Tunggakan - Uang Titip
- **Pelanggan Ditangguhkan**: Tagihan = Tunggakan - Uang Titip (tanpa tagihan bulanan)

### 3. Visual Styling
- **Pelanggan Aktif**: Background putih
- **Pelanggan Ditangguhkan**: Background kuning muda (#FFF2CC) dengan font oranye (#FF8C00)
- **Pelanggan dengan Tunggakan**: Background kuning (#FFFF99)

## File yang Dimodifikasi

### `components/export-data.tsx`

#### Export Multisheet (13 Sheet)
#### Export Single Sheet (1 Sheet)

**Perubahan pada `exportToExcelSingle()`:**

1. **Helper Function untuk Cek Suspension**
```typescript
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
```

2. **Logika Status dan Tagihan**
```typescript
// Cek apakah customer ditangguhkan di bulan ini
const isSuspended = isCustomerSuspended(customer, currentMonth, currentYear)

if (customer.status === "inactive") {
  status = "Tidak Berlangganan"
} else if (isSuspended) {
  // Customer ditangguhkan di bulan ini
  status = "Ditangguhkan"
  tanggalBayar = ""
} else {
  // Logika normal untuk pelanggan aktif
}

// Jika customer ditangguhkan, tidak ada tagihan bulanan
const effectiveTarifBulanan = isSuspended ? 0 : tarifBulanan
const totalKewajiban = Math.max(0, effectiveTarifBulanan + tunggakan - uangTitip)
```

3. **Styling untuk Suspended Customers**
```css
.suspended-row td { background-color: #FFF2CC; color: #FF8C00; } /* Orange for suspended customers */
```

4. **Row Class Logic**
```typescript
let rowClass = ""
if (row["Status"] === "Tidak Berlangganan") {
  rowClass = "inactive-row"
} else if (row["IsSuspended"]) {
  rowClass = "suspended-row"
} else if (row["Tunggakan"] !== "Rp 0") {
  rowClass = "debt-row"
}
```

#### Export Multisheet (13 Sheet)

**Perubahan pada `createMonthSheetData()`:**

1. **Filter Pelanggan Berdasarkan Tanggal Dibuat**
```typescript
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
```

2. **Import Suspension Data**
```typescript
const { customers, payments, suspensions, loading } = usePayment()
```

#### 2. Helper Function untuk Cek Suspension
```typescript
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
```

#### 3. Logika Status dan Tagihan
```typescript
// Cek apakah customer ditangguhkan di bulan ini
const isSuspended = isCustomerSuspended(customer, month, year)

if (customer.status === "inactive") {
  status = "Tidak Berlangganan"
} else if (isSuspended) {
  // Customer ditangguhkan di bulan ini
  status = "Ditangguhkan"
  tanggalBayar = ""
  nominal = 0
} else {
  // Logika normal untuk pelanggan aktif
}

// Jika customer ditangguhkan, tidak ada tagihan bulanan
const effectiveTarifBulanan = isSuspended ? 0 : tarifBulanan
const totalKewajiban = Math.max(0, effectiveTarifBulanan + tunggakan - uangTitip)
```

#### 4. Styling untuk Suspended Customers
```typescript
// Determine row style based on customer status and debt
let rowStyle = "DataStyle"
if (customer.status === "inactive") {
  rowStyle = "InactiveStyle"
} else if (isSuspended) {
  rowStyle = "SuspendedStyle"
} else if (tunggakan > 0) {
  rowStyle = "DebtStyle"
}
```

#### 5. Excel Styles
```xml
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
```

## Contoh Hasil Export

### INDRA 12 ditangguhkan di bulan Agustus:

**Bulan Agustus:**
- **Status**: "Ditangguhkan"
- **Tarif Bulanan**: Rp 100.000 (tidak berlaku)
- **Tunggakan**: Rp 0
- **Total Kewajiban**: Rp 0 (hanya tunggakan)
- **Styling**: Background kuning muda, font oranye

**Bulan September:**
- **Status**: "Belum Bayar" (kembali normal)
- **Tarif Bulanan**: Rp 100.000
- **Tunggakan**: Rp 0
- **Total Kewajiban**: Rp 100.000 (tagihan bulanan + tunggakan)
- **Styling**: Background putih

### TESTER ANAJY (Pelanggan Baru - Ditambahkan Agustus 2025):

**Bulan Juli 2025:**
- **Status**: Tidak muncul di sheet (belum ada di sistem)

**Bulan Agustus 2025:**
- **Status**: "Belum Bayar" (pelanggan baru)
- **Tarif Bulanan**: Rp 100.000
- **Tunggakan**: Rp 0 (pelanggan baru)
- **Total Kewajiban**: Rp 100.000
- **Styling**: Background putih

**Bulan September 2025:**
- **Status**: "Belum Bayar" (normal)
- **Tarif Bulanan**: Rp 100.000
- **Tunggakan**: Rp 0
- **Total Kewajiban**: Rp 100.000
- **Styling**: Background putih

## Manfaat Perubahan

1. **Konsistensi**: Export Excel mengikuti logika suspension yang sama dengan aplikasi
2. **Visual Clarity**: Pelanggan yang ditangguhkan mudah dikenali dengan styling khusus
3. **Akurasi**: Perhitungan tagihan yang benar untuk pelanggan yang ditangguhkan
4. **Transparansi**: Status "Ditangguhkan" jelas ditampilkan di Excel
5. **Historical Accuracy**: Pelanggan hanya muncul di sheet bulan-bulan setelah mereka ditambahkan
6. **Fair Billing**: Tidak ada tagihan retroaktif untuk pelanggan yang belum ada di sistem

## Testing

Sistem telah diuji dengan script `test-export-suspension.js`, `test-export-single-suspension.js`, dan `test-multisheet-customer-filter.js` yang menunjukkan:

### Export Multisheet:
- INDRA 12 yang ditangguhkan di Agustus 2025 memiliki status "Ditangguhkan"
- Tagihan Agustus untuk INDRA 12 adalah Rp 0 (hanya tunggakan)
- Styling khusus untuk pelanggan yang ditangguhkan
- **TESTER ANAJY tidak muncul di sheet Juli 2025** (belum ada di sistem)
- **TESTER ANAJY muncul di sheet Agustus 2025** (sudah ditambahkan)

### Export Single Sheet:
- INDRA 12 yang ditangguhkan di Agustus 2025 memiliki status "Ditangguhkan"
- Tarif Bulanan INDRA 12 adalah Rp 0 (tidak berlaku)
- Total Kewajiban INDRA 12 adalah Rp 0 (hanya tunggakan)
- Background kuning muda dengan font oranye untuk pelanggan yang ditangguhkan

## Catatan Penting

- Suspension **tidak menghapus tunggakan** yang sudah ada
- Suspension hanya **menghentikan tagihan bulanan** di periode yang ditentukan
- Setelah periode suspension selesai, pelanggan kembali mendapat tagihan bulanan normal
- Export Excel sekarang menampilkan status dan tagihan yang akurat sesuai logika suspension 