# AUDIT S2019 — Service Session → Component Context

## Temuan utama

S2018 sudah menangani session yang terdiri dari beberapa history row, tetapi masih ada gap penting: satu `D.servisLogs` row dapat memiliki `checklist[]` berisi beberapa komponen. Resolver lama mengambil komponen checklist pertama ketika `serviceComponentId` parent kosong.

Akibatnya komponen kedua/ketiga dapat mengalami:

- Reminder → Riwayat tidak menemukan row yang benar;
- Riwayat → Reminder membuka reminder komponen pertama;
- Audit terlihat benar di level sesi tetapi tidak menjelaskan komponen fokus.

## Keputusan arsitektur

Tidak memecah atau menulis ulang histori lama.

Model navigasi:

```text
sessionId/serviceJobId = parent context
serviceComponentId    = component identity
checklist.itemId      = component identity fallback jika row parent belum memiliki ID
historyId              = evidence record identity
```

## Implementasi

### 1. `componentsOf(log)`

Membaca semua `checklist[]`, bukan hanya item pertama.

Setiap item diproyeksikan menjadi:

- canonical `serviceComponentId` bila tersedia;
- `masterCategoryId`;
- nama komponen;
- action type;
- condition result/note;
- `historyId`;
- `sessionId`;
- vehicle scope.

### 2. `sessionComponents(log)`

Menggabungkan seluruh component projection dari seluruh row dalam session yang sama dan kendaraan yang sama, lalu dedupe berdasarkan canonical component identity.

### 3. Component-focused navigation

Tersedia tiga action:

- `openServiceComponentHistoryS2019()`
- `openServiceComponentReminderS2019()`
- `openServiceComponentAuditS2019()`

Ketiganya menggunakan `historyId + componentId` yang sama.

### 4. Reminder → History hardening

`openHistoryFromReminder()` diberi wrapper S2019 sehingga pencarian target tidak hanya menggunakan `resolveLogServiceComponentId()` yang sebelumnya hanya mengembalikan checklist pertama.

Sekarang target dapat ditemukan bila component berada di checklist index 0, 1, 2, dst.

### 5. Reminder focus

Saat membuka Reminder dari komponen, sebuah proxy read-only digunakan hanya selama render agar Reminder membaca component yang dipilih. Data `D.servisLogs` dikembalikan ke object aslinya setelah render.

### 6. Audit focus

Audit mempertahankan renderer/package existing, lalu menambahkan evidence card untuk component fokus. Tidak ada perubahan pada source history.

## Contoh

Satu row:

```text
history H1
└── checklist
    ├── filter-udara
    ├── v-belt-cvt
    └── busi
```

Jika user memilih `v-belt-cvt`:

```text
H1
 └── 🎯 v-belt-cvt
       ├── 📋 Riwayat v-belt-cvt
       ├── 🔔 Pengingat v-belt-cvt
       └── 🔎 Audit v-belt-cvt
```

Filter Udara dan Busi tetap hanya context sibling, bukan target.

## Regression evidence

PASS:

- one-row multi-checklist expansion;
- multi-row same-session aggregation;
- vehicle isolation;
- component isolation;
- component #2 Reminder → History;
- component-specific Reminder projection;
- component-specific Audit context;
- S2014;
- S2015;
- S2016;
- S2017;
- S2018;
- HTML wiring index/app_production;
- service-worker cache wiring;
- source syntax;
- production bundle syntax.

## Risiko yang sengaja tidak diambil

- tidak melakukan automatic backfill `serviceComponentId` pada histori;
- tidak mengubah `checklist[]`;
- tidak menghapus duplicate history;
- tidak mengubah finance/stock;
- tidak membuat Maintenance Package menjadi identity komponen.

## Rekomendasi lanjutan

Jika nanti diperlukan audit yang lebih kuat, langkah berikutnya sebaiknya berupa **Service Evidence Identity** terpisah (`historyId + checklistItemId`) untuk foto, part, biaya, dan condition. Itu baru diperlukan jika satu komponen dalam satu sesi membutuhkan bukti finansial/foto yang benar-benar berbeda. S2019 belum membuat schema baru untuk kebutuhan tersebut.
