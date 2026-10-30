# S2027 — Reminder → History Round-Trip Audit

## Tujuan

Memastikan aksi `Riwayat` dari Reminder kembali ke history yang masih berada pada:

- vehicle yang sama;
- service component yang sama;
- salah satu session/history yang valid untuk component tersebut;
- tanpa mengharuskan history berasal dari session Reminder yang sama;
- tanpa membuat history baru atau menduplikasi row.

## Temuan arsitektur

S2016/S2019 sudah menyediakan navigasi `openHistoryFromReminder(categoryId, componentId)` dan S2019 mempersempit target berdasarkan `vehicleId + component identity`, bukan session.

S2027 tidak mengganti navigasi tersebut. S2027 menambahkan read-only audit/projection untuk memverifikasi round-trip terhadap persisted `D.servisLogs`.

## Kontrak yang diaudit

`Reminder(componentId, vehicleId)` → `History(historyId, componentId, vehicleId)`

Valid jika:

1. component identity tetap sama;
2. vehicle scope tetap sama;
3. history target merupakan row yang benar-benar memiliki component tersebut;
4. target boleh berasal dari session berbeda;
5. legacy row tetap dapat dipetakan melalui resolver/component projection;
6. ketika tidak ada history, UI tidak membuat row baru;
7. `D.servisLogs` tidak berubah.

## Multi-checklist

Untuk satu session yang memiliki beberapa component, kandidat history tetap diperiksa per component. S2027 tidak menggunakan `checklist[0]` sebagai target.

## Legacy

Legacy history tanpa checklist/serviceComponentId modern dapat tetap diaudit jika S2019 `componentsOf()` dapat memproyeksikan identity legacy/canonical.

## Persistence safety

S2027 hanya membaca `D.servisLogs` dan dapat menerima adapter navigasi untuk pengujian. Audit membandingkan snapshot sebelum/sesudah untuk memastikan tidak ada mutasi history.

Tidak ada perubahan schema, finance, evidence, reminder SOT, import/export, atau service history persistence.
