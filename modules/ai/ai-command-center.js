// ai-command-center.js — Sprint 3 Tahap 3.1: AI Command Center Foundation.
// Dipindah ke modules/ai/ai-command-center.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
//
// SCOPE Tahap 3.1 (Foundation SAJA):
//   Menyediakan satu registry netral tempat modul lain (Tahap 3.2+)
//   MENDAFTARKAN "command" AI (aksi yang bisa dijalankan lewat command
//   palette / asisten AI di masa depan) — TANPA UI, TANPA command bawaan
//   apa pun, dan TANPA menyentuh sistem yang sudah ada. File ini murni
//   mekanisme registry + eksekusi aman, sama sekali tidak berisi logic
//   bisnis (tidak ada satu command pun yang di-register di sini).
//
// KENAPA BUKAN FEATURE_REGISTRY (dashboard-hub-registry.js):
//   FEATURE_REGISTRY adalah taksonomi NAVIGASI (page/tab/goTo/action target
//   utk membuka kartu/menu yang SUDAH ADA di UI) — dikonsumsi DashboardHub.
//   AICommandCenter adalah registry AKSI YANG BISA DIEKSEKUSI (fungsi
//   `run`, dipanggil langsung, bukan navigasi ke halaman) — kebutuhan
//   berbeda, konsumen berbeda (masa depan: AI command palette / asisten),
//   dan SENGAJA dipisah supaya kontrak FEATURE_REGISTRY yang sudah dites
//   luas (dashboard-hub-registry.test.js dkk.) tidak tersentuh sama
//   sekali. File ini tidak membaca maupun menulis FEATURE_REGISTRY.
//
// KENAPA MURNI LOGIC (tidak ada DOM/render):
//   Sama seperti dashboard-hub-registry.js (Tahap 0 Dashboard Hub) —
//   fondasi data/registry didahulukan, UI (command palette, dsb.)
//   menyusul di tahap terpisah setelah fondasi ini stabil & dites.
//
// TIDAK DIUBAH oleh file ini: FEATURE_REGISTRY, Dashboard V2, business
// logic modul manapun (akun/cicilan/cobek/vehicle/dll). File ini murni
// aditif — modul lain baru mulai memanggil AICommandCenter.registerCommand()
// di tahap selanjutnya; sampai saat itu, registry ini kosong & tidak
// berefek apa pun ke app yang berjalan.

const AICommandCenter = {
  // Internal state — array of { id, label, description, category, run }.
  // SENGAJA tidak pakai object map (id -> cmd) supaya urutan pendaftaran
  // (insertion order) terjaga apa adanya utk konsumen UI masa depan
  // (mis. urutan tampil di command palette), sama seperti pola array-based
  // FEATURE_REGISTRY, bukan preferensi Object.keys() yang tidak dijamin
  // stabil lintas engine untuk semua bentuk key.
  _commands: [],

  // registerCommand(cmd) — satu-satunya jalur pendaftaran command.
  // Validasi minimal tapi ketat pada field yang dibutuhkan eksekusi aman:
  //   id          : string non-kosong, HARUS unik (duplikat ditolak diam2,
  //                 pola sama dgn resolveFavoritEntries: skip silent utk
  //                 data tidak valid, bukan throw — supaya satu modul yang
  //                 salah daftar tidak bisa mematikan modul lain yang
  //                 sudah lebih dulu register di app yang sama).
  //   label       : string non-kosong (nama tampil, dipakai UI masa depan).
  //   run         : function (badan aksi). WAJIB ada — command tanpa `run`
  //                 tidak ada gunanya di Command Center (beda dgn
  //                 FEATURE_REGISTRY yang boleh kategori tanpa target).
  //   description : optional, default string kosong.
  //   category    : optional, default 'general' — pengelompokan longgar
  //                 utk UI masa depan, TIDAK divalidasi terhadap daftar
  //                 tetap apa pun (supaya modul baru bebas menambah
  //                 kategori tanpa perlu edit file ini).
  // Return: true kalau berhasil didaftarkan, false kalau ditolak (invalid
  // atau id duplikat) — dipakai pemanggil utk tahu apakah perlu
  // menyesuaikan id, bukan exception yang bisa menghentikan boot modul lain.
  registerCommand(cmd) {
    if (!cmd || typeof cmd !== 'object') return false;
    if (typeof cmd.id !== 'string' || cmd.id.trim() === '') return false;
    if (typeof cmd.label !== 'string' || cmd.label.trim() === '') return false;
    if (typeof cmd.run !== 'function') return false;
    if (this._commands.some((c) => c.id === cmd.id)) return false; // id harus unik

    this._commands.push({
      id: cmd.id,
      label: cmd.label,
      description: typeof cmd.description === 'string' ? cmd.description : '',
      category: typeof cmd.category === 'string' && cmd.category.trim() !== '' ? cmd.category : 'general',
      run: cmd.run,
    });
    return true;
  },

  // unregisterCommand(id) — kebalikan registerCommand(). Return true kalau
  // ada entry yang dihapus, false kalau id tidak ditemukan. Disediakan dari
  // Foundation ini (bukan ditunda ke tahap UI) karena modul yang mendaftar
  // command butuh cara bersih utk melepas command saat modulnya di-teardown
  // (mis. fitur yang dinonaktifkan lewat toggle), tanpa harus reset seluruh
  // registry lewat clear().
  unregisterCommand(id) {
    const idx = this._commands.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this._commands.splice(idx, 1);
    return true;
  },

  // getCommands() — copy array BERISI copy tiap command object (bukan
  // referensi internal, di kedua level: array maupun object-nya), supaya
  // pemanggil tidak bisa memutasi registry langsung dari luar (satu-satunya
  // jalur mutasi tetap registerCommand/unregisterCommand/clear), pola sama
  // dgn DashboardHubFavorit.getFavoritKeys(). Object.assign({}, c) — bukan
  // JSON.parse(JSON.stringify(c)) — supaya `run` (function) ikut terbawa,
  // bukan hilang (JSON tidak bisa serialize function).
  getCommands() {
    return this._commands.map((c) => Object.assign({}, c));
  },

  // getCommand(id) — cari satu command, null kalau tidak ada. Return
  // shallow copy juga (bukan referensi array internal) utk alasan yang
  // sama seperti getCommands().
  getCommand(id) {
    const found = this._commands.find((c) => c.id === id);
    return found ? Object.assign({}, found) : null;
  },

  // execute(id, ...args) — satu-satunya jalur eksekusi command. Foundation
  // ini SENGAJA membungkus run() dalam try/catch: command didaftarkan oleh
  // modul lain (kode yang file ini tidak kontrol), jadi satu command yang
  // error TIDAK BOLEH melempar exception mentah ke pemanggil (mis. UI
  // command palette masa depan) — dikembalikan sebagai hasil terstruktur
  // supaya pemanggil bisa menampilkan pesan gagal tanpa crash.
  // Return bentuk seragam: { ok: boolean, result?, error? }.
  execute(id, ...args) {
    const cmd = this._commands.find((c) => c.id === id);
    if (!cmd) return { ok: false, error: 'not_found' };
    try {
      const result = cmd.run(...args);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: (err && err.message) ? err.message : String(err) };
    }
  },

  // clear() — kosongkan registry. Dipakai test harness utk isolasi antar
  // test (window/global sandbox bisa reuse instance yang sama antar test
  // file dalam satu proses `node --test`), BUKAN dipanggil app runtime
  // dalam kondisi normal (tidak ada satu pun pemanggil clear() dari modul
  // lain per Tahap 3.1 — kalau nanti dipakai runtime, wajib didokumentasikan
  // ulang di sini kenapa).
  clear() {
    this._commands = [];
  },
};

if (typeof window !== 'undefined') {
  window.AICommandCenter = AICommandCenter;
}
