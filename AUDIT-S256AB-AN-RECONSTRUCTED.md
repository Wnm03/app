# S256AB..AN — Rekonstruksi isi sesi (dibuat di S256AT)

**Status dokumen:** DIREKONSTRUKSI dari diff `app-main (13)` → akumulasi S256AP, penanda `S256Axx` di source/komentar, dan test. BUKAN catatan asli
sesi tersebut (catatan asli tidak ikut paket S256AP). Tingkat keyakinan: **T** = tinggi (penanda eksplisit + test), **S** = sedang (penanda saja), **R** = rendah (disimpulkan dari diff, tanpa penanda).

| Sesi | Isi (bukti) | File | Test | Yakin |
|---|---|---|---|---|
| AB | Hero domain ringkas di mobile (sembunyikan paragraf intro + status pill; halaman mobil hanya tampilkan aksi pertama); `.chip` kanonik (filter servis severity/aksi/kategori sebelumnya tanpa CSS) | `modern-ui-layer.css` | — (baru dijaga `s256as`) | S |
| AC | Target sentuh ≥44px mobile (audit Settings): `chip-btn`, `header-badge`, `card-collapse-head/toggle`, `qs-btn`, `tx-del`, `ai-q`, `vehicle-chip`, sub-tab, `cn-*`; spesifisitas halaman mobil diulang | `modern-ui-layer.css` | `s256ac`, `s256ad` | T |
| AD | Baris tap reminder/katalog Servis + pill inline 44px, hook kelas `sv-tap` | `modern-ui-layer.css`, `servis-b.js`, `sparepart-servis.js` | `s256ad`, `s256ae` | T |
| AE | Markup baris reminder membawa `sv-tap`, `data-action` tidak berubah | `servis-b.js`, `sparepart-servis.js` | `s256ae` | T |
| AF | Aktivasi keyboard (Enter/Spasi) untuk `<div>/<span role="button" data-action>` | `features-helpers-global-security.js` (+17/-2) | `s256af` | T |
| AG | Keterjangkauan keyboard untuk kontrol non-native (whitelist daun, bukan baris kontainer) + fokus terlihat | `a11y-action-controls.js` (baru), CSS | `s256ag` | T |
| AH | `aria-pressed` satu-penulis untuk toggle div/span (searah: class `active` → atribut; tidak menulis class) | `a11y-pressed-state.js` (baru) | `s256ah` | T |
| AI | `aria-pressed` untuk `button.chip-btn` native + picker single-select | `a11y-pressed-native.js` (baru) | `s256ai` | T |
| AJ | Semantik tab modal "Worth It?" (tablist/tab/tabpanel, roving tabindex, panah/Home/End) | `a11y-tabs-worthit.js` (baru) | `s256aj` | T |
| AK | `aria-expanded`/`aria-controls` untuk toggle "⚙️ Atur" dua kartu proyeksi kas | `a11y-expanded-toggles.js` (baru) | `s256ak` | T |
| AL | Census runtime a11y AG–AK (Chromium, 390×844) | `a11y-runtime-census.py` (baru) | — (kini `s256as`) | T |
| AM | Census per halaman (8 halaman) + klik-tembus grup single-select/toggle | `a11y-runtime-census-pages.py` (baru) | — (kini `s256as`) | T |
| AN | Census modal (25 modal, klik mouse sungguhan) + data 2 kendaraan lewat `saveVehicle()`; menemukan bug AO | `a11y-runtime-census-modals.py` (baru) | `s256an` | T |

## Perubahan yang tidak bertanda sesi (keyakinan R)
- **Versi/cache 2254 → 2272** di `sw.js`, `index.html`, `app_production.html`, dan satu baris stempel di `modals.js`, `modules-calc.js`, `modules-render.js`, `chat-action-handlers.js` (diff tiap file hanya `54`→`72`).
- **`scripts/build.js` +5 baris:** mendaftarkan 5 modul `a11y-*.js` ke grup bundle A (urutan: action-controls, pressed-state, pressed-native, tabs-worthit, expanded-toggles). Bundle A mengandung kelima modul itu; bundle B tidak (memang tidak seharusnya).
- **`servis-b.js` perubahan tampilan reminder (diperkirakan bagian AB/AD):** (1) chip filter severity berhitungan 0 disembunyikan kecuali "Semua"/pilihan aktif; (2) baris ringkasan riwayat placeholder "Belum ada riwayat tercatat" tidak dirender; (3) label tombol "🧾 Riwayat"/"✅ …" dipersingkat tanpa emoji dan tombol min-height 44px; (4) ikon ✏️ dihapus dari header baris; (5) select kategori jadi `flex:1 1 150px`. Dijaga test statis baru `s256at` (poin 1–3).
- **Bundle:** `app-bundle-a.min.js` segar (memuat AG–AK); `app-bundle-b.min.js` BASI (source `fuel-price-ref.js` berubah di AO).

## Yang tidak bisa direkonstruksi
Alasan desain, urutan kerja, dan hasil test per sesi (hanya hasil akumulasi S256AO/AP yang terdokumentasi di `PATCH-MANIFEST-S256AP.txt`). Jangan memakai dokumen ini sebagai bukti bahwa tiap sesi dulu lulus sendiri-sendiri.
