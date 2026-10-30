# S2026 — Component-Scoped Reminder UX

## Tujuan
Menutup gap UX yang terdeteksi S2025: ketika user memilih satu component pada session multi-checklist, tab Reminder harus memiliki context component yang eksplisit.

## Keputusan
- Reminder memakai projection component-scoped.
- SOT interval tetap kategori/override kendaraan.
- Tidak membuat field interval baru pada history.
- Tidak membuat reminder kedua.
- Tidak mengubah `servisLogs`, finance transaction, atau evidence.
- `reminderProjection()` diekspos sebagai kontrak agar scope dapat diuji tanpa bergantung pada DOM.

## Jalur
`History component focus → component projection → Reminder renderer → SOT interval/vehicle override`

## Kompatibilitas
S2019 sudah melakukan projection sementara saat memanggil renderer legacy. S2026 menambahkan kontrak eksplisit + audit/read-only UI di atas mekanisme tersebut; tidak mengganti SOT reminder.
