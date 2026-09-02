#!/usr/bin/env node
/**
 * cleanup-duplicate-pricehistory.js
 * ----------------------------------
 * Sesi S711 (backlog dari SESSION-NOTE-S710.md, "Bug 1").
 *
 * MASALAH:
 *   Kode aplikasi saat ini SUDAH punya fix supaya priceHistory di
 *   `partsStock[i].priceHistory` tidak dobel saat transaksi tersimpan.
 *   Tapi backup lama (sebelum fix itu masuk) masih menyimpan entri
 *   priceHistory yang identik dobel utk txId yang sama (mis. "ban
 *   belakang 90/90" & "pentil tubles"). Ini murni data lama yg
 *   kebobolan, BUKAN bug aktif di kode.
 *
 * APA YANG DILAKUKAN SCRIPT INI:
 *   1. Baca file backup JSON (hasil export dari app).
 *   2. Untuk tiap item di `partsStock`, buang entri `priceHistory`
 *      yang isinya identik persis (deep-equal) dengan entri lain di
 *      array yang sama — sisakan kemunculan pertama saja.
 *   3. Tidak mengubah field lain (qty, price, avgPrice, txRefs, dst)
 *      — murni membersihkan log riwayat yang dobel, 0 perubahan ke
 *      saldo/stok.
 *   4. Tulis backup baru + cetak ringkasan item mana saja yg dibersihkan.
 *
 * CARA PAKAI:
 *   node cleanup-duplicate-pricehistory.js <input-backup.json> [output-backup.json]
 *
 *   Kalau [output-backup.json] tidak diisi, hasil ditulis ke
 *   "<input>.cleaned.json" di folder yang sama (file asli TIDAK ditimpa).
 *
 * AMAN dijalankan berkali-kali (idempotent) — kalau tidak ada duplikat,
 * script hanya melapor "0 item dibersihkan" dan tetap menulis salinan.
 */

const fs = require('fs');
const path = require('path');

function main() {
  const [, , inputPath, outputPathArg] = process.argv;

  if (!inputPath) {
    console.error('Cara pakai: node cleanup-duplicate-pricehistory.js <input-backup.json> [output-backup.json]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`File tidak ditemukan: ${resolvedInput}`);
    process.exit(1);
  }

  const outputPath = outputPathArg
    ? path.resolve(outputPathArg)
    : resolvedInput.replace(/\.json$/i, '') + '.cleaned.json';

  const raw = fs.readFileSync(resolvedInput, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Gagal parse JSON:', e.message);
    process.exit(1);
  }

  const partsStock = Array.isArray(data.partsStock) ? data.partsStock : [];
  const report = [];

  for (const item of partsStock) {
    if (!Array.isArray(item.priceHistory) || item.priceHistory.length < 2) continue;

    const seen = new Set();
    const deduped = [];
    let removed = 0;

    for (const entry of item.priceHistory) {
      const key = JSON.stringify(entry);
      if (seen.has(key)) {
        removed++;
        continue;
      }
      seen.add(key);
      deduped.push(entry);
    }

    if (removed > 0) {
      item.priceHistory = deduped;
      report.push({
        id: item.id,
        name: item.name,
        entriesBefore: item.priceHistory.length + removed,
        entriesAfter: item.priceHistory.length,
        duplikatDibuang: removed,
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

  console.log('=== Pembersihan priceHistory dobel (partsStock) ===');
  if (report.length === 0) {
    console.log('Tidak ada duplikat ditemukan. File tetap ditulis (salinan bersih) ke:');
  } else {
    console.log(`${report.length} item dibersihkan:`);
    for (const r of report) {
      console.log(`  - ${r.name} (${r.id}): ${r.entriesBefore} -> ${r.entriesAfter} entri (buang ${r.duplikatDibuang})`);
    }
    console.log('\nHasil ditulis ke:');
  }
  console.log(`  ${outputPath}`);
  console.log('\nCatatan: hanya priceHistory yang disentuh. qty, price, avgPrice, txRefs,');
  console.log('dan semua field lain TIDAK diubah — jadi aman untuk saldo/laporan stok.');
}

main();
