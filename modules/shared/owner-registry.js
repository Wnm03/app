// owner-registry.js — Owner Registry (Sesi 489, langkah 1/5 rencana
// PLAN-owner-registry-multi-session.md).
//
// TARGET: satu sumber kebenaran `ownerId` lintas Aset/Investasi/Titipan.
// Audit S488 menemukan `assetOwnersModal`/`investmentOwnersModal` generate
// `uid()` BARU tiap baris pemilik baru tanpa cek existing owner — "Budi" di
// Aset A dan Aset B bisa punya `ownerId` berbeda, padahal orangnya sama.
//
// SESI INI (S489) = FONDASI SAJA, TANPA WIRING. Tidak menyentuh aset.js,
// investasi-view.js, modals.js, atau titipanCommitmentModal — itu kerjaan
// S490 (aset.js), S491 (investasi-view.js), S492 (titipan), pola sama
// persis "1 task = 1 sesi" yang dipakai multi-owner-engine.js (S390).
//
// GATE #1 (dikunci): seed KOSONG. Registry mulai kosong, TIDAK di-backfill
// dari `D.assets[].owners`/`D.investments[].owners`/`D.titipanCommitments`
// yang sudah ada. Owner lama tetap standalone (nama sama, `ownerId` beda)
// persis seperti sekarang — hanya entri BARU setelah S490+ live yang akan
// konsisten. Konsisten dengan disiplin proyek "0 mutasi data existing".
// (Karena seed kosong, TIDAK perlu flag idempotent-seed seperti yang
// diwanti-wanti di "Danger point" plan — tidak ada proses seed sama sekali.)
//
// Struktur data: `D.ownerRegistry: [{id, name}]` — SATU field baru, tidak
// mengubah skema `owners[]` yang sudah ada di assets/investments/
// titipanCommitments. Field `ownerId`/`ownerName` di record lama tetap
// dibaca apa adanya oleh kode lain (0 sentuhan ke situ sesi ini).
//
// Pola guard `typeof` & getter-lazy-init sama persis
// `DanaTitipanPortfolioAPI.getCommitments()` (S485b) — getter TIDAK menulis
// `D.ownerRegistry` kalau belum ada, cuma balikin array kosong.

const OwnerRegistry = {

  // listAll() — getter read-only. Balikin `D.ownerRegistry` apa adanya
  // (atau `[]` kalau belum pernah diisi) — dipakai sebagai sumber dropdown
  // "Pilih Pemilik" di S490/S491 (belum ada consumer sesi ini).
  listAll() {
    return (typeof D !== 'undefined' && Array.isArray(D.ownerRegistry)) ? D.ownerRegistry : [];
  },

  // findOrCreate(name) — cari entri existing by NAMA (trim, case-insensitive)
  // dulu; kalau ketemu, balikin `id`-nya (TIDAK membuat entri baru/duplikat).
  // Kalau tidak ketemu, buat entri baru (`id` via `uid()`), push ke
  // `D.ownerRegistry`, panggil `save()` kalau tersedia, balikin `id` baru.
  //
  // CATATAN — batas fungsi ini: matching by nama HANYA dipakai di titik
  // input "buat baru" (user mengetik nama, S490+ dropdown). Registry
  // sendiri tetap dedup by `id`, BUKAN by nama — `rename()`/`merge()` (R4)
  // TIDAK mengubah itu: rename tidak auto-collapse ke entri lain yang
  // kebetulan namanya jadi sama (lihat komentar `rename()` di bawah), harus
  // lewat `merge()` eksplisit kalau memang mau digabung.
  //
  // Parameter:
  //   name (string) — wajib non-empty setelah di-trim, kalau tidak throw
  //     Error (pola sama `saveCommitment()`/`recordReturn()`).
  // Return: string `id` (existing atau baru).
  findOrCreate(name) {
    const trimmed = (name && String(name).trim()) || '';
    if (!trimmed) throw new Error('Nama pemilik wajib diisi');
    if (typeof D === 'undefined') throw new Error('Registry belum siap dimuat');
    D.ownerRegistry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const lower = trimmed.toLowerCase();
    const existing = D.ownerRegistry.find((o) => o && typeof o.name === 'string' && o.name.trim().toLowerCase() === lower);
    if (existing) return String(existing.id);
    const id = String((typeof uid === 'function') ? uid() : ('owner_' + Date.now()));
    D.ownerRegistry.push({ id, name: trimmed });
    if (typeof save === 'function') save();
    return id;
  },

  // rename(id, newName) — R4 (audit ownership/titipan, menutup
  // OWNREG-GATE3-001). Ganti `name` 1 entri registry + PROPAGASI ke semua
  // salinan `ownerName` yang tersimpan denormalized per baris (owners[] di
  // Aset/Investasi, D.titipanCommitments[], D.debts[] tertaut) — tanpa
  // propagasi ini, rename di registry saja TIDAK akan terlihat di UI karena
  // seluruh consumer baca `ownerName` dari baris masing-masing, bukan
  // lookup ke registry saat render (lihat komentar `_holdingSplits()`/
  // `_assetSplits()` di dana-titipan-portfolio-presenter.js).
  //
  // KEPUTUSAN Gate #3 (dikunci sesi ini): rename TIDAK auto-collapse ke
  // entri lain yang kebetulan namanya jadi sama (opsi (b) dari
  // OWNREG-GATE3-001) — 2 `id` tetap 2 entri terpisah walau nama akhirnya
  // sama, konsisten dgn "registry dedup by id, bukan by nama" (S489).
  // Kalau memang mau digabung, pakai `merge()` di bawah secara eksplisit.
  //
  // Return: {ok:true, assets, investments, commitments} — jumlah baris yang
  // ikut diupdate per domain. {ok:false, reason} kalau id tidak ditemukan
  // atau newName kosong.
  rename(id, newName) {
    if (typeof D === 'undefined') return { ok: false, reason: 'Registry belum siap dimuat' };
    D.ownerRegistry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const entry = D.ownerRegistry.find((o) => o && String(o.id) === String(id));
    if (!entry) return { ok: false, reason: 'Owner tidak ditemukan di registry' };
    const trimmed = (newName && String(newName).trim()) || '';
    if (!trimmed) return { ok: false, reason: 'Nama baru wajib diisi' };
    entry.name = trimmed;
    let assets = 0, investments = 0, commitments = 0, debts = 0;
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      (Array.isArray(a && a.owners) ? a.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(id)) { o.ownerName = trimmed; assets++; }
      });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      (Array.isArray(h && h.owners) ? h.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(id)) { o.ownerName = trimmed; investments++; }
      });
    });
    (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []).forEach((c) => {
      if (c && String(c.ownerId) === String(id)) { c.ownerName = trimmed; commitments++; }
    });
    // Cermin blok debts di merge() (baris di bawah) — temuan sesi-5:
    // rename() sebelumnya tidak propagasi ke D.debts[].name, jadi
    // checkDebtNameStaleness() (titipan-reconcile.js) nyala merah palsu
    // setiap kali owner registry di-rename tanpa ganti nama debt terkait.
    (Array.isArray(D.debts) ? D.debts : []).forEach((d) => {
      if (d && String(d.linkedOwnerId) === String(id)) { d.name = trimmed; debts++; }
    });
    if (typeof save === 'function') save();
    return { ok: true, assets, investments, commitments, debts };
  },

  // merge(sourceId, targetId) — R4: gabung 2 entri registry yang ternyata
  // orang yang sama (mis. dulu diketik "Budi" & "Budi W" terpisah). SEMUA
  // referensi `sourceId` (owners[] Aset/Investasi, D.titipanCommitments[],
  // D.debts[].linkedOwnerId) dipindah ke `targetId`, `ownerName` disamakan
  // ke nama `targetId` di registry, lalu entri `sourceId` DIHAPUS dari
  // registry. Penghapusan HANYA di `D.ownerRegistry` — tidak pernah
  // menghapus Aset/Investasi/Commitment/Debt itu sendiri.
  //
  // GUARD tabrakan (pola sama persis Aset/Investment.migrateOwnersToRegistry()
  // R2): kalau 1 entity (aset/holding) SUDAH punya baris `targetId` DAN
  // `sourceId` sekaligus, entity itu di-SKIP UTUH (porsi tidak digabung
  // otomatis — butuh review manual, dua porsi yang beda tidak boleh
  // ke-collapse diam-diam). Kalau ADA konflik di entity mana pun, `merge()`
  // BATAL TOTAL (tidak ada perubahan parsial) — return
  // {ok:false, reason:'conflict', conflicts:[...]}.
  //
  // Return sukses: {ok:true, assets, investments, commitments, debts}.
  merge(sourceId, targetId) {
    if (typeof D === 'undefined') return { ok: false, reason: 'Registry belum siap dimuat' };
    if (String(sourceId) === String(targetId)) return { ok: false, reason: 'sourceId dan targetId sama' };
    D.ownerRegistry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const src = D.ownerRegistry.find((o) => o && String(o.id) === String(sourceId));
    const tgt = D.ownerRegistry.find((o) => o && String(o.id) === String(targetId));
    if (!src || !tgt) return { ok: false, reason: 'sourceId atau targetId tidak ditemukan di registry' };
    const conflicts = [];
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      const ids = (Array.isArray(a && a.owners) ? a.owners : []).filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
      if (ids.includes(String(sourceId)) && ids.includes(String(targetId))) conflicts.push({ domain: 'asset', id: a.id });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      const ids = (Array.isArray(h && h.owners) ? h.owners : []).filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
      if (ids.includes(String(sourceId)) && ids.includes(String(targetId))) conflicts.push({ domain: 'investment', id: h.id });
    });
    if (conflicts.length) return { ok: false, reason: 'conflict', conflicts };
    let assets = 0, investments = 0, commitments = 0, debts = 0;
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      (Array.isArray(a && a.owners) ? a.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(sourceId)) { o.ownerId = targetId; o.ownerName = tgt.name; assets++; }
      });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      (Array.isArray(h && h.owners) ? h.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(sourceId)) { o.ownerId = targetId; o.ownerName = tgt.name; investments++; }
      });
    });
    (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []).forEach((c) => {
      if (c && String(c.ownerId) === String(sourceId)) { c.ownerId = targetId; c.ownerName = tgt.name; commitments++; }
    });
    (Array.isArray(D.debts) ? D.debts : []).forEach((d) => {
      if (d && String(d.linkedOwnerId) === String(sourceId)) { d.linkedOwnerId = targetId; d.name = tgt.name; debts++; }
    });
    D.ownerRegistry = D.ownerRegistry.filter((o) => String(o.id) !== String(sourceId));
    if (typeof save === 'function') save();
    return { ok: true, assets, investments, commitments, debts };
  },

};

if (typeof window !== 'undefined') {
  window.OwnerRegistry = OwnerRegistry;
}
