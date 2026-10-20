# S2599 — Fix self-test "(kasus tanpa nama) Cannot read properties of undefined (reading 'fn')"
Akar masalah: `modules/shared/self-test-cases-b.js` punya `}},,` (koma ganda) setelah case "Kartu pengingat Backup legacy retired" -> hole di array -> `c` undefined di loop `computeSelfTestResults()`.
Fix: hapus koma ganda; guard di self-test.js (entri kosong dilaporkan jelas); boot-early.js cache-bust ?v=2207 -> 2208; test baru tests/self-test-registry-no-holes.test.js; build disinkronkan ke v2599 (SKIP_LINT=1 build:safe, suite hijau).
