'use strict';
// S2433.3 (KONTRAK DETEKSI KONFLIK, NON-MUTATIF): fungsi murni, tidak dimuat oleh aplikasi/bundle.
// Hanya MEMBACA daftar kendaraan; tidak mengubah input, tidak menulis apa pun, tanpa efek samping.
// Deterministik: input sama -> keluaran sama (urut berdasarkan indeks kendaraan, lalu urutan kategori).
// Kontrak: docs/KONTRAK-S2433-3-DETEKSI-KONFLIK.md
const DIKENAL = Object.freeze(['motor', 'mobil', 'listrik']);
const KATEGORI = Object.freeze({
  KONFLIK: 'konflik_jenis_vs_vehicletype',            // keduanya motor/mobil, berbeda
  LINTAS_KONSEP: 'beda_lintas_konsep_perlu_kontrak_domain', // salah satu 'listrik', berbeda: JANGAN disamakan
  TIDAK_LENGKAP: 'data_tidak_lengkap',                // tepat satu field kosong
  TANPA_TIPE: 'tanpa_tipe',                           // kedua field kosong
  NILAI_TIDAK_VALID: 'nilai_tidak_valid',             // nilai di luar daftar dikenal (per field)
  SNAPSHOT_BEDA: 'snapshot_beda_dari_sumber',         // sot.vehicleType != nilai efektif
  PROFIL_MODEL_BEDA: 'profil_model_beda_dari_tersimpan' // profil model (opsional) != nilai tersimpan
});
const norm = (x) => { const t = String(x == null ? '' : x).trim().toLowerCase(); return t || null; };

// opts.profilModel (opsional): { [modelId]: 'motor'|'mobil'|'listrik' } -- hanya dibaca.
function deteksiKonflik(vehicles, opts) {
  const profil = (opts && opts.profilModel) || null;
  const temuan = [];
  const daftar = Array.isArray(vehicles) ? vehicles : [];
  let diperiksa = 0;
  daftar.forEach((v, index) => {
    if (!v || typeof v !== 'object') return;
    diperiksa++;
    const jenis = norm(v.jenis), vt = norm(v.vehicleType), snap = norm(v.sot && v.sot.vehicleType);
    const modelId = v.modelId || null;
    const efektif = vt || jenis; // urutan yang dipakai audit SOT Car Notes
    const buat = (kategori, sumber, extra) => temuan.push(Object.assign({
      id: v.id == null ? null : v.id, index, nama: v.name == null ? null : v.name,
      kategori, jenis, vehicleType: vt, snapshot: snap, modelId, sumber }, extra || {}));
    if (jenis && vt) {
      if (jenis !== vt && DIKENAL.includes(jenis) && DIKENAL.includes(vt)) {
        buat((jenis === 'listrik' || vt === 'listrik') ? KATEGORI.LINTAS_KONSEP : KATEGORI.KONFLIK, 'jenis|vehicleType');
      }
    } else if (jenis || vt) {
      buat(KATEGORI.TIDAK_LENGKAP, 'jenis|vehicleType', { fieldKosong: jenis ? 'vehicleType' : 'jenis' });
    } else {
      buat(KATEGORI.TANPA_TIPE, 'jenis|vehicleType');
    }
    if (jenis && !DIKENAL.includes(jenis)) buat(KATEGORI.NILAI_TIDAK_VALID, 'jenis', { field: 'jenis', nilai: jenis });
    if (vt && !DIKENAL.includes(vt)) buat(KATEGORI.NILAI_TIDAK_VALID, 'vehicleType', { field: 'vehicleType', nilai: vt });
    if (snap && efektif && snap !== efektif) buat(KATEGORI.SNAPSHOT_BEDA, 'sot.vehicleType', { nilaiEfektif: efektif });
    if (profil && modelId && Object.prototype.hasOwnProperty.call(profil, modelId)) {
      const p = norm(profil[modelId]);
      if (p && efektif && p !== efektif) buat(KATEGORI.PROFIL_MODEL_BEDA, 'profilModel', { nilaiProfil: p, nilaiEfektif: efektif });
    }
  });
  const ringkasan = {}; Object.values(KATEGORI).forEach((k) => { ringkasan[k] = 0; });
  temuan.forEach((t) => { ringkasan[t.kategori]++; });
  return { totalDiperiksa: diperiksa, ringkasan, temuan };
}
module.exports = { deteksiKonflik, KATEGORI, DIKENAL };
