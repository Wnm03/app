// penyusutan-ai-widget.js — Widget "🤖 Rekomendasi AI" utk kartu 📉 Penyusutan
// Dipindah ke modules/asset/penyusutan-ai-widget.js (Sesi 9 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Aset (aset.js: Penyusutan.renderList(), target #assetPenyusutanAI, halaman
// Aset). MODUL BARU — tidak mengubah satu baris pun logic Penyusutan/Aset yang
// sudah ada; file ini HANYA render ke satu container baru yang dipanggil
// SETELAH box #assetPenyusutanList ditulis (pola sama persis dgn
// invest-ai-widget.js -> InvestAI.mountInto(), dipanggil dari
// AlokasiAset.renderOne()).
//
// TUJUAN: baca kondisi D.assets (Buku Aset, aset.js) + setting a.penyusutan
// tiap aset, semua lewat guard `typeof X!=='undefined'` spy aman
// dites/berdiri sendiri, lalu kasih catatan praktis (BUKAN saran akuntansi/
// pajak berlisensi):
//   - Aset yang jenisnya biasanya MENURUN nilainya (Kendaraan/Rumah-Bangunan)
//     tapi penyusutannya belum diaktifkan sama sekali.
//   - Aset Tanah yang malah diaktifkan penyusutannya (tanah lazimnya TIDAK
//     disusutkan krn nilainya cenderung naik/stabil, beda dgn bangunan di
//     atasnya).
//   - Aset yang penyusutannya aktif tapi datanya belum lengkap (Harga
//     Perolehan kosong) — sudah ada warning per-baris, di sini direkap jadi
//     satu catatan ringkas kalau lebih dari satu.
//   - Aset (metode Garis Lurus) yang sudah mencapai akhir umur manfaat.
//   - Aset yang nilai bukunya sudah tersisa sangat kecil (<=20%) dari Harga
//     Perolehan tapi belum habis umur manfaat — sinyal utk cek kondisi fisik.

function _paFmtRp(n) {
  return typeof fmtFull === 'function' ? fmtFull(n) : 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}
function _paEsc(s) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s);
}

// Jenis aset yang LAZIMNYA menurun nilainya (kandidat kuat utk penyusutan).
const PENYUSUTAN_AI_JENIS_MENURUN = ['Kendaraan', 'Rumah/Bangunan'];
// Jenis aset yang LAZIMNYA tidak disusutkan (nilai cenderung naik/stabil).
const PENYUSUTAN_AI_JENIS_TIDAK_SUSUT = ['Tanah', 'Emas/Logam Mulia', 'Saham', 'Reksadana', 'Kripto', 'Deposito/Investasi'];

const PenyusutanAI = {

  _assets() {
    if (typeof D === 'undefined' || !Array.isArray(D.assets)) return [];
    return D.assets;
  },

  // 1) Kandidat kuat (Kendaraan/Rumah-Bangunan) yang belum aktifkan penyusutan.
  _checkBelumAktif() {
    const list = PenyusutanAI._assets().filter((a) => PENYUSUTAN_AI_JENIS_MENURUN.includes(a.jenis) && !(a.penyusutan && a.penyusutan.aktif));
    if (!list.length) return [];
    const contoh = list.slice(0, 3).map((a) => _paEsc(a.name)).join(', ');
    const sisa = list.length > 3 ? ` (+${list.length - 3} lagi)` : '';
    return [{
      icon: '📉',
      text: `${list.length} aset (${contoh}${sisa}) biasanya nilainya menurun dari waktu ke waktu, tapi penyusutannya belum diaktifkan. Aktifkan supaya Nilai Buku & estimasi Kekayaan Bersih lebih realistis.`,
      priority: 2,
    }];
  },

  // 2) Tanah yang malah diaktifkan penyusutannya (lazimnya tidak disusutkan).
  _checkTanahDisusutkan() {
    const list = PenyusutanAI._assets().filter((a) => PENYUSUTAN_AI_JENIS_TIDAK_SUSUT.includes(a.jenis) && a.penyusutan && a.penyusutan.aktif);
    if (!list.length) return [];
    const contoh = list.slice(0, 3).map((a) => _paEsc(a.name)).join(', ');
    const sisa = list.length > 3 ? ` (+${list.length - 3} lagi)` : '';
    return [{
      icon: '🧭',
      text: `Penyusutan aktif di ${contoh}${sisa} — jenis aset ini lazimnya nilainya cenderung naik/stabil (bukan menurun), jadi penyusutan mungkin kurang cocok. Pertimbangkan matikan & pantau nilainya lewat kartu 💹 Performa Investasi saja.`,
      priority: 3,
    }];
  },

  // 3) Penyusutan aktif tapi Harga Perolehan belum diisi (tidak bisa dihitung).
  _checkDataBelumLengkap() {
    if (typeof Penyusutan === 'undefined') return [];
    const list = PenyusutanAI._assets().filter((a) => a.penyusutan && a.penyusutan.aktif && a.penyusutan.metode !== 'manual' && Penyusutan.hargaPerolehan(a) == null);
    if (!list.length) return [];
    const contoh = list.slice(0, 3).map((a) => _paEsc(a.name)).join(', ');
    const sisa = list.length > 3 ? ` (+${list.length - 3} lagi)` : '';
    return [{
      icon: '⚠️',
      text: `${list.length} aset (${contoh}${sisa}) sudah aktifkan penyusutan tapi Modal Investasi / Harga Beli × Jumlah Unit-nya belum diisi, jadi belum bisa dihitung. Lengkapi dulu lewat Edit Aset.`,
      priority: 1,
    }];
  },

  // 4) Aset (Garis Lurus) yang sudah mencapai akhir umur manfaat.
  _checkHabisManfaat() {
    if (typeof Penyusutan === 'undefined') return [];
    const list = PenyusutanAI._assets().filter((a) => {
      if (!(a.penyusutan && a.penyusutan.aktif)) return false;
      const hasil = Penyusutan.hitung(a);
      return !!(hasil && hasil.habisManfaat);
    });
    if (!list.length) return [];
    const contoh = list.slice(0, 3).map((a) => _paEsc(a.name)).join(', ');
    const sisa = list.length > 3 ? ` (+${list.length - 3} lagi)` : '';
    return [{
      icon: '✅',
      text: `${list.length} aset (${contoh}${sisa}) sudah mencapai akhir umur manfaat estimasinya. Kalau masih dipakai, tidak masalah; kalau sudah waktunya ganti, ini bisa jadi pengingat evaluasi.`,
      priority: 4,
    }];
  },

  // 5) Nilai buku tersisa <=20% dari Harga Perolehan tapi belum habis manfaat.
  _checkNilaiBukuKecil() {
    if (typeof Penyusutan === 'undefined') return [];
    const hits = [];
    PenyusutanAI._assets().forEach((a) => {
      if (!(a.penyusutan && a.penyusutan.aktif)) return;
      const hasil = Penyusutan.hitung(a);
      if (!hasil || hasil.habisManfaat || hasil.hargaPerolehan == null || hasil.hargaPerolehan <= 0) return;
      const pct = hasil.nilaiBuku / hasil.hargaPerolehan;
      if (pct <= 0.2) hits.push({ name: a.name, pct, nilaiBuku: hasil.nilaiBuku });
    });
    if (!hits.length) return [];
    hits.sort((a, b) => a.pct - b.pct);
    const worst = hits[0];
    const sisa = hits.length > 1 ? ` (+${hits.length - 1} aset lain dgn kondisi serupa)` : '';
    return [{
      icon: '🔧',
      text: `Nilai buku ${_paEsc(worst.name)} tinggal ${Math.round(worst.pct * 100)}% (${_paFmtRp(worst.nilaiBuku)}) dari Harga Perolehan${sisa}. Kalau ini kendaraan/peralatan yang masih dipakai, cek kondisi fisiknya — kadang saat ini justru momen yang pas buat rencanakan penggantian.`,
      priority: 4,
    }];
  },

  // ---------- API utama ----------
  generateRecommendations() {
    if (typeof D === 'undefined') return [];
    const all = [
      ...PenyusutanAI._checkDataBelumLengkap(),
      ...PenyusutanAI._checkBelumAktif(),
      ...PenyusutanAI._checkTanahDisusutkan(),
      ...PenyusutanAI._checkHabisManfaat(),
      ...PenyusutanAI._checkNilaiBukuKecil(),
    ];
    return all.sort((a, b) => a.priority - b.priority).slice(0, 5);
  },

  buildWidgetHtml(recommendations) {
    const list = recommendations && recommendations.length ? recommendations : null;
    const itemsHtml = list
      ? list.map((r) => `<div class="fg" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">
          <span>${r.icon}</span><span style="font-size:12px;line-height:1.5">${r.text}</span>
        </div>`).join('')
      : `<div class="fg" style="font-size:12px;color:var(--text2)">Belum ada catatan otomatis — aktifkan penyusutan di aset yang relevan (kendaraan/bangunan) supaya rekomendasi mulai muncul di sini.</div>`;
    return `
      <div class="u-fs11 u-t2 u-mt10 u-mb4" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px">🤖 Rekomendasi AI</div>
      <div id="penyusutanAiList">${itemsHtml}</div>
    `;
  },

  // mountInto(el) — SATU-SATUNYA fungsi yang sentuh DOM. Dipanggil dari
  // aset.js (Penyusutan.renderList()) SETELAH #assetPenyusutanList ditulis.
  // Container-nya sendiri (#assetPenyusutanAI) TERPISAH dari box per-aset,
  // jadi di sini boleh langsung set innerHTML (bukan append spt InvestAI,
  // krn tidak ada konten lain yg perlu dipertahankan di container ini).
  mountInto(el) {
    if (!el || typeof document === 'undefined') return;
    el.innerHTML = PenyusutanAI.buildWidgetHtml(PenyusutanAI.generateRecommendations());
  },
};

if (typeof window !== 'undefined') {
  window.PenyusutanAI = PenyusutanAI;
}
