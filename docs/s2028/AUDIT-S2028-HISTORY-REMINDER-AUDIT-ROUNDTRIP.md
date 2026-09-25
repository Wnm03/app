# S2028 — History → Reminder → Audit Round-Trip Integrity

## Scope

Audit read-only untuk memastikan context `vehicle → history → session → component` tetap konsisten ketika user berpindah dari History ke Reminder lalu ke Audit.

## Kontrak

- History context tetap menjadi parent context.
- `serviceComponentId` / checklist identity tetap menjadi navigation identity.
- Vehicle scope tidak boleh berpindah.
- Component focus tidak boleh berubah menjadi component lain.
- Session ID tetap dicatat sebagai provenance context; perubahan session hanya valid jika target history memang berbeda.
- Legacy history boleh diaudit melalui resolver S2019 tanpa backfill.
- Tidak membuat history/reminder baru.
- Tidak mengubah `D.servisLogs`, finance, atau evidence.

## Checks

1. History ID tersedia.
2. Component tersedia pada history.
3. Vehicle scope sama.
4. Component focus sama.
5. History target sama.
6. Legacy history tetap dapat dipetakan.
7. Multi-checklist tidak memakai `checklist[0]` sebagai focus otomatis.
8. Snapshot `D.servisLogs` sebelum/sesudah round-trip identik.

## Hasil

S2028 menambahkan guard/projection `ServiceHistoryHistoryReminderAuditRoundTripS2028` tanpa mengganti implementasi navigasi existing S2019.

Regression subset S2014–S2028: PASS, 0 failure baru.
Full repository suite tidak diklaim karena limitation test S2012 (`tests/helpers/loadSource`) yang sudah ada sebelumnya.
