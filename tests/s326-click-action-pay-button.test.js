'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');

test('S326 — tombol Bayar ✅ memakai wrapper action yang eksplisit',()=>{
  const render=fs.readFileSync(path.join(ROOT,'modules','shared','modules-render.js'),'utf8');
  const wrappers=fs.readFileSync(path.join(ROOT,'modules','shared','action-wrappers.js'),'utf8');
  assert.match(wrappers,/function billActionPayNow\(id\)\{\s*return markBillPaid\(id,false\);\s*\}/);
  assert.ok((render.match(/data-action="billActionPayNow"/g)||[]).length>=2,
    'Semua tombol Bayar langsung pada kartu utama/dashboard harus memakai billActionPayNow');
  assert.doesNotMatch(render,/data-action="markBillPaid"[^>]*title="Bayar sekarang"/,
    'Tombol UI Bayar tidak boleh memanggil fungsi inti langsung; gunakan wrapper supaya kontrak klik jelas');
});

test('S326 — kontrak alur bayar: wrapper meneruskan ke markBillPaid(id,false)',()=>{
  const wrappers=fs.readFileSync(path.join(ROOT,'modules','shared','action-wrappers.js'),'utf8');
  const m=wrappers.match(/function billActionPayNow\(id\)\{\s*return markBillPaid\(id,false\);\s*\}/);
  assert.ok(m,'wrapper Bayar tidak ditemukan');
});
