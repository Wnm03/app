// titipan-sync.js — S583 Sesi 10a ("titipan-sync-single-gate", DESAIN AWAL).
//
// LATAR (Rekomendasi #1 dari 5 rekomendasi audit TitipanReconcile awal,
// tercatat "belum dikerjakan" di PATCH-NOTES sesi-2 s/d sesi-6):
// Aset._syncOwnerDebts(a) -- satu-satunya fungsi yang menjaga D.debts tetap
// sinkron dgn porsi non-SELF tiap aset -- dipanggil dari 5 titik terpisah
// di 2 file, SEMUANYA copy-paste guard yang identik:
//   typeof Aset!=='undefined' && typeof Aset._syncOwnerDebts==='function'
// Titik-titik itu (dibaca langsung dari source, sesi ini, 0 diubah):
//   1. aset.js:215   -- syncLinkedAssetNilaiFromAkun() (arah Akun->Aset)
//   2. aset.js:1403  -- (jalur simpan owners di dekat saveOwners())
//   3. aset.js:1556  -- migrateOwnersToRegistry() (pasca relabel ownerId)
//   4. aset.js:1713  -- (jalur simpan aset, savedAsset)
//   5. akun.js:547   -- AccOwners jalur simpan (arah Akun->Aset utk akun tertaut)
// 0 bug ditemukan di kelima titik ini sesi ini -- tapi persis pola tersebar
// begini yang jadi alasan Rec #1 diajukan: tidak ada SATU titik yang bisa
// dipercaya kalau nanti ada titik ke-6/7 (guard lupa ditambah), atau kalau
// suatu saat perlu ditambah langkah lain sesudah tiap sync (mis. re-run
// TitipanReconcile.checkAll(), atau logging) tanpa mengedit N lokasi
// terpisah satu per satu (risiko 1 lokasi kelewat).
//
// SESI INI (10a) — PURE ADDITIVE, 0 WIRING KE JALUR TULIS:
// TitipanSync.reconcile(a) dibuat sbg gerbang tunggal yang MEMBUNGKUS
// Aset._syncOwnerDebts(a) -- guard dipindah ke SINI (bukan diduplikasi
// lagi), 0 rumus baru, 0 perubahan perilaku _syncOwnerDebts() itu sendiri.
// Modul ini BELUM dipanggil dari mana pun -- aset.js/akun.js masih 100%
// pakai `Aset._syncOwnerDebts(a)` langsung di kelima titik di atas, 0
// baris di file itu disentuh sesi ini. TitipanSync hidup berdampingan,
// siap dipakai sesi berikutnya.
//
// KENAPA DIPECAH 10a/10b (bukan 1 sesi sekaligus):
// Kata "wajib" di Rec #1 ("satu GERBANG WAJIB") berarti tujuan akhirnya
// kelima call site di atas HARUS diganti ke TitipanSync.reconcile(a) --
// bukan sekadar modul baru ditambah lalu yang lama dibiarkan berdampingan
// selamanya (itu cuma nambah 1 cara baru tanpa menghapus 5 cara lama,
// tidak menyelesaikan masalah "tersebar"). Tapi mengganti 5 titik panggil
// di 2 file yang menyentuh ALUR TULIS INTI (tiap kali nilai aset dari akun
// tertaut berubah, tiap kali owners disimpan, tiap migrasi registry, tiap
// simpan aset) adalah perubahan RISIKO TINGGI -- kalau 1 saja titik salah
// tersambung/kelewat saat migrasi, entry Utang Titipan bisa berhenti
// sinkron TANPA error yang kelihatan (persis kelas bug BUG-OWN-002 yang
// TitipanReconcile sendiri dibuat utk deteksi). Sesi 10a sengaja fokus
// BIKIN & UJI gerbangnya dulu secara terisolasi -- bisa diverifikasi
// 100% lewat unit test tanpa risiko apa pun ke jalur tulis nyata.
//
// SESI 10b (TERPISAH, BELUM DIKERJAKAN, DI LUAR SCOPE PATCH INI):
// Ganti kelima call site SATU PER SATU (bukan sekaligus 5 titik dalam 1
// commit besar) dari `Aset._syncOwnerDebts(a)` (dgn guard inline) menjadi
// `TitipanSync.reconcile(a)`, tiap penggantian diverifikasi individual
// (full regression `node --test tests/*.test.js` di antara tiap titik).
// Urutan yang disarankan (risiko naik dari kecil ke besar, byte-for-byte
// sama persis semantiknya krn reconcile() cuma membungkus guard yang
// sudah ada -- tidak menambah/mengurangi kondisi apa pun):
//   akun.js:547 (1 titik, 1 file, jalur paling jarang terpanggil) dulu,
//   baru aset.js:215/1403/1556/1713 menyusul satu-satu.
// Juga perlu registrasi `titipan-sync.js` ke `scripts/build.js` (grup sama
// dgn `titipan-reconcile.js`, setelah `multi-owner-engine.js` DAN setelah
// `aset.js` dimuat -- reconcile() memanggil Aset._syncOwnerDebts() jadi
// urutan load harus Aset lebih dulu, beda dgn titipan-reconcile.js yang
// PURE read-only dan tidak butuh urutan khusus).
//
// KONTRAK reconcile(a):
//   a falsy (null/undefined)                -> {ok:false, synced:false, reason:'no-asset'}
//   Aset atau Aset._syncOwnerDebts hilang    -> {ok:false, synced:false, reason:'sync-unavailable'}
//   sukses                                   -> {ok:true, synced:true}
// _syncOwnerDebts(a) sendiri tidak melempar exception dalam kondisi normal
// (sudah ada guard `!D.debts` di dalamnya) -- reconcile() SENGAJA tidak
// menambah try/catch baru supaya error asli (kalau ada, mis. dari
// MultiOwnerEngine.getOwners() yang error) tetap kelihatan apa adanya,
// bukan ketelan jadi silent {ok:false} yang menyesatkan.
const TitipanSync = {

// reconcile(a) — gerbang tunggal (SATU titik, dipersiapkan menggantikan
// 5 titik panggil `Aset._syncOwnerDebts(a)` yang ada sekarang, lihat sesi
// 10b) utk sinkronisasi Utang Titipan 1 aset. Wrapper murni sesi ini: 0
// mutasi TAMBAHAN di luar apa yang sudah dilakukan _syncOwnerDebts(a)
// sendiri, 0 rumus baru.
reconcile(a) {
  if (!a) return { ok: false, synced: false, reason: 'no-asset' };
  if (typeof Aset === 'undefined' || typeof Aset._syncOwnerDebts !== 'function') {
    return { ok: false, synced: false, reason: 'sync-unavailable' };
  }
  Aset._syncOwnerDebts(a);
  return { ok: true, synced: true };
},

};

if (typeof module !== 'undefined' && module.exports) module.exports = TitipanSync;
if (typeof window !== 'undefined') window.TitipanSync = TitipanSync;
