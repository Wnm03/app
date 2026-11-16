'use strict';
// Lencana "Memuat dana klien" di kartu akun hanya bila dana tertahan > 0.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const r=fs.readFileSync('modules/shared/modules-render.js','utf8');
test('lencana akun digerbangi dana tertahan > 0',()=>{
 assert.match(r,/_klienRingkas=\(typeof saldoKlienRingkasSafe==='function'\)\?saldoKlienRingkasSafe\(\):null/);
 assert.match(r,/_klienAccIds=\(_klienRingkas&&_klienRingkas\.tertahan>0&&typeof akunAliranKlienSetSafe==='function'\)/);
});
test('teks lencana tetap ada utk kasus tertahan > 0',()=>{
 assert.match(r,/Memuat dana klien \(tidak termasuk saldo pribadi\)/);
});
