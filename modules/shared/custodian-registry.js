// custodian-registry.js — Custodian Registry (Sesi S540-A, Tahap 1/4
// DESIGN-S540-CUSTODIAN-GROUPING.md, Design Lock disetujui user dengan
// keputusan final: Opsi A/registry, seed kosong, 0 backfill, assign manual,
// build() tidak berubah untuk grouping).
//
// TARGET: satu sumber kebenaran `custodianId` untuk instrumen investasi
// (Dana Titipan holdings) — supaya Sucorinvest/Schroder/BNI AM bisa
// direferensikan sebagai sub-item dari 1 kustodian (mis. 🏦 Majoris) lewat
// relasi DATA sungguhan, bukan indent visual doang (yang sudah dikerjakan
// S535, murni kosmetik).
//
// SESI INI (S540-A) = FONDASI SAJA, TANPA WIRING. Tidak menyentuh
// investasi.js (itu S540-B), UI form investment (S540-C), atau grouping di
// dana-titipan-portfolio-presenter.js (S540-D) — pola sama persis "1 task =
// 1 sesi" yang dipakai owner-registry.js (S489)/multi-owner-engine.js (S390).
//
// Seed KOSONG (keputusan final Design Lock, sama seperti Gate #1
// OwnerRegistry): registry mulai kosong, TIDAK di-backfill dari nama
// holding existing (mis. holding bernama "🏦 Majoris" TIDAK otomatis jadi
// entri registry). Konsisten disiplin proyek "0 mutasi data existing".
//
// Struktur data: `D.investmentCustodians: [{id, name}]` — SATU field baru,
// tidak mengubah skema `D.investments[]` sama sekali sesi ini (itu S540-B).
//
// Pola guard `typeof` & getter-lazy-init, serta `findOrCreate()` (dedup by
// nama trim+case-insensitive, dedup registry sendiri tetap by `id`), SAMA
// PERSIS `OwnerRegistry` (modules/shared/owner-registry.js, S489) — 0
// perilaku baru diciptakan, murni duplikasi pola yang sudah terbukti aman
// untuk entity registry berbeda.

const CustodianRegistry = {

  // listAll() — getter read-only. Balikin `D.investmentCustodians` apa
  // adanya (atau `[]` kalau belum pernah diisi) — dipakai sebagai sumber
  // dropdown "Pilih/Buat Kustodian" di S540-C (belum ada consumer sesi ini).
  listAll() {
    return (typeof D !== 'undefined' && Array.isArray(D.investmentCustodians)) ? D.investmentCustodians : [];
  },

  // findOrCreate(name) — cari entri existing by NAMA (trim, case-
  // insensitive) dulu; kalau ketemu, balikin `id`-nya (TIDAK membuat entri
  // baru/duplikat). Kalau tidak ketemu, buat entri baru (`id` via `uid()`),
  // push ke `D.investmentCustodians`, panggil `save()` kalau tersedia,
  // balikin `id` baru.
  //
  // CATATAN — batas fungsi ini (sama persis catatan OwnerRegistry): matching
  // by nama HANYA dipakai di titik input "buat baru" (user mengetik nama,
  // S540-C dropdown). Registry sendiri tetap dedup by `id`, BUKAN by nama —
  // rename entri (fitur rename, OUT-OF-SCOPE seluruh paket S540) TIDAK
  // collapse otomatis ke entri lain yang kebetulan namanya jadi sama.
  //
  // Parameter:
  //   name (string) — wajib non-empty setelah di-trim, kalau tidak throw
  //     Error (pola sama `OwnerRegistry.findOrCreate()`).
  // Return: string `id` (existing atau baru).
  findOrCreate(name) {
    const trimmed = (name && String(name).trim()) || '';
    if (!trimmed) throw new Error('Nama kustodian wajib diisi');
    if (typeof D === 'undefined') throw new Error('Registry belum siap dimuat');
    D.investmentCustodians = Array.isArray(D.investmentCustodians) ? D.investmentCustodians : [];
    const lower = trimmed.toLowerCase();
    const existing = D.investmentCustodians.find((c) => c && typeof c.name === 'string' && c.name.trim().toLowerCase() === lower);
    if (existing) return String(existing.id);
    const id = String((typeof uid === 'function') ? uid() : ('custodian_' + Date.now()));
    D.investmentCustodians.push({ id, name: trimmed });
    if (typeof save === 'function') save();
    return id;
  },

  // rename(id, newName) — S542 (follow-up ringan #2 pasca-S541, lihat
  // s541-SESSION-NOTE.md §Non-goals). Ubah `name` entri existing di
  // `D.investmentCustodians` TANPA mengubah `id` -- jadi semua holding yang
  // sudah mereferensikan `custodianId` ini otomatis ikut tampil dgn nama
  // baru di mana pun (dropdown investmentModal, grup Dana Titipan,
  // dst) tanpa perlu di-update satu-satu, karena semuanya baca nama lewat
  // lookup id -> registry (bukan menyalin nama ke holding).
  //
  // TIDAK melakukan dedup/collapse ke entri lain yg kebetulan namanya jadi
  // sama setelah rename (sama seperti catatan `findOrCreate()` di atas --
  // registry tetap dedup by `id`, bukan by nama). Kalau id tidak ketemu di
  // registry, balikin `false` (bukan throw) -- caller (UI) yg menampilkan
  // pesan ke user, pola sama `remove()` di bawah.
  //
  // Parameter:
  //   id (string) — id entri yang mau diubah namanya.
  //   newName (string) — nama baru, wajib non-empty setelah di-trim.
  // Return: `true` kalau berhasil, `false` kalau id tidak ditemukan.
  rename(id, newName) {
    const trimmed = (newName && String(newName).trim()) || '';
    if (!trimmed) throw new Error('Nama kustodian wajib diisi');
    if (typeof D === 'undefined') throw new Error('Registry belum siap dimuat');
    D.investmentCustodians = Array.isArray(D.investmentCustodians) ? D.investmentCustodians : [];
    const entry = D.investmentCustodians.find((c) => c && String(c.id) === String(id));
    if (!entry) return false;
    entry.name = trimmed;
    if (typeof save === 'function') save();
    return true;
  },

  // remove(id) — S542 (follow-up ringan #2 pasca-S541). Hapus entri dari
  // `D.investmentCustodians`. SENGAJA TIDAK menyentuh
  // `D.investments[].custodianId` holding manapun yang masih
  // mereferensikan id ini -- itu sudah AMAN by design sejak S540-D:
  // `DanaTitipanPortfolioPresenter._custodianName()` fallback ke label
  // "Kustodian" kalau id-nya tidak ketemu di registry (lihat
  // dana-titipan-portfolio-presenter.js, dibuktikan test S540-D #8),
  // BUKAN hilang/error. Holding itu sendiri (nama, unit, nilai, dst) TIDAK
  // ikut terhapus -- cuma "putus" dari grup kustodian & jadi flat/grup
  // fallback lagi, persis seperti sebelum kustodian itu pernah dibuat.
  //
  // Parameter:
  //   id (string) — id entri yang mau dihapus.
  // Return: `true` kalau entri ditemukan & dihapus, `false` kalau id tidak
  //   ditemukan (0 perubahan pada D.investmentCustodians).
  remove(id) {
    if (typeof D === 'undefined') throw new Error('Registry belum siap dimuat');
    D.investmentCustodians = Array.isArray(D.investmentCustodians) ? D.investmentCustodians : [];
    const idx = D.investmentCustodians.findIndex((c) => c && String(c.id) === String(id));
    if (idx === -1) return false;
    D.investmentCustodians.splice(idx, 1);
    if (typeof save === 'function') save();
    return true;
  },

};

if (typeof window !== 'undefined') {
  window.CustodianRegistry = CustodianRegistry;
}
