#!/usr/bin/env node
'use strict';
// scripts/verify-bundle-freshness.js — S365 (tier-2, lanjutan audit
// ScannerSession self-heal s360-s364, rekomendasi tier-2 dari
// FIX-s362-scannersession-global-watchdog.md yang belum dikerjakan sesi
// s363/s364).
//
// Masalah yang dicegah: pola bug s326->s328. Kronologi asli: patch S326
// mengganti handler tombol Bayar/Riwayat di SOURCE (modules-render.js), tapi
// app-bundle-b.min.js yang BENERAN dipakai browser sempat TIDAK di-rebuild
// sebelum di-upload -> tombol tidak merespons di app sungguhan walau
// source-nya sudah "benar". Ketahuan lewat laporan user, bukan sebelum
// deploy (lihat AUDIT-S328-CLICK-REGRESSION.md, FIX-s326-dead-wrapper-
// stale-test.md).
//
// `node scripts/build.js` SENDIRI tidak bisa mendeteksi pola ini — build.js
// SELALU nge-rebuild bundle dari source tiap dipanggil, jadi kalau memang
// dijalankan, bundle otomatis segar. Risikonya justru saat build.js TIDAK
// dijalankan sama sekali sebelum upload (lupa, atau upload manual file lama
// dari clone/branch lain) — build.js tidak pernah punya kesempatan
// mendeteksi itu krn dia sendiri tidak dipanggil.
//
// Skrip ini berdiri sendiri (TIDAK menjalankan build.js / tidak menulis
// apa pun) — cukup baca marker hash di baris pertama bundle (ditulis
// buildBundle(), lihat scripts/bundle-hash.js) & bandingkan dengan hash
// yang dihitung ulang dari source SAAT INI. Cocok dipakai sbg langkah
// terakhir sebelum upload/deploy, atau step CI terpisah dari build.
//
// Pemakaian:
//   node scripts/verify-bundle-freshness.js
// Exit 0 kalau kedua bundle segar (hash cocok), exit 1 kalau ada yang basi
// atau belum pernah dibangun dengan marker ini.

const fs = require('fs');
const path = require('path');
const { computeGroupHash, extractEmbeddedHash } = require('./bundle-hash');

const ROOT = path.join(__dirname, '..');
function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Duplikasi minimal GROUP_A/GROUP_B dari build.js DIHINDARI supaya skrip ini
// tetap ringan (tidak import seluruh build.js, yang juga akan menjalankan
// module-level const seperti ALL_SOURCE, OVERSIZED_FILE_ALLOWLIST, dst) —
// tapi itu berarti kalau GROUP_A/GROUP_B di build.js berubah, daftar di
// bawah HARUS ikut disamakan manual. Untuk menghindari drift diam-diam,
// bundleDefs() membaca ulang GROUP_A/GROUP_B langsung dari build.js via
// regex sederhana alih-alih menyalin daftar file — satu sumber kebenaran
// tetap di build.js, skrip ini cuma "membaca", tidak duplikasi datanya.
function extractGroupFromBuildJs(buildJsSrc, constName) {
  const re = new RegExp(`const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = buildJsSrc.match(re);
  if (!m) throw new Error(`Tidak bisa menemukan const ${constName} di scripts/build.js — cek apakah nama/format berubah.`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((mm) => mm[1]);
}

function bundleDefs() {
  const buildJsSrc = readFile('scripts/build.js');
  return [
    { group: extractGroupFromBuildJs(buildJsSrc, 'GROUP_A'), outFile: 'app-bundle-a.min.js' },
    { group: extractGroupFromBuildJs(buildJsSrc, 'GROUP_B'), outFile: 'app-bundle-b.min.js' },
  ];
}

// checkBundleFreshness() — diekstrak S767 supaya bisa dipanggil sbg gate
// dari scripts/verify-release-ready.js (Gate baru "bundle-freshness"),
// bukan cuma lewat CLI terpisah `npm run verify-bundle`. Alasan: gate S424
// (verify-release-ready.js) SEHARUSNYA jadi satu-satunya pemeriksaan wajib
// sebelum ZIP (lihat docs/ZIP_RULES.md), tapi sebelum S767 skrip itu TIDAK
// pernah memanggil pengecekan freshness ini sama sekali -- artinya insiden
// S756 (bundle basi lolos sampai ke user) bisa saja lolos LAGI walau
// "npm run release-check" sudah dijalankan & lolos, selama orangnya lupa
// menjalankan `npm run verify-bundle` secara terpisah. Fungsi ini murni
// (tidak console.log/process.exit) supaya aman dipanggil dari modul lain;
// main()/CLI di bawah tetap pakai perilaku cetak+exit yang sama seperti
// sebelumnya.
function checkBundleFreshness() {
  const results = [];
  for (const { group, outFile } of bundleDefs()) {
    const bundlePath = path.join(ROOT, outFile);
    if (!fs.existsSync(bundlePath)) {
      results.push({ file: outFile, status: 'missing' });
      continue;
    }
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    const embedded = extractEmbeddedHash(bundleContent);
    const current = computeGroupHash(group, readFile);
    if (embedded === null) {
      results.push({ file: outFile, status: 'no-marker' });
    } else if (embedded !== current) {
      results.push({ file: outFile, status: 'stale', embedded, current });
    } else {
      results.push({ file: outFile, status: 'fresh', hash: current });
    }
  }
  return results;
}

function main() {
  const results = checkBundleFreshness();
  let anyStale = false;
  for (const r of results) {
    if (r.status === 'missing') {
      console.error(`❌ ${r.file} tidak ditemukan — jalankan node scripts/build.js dulu.`);
      anyStale = true;
    } else if (r.status === 'no-marker') {
      console.error(`❌ ${r.file} — belum punya marker hash (dibangun dgn build.js versi lama sebelum S365). Jalankan node scripts/build.js untuk rebuild.`);
      anyStale = true;
    } else if (r.status === 'stale') {
      console.error(`❌ ${r.file} BASI — hash source saat ini (${r.current}) tidak cocok dengan hash tertanam di bundle (${r.embedded}). Source sudah berubah sejak bundle ini terakhir di-build. Jalankan node scripts/build.js lalu upload ULANG bundle-nya sebelum deploy.`);
      anyStale = true;
    } else {
      console.log(`✓ ${r.file} segar (hash source cocok: ${r.hash})`);
    }
  }
  if (anyStale) {
    console.error('\n❌ Verifikasi GAGAL — jangan upload/deploy sampai semua bundle segar.');
    process.exit(1);
  }
  console.log('\n✅ Semua bundle segar & siap deploy.');
}

module.exports = { bundleDefs, checkBundleFreshness };

if (require.main === module) main();
