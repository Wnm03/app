# AUDIT S2023 — Evidence Completeness & Consistency

## Scope
Read-only audit atas lifecycle bukti servis:
`checklist → condition → cost → parts → photos → history → finance`.

## Temuan arsitektur penting
- S2019 `componentsOf()` sengaja mengekspos navigation identity, bukan seluruh persisted evidence.
- Karena itu S2023 membaca ulang `log.checklist[]` sebagai **snapshot evidence source** untuk komponen yang sedang diaudit; tidak membuat SOT baru dan tidak mengubah S2019.
- S2022 juga di-hardening agar `componentEvidence()` dapat merehidrasi field evidence dari checklist snapshot. Ini mencegah Audit UI menampilkan "none" hanya karena layer navigation S2019 tidak mengekspos field evidence.

## Pemeriksaan
- Identity: history ID, vehicle ID, service component ID.
- Action/condition: action type, condition result/note, not-applicable coherence.
- Photos: jumlah dan entri kosong/tidak valid.
- Cost: `costBreakdown.source`, numeric total, jumlah labor+parts+consumables+other, dan pembanding dengan row cost.
- Parts: `catalogPartRefs`, `catalogId`, qty, `usedPartId`, `usedPartQty`.
- Service evidence: transaction/photo consistency terhadap row/history yang tersedia.
- Multi-component scope: biaya/foto level history tidak otomatis dianggap milik komponen.
- Session total: jumlah breakdown komponen dibanding `history.cost` ketika data cukup untuk dibandingkan.

## Severity
- `ERROR`: inkonsistensi matematis/identity yang konkret.
- `WARNING`: evidence tidak lengkap atau referensi yang perlu diverifikasi.
- `INFO`: kondisi yang dapat valid tetapi penting dijelaskan scope-nya.

## Non-goals
- Tidak mengalokasikan biaya.
- Tidak memindahkan foto.
- Tidak mengubah transaksi/finance.
- Tidak mengubah checklist/history schema.
- Tidak backfill legacy.
- Tidak menghapus duplicate/legacy records.
