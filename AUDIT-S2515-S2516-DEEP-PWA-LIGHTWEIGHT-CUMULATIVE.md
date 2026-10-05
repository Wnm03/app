# Audit S2515-S2516 — Deep PWA Lightweight / Navigation / Restore Continuity

## Baseline
- Baseline baru: `app-main (8).zip`
- Final build: `s2041-1-part-sot-hardening-2238`
- HTML/SW cache: `?v=2238` / `kw-cache-v2238`

## Temuan substantif

### 1. Navigation masih melakukan render presenter berat pada call stack tap
`showPage()` sebelumnya memanggil `renderPageContent(name)` langsung sebelum browser memperoleh kesempatan paint. Pada perangkat Android, presenter Finance/Vehicle/Asset/Shop yang berat membuat perpindahan tab terasa macet.

**Fix S2515**
- User navigation langsung mengaktifkan destination page.
- Presenter dijadwalkan ke frame berikutnya (`requestAnimationFrame`, fallback `setTimeout(0)`).
- Rapid tap A -> B memakai sequence guard sehingga render A yang tertunda tidak boleh repaint setelah B aktif.
- Render key per page/state revision mencegah presenter dihitung ulang bila state dan sub-tab tidak berubah.
- Programmatic/history navigation tetap synchronous untuk kompatibilitas.

### 2. Storage monitor melakukan polling 60 detik tanpa memperhatikan visibility
Polling storage bukan pekerjaan UI kritis dan tetap membangunkan runtime saat tab/background.

**Fix S2515**
- interval 60 detik dihapus.
- periodic check menjadi 5 menit.
- timer berhenti saat hidden dan dijadwalkan ulang ketika visible/focus/online/pageshow.

### 3. Baseline baru ternyata kehilangan hardening S2512
`app-bootstrap.js` pada baseline masih menggunakan `Promise.race()` dengan hard failure 15 detik. Ini adalah regresi nyata terhadap S2512 dan menjelaskan kembali banner error palsu pada perangkat lambat.

**Fix dipulihkan**
- >15 detik hanya diagnostic warning.
- hard timeout 30 detik.
- watchdog dibersihkan setelah boot settled.
- success/recovery tidak lagi dilaporkan sebagai failure.

### 4. Baseline baru juga kehilangan sebagian S2461 restore diagnostic
UI tombol diagnostic sudah ada di HTML, tetapi helper runtime untuk:
- `copyS2013RestoreDiagnostic`
- `downloadS2013RestoreDiagnostic`
- `clearS2013RestoreDiagnostic`

serta payload `categoryComponentReconciliation` tidak lengkap.

**Fix S2461/S2516**
- helper diagnostic dipulihkan.
- issue/changed reconciliation disimpan sampai 200 item.
- diagnostic gagal restore dipersist ke `kw_restore_diagnostic_s2013` agar dapat dilaporkan dari HP tanpa Eruda/eval.
- diagnostic lama dibersihkan saat restore baru dimulai dan setelah restore sukses.

## Test
### Targeted regression
**40/40 PASS** pada suite gabungan navigation, bootstrap watchdog, restore/SOT, Finance taxonomy, bundle freshness, dan diagnostic persistence.

Gate:
- Bundle freshness: PASS
- Version integrity: PASS
- Runtime lifecycle: PASS
- PWA recovery: PASS
- SOT integrity: PASS
- Architecture integrity: PASS
- Persistence integrity: PASS

### Full repository test
Full `npm test` tidak selesai dalam batas waktu audit environment. Proses mencapai setidaknya test #513 sebelum timeout tanpa menghasilkan summary final. Karena itu **tidak diklaim full-suite certification**.

## Non-substantive release warnings
- `esbuild` tidak tersedia -> bundle valid tetapi belum diminify.
- source-size warnings tetap ada pada file legacy besar.
- HTML performance budget sekitar 0,3% di atas budget lama; tidak mengubah correctness.

## Final assessment
Scope PWA navigation/bootstrap/recovery/restore diagnostic yang diaudit: **tidak ada gap substantif tersisa setelah S2515/S2516**.
