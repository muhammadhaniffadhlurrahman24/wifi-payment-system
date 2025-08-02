# New Customer Billing

## Deskripsi

Fitur ini memastikan bahwa pelanggan baru **tidak langsung mendapat tagihan bulanan** saat ditambahkan. Tagihan bulanan hanya akan diakumulasikan melalui debt accumulation script untuk pelanggan yang sudah ada sebelum bulan saat ini.

## Bagaimana Cara Kerjanya

### 1. Penambahan Pelanggan Baru
- **Pelanggan Baru**: Debt diinisialisasi ke **Rp 0**
- **Pelanggan Aktif**: Status "active" tetapi tidak ada debt
- **Pelanggan Tidak Aktif**: Status "inactive" dan debt Rp 0

### 2. Debt Accumulation
- **Pelanggan Baru di Bulan Ini**: **SKIP** - tidak mendapat debt accumulation
- **Pelanggan Lama**: Normal debt accumulation jika belum bayar
- **Pelanggan Ditangguhkan**: **SKIP** - tidak mendapat debt accumulation

### 3. Tagihan Pertama
- Pelanggan baru akan mendapat tagihan bulanan **di bulan berikutnya** (melalui debt accumulation)
- Ini memastikan pelanggan hanya membayar untuk periode yang mereka gunakan

## Implementasi

### File yang Dimodifikasi

#### 1. `app/api/customers/route.ts`
```typescript
// Pelanggan baru tidak langsung mendapat debt
// Debt akan diakumulasikan melalui debt accumulation script
const initialDebt = 0
```

#### 2. `context/payment-context.tsx`
```typescript
// Cek apakah pelanggan ditambahkan di bulan ini
const customerCreatedAt = new Date(customer.createdAt)
const customerCreatedMonth = customerCreatedAt.getMonth()
const customerCreatedYear = customerCreatedAt.getFullYear()

// Jika pelanggan ditambahkan di bulan ini, skip debt accumulation
if (customerCreatedYear === currentYear && customerCreatedMonth === currentMonth) {
  console.log(`Skipping debt accumulation for ${customer.name} - added this month`)
  continue
}
```

#### 3. `scripts/accumulate-debt.js`
```javascript
// Cek apakah pelanggan ditambahkan di bulan ini
const customerCreatedAt = new Date(customer.createdAt)
const customerCreatedMonth = customerCreatedAt.getMonth()
const customerCreatedYear = customerCreatedAt.getFullYear()

// Jika pelanggan ditambahkan di bulan ini, skip debt accumulation
if (customerCreatedYear === currentYear && customerCreatedMonth === currentMonth) {
  console.log(`Skipping debt accumulation for ${customer.name} - added this month`)
  continue
}
```

## Contoh Skenario

### Pelanggan Baru "TESTER ANAJY" (Ditambahkan Agustus 2025)

**Bulan Agustus 2025:**
- ✅ **Debt**: Rp 0 (tidak ada debt)
- ✅ **Status**: "active" 
- ✅ **Tagihan**: Tidak ada (pelanggan baru)
- ✅ **Debt Accumulation**: SKIP

**Bulan September 2025:**
- ⚠️ **Debt**: Rp 100.000 (jika belum bayar Agustus)
- ⚠️ **Tagihan**: Rp 100.000 (tagihan bulanan September + debt Agustus)
- ⚠️ **Debt Accumulation**: AKTIF (pelanggan sudah bukan baru)

## Testing

Sistem telah diuji dengan script test yang menunjukkan:
- ✅ Pelanggan baru "TESTER ANAJY" tidak mendapat debt accumulation
- ✅ Debt accumulation hanya berlaku untuk pelanggan lama
- ✅ Logika suspension tetap berfungsi normal

## Manfaat

1. **Fair Billing**: Pelanggan hanya membayar untuk periode yang mereka gunakan
2. **Flexibility**: Pelanggan bisa ditambahkan kapan saja tanpa tagihan retroaktif
3. **Consistency**: Logika yang konsisten antara aplikasi dan debt accumulation
4. **Transparency**: Jelas kapan pelanggan mulai mendapat tagihan bulanan

## Catatan Penting

- **Pelanggan Baru**: Tidak mendapat debt di bulan pertama
- **Pelanggan Lama**: Normal debt accumulation jika belum bayar
- **Suspension**: Tetap berfungsi normal untuk semua pelanggan
- **Export Excel**: Mengikuti logika yang sama 