'use strict';
// S2897: pemeriksa konsistensi nama/ID pemilik di backup (opt-in, baca-saja, tanpa browser, tanpa tulis file).
// Jalankan: BACKUP=/path/backup-keluarga-W.json npm run test:e2e:pemilik   (E2E_SKIP_OK=1 -> exit 0 bila BACKUP tidak ada)
// Exit: 0 konsisten, 1 ada ketidakkonsistenan, 3 dilewati (tanpa BACKUP).
const fs = require('fs');
const TIPE = new Set(['SELF', 'INVESTOR', 'CUSTOMER', 'THIRD_PARTY', 'FAMILY']); // tipe kepemilikan (OWNERSHIP_TYPES), bukan ID registry
function periksa(d) {
  const reg = new Map((d.ownerRegistry || []).map((o) => [String(o.id), String(o.name || '').trim()]));
  const bad = [];
  const chk = (src, id, name) => {
    if (id == null || id === '' || TIPE.has(String(id))) return;
    const r = reg.get(String(id));
    if (r === undefined) bad.push(src + ': ownerId ' + id + ' tidak ada di registry');
    else if (name !== undefined && String(name).trim() !== r) bad.push(src + ': nama "' + name + '" != registry "' + r + '"');
  };
  (d.assets || []).forEach((a) => (a.owners || []).filter((o) => !o.isSelf).forEach((o) => chk('aset ' + a.id, o.ownerId, o.ownerName)));
  (d.investments || []).forEach((h) => (h.owners || []).filter((o) => !o.isSelf).forEach((o) => chk('holding ' + h.id, o.ownerId, o.ownerName)));
  (d.titipanCommitments || []).forEach((c) => chk('komitmen ' + c.ownerId, c.ownerId, c.ownerName));
  (d.debts || []).forEach((x) => {
    if (x.linkedOwnerId) chk('utang ' + x.name, x.linkedOwnerId, x.name);
    if (x.renovBagiProjectId != null && String(x.linkedOwnerId) !== String(x.renovBagiOwnerId)) bad.push('utang bagi hasil ' + x.name + ': linkedOwnerId != renovBagiOwnerId');
  });
  (d.renovProjects || []).forEach((p) => ((p.bagiHasil || {}).owners || []).filter((o) => !o.isSelf).forEach((o) => chk('bagiHasil ' + p.name, o.ownerId, o.ownerName)));
  const n = {}; (d.ownerRegistry || []).forEach((o) => { const k = String(o.name || '').trim().toLowerCase(); n[k] = (n[k] || 0) + 1; });
  Object.keys(n).filter((k) => n[k] > 1).forEach((k) => bad.push('registry: nama ganda ' + k));
  return bad;
}
module.exports = { periksa };
if (require.main === module) {
  const f = process.env.BACKUP || process.env.E2E_BACKUP;
  if (!f || !fs.existsSync(f)) { console.log('E2E-PEMILIK SKIP — BACKUP tidak diberikan'); process.exit(process.env.E2E_SKIP_OK === '1' ? 0 : 3); }
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); const bad = periksa(j.data || j);
  if (bad.length) { console.error('E2E-PEMILIK FAIL\n' + bad.join('\n')); process.exit(1); }
  console.log('E2E-PEMILIK OK — nama/ID pemilik konsisten'); process.exit(0);
}
