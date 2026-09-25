'use strict';
// S1969: Pengingat -> Riwayat must reuse the canonical Edit Catatan Servis presenter.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis.js'),'utf8');

test('S1969 Riwayat pada Pengingat memilih service-log SOT lalu membuka editor yang sama di tab Riwayat',()=>{
  assert.match(src,/openHistoryFromReminder\(categoryId,componentId\)\{/);
  assert.match(src,/const history=logs\.filter\(sameTarget\)\.slice\(\)\.sort/);
  assert.match(src,/const target=history\.find\(matchesReset\)\|\|history\[0\]\|\|null/);
  assert.match(src,/Servis\.openModal\(target\.id\);\s*Servis\.serviceHistorySessionFilter='';\s*Servis\.serviceHistoryComponentFilter=String\(componentId\|\|''\);\s*Servis\.setEditTab\('history'\);/);
});

test('S1969 routing mempertahankan identity komponen canonical dan tidak membuat SOT riwayat baru',()=>{
  assert.match(src,/componentId=componentId\|\|linkedCat&&linkedCat\.serviceComponentId\|\|null/);
  assert.match(src,/String\(componentId\)===String\(logComponent\)/);
  assert.match(src,/SOT navigation: Pengingat hanya memilih service-log sumber yang canonical/);
  const fnStart=src.indexOf('openHistoryFromReminder(categoryId,componentId){');
  const fnEnd=src.indexOf('\nrenderServiceComponentFilter(beforeEl){',fnStart);
  const fn=src.slice(fnStart,fnEnd);
  assert.doesNotMatch(fn,/D\.servisLogs\.push\(/);
});

test('S1969 saat belum ada riwayat tidak membuat record servis kosong',()=>{
  const fnStart=src.indexOf('openHistoryFromReminder(categoryId,componentId){');
  const fnEnd=src.indexOf('\nrenderServiceComponentFilter(beforeEl){',fnStart);
  const fn=src.slice(fnStart,fnEnd);
  assert.match(fn,/if\(!target\)\{/);
  assert.match(fn,/Belum ada riwayat servis untuk komponen ini/);
  assert.match(fn,/return null;/);
  assert.doesNotMatch(fn,/Servis\.openModal\(null\)/);
});

test('S1969 tombol Riwayat reminder tetap menunjuk resolver canonical yang sama',()=>{
  const ui=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-b.js'),'utf8');
  assert.match(ui,/data-action="Servis\.openHistoryFromReminder"/);
  assert.match(ui,/JSON\.stringify\(\[r\.cat\.id,r\.cat\.serviceComponentId\|\|null\]\)/);
});

test('S1969 tidak lagi mengarahkan tombol Riwayat ke daftar Car Notes sebagai presenter utama',()=>{
  const fnStart=src.indexOf('openHistoryFromReminder(categoryId,componentId){');
  const fnEnd=src.indexOf('\nrenderServiceComponentFilter(beforeEl){',fnStart);
  const fn=src.slice(fnStart,fnEnd);
  assert.match(fn,/if\(!target\)\{[\s\S]*Servis\.renderList\(\);/);
  assert.match(fn,/Servis\.openModal\(target\.id\);/);
  assert.match(fn,/Servis\.openModal\(target\.id\);/);
});
