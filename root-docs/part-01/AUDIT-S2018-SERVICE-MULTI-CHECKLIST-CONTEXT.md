# AUDIT S2018 — Multi-Checklist Service: History / Reminder / Audit Context

## Temuan inti

Satu sesi servis dapat mencentang beberapa komponen sekaligus. Data persistence yang sudah ada memang memecah checklist menjadi beberapa `D.servisLogs`, tetapi semua row tetap membawa `sessionId/serviceJobId` yang sama. Artinya:

- **session** adalah parent/context pekerjaan;
- **serviceComponentId** adalah identity komponen;
- **reminder** harus tetap component-scoped;
- **history** harus dapat menunjukkan komponen target sekaligus komponen lain dalam sesi;
- **audit** harus menjelaskan komponen mana yang sedang diaudit, tanpa mencampurkan reminder komponen lain.

S2018 tidak membuat SOT baru untuk kategori/komponen dan tidak mengubah histori lama.

## Implementasi

### 1. Canonical component context

`modules/vehicle/service-history-context-s2018.js` menyediakan projection read-only:

- `componentId(log)` — ID canonical, checklist fallback, lalu resolver SOT;
- `identity(log)` — resolve kategori + komponen melalui `ServiceTaxonomySOT`;
- `sessionRows(log)` — semua row dalam sesi yang sama **dan kendaraan yang sama**;
- `componentsForSession(log)` — daftar komponen unik dalam satu sesi;
- `reminderForComponent(log)` — reminder hanya untuk komponen fokus;
- `auditForLog(log)` — audit component + session context + reminder projection.

### 2. UI History

Tab Riwayat sekarang mendapatkan card `🧭 Konteks Riwayat` di bagian atas:

- kendaraan;
- ID sesi singkat;
- jumlah komponen dalam sesi;
- setiap komponen + kategori canonical;
- status Pengingat untuk komponen tersebut;
- tombol `🔔 Pengingat` dan `🔎 Audit` per komponen.

Jika sesi berisi:

- Filter Udara
- V-Belt CVT
- Busi

maka saat user membuka riwayat Filter Udara, UI tetap menunjukkan ketiganya sebagai bagian dari sesi, tetapi daftar riwayat tetap mengikuti filter Filter Udara.

### 3. UI Audit

Tab Audit mendapatkan card konteks yang sama, lalu integrity block:

- komponen fokus;
- canonical category/component ID;
- jumlah komponen sesi;
- reminder aktif/tidak aktif untuk komponen fokus;
- mismatch canonical yang dapat dideteksi.

Audit tetap read-only terhadap histori sumber.

### 4. Deep navigation

Dari konteks sesi:

`komponen → Pengingat` membuka Reminder untuk komponen tersebut.

`komponen → Audit` membuka Audit untuk komponen tersebut.

Context tidak diganti menjadi `sessionId` sebagai filter reminder. Reminder tetap mengikuti component identity.

## Aturan multi-checklist

Untuk satu sesi `S` dengan komponen `A`, `B`, `C`:

```text
Session S
├─ History A → component A
│  ├─ Reminder A
│  └─ Audit A
├─ History B → component B
│  ├─ Reminder B
│  └─ Audit B
└─ History C → component C
   ├─ Reminder C
   └─ Audit C
```

Tidak boleh terjadi:

```text
Audit A → Reminder B
History A → Audit B
```

karena semua navigasi menggunakan `serviceComponentId` row yang dipilih.

## Non-destructive

- tidak menghapus `D.servisLogs`;
- tidak mengubah `sessionId`;
- tidak mengubah `serviceComponentId`;
- tidak mengubah interval reminder;
- tidak membuat duplicate reminder;
- tidak menggabungkan sesi secara otomatis;
- tidak mengubah transaksi finance.

## Validasi

PASS:

- satu sesi dengan 2+ komponen tetap satu context;
- komponen sesi tidak bocor antar kendaraan;
- audit fokus mempertahankan `serviceComponentId` yang dipilih;
- reminder projection hanya membaca komponen fokus;
- navigasi Pengingat/Audit menggunakan row component yang sama;
- S2014 regression;
- S2015 regression;
- S2016 Reminder → History regression;
- S2017 taxonomy SOT regression;
- syntax source + production bundle;
- cache/version wiring 2018.

## Kesimpulan

S2018 memperjelas relasi **Service Session → Component → Reminder/History/Audit** tanpa memindahkan ownership data. Sesi tetap menjadi konteks pekerjaan, sedangkan `serviceComponentId` tetap menjadi identity yang menentukan reminder, history filter, dan audit.
