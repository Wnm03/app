# B11 — QoL: tombol "Buka Aset" langsung dari saran Data Health Check

## Konteks
Poin #5 dari rencana B1-B10 (QoL): saran Data Health Check yang menyebut
1 aset spesifik (orphan `investmentId` — B6/B8, & saran pairing dobel-catat
— B4) selama ini cuma teks; user harus cari manual aset yang dimaksud di
Buku Aset.

## Perubahan
**`data-health-check.js`** (satu-satunya file diubah):
1. 2 issue yang sudah menyebut 1 aset spesifik sekarang menyertakan field
   `assetId` di object issue:
   - "Aset tertaut ke Holding Investasi yang sudah dihapus" (B6/B8) → `assetId:a.id`
   - "Kemungkinan Aset & Investasi dobel-catat (belum ditautkan)" (B4) → `assetId:c.assetId`
     (sudah ada di return `_findInvestmentMigrationCandidates()`, tinggal diteruskan)
2. Blok render list di akhir `runDataHealthCheck()` (bagian yang sama yang
   isi `listEl.innerHTML`) — kalau `i.assetId` ada, tambah 1 tombol
   "📦 Buka Aset" yang reuse dispatcher `data-action="openAssetModal"
   data-args="[assetId]"` yang **sudah ada** (pola sama persis baris list
   Aset di `aset.js`). **0 dispatcher baru, 0 fungsi buka-modal baru** — cuma
   nambah 1 elemen `<button>` ber-atribut yang sudah dikenali handler lama.
   Issue lain (tanpa `assetId`) tampilannya tidak berubah sama sekali.

## Kenapa scope-nya cukup 1 file
Awalnya dikira perlu file render/UI terpisah (di luar patch B1-B10 yang
diupload) — ternyata rendering list Data Health Check ternyata ADA di
`data-health-check.js` sendiri (bagian bawah `runDataHealthCheck()`,
`listEl.innerHTML=issues.map(...)`), jadi seluruh fitur (data + tombol)
selesai di 1 file, sesuai pola "0 file baru" sesi-sesi B sebelumnya.

## Test
`tests/data-health-check-asset-action-b11.test.js` (4 test baru):
- Issue orphan investmentId → `assetId` terisi + tombol `openAssetModal` muncul di HTML.
- Issue saran dobel-catat (B4, pakai `Aset` palsu) → `assetId` terisi + tombol muncul.
- Issue TANPA `assetId` (contoh: akun tautan tidak valid) → TIDAK dapat tombol (regresi negatif).
- title/detail/level issue orphan investmentId tidak berubah (regresi B8).

Diverifikasi lokal dengan harness VM sederhana (setara `loadSource()`
project, `document.getElementById` di-stub 2 elemen palsu): 4/4 lulus.
Jalankan bareng suite lengkap project (`node --test`) untuk baseline resmi
3846 → 3850.

## Tidak diubah
- Dispatcher `data-action` global (di luar file ini) — sudah ada &
  digunakan tanpa perubahan.
- Issue lain yang tidak menyebut 1 aset spesifik (misal ID transaksi
  duplikat, barang wishlist duplikat) — sengaja tidak dikasih tombol,
  karena tidak merujuk ke 1 record tunggal yang bisa dibuka.
