'use strict';

/**
 * Build-time lint suite extracted from build.js.
 * Behavior-preserving extraction: lint implementations and registry remain
 * unchanged and receive their existing build dependencies through ctx.
 */
module.exports = function createBuildLintRegistry(ctx) {
  const {
    ROOT, HTML_FILES, ALL_SOURCE, readFile, fs, path, execSync,
  } = ctx;

function lintDnoneStyleDisplayMismatch() {
  const htmlSrc = HTML_FILES.map(readFile).join('\n');
  const dnoneIds = new Set();
  const idTagRe = /<[^>]*\bid=["']([a-zA-Z0-9_-]+)["'][^>]*>/g;
  let m;
  while ((m = idTagRe.exec(htmlSrc))) {
    if (m[0].includes('u-dnone')) dnoneIds.add(m[1]);
  }
  const classFirstRe = /<[^>]*class=["'][^"']*u-dnone[^"']*["'][^>]*\bid=["']([a-zA-Z0-9_-]+)["']/g;
  while ((m = classFirstRe.exec(htmlSrc))) dnoneIds.add(m[1]);

  const allSrc = ALL_SOURCE.map((f) => `\n//FILE:${f}\n${readFile(f)}`).join('');

  // id-id yang SUDAH benar (pernah di-classList.remove/toggle('u-dnone'), langsung atau lewat variabel)
  const fixedIds = new Set();
  const declRe = /(?:const|let|var)\s+(\w+)\s*=\s*document\.getElementById\(["']([a-zA-Z0-9_-]+)["']\)/g;
  const varToId = {};
  while ((m = declRe.exec(allSrc))) {
    (varToId[m[1]] = varToId[m[1]] || new Set()).add(m[2]);
  }
  const directFixRe = /getElementById\(["']([a-zA-Z0-9_-]+)["']\)\.classList\.(remove|toggle)\(["']u-dnone["']/g;
  while ((m = directFixRe.exec(allSrc))) fixedIds.add(m[1]);
  const varFixRe = /(\w+)\.classList\.(remove|toggle)\(["']u-dnone["']/g;
  while ((m = varFixRe.exec(allSrc))) {
    (varToId[m[1]] || []).forEach((id) => fixedIds.add(id));
  }

  // Untuk tiap file source, cek per-kejadian style.display=show, cari deklarasi
  // getElementById terdekat SEBELUM baris itu utk variabel yang sama (scope-aware secara heuristik),
  // lalu pastikan sudah ada classList.remove/toggle('u-dnone') di antara deklarasi & baris itu.
  const showValRe = /(block|flex|grid|inline[a-z-]*)/;
  const problems = [];
  for (const f of ALL_SOURCE) {
    const content = readFile(f);
    const decls = [];
    const dRe = /(?:const|let|var)\s+(\w+)\s*=\s*document\.getElementById\(["']([a-zA-Z0-9_-]+)["']\)/g;
    let dm;
    while ((dm = dRe.exec(content))) decls.push({ pos: dm.index, v: dm[1], id: dm[2] });
    const disRe = /(\w+)\.style\.display\s*=\s*['"](block|flex|grid|inline[a-z-]*)['"]/g;
    let sm;
    while ((sm = disRe.exec(content))) {
      const varName = sm[1];
      const cands = decls.filter((d) => d.v === varName && d.pos < sm.index);
      if (!cands.length) continue;
      const nearest = cands[cands.length - 1];
      if (!dnoneIds.has(nearest.id) || fixedIds.has(nearest.id)) continue;
      const between = content.slice(nearest.pos, sm.index);
      const fixRe = new RegExp(varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\.classList\\.(remove|toggle)\\(['\"]u-dnone['\"]");
      if (fixRe.test(between)) continue;
      const line = content.slice(0, sm.index).split('\n').length;
      problems.push(`${f}:${line} — #${nearest.id} disembunyikan via class "u-dnone" di HTML, tapi ditampilkan cuma lewat ${varName}.style.display='${sm[2]}' tanpa ${varName}.classList.remove('u-dnone')`);
    }
  }
  return problems;
}

// 4c. Lint: cegah regresi bug "field user di-render tanpa escapeHtml()"
// Kronologi: pernah ketemu (lewat audit manual) beberapa `${xxx.nama}` /
// `${xxx.catatan}` dkk yang dirender langsung ke innerHTML tanpa
// escapeHtml(), jadi celah HTML/script injection kalau isinya diisi user
// (nama pelanggan, catatan transaksi, dst bisa berisi karakter `<`/`>`).
// Lint ini otomatis mengulang cara pengecekan manual tsb tiap build:
//   1. Cari semua interpolasi `${...}` di source (bukan bundle) yang
//      isinya CUMA akses properti polos, misal `${s.nama}`, `${it.note}`,
//      `${a.items[0].name}` — bukan pemanggilan fungsi (jadi `${escapeHtml(x)}`
//      atau `${fmtFull(x)}` otomatis lolos, karena bukan properti polos).
//   2. Properti terakhirnya dicek ke daftar FIELD_NAMES_USER di bawah —
//      nama-nama field yang di app ini historisnya dipakai buat nampung
//      teks bebas ketikan user (nama pelanggan, catatan, alamat, dst).
//   3. Kalau ${...} itu ada di dalam template literal yang mengandung tag
//      HTML (ada pola `<namatag ...>`), berarti kemungkinan besar hasilnya
//      dipakai lewat innerHTML — jadi wajib diescape. Interpolasi yang
//      cuma dipakai buat teks biasa (mis. pesan toast(), bukan innerHTML)
//      TIDAK mengandung tag HTML, jadi otomatis tidak kena lint ini.
//   4. Kalau baris yang sama sudah ditandai manual `// lint-ok-no-escape:
//      <alasan>` (dicek & dipastikan memang bukan data user, misal label
//      status/enum yang fix dari kode, bukan input user), lint ini skip —
//      supaya false-positive yang sudah diverifikasi tidak menghalangi
//      build terus-menerus. TAPI penanda ini harus ditulis manual oleh
//      manusia yang sudah mengecek, bukan ditambah otomatis oleh build.
// Catatan: FIELD_NAMES_USER bukan daftar lengkap selamanya — kalau nanti
// ada field baru yang menampung teks ketikan user (misal fitur baru
// "merkKendaraan" atau "alasanRefund"), TAMBAHKAN nama field itu ke daftar
// di bawah supaya ikut terlindungi lint ini.
const FIELD_NAMES_USER = new Set([
  'nama', 'catatan', 'keterangan', 'deskripsi', 'alamat', 'pesan', 'komentar',
  'judul', 'memo', 'alasan', 'tujuan', 'merk', 'plat', 'notes', 'note',
  'name', 'desc', 'sumber', 'penyewa', 'phone', 'email', 'kota', 'city',
  'address', 'pelanggan', 'customer', 'supplier', 'vendor', 'produsen',
]);
const SUPPRESS_MARKER = 'lint-ok-no-escape';

// Cari semua `${...}` di source (brace-aware, karena isinya bisa mengandung
// kurung kurawal nested, mis. ternary `${a?b:c}`).
function findTemplateInterpolations(content) {
  const results = [];
  const re = /\$\{/g;
  let m;
  while ((m = re.exec(content))) {
    const start = m.index + 2;
    let depth = 1;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }
    results.push({ atPos: m.index, endPos: i, inner: content.slice(start, i - 1) });
  }
  return results;
}

// Cari template literal (di antara backtick) yang membungkus posisi tsb,
// buat cek apakah literal itu mengandung tag HTML (indikasi dipakai lewat
// innerHTML) — heuristik, bukan parser JS penuh, tapi cukup buat lint ini.
function enclosingTemplateLiteral(content, pos) {
  const bstart = content.lastIndexOf('`', pos);
  if (bstart === -1) return null;
  const bend = content.indexOf('`', pos);
  if (bend === -1) return null;
  return content.slice(bstart, bend);
}

const BARE_MEMBER_RE = /^[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*|\[\d+\])*$/;
const HTML_TAG_RE = /<[a-zA-Z][a-zA-Z0-9-]*[\s>/]/;

// --- Bagian tambahan: lint yang sama tapi buat pola CONCATENATION -----------
// (`el.innerHTML = 'Halo ' + x.nama`), bukan cuma template literal `${...}`.
// Kronologi: lint di atas (findTemplateInterpolations) cuma nangkep pola
// `${obj.field}` di dalam template literal — kalau kode ditulis pakai
// concatenation string biasa (operator `+`) yang dirender ke innerHTML/
// outerHTML/insertAdjacentHTML/document.write, field user di situ LOLOS dari
// lint di atas walau celahnya sama persis (HTML/script injection).
// Cara kerja (heuristik brace/quote-aware, bukan parser JS penuh):
//   1. Cari semua sink HTML yang dikenal: `x.innerHTML=`, `x.innerHTML+=`,
//      `x.outerHTML=`/`+=`, `x.insertAdjacentHTML(pos, ...)`, dan
//      `document.write(...)`/`document.writeln(...)`.
//   2. Dari posisi sink itu, scan ekspresi di sisi kanan (atau argumen HTML-
//      nya utk insertAdjacentHTML) sambil melacak kedalaman kurung/kurawal/
//      kurung-siku & state di dalam string/template literal, supaya operator
//      `+` yang levelnya "top-level" (bukan di dalam nested call/array/object)
//      bisa dipisah jadi operand-operand.
//   3. Tiap operand dicek: kalau berupa member-expression polos (`x.nama`,
//      bukan `escapeHtml(x.nama)` — pemanggilan fungsi otomatis lolos karena
//      bentuknya bukan lagi member-expression polos) DAN nama field
//      terakhirnya ada di FIELD_NAMES_USER yang sama dgn lint di atas →
//      dianggap pelanggaran.
//   4. Suppress manual `// lint-ok-no-escape: <alasan>` di baris yang sama
//      tetap berlaku, sama seperti lint template-literal.
// Batasan (heuristik, bukan parser penuh): kalau HTML dirakit dulu ke variabel
// perantara lalu BARU di-assign ke innerHTML beberapa baris kemudian (mis.
// `let html=...; el.innerHTML=html;`), lint ini tidak menelusuri sampai ke
// assignment `html=...`-nya — cuma sink innerHTML/outerHTML/insertAdjacentHTML/
// document.write yang di-scan langsung ekspresi kanannya.

// Scan dari `startPos` mengikuti kedalaman kurung ()/[]/{} & state string
// ('/"/`), berhenti begitu ketemu `;` atau `,` di level TOP (depth 0), atau
// ketemu penutup kurung yang levelnya "keluar" dari scope pemanggil (depth
// jadi negatif). Selagi jalan, catat posisi absolut tiap operator `+` yang
// levelnya top-level (bukan `++`, bukan di dalam string/nested bracket).
function scanConcatExpr(content, startPos) {
  let i = startPos;
  let depth = 0;
  let quote = null;
  const plusPositions = [];
  while (i < content.length) {
    const c = content[i];
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i++; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break; // keluar dari scope pemanggil (mis. tutup kurung sink)
      depth--; i++; continue;
    }
    if (depth === 0 && (c === ';' || c === ',')) break;
    if (depth === 0 && c === '+' && content[i - 1] !== '+' && content[i + 1] !== '+' && content[i + 1] !== '=') {
      plusPositions.push(i);
    }
    i++;
  }
  return { endPos: i, plusPositions };
}

// Ambil daftar argumen (posisi start/end) dari sebuah pemanggilan fungsi,
// dimulai TEPAT SETELAH tanda kurung buka `(`.
function scanCallArgs(content, afterOpenParen) {
  const args = [];
  let pos = afterOpenParen;
  while (pos <= content.length) {
    const { endPos, plusPositions } = scanConcatExpr(content, pos);
    args.push({ start: pos, end: endPos, plusPositions });
    if (content[endPos] === ',') { pos = endPos + 1; continue; }
    break;
  }
  return args;
}

// Sink HTML yang dikenal lint ini. `kind:'assign'` -> scan ekspresi setelah
// operator `=`/`+=`. `kind:'call'` -> scan argumen ke-`argIndex` dari
// pemanggilan fungsi (0-based).
const HTML_SINK_PATTERNS = [
  { re: /\.innerHTML\s*(\+=|=(?!=))\s*/g, kind: 'assign' },
  { re: /\.outerHTML\s*(\+=|=(?!=))\s*/g, kind: 'assign' },
  { re: /\.insertAdjacentHTML\s*\(/g, kind: 'call', argIndex: 1 },
  { re: /document\.write(?:ln)?\s*\(/g, kind: 'call', argIndex: null }, // null = cek semua argumen
];

function findConcatOperands(content) {
  // {start,end} tiap operand yg perlu dicek, dikumpulkan dari semua sink.
  const operands = [];
  for (const sink of HTML_SINK_PATTERNS) {
    sink.re.lastIndex = 0;
    let m;
    while ((m = sink.re.exec(content))) {
      if (sink.kind === 'assign') {
        const start = m.index + m[0].length;
        const { endPos, plusPositions } = scanConcatExpr(content, start);
        const bounds = [start, ...plusPositions, endPos];
        for (let k = 0; k < bounds.length - 1; k++) {
          const opStart = k === 0 ? bounds[0] : bounds[k] + 1;
          operands.push({ start: opStart, end: bounds[k + 1] });
        }
      } else {
        const args = scanCallArgs(content, m.index + m[0].length);
        const targetArgs = sink.argIndex === null ? args : (args[sink.argIndex] ? [args[sink.argIndex]] : []);
        for (const arg of targetArgs) {
          const bounds = [arg.start, ...arg.plusPositions, arg.end];
          for (let k = 0; k < bounds.length - 1; k++) {
            const opStart = k === 0 ? bounds[0] : bounds[k] + 1;
            operands.push({ start: opStart, end: bounds[k + 1] });
          }
        }
      }
    }
  }
  return operands;
}

function lintUnescapedUserFieldConcat() {
  const problems = [];
  for (const f of ALL_SOURCE) {
    const content = readFile(f);
    const lines = content.split('\n');
    for (const { start, end } of findConcatOperands(content)) {
      const inner = content.slice(start, end).trim();
      if (!BARE_MEMBER_RE.test(inner)) continue;
      const segs = inner.split(/\.|\[/).map((s) => s.replace(/\]$/, '').replace(/\?$/, ''));
      const lastField = segs[segs.length - 1];
      if (!FIELD_NAMES_USER.has(lastField)) continue;

      const lineNo = content.slice(0, start).split('\n').length;
      if (lines[lineNo - 1] && lines[lineNo - 1].includes(SUPPRESS_MARKER)) continue;

      problems.push(`${f}:${lineNo} — + ${inner} — field "${lastField}" terlihat seperti data ketikan user, dirender ke innerHTML/outerHTML/insertAdjacentHTML/document.write lewat concatenation ("+"), bukan escapeHtml()`);
    }
  }
  return problems;
}

function lintUnescapedUserField() {
  const problems = [];
  for (const f of ALL_SOURCE) {
    const content = readFile(f);
    const lines = content.split('\n');
    for (const occ of findTemplateInterpolations(content)) {
      const inner = occ.inner.trim();
      // Hanya tertarik ke interpolasi properti polos (bukan pemanggilan
      // fungsi) — kalau sudah dibungkus escapeHtml(...)/fmtFull(...)/dst,
      // bentuknya bukan lagi member-expression polos, jadi otomatis lolos.
      if (!BARE_MEMBER_RE.test(inner)) continue;
      const segs = inner.split(/\.|\[/).map((s) => s.replace(/\]$/, '').replace(/\?$/, ''));
      const lastField = segs[segs.length - 1];
      if (!FIELD_NAMES_USER.has(lastField)) continue;

      const tmpl = enclosingTemplateLiteral(content, occ.atPos);
      if (!tmpl || !HTML_TAG_RE.test(tmpl)) continue; // bukan innerHTML-shaped literal

      const lineNo = content.slice(0, occ.atPos).split('\n').length;
      // Penanda suppress tidak bisa ditaruh SATU baris dgn interpolasi kalau baris
      // itu ada di DALAM template literal (`//` akan ikut jadi bagian string, bukan
      // komentar beneran). Jadi selain baris interpolasi itu sendiri (utk kasus
      // literal satu baris), izinkan juga penanda ditaruh persis di baris SEBELUM
      // template literal itu mulai (baris `const x=\`...` di-comment di atasnya).
      const tmplStartPos = content.lastIndexOf('`', occ.atPos);
      const tmplStartLine = content.slice(0, tmplStartPos).split('\n').length;
      const suppressLines = [lineNo, tmplStartLine - 1];
      if (suppressLines.some((ln) => lines[ln - 1] && lines[ln - 1].includes(SUPPRESS_MARKER))) continue;

      problems.push(`${f}:${lineNo} — \${${inner}} — field "${lastField}" terlihat seperti data ketikan user, dirender di dalam markup HTML tanpa escapeHtml()`);
    }
  }
  return problems;
}

// 3b. Lint regresi bug "chicken-egg" OCR (lihat komentar di atas file & di
// scan-ocr.js). Tesseract cuma didaftarkan sbg global DI DALAM
// ensureTesseract(), yang HANYA dipanggil dari getOcrWorker()/ocrRecognize().
// Guard dini `typeof Tesseract==='undefined'` SEBELUM ocrRecognize() sempat
// jalan bikin OCR selalu gagal di percobaan pertama (deadlock). Satu-satunya
// tempat pola string ini boleh muncul di source adalah di DALAM komentar
// (mis. komentar BUGFIX yang menjelaskan sejarah bug ini) — bukan di kode aktif.
function lintOcrPrematureTesseractCheck() {
  const BAD_RE = /typeof\s+Tesseract\s*===?\s*['"]undefined['"]/;
  const problems = [];
  for (const f of ALL_SOURCE) {
    const content = readFile(f);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//')) return; // baris komentar, aman (mis. komentar BUGFIX historis)
      if (BAD_RE.test(line)) {
        problems.push(`${f}:${idx + 1} — ${line.trim()}`);
      }
    });
  }
  return problems;
}

// 3c. Lint regresi "MODAL_HTML index drift" (dicatat di FIX-v982-s320,
// housekeeping; diupdate SA10a/v1568 & SA10b/v1569). Logic sungguhannya ada
// di scripts/lib/modal-html-index-drift.js -- dipakai bareng dgn
// tests/modal-html-index-drift.test.js supaya gate build.js & suite
// `npm test` selalu ngecek pola yang SAMA persis, tidak bisa diam-diam
// drift satu sama lain (sempat kejadian di SA10a: build.js pakai regex
// lama sementara test unitnya sendiri tidak pernah dibuat).
const { checkModalHtmlIndexDrift } = require('./lib/modal-html-index-drift');
function lintModalHtmlIndexDrift() {
  return checkModalHtmlIndexDrift(ROOT, HTML_FILES);
}

// 3d. Lint regresi "drift struktural Scanner" (housekeeping, dicatat di
// AUDIT_BUG_PIN_BARCODE_2_SESI_CLAUDE_SESI2_HASIL.md — saran audit #2,
// ADR-028). `vehicle-scanner.js` & `sparepart-scanner.js` SENGAJA
// duplikasi total pola lifecycle kamera (lihat ADR-028 utk alasan
// isolasi risiko antar scanner) -- tapi itu berarti kalau salah satu
// file diperbaiki (mis. tambah parameter baru ke pauseCamera() utk fix
// bug), TIDAK ADA yang otomatis menangkap kalau file satunya lupa
// disamakan. Lint ini generik: bandingkan DAFTAR nama fungsi "kembar"
// (nama sama minus prefix VehicleScanner/SparepartScanner) di kedua
// file + jumlah parameter tiap fungsi kembar itu. Tidak menuntut urutan
// atau isi function body sama (adapter-only code di sparepart-scanner.js
// boleh beda), HANYA menjaga agar pasangan fungsi lifecycle inti yang
// memang harus identik pola-nya tidak diam-diam divergen tanpa sadar.
const SCANNER_TWIN_FN_SUFFIXES = [
  'WithCameraTimeout',
  'ShouldDebounce',
  'RecordScan',
  'StopMediaStream',
  'PauseCamera',
  'ResumeCamera',
  'AttachLifecycle',
  'DetachLifecycle',
  'ApplyTorchCapability',
  'IsHarmlessDecodeError',
  'BuildOverlay',
  'ErrorMessage',
];
function lintScannerStructuralDrift() {
  const files = {
    vehicleScanner: 'modules/vehicle/vehicle-scanner.js',
    sparepartScanner: 'modules/vehicle/sparepart-scanner.js',
  };
  const problems = [];
  const parsed = {};

  for (const [prefix, file] of Object.entries(files)) {
    const content = readFile(file);
    const fnRe = new RegExp(`(?:^|\\n)(?:async )?function ${prefix}([A-Za-z]+)\\(([^)]*)\\)`, 'g');
    const found = {};
    let m;
    while ((m = fnRe.exec(content)) !== null) {
      const suffix = m[1];
      const params = m[2].trim();
      const arity = params === '' ? 0 : params.split(',').length;
      found[suffix] = arity;
    }
    parsed[prefix] = { file, found };
  }

  for (const suffix of SCANNER_TWIN_FN_SUFFIXES) {
    const a = parsed.vehicleScanner.found[suffix];
    const b = parsed.sparepartScanner.found[suffix];
    if (a === undefined && b === undefined) {
      // Sudah tidak ada di keduanya (mis. dihapus bareng sengaja) -- aman.
      continue;
    }
    if (a === undefined) {
      problems.push(`vehicleScanner${suffix}() tidak ditemukan di ${parsed.vehicleScanner.file}, padahal sparepartScanner${suffix}() ada di ${parsed.sparepartScanner.file} (arity ${b})`);
      continue;
    }
    if (b === undefined) {
      problems.push(`sparepartScanner${suffix}() tidak ditemukan di ${parsed.sparepartScanner.file}, padahal vehicleScanner${suffix}() ada di ${parsed.vehicleScanner.file} (arity ${a})`);
      continue;
    }
    if (a !== b) {
      problems.push(`Jumlah parameter berbeda utk fungsi kembar "${suffix}": vehicleScanner${suffix}(${a} param) vs sparepartScanner${suffix}(${b} param) -- kemungkinan salah satu diubah tanpa menyamakan yang lain`);
    }
  }
  return problems;
}

// 4. Naikkan ?v=N & CACHE_NAME lewat bump-version.sh yang sudah ada
function bumpCacheVersion(version) {
  const m = String(version).match(/(\d+)$/);
  if (!m) throw new Error(`Versi build tidak memiliki nomor cache di akhir: ${version}`);
  const cacheVersion = m[1];
  const out = execSync(`bash scripts/bump-version.sh ${JSON.stringify(cacheVersion)}`, { cwd: ROOT }).toString();
  return out;
}

// 5. Cek sintaks hasil build
function syntaxCheck(file) {
  try {
    execSync(`node --check ${JSON.stringify(path.join(ROOT, file))}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e.stderr || e.stdout || e.message).toString() };
  }
}

// 3e. Lint non-fatal: cek baris "| Label | Angka |" di dokumen² tertentu vs
// jumlah file sungguhan di repo. TIDAK menghentikan build (angka baseline
// wajar berubah tiap sesi nambah file) — cuma WARNING supaya dokumen yang
// telat diupdate ketahuan sebelum jadi kasus seperti audit pack v987/s325
// yang ternyata dibuat dari snapshot yang salah (angka baseline meleset
// dari isi ZIP yang sebenarnya diupload).
//
// GENERIK (S328, tindak lanjut poin #2 daftar saran maintainability
// pasca-audit S324): sebelumnya fungsi ini HARDCODE cuma cek 4 dari 8 baris
// "Coverage Baseline" di AUDIT_MATRIX.md ("Total files"/"JavaScript"/
// "Markdown"/"HTML") — 2 baris lain yang SAMA-SAMA angka file count murni
// ("JSON", "CSS") diam-diam TIDAK PERNAH dicek sejak baseline dibuat,
// padahal formatnya identik & gampang dihitung. "Tests" & "Module families"
// sengaja TETAP tidak dicek: "Tests" di tabel ini historically berarti
// jumlah *kasus* test (bukan jumlah file), sudah dicek terpisah & lebih
// akurat lewat `node --test` (lihat CHANGELOG), dan "Module families" pakai
// notasi "13+" (bukan angka pasti) — memaksakan keduanya ke pola file-count
// generik ini cuma akan menghasilkan sinyal palsu.
//
// FILE_COUNT_LINT_LABELS di bawah adalah SATU-SATUNYA tempat yang perlu
// diedit kalau sesi berikutnya mau menambah baris count baru (mis. ada
// baseline count lain ditambah ke AUDIT_MATRIX.md atau ke dokumen lain) —
// tidak perlu tulis fungsi walk-direktori baru per label seperti pola lama.
const FILE_COUNT_LINT_LABELS = {
  'Total files': () => true,
  'JavaScript': (name) => name.endsWith('.js'),
  'Markdown': (name) => name.endsWith('.md'),
  'HTML': (name) => name.endsWith('.html'),
  'JSON': (name) => name.endsWith('.json'),
  'CSS': (name) => name.endsWith('.css'),
};

// Dokumen mana saja yang discan utk baris "| Label | Angka |". Generik juga
// dari sisi dokumen: kalau sesi berikutnya taruh baseline count serupa di
// dokumen lain (bukan cuma AUDIT_MATRIX.md), cukup tambah path-nya di sini.
const FILE_COUNT_LINT_DOCS = ['docs/AUDIT_MATRIX.md'];

function lintDocsBaselineCountDrift() {
  // Satu kali walk seluruh repo, hitung SEMUA label sekaligus per file —
  // lebih efisien drpd versi lama yang walk ulang direktori per ekstensi,
  // dan otomatis ikut menghitung label baru yang ditambah ke
  // FILE_COUNT_LINT_LABELS tanpa perlu sentuh logic walk-nya lagi.
  const labels = Object.keys(FILE_COUNT_LINT_LABELS);
  const actual = Object.fromEntries(labels.map((l) => [l, 0]));
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git' || name === 'backups') continue;
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      for (const label of labels) {
        if (FILE_COUNT_LINT_LABELS[label](name)) actual[label]++;
      }
    }
  };
  walk(ROOT);

  const warnings = [];
  for (const docPath of FILE_COUNT_LINT_DOCS) {
    if (!fs.existsSync(path.join(ROOT, docPath))) continue;
    const md = readFile(docPath);
    for (const label of labels) {
      const re = new RegExp('\\|\\s*' + label + '\\s*\\|\\s*(\\d+)\\s*\\|');
      const m = md.match(re);
      if (!m) continue;
      const docCount = Number(m[1]);
      const actualCount = actual[label];
      if (docCount !== actualCount) {
        warnings.push(`${docPath} — "${label}": dokumen bilang ${docCount}, repo sungguhan ${actualCount} (selisih ${actualCount - docCount})`);
      }
    }
  }
  return warnings;
}

// Ambang baris untuk file source .js (BUKAN bundle/.min.js) sebelum
// dianggap "kegedean" & jadi kandidat dipecah modulnya. Nomor ini
// longgar dgn sengaja (file terbesar saat ambang ini dibuat ada di
// ~2100 baris) — tujuannya cuma menandai file yang TERUS membesar,
// bukan memaksa refactor mendadak. Kalau sebuah file source memang
// sengaja besar & sudah didiskusikan, tambahkan nama filenya (relatif
// ke ROOT, pakai '/') ke OVERSIZED_FILE_ALLOWLIST di bawah supaya
// tidak terus muncul di setiap build.
const OVERSIZED_FILE_LINE_THRESHOLD = 1600;
const OVERSIZED_FILE_ALLOWLIST = [
  'self-test.js', // kumpulan test lama, bukan kode aplikasi — wajar besar
];

// 3d. Lint guard "empty catch" (S330, poin #5 dari daftar saran
// maintainability user pasca-audit S324). Blok catch yang isinya 100%
// kosong (tanpa kode maupun komentar) menelan error TANPA jejak apa pun —
// kalau errornya beneran terjadi di produksi, tidak ada cara tahu dari
// console/log manapun. Lint ini TIDAK melarang menelan error sama sekali
// (banyak try/catch di codebase ini SENGAJA silent, mis. optional feature
// detection/localStorage tidak tersedia/dst) — cukup mewajibkan blok catch
// punya SESUATU di dalamnya: kode (console.warn/fallback/assignment/dst)
// ATAU minimal komentar yang menjelaskan KENAPA sengaja dikosongkan. Body
// yang beneran kosong (cuma whitespace) yang ditandai; body berisi
// komentar SAJA (mis. `catch(e){ /* sengaja diam */ }`) sudah otomatis
// lolos, tidak perlu penanda suppress terpisah.
// severity: 'warning' (bukan 'blocking') — di codebase existing ada cukup
// banyak catch kosong pre-existing (mis. onboarding.js/keamanan-pin.js/
// debug-console.js dkk), memblokir build sekarang berarti harus
// membereskan semuanya dulu dalam 1 sesi, di luar scope "guard" (cegah
// regresi baru) yang diminta poin #5 — pola sama dgn docs-baseline-count-
// drift (S321) & oversized-source-files (S325) yang juga warning-only
// saat pertama ditambahkan ke codebase existing.
function findMatchingBrace(content, openBracePos) {
  let depth = 0;
  let quote = null;
  for (let i = openBracePos; i < content.length; i++) {
    const c = content[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lintEmptyCatchGuard() {
  const problems = [];
  const CATCH_RE = /\bcatch\b\s*(\([^)]*\))?\s*\{/g;
  for (const f of ALL_SOURCE) {
    const content = readFile(f);
    CATCH_RE.lastIndex = 0;
    let m;
    while ((m = CATCH_RE.exec(content))) {
      const openBracePos = m.index + m[0].length - 1;
      const closeBracePos = findMatchingBrace(content, openBracePos);
      if (closeBracePos === -1) continue;
      const body = content.slice(openBracePos + 1, closeBracePos);
      if (body.trim() !== '') continue; // ada kode dan/atau komentar -> lolos
      const lineNo = content.slice(0, m.index).split('\n').length;
      problems.push(`${f}:${lineNo} — catch block kosong total (tanpa kode maupun komentar), error ditelan tanpa jejak`);
    }
  }
  return problems;
}

// lintOverlayOpenBypassesGuard() — kodifikasi audit manual yang dilakukan
// sesi s362 (rekomendasi tier-2 dari FIX-s362-scannersession-global-
// watchdog.md): dulu grep -rn "classList.add('open')" modules/ dijalankan
// MANUAL tiap ada laporan "tombol/dialog macet, 0 toast" (lihat FIX-s360,
// FIX-s361). Root cause-nya SELALU sama: overlay yang buka dirinya sendiri
// lewat classList.add('open') langsung, TANPA lewat openModal()/
// _queueDialog()/openQS() (satu-satunya 3 jalur yang sudah dipasangi self-
// heal ScannerSession — lihat modal-navigasi.js), bakal ke-tangkep CSS
// body.scanner-session-active kalau state ScannerSession nyangkut, tanpa
// jejak error apa pun.
//
// Lint ini menjalankan audit yang sama otomatis tiap build, supaya modul
// fitur baru yang lupa lewat openModal()/_queueDialog()/openQS() ketahuan
// SAAT BUILD, bukan lewat laporan user lagi.
//
// Whitelist sengaja SEMPIT (bukan per-file besar) supaya menambahkan overlay
// bypass baru harus disengaja, bukan kebetulan lolos:
// - modules/shared/modal-navigasi.js — implementasi guard itu sendiri
//   (openModal()/_queueDialog()/openQS() MEMANG classList.add('open') di
//   dalamnya, itu tempat _dialogSelfHeal()/isActive() dipanggil).
// - self-test.js — harness diagnostik internal yang sengaja
//   menambah/mengembalikan class 'open' SEMENTARA utk menguji renderer
//   (simpan state asli, restore persis di finally) — bukan jalur UI yang
//   dipicu tap user, jadi tidak relevan dgn bug "tombol macet, 0 toast".
const OVERLAY_OPEN_BYPASS_ALLOWLIST = [
  'modules/shared/modal-navigasi.js',
  'self-test.js',
  // Self-test harness deliberately opens real overlays to inspect rendered HTML/state.
  'modules/shared/self-test-cases-b.js',
];

function lintOverlayOpenBypassesGuard() {
  const problems = [];
  const OPEN_RE = /\.classList\.add\(\s*['"]open['"]\s*\)/g;
  for (const f of ALL_SOURCE) {
    if (OVERLAY_OPEN_BYPASS_ALLOWLIST.includes(f)) continue;
    const content = readFile(f);
    OPEN_RE.lastIndex = 0;
    let m;
    while ((m = OPEN_RE.exec(content))) {
      const lineNo = content.slice(0, m.index).split('\n').length;
      problems.push(`${f}:${lineNo} — overlay dibuka lewat classList.add('open') langsung, bukan lewat openModal()/_queueDialog()/openQS()`);
    }
  }
  return problems;
}

// lintOverlayOpenReflowGuard() — sisa rekomendasi terbuka dari
// FIX-s368-overlay-open-animation-reflow-race.md ("Lint baru yang
// memastikan tiap classList.add('open') baru selalu diikuti reflow").
//
// lintOverlayOpenBypassesGuard() (di atas) sudah menutup 1 celah: overlay
// yang classList.add('open') di LUAR modules/shared/modal-navigasi.js
// ketahuan build. Tapi di DALAM file itu sendiri (satu-satunya file yang
// di-allowlist utk classList.add('open')) tidak ada jaring pengaman kalau
// nanti ada jalur buka-overlay ke-4/ke-5 ditambahkan TANPA reflow paksa
// (`void el.offsetWidth`) — race "animation overlayIn gagal terinstansiasi,
// opacity macet 0 permanen" (lihat komentar lengkap di openModal()) bisa
// terulang lewat jalur baru itu, lolos dari lint bypass di atas krn memang
// file-nya sudah di-whitelist.
//
// Lint ini scan KHUSUS file itu: tiap classList.add('open') harus diikuti
// `offsetWidth` dalam REFLOW_LOOKAHEAD_LINES baris setelahnya (cukup longgar
// utk komentar penjelasan panjang di antaranya, spt pola openModal() yang
// sudah ada — 15 baris dipilih krn openModal() punya jarak terjauh, ~15
// baris komentar, antara classList.add('open') & void el.offsetWidth).
const OVERLAY_OPEN_REFLOW_FILE = 'modules/shared/modal-navigasi.js';
const OVERLAY_OPEN_REFLOW_LOOKAHEAD_LINES = 15;

function lintOverlayOpenReflowGuard() {
  const problems = [];
  if (!ALL_SOURCE.includes(OVERLAY_OPEN_REFLOW_FILE)) return problems;
  const content = readFile(OVERLAY_OPEN_REFLOW_FILE);
  const lines = content.split('\n');
  const OPEN_RE = /\.classList\.add\(\s*['"]open['"]\s*\)/;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('//')) continue; // skip baris komentar (mis. penjelasan yang MENYEBUT classList.add('open'), bukan kode sungguhan)
    if (!OPEN_RE.test(lines[i])) continue;
    const windowEnd = Math.min(lines.length, i + 1 + OVERLAY_OPEN_REFLOW_LOOKAHEAD_LINES);
    const hasReflow = lines.slice(i, windowEnd).some((l) => l.includes('offsetWidth'));
    if (!hasReflow) {
      problems.push(`${OVERLAY_OPEN_REFLOW_FILE}:${i + 1} — classList.add('open') tanpa reflow paksa (offsetWidth) dalam ${OVERLAY_OPEN_REFLOW_LOOKAHEAD_LINES} baris setelahnya`);
    }
  }
  return problems;
}

function lintOversizedSourceFiles() {
  const skipDirs = new Set(['node_modules', '.git', 'backups', 'tests']);
  const results = [];

  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (skipDirs.has(name)) continue;
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.js') || name.endsWith('.min.js')) continue;
      const relPath = path.relative(ROOT, full).split(path.sep).join('/');
      if (OVERSIZED_FILE_ALLOWLIST.includes(relPath)) continue;
      const lineCount = readFile(relPath).split('\n').length;
      if (lineCount > OVERSIZED_FILE_LINE_THRESHOLD) {
        results.push({ relPath, lineCount });
      }
    }
  };
  walk(ROOT);

  return results
    .sort((a, b) => b.lineCount - a.lineCount)
    .map((r) => `${r.relPath} — ${r.lineCount} baris (ambang: ${OVERSIZED_FILE_LINE_THRESHOLD})`);
}

// ============================================================================
// LINT REGISTRY — SSOT (Single Source of Truth) untuk seluruh operasi lint
// build-time (S328 poin #4 dari daftar saran maintainability pasca-audit
// S324). SEBELUM sesi ini, tiap lint punya blok wiring bespoke ~15 baris
// duplikat di main() (console.log pembuka, cek problems.length, format
// error/warning, process.exit(1) utk blocking) — nambah lint baru berarti
// copy-paste blok itu & rawan lupa 1 bagian. Sekarang tiap lint cukup 1
// entry di array ini (fn murni yang sudah ada, TIDAK diubah) + 1 fungsi
// generik `runLintRegistry()` yang mengeksekusi & melaporkan semuanya.
// Urutan array = urutan eksekusi, dipertahankan SAMA PERSIS urutan lama di
// main() sebelum refactor ini — 0 perubahan perilaku (pesan/exit code/
// urutan check identik). severity 'blocking' -> process.exit(1) kalau ada
// problem (5 lint lama yg pakai console.error+exit). severity 'warning' ->
// console.warn saja, build TETAP LANJUT (2 lint lama yg pakai console.warn).
// S330 (poin #5, "guard empty-catch") menambah entry ke-8, `empty-catch-
// guard`, severity 'warning' (banyak catch kosong pre-existing di codebase,
// lihat komentar di lintEmptyCatchGuard()).
// ============================================================================
const LINT_REGISTRY = [
  {
    name: 'dnone-style-display-mismatch',
    severity: 'blocking',
    checkingMsg: 'Mengecek pola bug "u-dnone (!important) vs style.display"...',
    successMsg: '✓ Tidak ada elemen u-dnone yang berisiko permanen kosong\n',
    run: lintDnoneStyleDisplayMismatch,
    label: (n) => `ditemukan ${n} elemen berpotensi "judul tampil, konten permanen kosong":`,
    advice:
      '\nPerbaiki dengan menambahkan classList.remove(\'u-dnone\') (atau classList.toggle) ' +
      'sebelum/menyertai baris style.display di atas, lalu jalankan ulang node build.js.\n' +
      'Referensi kasus asli: card Kebebasan Finansial (dashFiBody) yang judulnya tampil tapi isinya kosong.',
  },
  {
    name: 'empty-catch-guard',
    severity: 'warning',
    checkingMsg: 'Mengecek catch block yang kosong total (menelan error tanpa jejak)...',
    successMsg: '✓ Tidak ada catch block yang kosong total\n',
    run: lintEmptyCatchGuard,
    label: (n) => `${n} catch block kosong total ditemukan (build TETAP LANJUT, ini cuma peringatan):`,
    advice:
      '\nCatch yang sengaja diam itu boleh, tapi tambahkan minimal komentar yang menjelaskan\n' +
      'kenapa (mis. `catch(e){ /* localStorage tidak tersedia, aman diabaikan */ }`), atau\n' +
      'log seadanya (console.warn/console.debug) supaya kalau errornya tidak terduga masih\n' +
      'ada jejaknya. Daftar di atas cuma warning (banyak yang pre-existing & sengaja) — perbaiki\n' +
      'kalau sempat, atau biarkan kalau memang sudah sengaja & masih relevan.\n',
  },
  {
    name: 'unescaped-user-field',
    severity: 'blocking',
    checkingMsg: 'Mengecek pola bug "field user dirender tanpa escapeHtml()"...',
    successMsg: '✓ Tidak ada field user yang dirender tanpa escapeHtml() (template literal maupun concatenation)\n',
    run: () => lintUnescapedUserField().concat(lintUnescapedUserFieldConcat()),
    label: (n) => `ditemukan ${n} interpolasi/concatenation field user yang berpotensi celah HTML/script injection:`,
    advice:
      '\nPerbaiki dengan membungkus pakai escapeHtml(...), misal ${escapeHtml(x.nama)} atau ' +
      "'...'+escapeHtml(x.nama)+'...'.\n" +
      'Kalau setelah dicek field itu TERNYATA bukan data ketikan user (misal label status/enum ' +
      'tetap dari kode), tandai baris itu dgn komentar `// lint-ok-no-escape: <alasan>` supaya ' +
      'lint ini tidak menghalangi build lagi untuk baris tsb.',
  },
  {
    name: 'ocr-premature-tesseract-check',
    severity: 'blocking',
    checkingMsg: 'Mengecek regresi pola bug "chicken-egg" OCR (typeof Tesseract===\'undefined\' sbg guard dini)...',
    successMsg: '✓ Tidak ada regresi pola guard dini Tesseract\n',
    run: lintOcrPrematureTesseractCheck,
    label: (n) => `ditemukan ${n} baris dengan pola guard dini "typeof Tesseract==='undefined'":`,
    advice:
      '\nPola ini pernah menyebabkan OCR selalu gagal di scan pertama (Tesseract baru terdaftar\n' +
      'sbg global DI DALAM ensureTesseract(), yang dipanggil dari getOcrWorker()/ocrRecognize() —\n' +
      'jadi guard dini ini selalu true & langsung return sebelum sempat jalan). Hapus baris di atas;\n' +
      'biarkan ocrRecognize()/getOcrWorker() yang menangani kegagalan modul lewat scanErrorMessage().\n' +
      'Lihat komentar BUGFIX di scan-ocr.js untuk detail lengkap.',
  },
  {
    name: 'modal-html-index-drift',
    severity: 'blocking',
    checkingMsg: 'Mengecek regresi "MODAL_HTML index drift" (document.write(MODAL_HTML[N]) vs isi array sungguhan)...',
    successMsg: '✓ Tidak ada drift antara document.write(MODAL_HTML[N]) & isi MODAL_HTML sungguhan\n',
    run: lintModalHtmlIndexDrift,
    label: (n) => `ditemukan ${n} drift index MODAL_HTML:`,
    advice:
      '\nModal yang SALAH akan ke-render di posisi itu kalau ini dibiarkan. Perbaiki dgn ' +
      'menyamakan urutan MODAL_HTML di modals.js dgn urutan document.write(MODAL_HTML[N]) ' +
      'di index.html (atau perbaiki komentar "<!-- modal:xxx -->" kalau memang cuma komentarnya ' +
      'yang salah), lalu jalankan ulang node build.js.',
  },
  {
    name: 'scanner-structural-drift',
    severity: 'blocking',
    checkingMsg: 'Mengecek regresi "drift struktural Scanner" (vehicle-scanner.js vs sparepart-scanner.js)...',
    successMsg: '✓ Tidak ada drift struktural antara vehicle-scanner.js & sparepart-scanner.js\n',
    run: lintScannerStructuralDrift,
    label: (n) => `ditemukan ${n} drift struktural antara vehicle-scanner.js & sparepart-scanner.js:`,
    advice:
      '\nKedua file ini SENGAJA duplikasi total (lihat docs/architecture/ADR-028.md) supaya risiko\n' +
      'bug di satu scanner terisolasi dari scanner lain — tapi itu berarti fungsi lifecycle "kembar"\n' +
      '(pauseCamera/resumeCamera/dkk) harus tetap sama pola tanda tangannya di kedua file. Perbaiki\n' +
      'dengan menyamakan ulang fungsi yang disebut di atas (atau update SCANNER_TWIN_FN_SUFFIXES di\n' +
      'scripts/build.js kalau memang perubahan itu disengaja & sudah didiskusikan ulang).',
  },
  {
    name: 'docs-baseline-count-drift',
    severity: 'warning',
    checkingMsg: 'Mengecek "Coverage Baseline" di docs/AUDIT_MATRIX.md vs jumlah file sungguhan...',
    successMsg: '✓ Angka baseline di docs/AUDIT_MATRIX.md masih sinkron dengan repo\n',
    run: lintDocsBaselineCountDrift,
    label: () => 'docs/AUDIT_MATRIX.md kemungkinan sudah usang (build TETAP LANJUT, ini cuma peringatan):',
    advice: '\nUpdate tabel "Coverage Baseline" di docs/AUDIT_MATRIX.md kalau perubahan ini disengaja.\n',
  },
  {
    name: 'overlay-open-bypass-guard',
    severity: 'blocking',
    checkingMsg: 'Mengecek regresi "overlay classList.add(\'open\') tanpa lewat openModal()/_queueDialog()/openQS()" (tier-2 dari audit ScannerSession self-heal s360-s362)...',
    successMsg: '✓ Semua overlay dibuka lewat jalur yang sudah dipasangi self-heal ScannerSession (openModal()/_queueDialog()/openQS())\n',
    run: lintOverlayOpenBypassesGuard,
    label: (n) => `ditemukan ${n} overlay yang classList.add('open') langsung, bypass self-heal ScannerSession:`,
    advice:
      "\nKalau body.scanner-session-active nyangkut (kamera scan terputus di tengah jalan — lihat\n" +
      'FIX-s360-openmodal-scannersession-selfheal.md), overlay yang bypass ini akan ke-tangkep CSS\n' +
      '`body.scanner-session-active .overlay.open{display:none!important}` TANPA jejak error/toast\n' +
      'apa pun — persis gejala "tombol/dialog macet, 0 toast" yang berulang kali dilaporkan user.\n' +
      'Perbaiki dengan memanggil openModal(id) (untuk modal biasa) atau reuse _queueDialog()/\n' +
      'openQS() (untuk dialog custom baru) alih-alih classList.add(\'open\') langsung. Kalau baris\n' +
      'di atas MEMANG bukan overlay yang dipicu tap user (mis. harness test internal), tambahkan\n' +
      'file-nya ke OVERLAY_OPEN_BYPASS_ALLOWLIST di scripts/build.js.',
  },
  {
    name: 'overlay-open-reflow-guard',
    severity: 'blocking',
    checkingMsg: "Mengecek regresi \"classList.add('open') tanpa reflow paksa\" di modal-navigasi.js (sisa rekomendasi FIX-s368-overlay-open-animation-reflow-race.md)...",
    successMsg: "✓ Semua classList.add('open') di modal-navigasi.js diikuti reflow paksa (offsetWidth)\n",
    run: lintOverlayOpenReflowGuard,
    label: (n) => `ditemukan ${n} classList.add('open') tanpa reflow paksa di modal-navigasi.js:`,
    advice:
      "\nTanpa reflow paksa (`void el.offsetWidth;` segera setelah classList.add('open')), browser\n" +
      "bisa menggabungkan perubahan display & mulai-animasi jadi 1 style recalc — Animation utk\n" +
      "animasi overlayIn bisa gagal terinstansiasi total, elemen macet permanen di opacity:0 (lihat\n" +
      "komentar lengkap FIX-s368-overlay-open-animation-reflow-race.md & openModal() di\n" +
      "modules/shared/modal-navigasi.js). Perbaiki dengan menambahkan `void el.offsetWidth;` segera\n" +
      "setelah classList.add('open') pada jalur baru itu (contoh pola: openModal()/openQS()/\n" +
      "_openDialogOverlay()), atau reuse _openDialogOverlay(el) kalau memang overlay generik.",
  },
  {
    name: 'oversized-source-files',
    severity: 'warning',
    checkingMsg: `Mengecek file source .js yang sudah lewat ${OVERSIZED_FILE_LINE_THRESHOLD} baris (kandidat dipecah)...`,
    successMsg: `✓ Tidak ada file source .js yang lewat ${OVERSIZED_FILE_LINE_THRESHOLD} baris\n`,
    run: lintOversizedSourceFiles,
    label: (n) => `${n} file source sudah kegedean (build TETAP LANJUT, ini cuma peringatan):`,
    advice:
      '\nFile besar = blast radius besar tiap edit. Pertimbangkan dipecah per submodul kalau\n' +
      'sempat. Kalau memang sengaja besar & sudah didiskusikan, tambahkan ke\n' +
      'OVERSIZED_FILE_ALLOWLIST di scripts/build.js.\n',
  },
];

// Jalankan seluruh LINT_REGISTRY berurutan. 'blocking' -> process.exit(1) &
// berhenti di lint pertama yang gagal (sama seperti perilaku lama — tiap
// blok lama juga exit(1) segera, tidak menunggu lint berikutnya). 'warning'
// -> console.warn, lanjut ke lint berikutnya, build tidak pernah dihentikan
// oleh severity ini. Sesi berikutnya yang menambah lint baru CUKUP tambah 1
// entry ke LINT_REGISTRY di atas, TIDAK perlu menulis ulang fungsi ini.
function runLintRegistry(registry) {
  for (const lint of registry) {
    console.log(lint.checkingMsg);
    const problems = lint.run();
    if (!problems.length) {
      console.log(lint.successMsg);
      continue;
    }
    if (lint.severity === 'blocking') {
      console.error(`\n❌ BUILD DIHENTIKAN — ${lint.label(problems.length)}\n`);
      problems.forEach((p) => console.error('  - ' + p));
      console.error(lint.advice);
      process.exit(1);
    } else {
      console.warn(`\n⚠️  ${lint.label(problems.length)}\n`);
      problems.forEach((w) => console.warn('  - ' + w));
      console.warn(lint.advice);
    }
  }
}


  return {
    LINT_REGISTRY,
    runLintRegistry,
    syntaxCheck,
    bumpCacheVersion,
  };
};
