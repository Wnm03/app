'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const files=[
 'modules/business/gaji-bulanan.js','modules/business/kasir.js','modules/shared/modules-calc.js',
 'modules/home/renovasi.js','modules/shop/cobek-order.js','modules/shop/cobek-etalase.js',
 'modules/finance/kategori.js','modules/finance/tx-list-cashflow.js','modules/finance/tx-transfer.js',
 'modules/finance/linktx.js','modules/finance/akun.js','modules/finance/transaksi-b.js',
 'modules/finance/tagihan-kalender.js','modules/finance/pajak-pbb-zakat.js','modules/vehicle/vehicle-core.js',
 'modules/vehicle/servis.js'
];
test('S1854: optional refreshAfterMutation calls are standalone-safe',()=>{
 for(const rel of files){
  const s=fs.readFileSync(path.join(ROOT,rel),'utf8');
  const lines=s.split(/\n/);
  lines.forEach((line,i)=>{
   if(!line.includes('refreshAfterMutation(')) return;
   assert.match(line,/if\s*\(typeof refreshAfterMutation===['"]function['"]\)refreshAfterMutation\(/,
     `${rel}:${i+1} must guard refreshAfterMutation in standalone contexts`);
  });
 }
});
