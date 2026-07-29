#!/usr/bin/env node
'use strict';
// scripts/cleanup-backups.js — Sesi 293 (tindak lanjut audit eksternal: folder
// backups/ tumbuh terus tanpa retensi, tiap `node scripts/build.js` menyimpan
// salinan app-bundle-a.min.*.js & app-bundle-b.min.*.js lama tanpa batas).
//
// Retensi sederhana: simpan N backup TERBARU per bundle (default 10), hapus
// sisanya. "Terbaru" ditentukan dari mtime file (bukan parsing nama file),
// supaya tetap benar walau format label di nama file berubah-ubah.
//
// Dry-run by default — HANYA menampilkan apa yang AKAN dihapus & berapa
// ruang yang dihemat. Tambah --apply untuk benar-benar menghapus.
// TIDAK dipanggil otomatis dari build.js (sengaja) — jalankan manual saat
// folder backups/ ingin dirapikan.
//
// Pemakaian:
//   node scripts/cleanup-backups.js               # dry-run, keep=10
//   node scripts/cleanup-backups.js --keep=5       # dry-run, keep=5
//   node scripts/cleanup-backups.js --apply        # betulan hapus, keep=10
//   node scripts/cleanup-backups.js --keep=5 --apply

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const keepArg = argv.find((a) => a.startsWith('--keep='));
  const keep = keepArg ? parseInt(keepArg.split('=')[1], 10) : 10;
  return { apply, keep: Number.isFinite(keep) && keep >= 0 ? keep : 10 };
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Grup nama file backup per "bundle key" (mis. "app-bundle-a", "app-bundle-b")
// supaya retensi dihitung TERPISAH per bundle, bukan digabung.
function bundleKeyOf(filename) {
  const m = filename.match(/^(app-bundle-[a-z])\.min\./);
  return m ? m[1] : filename.replace(/\.[^.]+$/, '');
}

function run() {
  const { apply, keep } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`Tidak ada folder backups/ di ${BACKUP_DIR} — tidak ada yang perlu dibersihkan.`);
    return;
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => fs.statSync(path.join(BACKUP_DIR, f)).isFile())
    .map((f) => {
      const full = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(full);
      return { name: f, full, mtimeMs: stat.mtimeMs, size: stat.size, key: bundleKeyOf(f) };
    });

  if (!files.length) {
    console.log('Folder backups/ kosong — tidak ada yang perlu dibersihkan.');
    return;
  }

  const byKey = new Map();
  files.forEach((f) => {
    if (!byKey.has(f.key)) byKey.set(f.key, []);
    byKey.get(f.key).push(f);
  });

  let totalToDelete = 0;
  let totalBytes = 0;
  const toDelete = [];

  byKey.forEach((group, key) => {
    group.sort((a, b) => b.mtimeMs - a.mtimeMs); // terbaru dulu
    const kept = group.slice(0, keep);
    const removed = group.slice(keep);
    console.log(`\n${key}: ${group.length} backup ditemukan, simpan ${kept.length} terbaru, hapus ${removed.length}`);
    removed.forEach((f) => {
      toDelete.push(f);
      totalToDelete += 1;
      totalBytes += f.size;
      console.log(`  ${apply ? '🗑  menghapus' : '(akan dihapus)'} ${f.name}  (${humanSize(f.size)})`);
    });
  });

  console.log(`\nTotal: ${totalToDelete} file, ${humanSize(totalBytes)} ${apply ? 'dihapus' : 'akan dihemat kalau dijalankan dengan --apply'}.`);

  if (apply) {
    toDelete.forEach((f) => fs.unlinkSync(f.full));
    console.log('✅ Selesai menghapus backup lama.');
  } else if (totalToDelete > 0) {
    console.log('ℹ️  Ini masih dry-run. Jalankan ulang dengan --apply untuk benar-benar menghapus.');
  }
}

run();
