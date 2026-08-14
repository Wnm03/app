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

// reconcileAccounts() — 2026-08-14 sesi lanjutan, Rekomendasi #2 dari
// PATCH-NOTES-akun-dana-titipan-sync.md §2 (setelah Rec #1 audit-only/
// checkAccounts() & Rec #3 badge kosmetik selesai sesi-sesi sebelumnya).
// Menutup gap YANG SAMA yang dideteksi TitipanReconcile.checkAccounts():
// akun berdiri-sendiri (bukan tertaut Aset) dgn porsi kepemilikan non-SELF
// (modal "⚖️ Porsi Kepemilikan", akun.js) TIDAK PERNAH bikin baris Buku
// Utang -- fungsi ini yang PERTAMA KALI benar-benar MENULIS baris itu (Rec
// #1 cuma mendeteksi, 0 mutasi, lihat header titipan-reconcile.js).
//
// Pola tulis 1:1 SAMA PERSIS Aset._syncOwnerDebts(a) (aset.js): 1 entry
// utang PER OWNER non-SELF, ditandai di baris utangnya sendiri
// (linkedAccountId+linkedOwnerId, bukan pointer tunggal), owner yang
// dicabut/porsi->0 -> entry OTOMATIS dihapus, akun yang dihapus permanen ->
// seluruh entry linkedAccountId-nya ikut dihapus (dibersihkan di akhir,
// simetris). 0 rumus baru di luar 1 titik: NOMINAL.
//
// KEPUTUSAN DESAIN (ditanya eksplisit ke user sebelum implementasi, lihat
// sesi ini): nominal = recalcAccBalance(acc.id) * porsi/100 -- SALDO AKUN
// SAAT INI, real-time, BUKAN snapshot statis spt a.nilai (Aset)/holdingCost
// (Investasi). Ini kebalikan pola Aset/Investasi (PATCH-NOTES §2 Rec #2 asli
// sempat menyebut ini "risiko sedang-tinggi" justru krn saldo akun berubah
// tiap transaksi, beda dari nilai Aset yg stabil) -- user secara eksplisit
// memilih ikut saldo real-time (bukan snapshot dikunci saat porsi diedit).
// Konsekuensi YANG DISADARI (bukan bug): beda dari _syncOwnerDebts() yang
// nilainya diam kalau a.nilai tidak diedit, baris "Dana titipan akun" di
// Buku Utang ini akan NAIK-TURUN otomatis tiap ada transaksi masuk/keluar di
// akun berdiri-sendiri itu -- sesuai keputusan, bukan efek samping tak
// disengaja.
//
// GERBANG PANGGIL (kenapa "real-time tiap transaksi" TIDAK butuh titik
// panggil baru di transaksi.js): dipanggil dari save() (features-helpers-
// global-security.js), gerbang TUNGGAL yang SUDAH terpanggil sesudah SETIAP
// mutasi transaksi (in/out/transfer) MAUPUN sesudah simpan porsi
// (AccOwners.save()) -- persis pola syncLinkedAssetNilaiFromAkun() (arah
// Akun->Aset) yang sudah lebih dulu dipanggil dari titik yang sama. 0 titik
// baru disentuh di transaksi.js/akun.js sendiri -- exactly alasan modul
// titipan-sync.js ini dibuat sesi 10a ("satu gerbang wajib" drpd tersebar).
//
// Akun TERTAUT ke Aset (a.accountId===acc.id) DILEWATI -- porsinya sudah
// disinkron ke Aset tertaut lewat reconcile(a)/syncLinkedAssetNilaiFromAkun()
// (arah Akun->Aset), exclusion SAMA PERSIS TitipanReconcile.
// _expectedFromAccounts(); kalau ikut dihitung di sini juga, 1 porsi yang
// sama dobel-tercatat (1x linkedAssetId, 1x linkedAccountId).
//
// BEDA dgn reconcile(a) di atas: fungsi ini SATU-SATUNYA di modul ini yang
// benar-benar MENULIS ke D.debts (reconcile(a) cuma membungkus fungsi tulis
// milik Aset). Ditaruh di sini (bukan titipan-reconcile.js) krn modul itu
// sengaja 0-mutasi (lihat header file itu) -- pola sama kenapa
// repairOrphans() ada di titipan-reconcile.js tapi TIDAK dipanggil dari
// checkAll()/warnIfNotOk(), hanya dipisah, di sini malah beda modul sekalian
// supaya audit (baca-saja) & sync (tulis) tetap 2 modul terpisah tegas.
//
// Return: {synced, removed} -- jumlah baris utang ditulis/diupdate & jumlah
// baris dihapus (owner dicabut/akun dihapus/akun baru saja ditautkan ke
// Aset), {synced:0,removed:0} kalau D/D.accounts/recalcAccBalance belum
// tersedia (no-op aman, dipanggil dari save() yang jalan di banyak konteks
// termasuk sebagian test headless).
reconcileAccounts() {
  const result = { synced: 0, removed: 0 };
  if (typeof D === 'undefined' || !Array.isArray(D.debts) || !Array.isArray(D.accounts)) return result;
  if (typeof recalcAccBalance !== 'function') return result;
  const assets = Array.isArray(D.assets) ? D.assets : [];
  const linkedAccountIds = new Set(assets.filter((a) => a && a.accountId != null).map((a) => String(a.accountId)));
  const touchedAccountIds = new Set();
  D.accounts.forEach((acc) => {
    if (!acc || acc.id == null) return;
    if (linkedAccountIds.has(String(acc.id))) return; // sudah kehitung via Aset tertaut, lihat catatan di atas
    touchedAccountIds.add(String(acc.id));
    let owners = [];
    if (typeof MultiOwnerEngine !== 'undefined' && typeof MultiOwnerEngine.getOwners === 'function') {
      let res;
      try { res = MultiOwnerEngine.getOwners(acc); } catch (e) { res = null; }
      owners = (res && res.ok) ? res.owners : [];
    }
    const nonSelfOwners = owners.filter((o) => o && !o.isSelf && o.porsi > 0);
    const balance = recalcAccBalance(acc.id);
    const existingLinked = D.debts.filter((d) => d && d.linkedAccountId != null && String(d.linkedAccountId) === String(acc.id));
    const keepIds = new Set();
    nonSelfOwners.forEach((o) => {
      const amount = balance * (o.porsi / 100);
      const catatan = 'Dana titipan akun: ' + (acc.name || '');
      let debt = existingLinked.find((d) => String(d.linkedOwnerId) === String(o.ownerId));
      if (debt) {
        Object.assign(debt, { name: o.ownerName, nilai: amount, catatan, lunas: amount <= 0 });
      } else {
        debt = {
          id: (typeof uid === 'function' ? uid() : Date.now()),
          name: o.ownerName,
          nilai: amount,
          bunga: 0,
          cicilanBulanan: 0,
          tanggal: (typeof todayStr === 'function' ? todayStr() : ''),
          jatuhTempo: '',
          catatan,
          lunas: amount <= 0,
          linkedAccountId: acc.id,
          linkedOwnerId: o.ownerId,
        };
        D.debts.push(debt);
      }
      keepIds.add(String(o.ownerId));
      result.synced++;
    });
    const before = D.debts.length;
    D.debts = D.debts.filter((d) => !(d && d.linkedAccountId != null && String(d.linkedAccountId) === String(acc.id) && !keepIds.has(String(d.linkedOwnerId))));
    result.removed += before - D.debts.length;
  });
  // Bersihkan baris linkedAccountId "sisa" -- akun yang sudah dihapus
  // permanen (id-nya tidak ketemu di D.accounts sama sekali) ATAU akun yang
  // BARU SAJA ditautkan ke Aset (sekarang ada di linkedAccountIds, jadi
  // dilewati loop di atas & tidak kena touchedAccountIds) -- keduanya harus
  // dibersihkan di sini krn loop di atas cuma iterasi akun yang masih ada &
  // masih berdiri-sendiri.
  const beforeDeleted = D.debts.length;
  D.debts = D.debts.filter((d) => !(d && d.linkedAccountId != null && !touchedAccountIds.has(String(d.linkedAccountId))));
  result.removed += beforeDeleted - D.debts.length;
  return result;
},

};

if (typeof module !== 'undefined' && module.exports) module.exports = TitipanSync;
if (typeof window !== 'undefined') window.TitipanSync = TitipanSync;
