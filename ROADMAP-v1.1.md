# ROADMAP-v1.1.md — Backlog Versi Berikutnya

Backlog ini disusun dari seluruh temuan `FINAL-QA.md` (Tahap 8) dan
carry-over rekomendasi Tahap 6–7 yang tercatat di `KNOWN-ISSUES.md`.
Dikelompokkan berdasarkan prioritas dan jenis perubahan yang dibutuhkan.

Item yang **membutuhkan perubahan JavaScript** ditandai 🔴 dan seluruhnya
masuk kategori ini sesuai instruksi — karena versi v1.0 (Tahap 1–8)
sengaja dibatasi hanya CSS/HTML/Markdown tanpa menyentuh JS.

---

## High Priority

Isu yang berdampak langsung ke pengalaman pengguna atau aksesibilitas.

1. **🟡 Perbaiki kontras `--text3` di 10 tema warna** (accessibility,
   WCAG AA). Saat ini 2.45–3.8:1 terhadap `--bg`/`--surface2` di tema
   yang diuji, target ≥4.5:1 untuk teks normal. Butuh review visual
   per tema agar tetap harmonis dengan palet masing-masing.
   *Sumber: `KNOWN-ISSUES.md` §1.1.*

2. ~~🔴 Exit/closing animation untuk overlay & bottom sheet.~~ **✅
   Selesai Tahap 10** — lihat `MODAL-EXIT-ANIMATION.md`. Diimplementasi
   di `closeModal()` (`modal-navigasi.js`, via `animationend` +
   fallback `setTimeout`) & `styles.css` (`overlayOut`/`slideDown`),
   bukan di `modals.js` (file itu isinya cuma `MODAL_HTML[]` string,
   logika buka/tutup modal sudah dipindah ke `modal-navigasi.js` sejak
   sebelum tahap ini — lihat komentar header file tsb).
   *Sumber: `KNOWN-ISSUES.md` §5.1.*

3. ~~🔴 Ganti emoji `icon:` di `dashboard-hub-registry.js` (FEATURE_REGISTRY)
   dengan SVG konsisten.~~ **✅ Selesai** — `feature-icons.js`
   (`FeatureIcons.render()`) memetakan tiap emoji `icon:` ke markup SVG
   inline bergaya sama dengan ikon lain di app (`stroke="currentColor"`,
   `viewBox 0 0 24 24`), dipasang di `dashboard-hub.js`,
   `dashboard-hub-search.js`, `dashboard-hub-favorit-view.js`. Emoji
   lain di luar FEATURE_REGISTRY (widget AI/LifeOS Areas) sengaja tidak
   disentuh — di luar scope §4.1.
   *Sumber: `KNOWN-ISSUES.md` §4.1.*

---

## Medium Priority

Konsistensi & polish yang meningkatkan kualitas kode tanpa mengubah
perilaku yang terlihat pengguna.

4. ~~🟢 Migrasikan literal `border-radius` → token `var(--r-*)`.~~ **✅
   Selesai** — audit ulang `styles.css` tidak menemukan sisa literal
   16px/10px/20px/12px yang belum pakai `var(--r-*)`.
   *Sumber: `KNOWN-ISSUES.md` §2.1.*

5. ~~🟢 Definisikan & pakai token `--shadow-*`.~~ **✅ Selesai** —
   audit ulang: seluruh `box-shadow` netral literal sudah bertoken,
   kecuali `.tgl-track::before` (thumb toggle) yang barusan
   ditambahkan tokennya (`--shadow-toggle-thumb`, value-preserving).
   Shadow ber-`var(--accent...)` (glow warna aksen/fokus, bukan
   elevasi netral) sengaja dibiarkan literal karena bukan bagian skala
   elevasi `--shadow-*`.
   *Sumber: `KNOWN-ISSUES.md` §2.2.*

6. **🟢 Konsolidasikan durasi `transition` non-token** ke skala
   `--dur-fast/base/moderate/slow` yang sudah ada (saat ini ≥15
   variasi durasi/easing tersebar).

   **Belum dikerjakan (beda dari #4/#5/#7/#10/#11 di atas)**: audit
   ulang menemukan durasi literal yang tersisa (`.12s`, `.22s`, `0.3s`,
   `0.4s`, `0.5s`, `0.6s` — progress bar, grafik bar, kasir tile, dll.)
   **tidak match persis** ke token yang ada (`--dur-fast:100ms`,
   `--dur-base:150ms`, `--dur-moderate:200ms`, `--dur-slow:250ms`).
   Memaksa ke token terdekat akan MENGUBAH kecepatan animasi (bukan
   value-preserving) — butuh review visual per komponen dulu sebelum
   dieksekusi, sama seperti item #1.
   *Sumber: `KNOWN-ISSUES.md` §2.3.*

7. ~~🟢 Perbesar area sentuh `.chip-btn`/`.qs-btn`.~~ **✅ Selesai** —
   `.chip-btn` sudah `padding:11px 14px`, `.qs-btn` sudah
   `padding:12px 12px`, keduanya sudah mendekati/mencapai 44px tinggi
   efektif.
   *Sumber: `KNOWN-ISSUES.md` §1.2.*

8. ~~🔴 Ripple berbasis koordinat sentuh asli~~ (bukan pulsa dari
   tengah). **✅ Selesai** — `modules/shared/ripple-position.js`
   (`computeRipplePercent()`/`applyRipplePosition()`) memasang listener
   `pointerdown` (fallback `mousedown`+`touchstart` untuk browser tanpa
   Pointer Events) yang men-set custom property `--ripple-x`/`--ripple-y`
   pada elemen sesaat sebelum `:active` menyalakan animasi. `styles.css`
   diubah minimal: `center/0% 0%` → `var(--ripple-x,50%) var(--ripple-y,50%)/0% 0%`
   (fallback tengah dipertahankan untuk aktivasi keyboard). Lihat
   `tests/ripple-position.test.js` (8 test, termasuk guard agar
   `RIPPLE_SELECTOR` selalu sinkron dengan daftar selector `::after` ripple
   di `styles.css`).
   *Sumber: `KNOWN-ISSUES.md` §5.2.*

---

## Low Priority

Nice-to-have, dampak kecil terhadap pengguna akhir.

9. **🟢 Migrasikan literal `font-size` kecil** (11px, 12px, 13px,
   8.5px) ke token `--fs-*` terdekat yang sudah ada.

   **Sebagian selesai (Sesi 277, 280)**: 47 literal yang PERSIS sama
   dengan token sudah dimigrasi (`11/12/13px`→`--fs-caption/--fs-label/
   --fs-body` Sesi 277; `14/15/16/17/18/20px`→`--fs-body-lg/
   --fs-title-sm/--fs-icon/--fs-title/--fs-icon-lg/--fs-stat` Sesi 280).
   Sisa literal (`8.5px`, `9.5px`, `10px`, `10.5px`, `11.5px`, `12.5px`,
   `13.5px`, `14.5px`, `19px`, `22px`, `24px`, `26px`, dst.) **sengaja
   dibiarkan** — tidak match persis token manapun, mengganti akan
   mengubah ukuran font sungguhan.
   *Sumber: `KNOWN-ISSUES.md` §2.4.*

10. ~~🟢 Tambahkan `max-width` container konsisten untuk seluruh
    `.page`.~~ **✅ Selesai Sprint 2 Tahap 15** — lihat komentar di
    `styles.css` dekat rule `.page{max-width:1080px;...}` dalam
    `@media (min-width:1024px)`.
    *Sumber: `KNOWN-ISSUES.md` §3.1.*

11. ~~🟢 Tambahkan hover/elevation pada tap-target sekunder lain.~~
    **✅ Selesai** — `.stat-box.clickable`, `.cobek-stat.clickable`,
    `.bbm-stat.clickable`, `.budget-sum-box.clickable`,
    `.budget-item.clickable` sudah dapat `:hover{box-shadow:var(--shadow-hover-sm)}`
    di `@media (min-width:1024px)`.
    *Sumber: `KNOWN-ISSUES.md` §5.3.*

---

## Ringkasan (diperbarui setelah audit ulang)

| # | Item | Status |
|---|---|---|
| 1 | Kontras `--text3` 🟡 | ⏳ Belum — butuh review visual per tema |
| 2 | Exit animation overlay/sheet 🔴 | ✅ Selesai (Tahap 10) |
| 3 | Icon SVG FEATURE_REGISTRY 🔴 | ✅ Selesai |
| 4 | Border-radius → token 🟢 | ✅ Selesai |
| 5 | Box-shadow → token 🟢 | ✅ Selesai |
| 6 | Konsolidasi durasi transition 🟢 | ⏳ Belum — bukan value-preserving, butuh review visual |
| 7 | Touch target chip-btn/qs-btn 🟢 | ✅ Selesai |
| 8 | Ripple berbasis koordinat 🔴 | ✅ Selesai |
| 9 | Font-size kecil → token 🟢 | 🔶 Sebagian (Sesi 277, 280) — sisa nilai tidak match token manapun |
| 10 | Container max-width konsisten 🟢 | ✅ Selesai (Sprint 2 Tahap 15) |
| 11 | Hover/elevation tap-target sekunder 🟢 | ✅ Selesai |

**8 dari 11 item sudah selesai.** Sisa 3 item (1, 6, 9) sengaja
belum disentuh karena masing-masing butuh keputusan/verifikasi visual
lintas tema/komponen — bukan sekadar belum sempat dikerjakan.
