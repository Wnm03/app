const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-b.js'),'utf8');

test('S1906 riwayat servis punya selection state transient dan vehicle scoped',()=>{
  assert.match(src,/_selectedHistoryIds:new Set\(\)/);
  assert.match(src,/_selectedHistoryVehicleId:null/);
  assert.match(src,/never persisted and never creates a new service record/);
  assert.match(src,/_historySelectionVehicleId\(\)/);
  assert.match(src,/if\(Servis\._selectedHistoryVehicleId!==selectionScope\)\{Servis\._selectedHistoryIds\.clear\(\)/);
});

test('S1906 setiap row riwayat dapat dicentang tanpa membuka editor',()=>{
  assert.match(src,/type="checkbox"/);
  assert.match(src,/data-action="Servis\.toggleHistorySelection"/);
  assert.match(src,/data-stop="1"/);
});

test('S1906 tersedia pilih semua, bersihkan, dan audit terpilih',()=>{
  assert.match(src,/Servis\.selectAllVisibleHistory/);
  assert.match(src,/Servis\.clearHistorySelection/);
  assert.match(src,/Servis\.openHistoryAudit/);
  assert.match(src,/Audit Riwayat Terpilih/);
});

test('S1906 audit adalah snapshot read-only dan tidak membuat SOT baru',()=>{
  assert.match(src,/Snapshot read-only dari riwayat yang dicentang/);
  assert.match(src,/Tidak membuat record servis, reminder, interval, atau transaksi baru/);
  assert.match(src,/renderSelectedHistoryAudit\(logs\)/);
});

test('S1906 audit mengikutsertakan editHistory dan perubahan aktual bila tersedia',()=>{
  assert.match(src,/Array\.isArray\(s\.editHistory\)/);
  assert.match(src,/Array\.isArray\(h&&h\.changes\)/);
  assert.match(src,/ch\.from/);
  assert.match(src,/ch\.to/);
});

test('S1906 selection hanya mengambil record kendaraan aktif',()=>{
  assert.match(src,/s&&s\.vehicleId===curVehicleId/);
  assert.match(src,/Servis\._getSelectedHistoryLogs/);
});

test('S1906 audit tidak bergantung pada modal edit servis',()=>{
  const start=src.indexOf('renderSelectedHistoryAudit(logs)');
  const end=src.indexOf('hideHistoryAudit()',start);
  assert.ok(start>=0&&end>start);
  const block=src.slice(start,end);
  assert.doesNotMatch(block,/openModal\(/);
  assert.doesNotMatch(block,/save\(/);
});

test('S1906 toolbar disembunyikan ketika hasil filter tidak memiliki riwayat',()=>{
  const idx=src.indexOf('if(!logs.length){');
  assert.ok(idx>=0);
  const block=src.slice(idx,idx+700);
  assert.match(block,/servisHistoryAuditToolbar/);
  assert.match(block,/servisHistoryAuditSelection/);
});
