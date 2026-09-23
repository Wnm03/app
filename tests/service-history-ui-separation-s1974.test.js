const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const servis=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const modals=fs.readFileSync(path.join(__dirname,'../modules/shared/modals.js'),'utf8');

test('S1974+: Riwayat dipisahkan dari Audit/Paket',()=>{
 const start=servis.indexOf('renderEditHistoryTab(){');
 const end=servis.indexOf('_renderEditHistoryHtml(s){',start);
 const history=servis.slice(start,end);
 assert.match(history,/Halaman ini hanya menampilkan bukti riwayat/);
 assert.doesNotMatch(history,/Jadikan Paket Pekerjaan/);
 assert.doesNotMatch(history,/Edit Kategori\/Komponen SOT/);
 assert.doesNotMatch(history,/Jenis Pekerjaan.*Audit/);
});

test('S1974+: tab Audit dan panel Audit tersedia sebagai surface terpisah',()=>{
 assert.match(modals,/id=\\"servisEditTabAudit\\"/);
 assert.match(modals,/id=\\"servisAuditPanel\\"/);
 assert.match(servis,/tab==='audit'\?'audit'/);
 assert.match(servis,/renderEditAuditTab\(\)/);
});

test('S1974+: operasi bulk membaca pilihan dari Audit panel terlebih dahulu',()=>{
 assert.match(servis,/document\.getElementById\('servisAuditPanel'\)\|\|document\.getElementById\('servisHistoryPanel'\)/);
});

test('S1974+: modal edit menggunakan satu viewport dan panel internal yang dapat scroll',()=>{
 assert.match(servis,/modal\.style\.height='100dvh'/);
 assert.match(servis,/modal\.style\.overflowY='hidden'/);
 assert.match(servis,/modal\.style\.display='flex'/);
 assert.match(servis,/detail\.style\.overflowY='auto'/);
 assert.match(servis,/reminder\.style\.overflowY='auto'/);
 assert.match(servis,/history\.style\.overflowY='auto'/);
 assert.match(servis,/audit\.style\.overflowY='auto'/);
});
