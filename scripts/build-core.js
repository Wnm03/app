'use strict';

/**
 * Core build operations extracted from build.js.
 * The implementations are kept unchanged and receive existing dependencies
 * through a small context object to avoid changing runtime/build behavior.
 */
module.exports = function createBuildCore(ctx) {
  const {
    ROOT, ALL_SOURCE, readFile, writeFile, fs, path, computeGroupHash, markerLine, Buffer,
  } = ctx;

// 1. Deteksi versi sekarang dari features-helpers-global-security.js (sumber APP_BUILD_VERSION)
function detectCurrentVersion() {
  // SINGLE SOURCE OF TRUTH: only the canonical shared source owns the
  // application build version. HTML, Service Worker and bundles are derived
  // artifacts and MUST NEVER participate in version detection.
  const canonicalFile = 'modules/shared/features-helpers-global-security.js';
  const canonical = readFile(canonicalFile);
  const m = canonical.match(/APP_BUILD_VERSION\s*=\s*'([^']+)'/);
  if (!m) throw new Error(`SOT versi aplikasi tidak ditemukan di ${canonicalFile}.`);
  const value = m[1];
  if (!/(\d+)$/.test(value)) throw new Error(`APP_BUILD_VERSION canonical '${value}' harus memiliki nomor release di akhir.`);
  return value;
}

function computeNextVersion(current, explicit) {
  const currentNumMatch = current.match(/(\d+)$/);
  const currentNum = currentNumMatch ? Number(currentNumMatch[1]) : null;
  if (explicit) {
    // Numeric explicit versions inherit the current version prefix, preventing
    // accidental downgrade from mixed HTML/SW/source versions.
    if (/^\d+$/.test(explicit) && currentNum !== null) {
      const n = Number(explicit);
      if (n < currentNum) throw new Error(`Versi eksplisit ${explicit} lebih rendah dari versi aktif ${current} — build downgrade ditolak.`);
      return current.slice(0, current.length - currentNumMatch[1].length) + explicit;
    }
    if (currentNum !== null && (explicit.match(/(\d+)$/) || [])[1] && Number((explicit.match(/(\d+)$/) || [])[1]) < currentNum) {
      throw new Error(`Versi eksplisit ${explicit} lebih rendah dari versi aktif ${current} — build downgrade ditolak.`);
    }
    return explicit;
  }
  // Format lama: "...-32" (angka polos di akhir) -> naikkan angka itu.
  const mTrailing = current.match(/^(.*-)(\d+)$/);
  if (mTrailing) {
    return mTrailing[1] + (parseInt(mTrailing[2], 10) + 1);
  }
  // Format konvensi terkini: "sNNN-slug-bebas" (slug TIDAK diakhiri angka,
  // mis. "s281-lifeos-areas-icon-svg") -> naikkan nomor sesi (sNNN),
  // slug dipertahankan apa adanya (hanya berarti "rebuild dari versi ini").
  const mSession = current.match(/^s(\d+)-(.+)$/);
  if (mSession) {
    const nextNum = parseInt(mSession[1], 10) + 1;
    return `s${nextNum}-${mSession[2]}`;
  }
  throw new Error(
    `Format versi "${current}" tidak dikenali (harus diakhiri -angka, mis. ...-32, ` +
    `atau format sesi "sNNN-slug", mis. s281-nama-fitur).\n` +
    `Kasih versi baru manual: node build.js nama-versi-baru`
  );
}

// 2. Ganti string versi lama -> baru di SEMUA file source yang memuatnya
function assertVersionConstantsAtOldVersion(oldV) {
  const problems = [];
  for (const { file, varName } of VERSION_CONSTANTS_TO_VERIFY) {
    const content = readFile(file);
    const re = new RegExp(varName + "\\s*=\\s*'([^']+)'");
    const m = content.match(re);
    if (!m) problems.push(`${file}: konstanta ${varName} tidak ditemukan sebelum bump`);
    else if (m[1] !== oldV) problems.push(`${file}: ${varName}='${m[1]}' tetapi canonical oldV='${oldV}'`);
  }
  if (problems.length) throw new Error('PRE-BUILD VERSION PREFLIGHT FAILED — tidak ada file yang ditulis.\n' + problems.map(p => '  - '+p).join('\n'));
}

function bumpVersionEverywhere(oldV, newV) {
  assertVersionConstantsAtOldVersion(oldV);
  const changed = [];
  for (const f of ALL_SOURCE) {
    const content = readFile(f);
    if (content.includes(oldV)) {
      writeFile(f, content.split(oldV).join(newV));
      changed.push(f);
    }
  }
  return changed;
}

// 2b. Verifikasi KERAS bahwa setiap konstanta *_VERSION yang dicek runtime lewat
// computeModuleSyncStatus()/_checkModuleVersionSync() (diagnostik-versi.js) BENAR-BENAR
// bernilai versi baru setelah bumpVersionEverywhere(). Ini jaring pengaman utk bug class
// "modals.js MODAL_VERSION diam-diam ketinggalan versi lama yang sudah tidak dipakai file
// lain" (ditemukan 2026-07-12) — bumpVersionEverywhere() cuma cari-ganti STRING oldV, jadi
// kalau satu file punya konstanta versi yang isinya SUDAH menyimpang dari oldV (mis. pernah
// ditulis manual jadi label custom spt 'kw200-import-katalog-harga'), file itu tidak pernah
// match content.includes(oldV) dan SELAMANYA tidak ke-update, TANPA build pernah melapor
// error apa pun — baru ketahuan dari warning runtime di console browser. Fungsi ini menutup
// celah itu: build SEKARANG GAGAL EKSPLISIT kalau ada konstanta yang tidak sinkron, alih-alih
// diam-diam lolos.
const VERSION_CONSTANTS_TO_VERIFY = [
  { file: 'modules/shared/modules-render.js', varName: 'MODULE_RENDER_VERSION' },
  { file: 'modules/shared/modals.js', varName: 'MODAL_VERSION' },
  { file: 'modules/shared/modules-calc.js', varName: 'MODULE_CALC_VERSION' },
  { file: 'chat-action-handlers.js', varName: 'MODULE_FEATURES_VERSION' },
  { file: 'modules/shared/features-helpers-global-security.js', varName: 'APP_BUILD_VERSION' },
  { file: 'modules/shared/features-helpers-global-security.js', varName: 'PRODUCTION_BUILD_SYNCED_VERSION' },
];
function verifyVersionConstantsSynced(newV) {
  const problems = [];
  for (const { file, varName } of VERSION_CONSTANTS_TO_VERIFY) {
    const content = readFile(file);
    const re = new RegExp(varName + "\\s*=\\s*'([^']+)'");
    const m = content.match(re);
    if (!m) {
      problems.push(`${file}: konstanta ${varName} tidak ditemukan sama sekali (nama variabel berubah?)`);
    } else if (m[1] !== newV) {
      problems.push(`${file}: ${varName}='${m[1]}' (seharusnya '${newV}') — kemungkinan nilai lama sudah menyimpang dari versi sebelumnya sehingga tidak ikut ke-replace oleh bumpVersionEverywhere()`);
    }
  }
  return problems;
}

// 3. Minifikasi opsional lewat esbuild (kalau terpasang), fallback ke gabungan mentah
function minify(code, requireMinify = false) {
  try {
    // eslint-disable-next-line global-require
    const esbuild = require('esbuild');
    const result = esbuild.transformSync(code, { minify: true, loader: 'js', target: 'es2019' });
    return { code: result.code, minified: true };
  } catch (e) {
    if (requireMinify) {
      const reason = e && e.message ? e.message : String(e);
      throw new Error(`Production build membutuhkan esbuild untuk minifikasi. Install devDependency esbuild terlebih dahulu. Detail: ${reason}`);
    }
    return { code, minified: false };
  }
}

// 3b. Backup bundle lama sebelum ditimpa, biar bisa rollback cepat kalau build baru bermasalah
const BACKUP_DIR = path.join(ROOT, 'backups');
const MAX_BACKUPS_PER_FILE = 4; // simpan 4 backup terakhir per bundle, sisanya dihapus otomatis
// (diturunkan dari 10 -> 4 di sesi cleanup 2026-07-10: limit 10 x 2 bundle x ~570KB
// = bisa sampai ~11MB dan ikut kebawa kalau folder project di-zip untuk dikirim/diupload.
// 4 backup/bundle = 4 langkah build terakhir yang bisa di-rollback.sh, cukup buat kejar
// masalah "build baru bermasalah" tanpa numpuk backup yang sudah pasti tidak dipakai lagi.)

function backupBundle(outFile, oldVersion) {
  const src = path.join(ROOT, outFile);
  if (!fs.existsSync(src)) return null; // build pertama kali, belum ada yang perlu dibackup

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-'); // aman dipakai di nama file
  const ext = path.extname(outFile); // .js
  const base = path.basename(outFile, ext); // app-bundle-a.min
  const backupName = `${base}.${oldVersion}.${ts}${ext}`;
  const dest = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(src, dest);
  pruneOldBackups(base, ext);
  return backupName;
}

// Hapus backup terlama kalau sudah melebihi MAX_BACKUPS_PER_FILE, biar folder tidak membengkak terus
function pruneOldBackups(base, ext) {
  const prefix = `${base}.`;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime); // terbaru dulu

  const toDelete = files.slice(MAX_BACKUPS_PER_FILE);
  for (const f of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name));
  }
}

function buildBundle(group, outFile, oldVersion, requireMinify = false) {
  const backupName = backupBundle(outFile, oldVersion);
  const combined = group.map(readFile).join('\n');
  const { code, minified } = minify(combined, requireMinify);
  const header = `// ${outFile} — DIBUAT OTOMATIS oleh build.js dari: ${group.join(', ')}\n` +
                 `// JANGAN diedit manual — edit file source-nya lalu jalankan: node build.js\n`;
  // S365 (tier-2, lanjutan audit ScannerSession self-heal s360-s364): marker
  // hash sumber SELALU ditulis di baris pertama bundle — juga saat
  // diminify, dgn ditempel SETELAH minify() supaya tidak ikut kena
  // strip komentar esbuild. Dipakai scripts/verify-bundle-freshness.js utk
  // mendeteksi "source sudah berubah TAPI bundle belum di-rebuild" (pola
  // bug s326->s328: openModal()/action-wrappers.js sempat di-fix di source,
  // tapi bundle yang dipakai browser masih versi lama) TANPA perlu
  // menjalankan build ulang — cukup baca 1 baris pertama bundle & bandingkan
  // hash-nya dgn source saat ini. Cocok dipakai sbg pre-deploy/CI check yg
  // ringan sebelum upload.
  const hashLine = markerLine(computeGroupHash(group, readFile));
  const finalCode = hashLine + (minified ? code : header + code);
  writeFile(outFile, finalCode);
  return { minified, size: Buffer.byteLength(finalCode, 'utf8'), backupName };
}


  return {
    detectCurrentVersion,
    computeNextVersion,
    bumpVersionEverywhere,
    assertVersionConstantsAtOldVersion,
    verifyVersionConstantsSynced,
    buildBundle,
  };
};
