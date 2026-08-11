# FIX v1087 — Sesi 389 — Daftarkan `purchaseOrderBatchModal` ke Modal Sweep

## Ringkasan
Tes Buka/Tutup Modal (in-app, self-test.js) melaporkan 1 modal bermasalah:
"(kelengkapan cakupan) modal belum terdaftar (#purchaseOrderBatchModal)".

## Root Cause
`purchaseOrderBatchModal` (dibuat Sesi 381, `BusinessFlowPresenter.
openPurchaseOrderBatchModal()`) ada di DOM (`modules/shared/modals.js`)
tapi tidak pernah didaftarkan ke `EXTRA_MODAL_SWEEP_SPECS` /
`MODULE_METHOD_MODAL_SPECS` di `self-test.js` — jadi luput dari cakupan
Tes Buka/Tutup Modal, bukan bug fungsional pada modalnya sendiri.

## Fix
Daftarkan entry baru di `MODULE_METHOD_MODAL_SPECS`, tepat setelah
`BusinessFlowPresenter.openTransferModal()` (pola identik — modal ini
juga cuma reset state form lalu `openModal()`):

```js
{label:'BusinessFlowPresenter.openPurchaseOrderBatchModal()',id:'purchaseOrderBatchModal',
call:()=>BusinessFlowPresenter.openPurchaseOrderBatchModal(),close:()=>closeModal('purchaseOrderBatchModal')},
```

## File Diubah
- `self-test.js` (+6 baris, 1 entry baru)

## Hasil
- Test Buka/Tutup Modal: modal sekarang tercakup, 0 bermasalah.
- `npm test`: tetap 2616/2616 pass (tidak ada regresi).

## Scope
Tidak menyentuh bundle/versi — perubahan murni di `self-test.js`.
