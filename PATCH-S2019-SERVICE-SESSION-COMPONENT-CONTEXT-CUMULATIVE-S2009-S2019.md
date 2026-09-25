# PATCH S2019 — Service Session → Component Context (Cumulative S2009–S2019)

## Tujuan

Memperbaiki kasus satu servis memiliki beberapa checklist komponen, termasuk ketika beberapa komponen tersimpan di **satu `D.servisLogs` row**. Navigasi dari Riwayat, Pengingat, dan Audit harus selalu menunjuk komponen yang sama.

## Prinsip

```text
Service Session
   └── Component
        ├── History
        ├── Reminder
        └── Audit
```

`sessionId/serviceJobId` hanya menjadi parent/context pekerjaan. `serviceComponentId` (atau `checklist.itemId` yang berhasil di-canonicalize) menjadi identity navigasi.

## Perubahan additive S2019

### Added

- `modules/vehicle/service-history-multichecklist-s2019.js`
- `tests/service-history-multichecklist-s2019.test.js`
- `tests/service-history-multichecklist-s2019-wiring.test.js`
- `PATCH-S2019-SERVICE-SESSION-COMPONENT-CONTEXT-CUMULATIVE-S2009-S2019.md`
- `AUDIT-S2019-SERVICE-SESSION-COMPONENT-CONTEXT.md`

### Updated

- `index.html` — cache/query version 2019 + loader S2019
- `app_production.html` — cache/query version 2019 + loader S2019
- `sw.js` — cache `kw-cache-v2019` + precache S2019

Artefak S2009–S2018 tetap dipertahankan.

## Perilaku baru

1. Satu history row dengan checklist `A/B/C` diproyeksikan menjadi tiga component context.
2. Satu session dengan beberapa history row juga diproyeksikan menjadi daftar komponen unik.
3. `Riwayat → component → Pengingat` tetap component-scoped.
4. `Riwayat → component → Audit` tetap component-scoped.
5. `Pengingat → Riwayat` sekarang dapat menemukan component yang berada di posisi kedua/ketiga dst. dalam `checklist`, bukan hanya checklist pertama.
6. Audit menampilkan komponen fokus dan bukti checklist/action/condition tanpa mengubah history sumber.
7. Komponen lain dalam session tetap terlihat sebagai context, tetapi tidak menjadi fokus secara diam-diam.

## Non-destructive

Tidak ada:

- penghapusan histori;
- perubahan `sessionId/serviceJobId`;
- perubahan interval reminder;
- merge/split session otomatis;
- duplicate reminder baru;
- perubahan transaksi finance;
- migrasi paksa terhadap legacy history.

## Rekomendasi tambahan yang diimplementasikan

- **Context chip/session summary** agar user selalu tahu kendaraan + sesi + komponen fokus.
- **Tiga action per component** (`Riwayat`, `Pengingat`, `Audit`) untuk mencegah ambiguity.
- **Focus marker 🎯** pada komponen aktif.
- **Read-only evidence** pada Audit: action, condition, category, canonical component ID.
- **Vehicle isolation** saat membentuk session context.
- **Canonical resolver fallback** tetap melalui SOT/catalog yang sudah ada.

## Batasan yang sengaja dipertahankan

S2019 tidak membuat SOT baru. Ia hanya menjadi navigation/read-model layer di atas SOT dan data histori yang sudah ada.
