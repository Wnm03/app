'use strict';
// Audit dana proyek: 4 konsumen yang masih menghitung aliran klien sbg pemasukan/pengeluaran pribadi.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');
const rd=(f)=>fs.readFileSync(f,'utf8');
const pad=(n)=>String(n).padStart(2,'0');
const NOW=new Date(),Y=NOW.getFullYear(),TODAY=Y+'-'+pad(NOW.getMonth()+1)+'-'+pad(NOW.getDate());
const KL="isAliranKlienSafe";

test('G1 ringkasan bulan Keuangan (render-b): income/expense real tanpa aliran klien + pencairan',()=>{
 const s=rd('modules/shared/modules-render-b.js');
 const i=s.indexOf('const txM=[];let inc=0,exp=0,incReal=0,expReal=0;');
 assert.ok(i>0);
 const blk=s.slice(i,i+1400);
 assert.match(blk,/isAliranKlienSafe/);
 assert.match(blk,/pencairanKlienBulanSafe/);
});
test('G2 kartu surplus (render.js): aliran klien dikeluarkan + pencairan masuk',()=>{
 const s=rd('modules/shared/modules-render.js');
 const i=s.indexOf('S2361: agregasi income/expense satu pass');
 assert.ok(i>0);
 const blk=s.slice(i,i+700);
 assert.match(blk,/isAliranKlienSafe/);
 assert.match(blk,/pencairanKlienBulanSafe/);
});
test('G4 budget insight (feature-insights): belanja dana proyek tidak memakai budget',()=>{
 const s=rd('modules/ai/feature-insights.js');
 const i=s.indexOf('const used=(D.transactions||[]).filter');
 assert.ok(i>0);
 assert.match(s.slice(i,i+400),/isAliranKlienSafe/);
});
test('G3 PPh21 isiDariTransaksi: DP klien tidak dihitung gaji; pencairan laba dihitung',()=>{
 const src=rd('modules/finance/pajak-pbb-zakat.js');
 const i=src.indexOf('isiDariTransaksi(){');
 const blk=src.slice(i,i+900);
 assert.match(blk,/isAliranKlienSafe/);
 assert.match(blk,/pencairanKlienRentangSafe/);
});
