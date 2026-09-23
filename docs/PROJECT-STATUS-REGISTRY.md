# PROJECT STATUS REGISTRY — S1942

**Status:** ACTIVE SOT dokumentasi pekerjaan/regresi

## Status vocabulary
- `CLOSED` — implementasi + bukti test/audit tersedia.
- `VERIFIED` — audit/test membuktikan kondisi saat ini.
- `KNOWN-LIMITATION` — sengaja dipertahankan oleh design/product lock.
- `BACKLOG` — pekerjaan fitur/peningkatan yang belum menjadi bug aktif.
- `BLOCKED-ENV` — belum dapat diverifikasi karena environment/tooling.
- `NEEDS-RE-AUDIT` — dokumen lama tidak cukup untuk menyatakan status kode sekarang.
- `HISTORICAL` — catatan sesi lama; tidak boleh dibaca sebagai backlog aktif.
- `SUPERSEDED` — keputusan lama digantikan keputusan yang lebih baru.

## Current registry
| ID | Area | Status | Bukti / sumber | Tindakan S1942 |
|---|---|---|---|---|
| REG-001 | Segmented pane SOT/lifecycle | VERIFIED | S1937–S1941 gates + targeted tests | Tidak ada perubahan business logic |
| REG-002 | Release firewall/closure | VERIFIED | release firewall + closure audit | Dipertahankan |
| REG-003 | Owner Resolver Audit-8 | CLOSED | Owner Resolver Audit-8–11 + Dana Titipan tests | Status direkonsiliasi |
| REG-004 | Owner Resolver Audit-9 badge | CLOSED | S579 source + S1942 regression | Resolver sudah dipakai |
| REG-005 | Owner Resolver Audit-10 | CLOSED | historical audit + current resolver choke-point | Tidak ada perubahan logic |
| REG-006 | Owner Resolver Audit-11 | CLOSED | backward compatibility tests | Tidak ada perubahan logic |
| REG-007 | Unlink asset `baseBalance/ownership` echo | KNOWN-LIMITATION | Owner Resolver Design Lock | Jangan auto-reset tanpa design lock baru |
| REG-008 | 7 jalur CREATE transaksi non-modal | BACKLOG | Design Lock DL-Next | Jangan bundel tanpa keputusan per jalur |
| REG-009 | `modules/shop/multi-owner-engine.js` | VERIFIED-LIVE | `scripts/build.js` memasukkannya | Jangan hapus |
| REG-010 | Browser visual smoke | BLOCKED-ENV | Browser nyata tidak tersedia di sandbox sebelumnya | Wajib pada device/browser nyata |
| REG-011 | eslint/esbuild/minification | BLOCKED-ENV | Toolchain sandbox sebelumnya tidak tersedia | Jangan klaim production-minified |
| REG-012 | Full suite | BLOCKED-ENV/NEEDS-RE-AUDIT | Runner sebelumnya timeout | Jalankan pada environment memadai |
| REG-013 | Minimal theme text contrast | CLOSED | `minimal-ui-theme.css` S1942 + test | `--text3` diperkuat |
| REG-014 | Desktop page max-width | VERIFIED | `styles.css` 1080px cap + mobile override | Tidak perlu patch |
| REG-015 | Historical docs containing TODO/BELUM | HISTORICAL | old patch notes/release logs | Jangan hapus sejarah |
| REG-016 | Vehicle DB/Master Database/Maintenance Package roadmap | NEEDS-RE-AUDIT/BACKLOG | roadmap historis | Jangan dianggap bug aktif tanpa current audit |

## Rules
1. Historical `BELUM/TODO/NEXT SESSION` bukan backlog aktif kecuali diregistrasikan di sini.
2. `KNOWN-LIMITATION` tidak boleh auto-fixed tanpa design lock.
3. `BLOCKED-ENV` adalah batas verifikasi, bukan bug aplikasi.
4. Production sign-off tetap memerlukan browser/device smoke dan minified build environment.
