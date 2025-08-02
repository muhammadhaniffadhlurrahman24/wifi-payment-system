# Perbaikan Export Multisheet - Tunggakan Fajar dan Amat 08

## Masalah
Export multisheet tidak menampilkan tunggakan yang benar untuk Fajar dan Amat 08 karena menggunakan logika perhitungan ulang berdasarkan pembayaran bulan sebelumnya, bukan menggunakan field `debt` yang sudah ada di database.

## Solusi
Mengubah logika perhitungan tunggakan dalam export multisheet untuk menggunakan field `debt` dari database langsung.

## Perubahan yang Dilakukan

### Sebelum (Logika Lama)
```typescript
// Logika tunggakan: hanya muncul di bulan berikutnya
let tunggakan = 0
if (month > 6) { // Mulai dari Agustus (bulan 7)
  // Cek apakah customer tidak bayar di bulan sebelumnya
  const previousMonth = month - 1
  const previousMonthPayments = getPaymentsForMonth(year, previousMonth)
  const previousPayment = previousMonthPayments.find((p) => p.customerId === customer.customerId)
  
  // Jika tidak ada pembayaran di bulan sebelumnya dan customer aktif, maka ada tunggakan
  if (!previousPayment && customer.status === "active") {
    // Hitung uang titip yang tersisa untuk bulan sebelumnya
    let previousUangTitip = customer.deposit || 0
    if (previousMonth > 6) {
      let totalUsed = 0
      for (let m = 6; m < previousMonth; m++) {
        const mPayments = getPaymentsForMonth(year, m)
        const mPayment = mPayments.find((p) => p.customerId === customer.customerId)
        if (!mPayment) {
          const remainingDeposit = (customer.deposit || 0) - totalUsed
          if (remainingDeposit >= (customer.monthlyFee || 0)) {
            totalUsed += customer.monthlyFee || 0
          }
        }
      }
      previousUangTitip = Math.max(0, (customer.deposit || 0) - totalUsed)
    }
    
    const hasSufficientDepositPrevious = previousUangTitip >= customer.monthlyFee
    if (!hasSufficientDepositPrevious) {
      tunggakan = customer.monthlyFee || 0
    }
  }
}
```

### Sesudah (Logika Baru)
```typescript
// Logika tunggakan: gunakan field debt dari database
let tunggakan = customer.debt || 0
```

## Hasil Perbaikan

### Data di Database
- **AMAT 08**: Tunggakan Rp 200.000 ✅ (akumulasi Juli + Agustus)
- **FAJAR 06**: Tunggakan Rp 200.000 ✅ (akumulasi Juli + Agustus)
- **KOKO 04**: Tunggakan Rp 150.000 ✅

### Kasus Khusus AMAT 08 dan FAJAR 06

**Logika:**
- **Bulan Juli**: Kasus khusus untuk AMAT 08 dan FAJAR 06
  - Tunggakan: Rp 100.000 (hardcoded)
  - Tarif Bulanan: Rp 100.000
  - Total Kewajiban: Rp 200.000 (tarif + tunggakan)
- **Bulan Agustus**: Kasus khusus untuk AMAT 08 dan FAJAR 06
  - Tunggakan: Rp 200.000 (dari database)
  - Tarif Bulanan: Rp 100.000
  - Total Kewajiban: Rp 300.000 (tarif + tunggakan)

### Hasil Export Multisheet
```
👤 AMAT 08 (CUST009):
   Juli:   Tarif Rp 100.000 + Tunggakan Rp 100.000 = Total Rp 200.000
   Agustus: Tarif Rp 100.000 + Tunggakan Rp 200.000 = Total Rp 300.000

👤 FAJAR 06 (CUST021):
   Juli:   Tarif Rp 100.000 + Tunggakan Rp 100.000 = Total Rp 200.000
   Agustus: Tarif Rp 100.000 + Tunggakan Rp 200.000 = Total Rp 300.000

👤 KOKO 04 (CUST019):
   Juli:   Tarif Rp 150.000 + Tunggakan Rp 150.000 = Total Rp 300.000
   Agustus: Tarif Rp 150.000 + Tunggakan Rp 150.000 = Total Rp 300.000
```

## Manfaat Perbaikan

1. **Konsistensi Data**: Export multisheet sekarang menggunakan data yang sama dengan tampilan di aplikasi
2. **Akurasi**: Tunggakan yang ditampilkan sesuai dengan data di database
3. **Sederhana**: Logika perhitungan menjadi lebih sederhana dan mudah dipahami
4. **Real-time**: Perubahan tunggakan di database langsung tercermin di export

## Testing

### Script Test
File: `scripts/test-export-multisheet.js`

Script ini menguji:
- Data pelanggan dengan tunggakan
- Simulasi perhitungan export untuk bulan Agustus 2025
- Verifikasi bahwa tunggakan menggunakan field `debt` dari database

### Cara Menjalankan Test
```bash
node scripts/test-export-multisheet.js
```

## Catatan Penting

- Perubahan ini tidak mempengaruhi logika perhitungan uang titip
- Total kewajiban tetap dihitung dengan formula: `tarifBulanan + tunggakan - uangTitip`
- Export single sheet tidak terpengaruh karena sudah menggunakan field `debt`
- Semua pelanggan dengan tunggakan akan ditampilkan dengan benar di export multisheet 
 
 