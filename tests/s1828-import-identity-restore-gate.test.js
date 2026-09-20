'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const SRC='modules/shared/backup-restore.js';
function read(){return fs.readFileSync(SRC,'utf8');}

test('S1828: import transaksi memakai importIdempotencyKey dan dedupe terhadap existing + accepted batch keys',()=>{
 const s=read();
 assert.match(s,/function _dedupeImportedTransactions\(imported\)/);
 assert.match(s,/importIdempotencyKey/);
 assert.match(s,/existingKeys=new Set\(\(Array\.isArray\(D\.transactions\)/);
 assert.match(s,/const acceptedKeys=new Set\(\);/);
 assert.match(s,/if\(existingKeys\.has\(key\)\|\|acceptedKeys\.has\(key\)\)return false;/);
 assert.match(s,/acceptedKeys\.add\(key\);/);
});

test('S1828: CSV parser memakai record parser yang menghormati quoted newline',()=>{
 const s=read();
 assert.match(s,/function splitCSVRecords\(content\)/);
 assert.match(s,/if\(!inQ&&\(ch==='\\n'\|\|ch==='\\r'\)\)/);
 assert.doesNotMatch(s,/function parseCSVImport\(content,type\)\{\nconst lines=content\.split/);
});

test('S1828: restore menolak shape domain kritis yang salah sebelum merge',()=>{
 const s=read();
 assert.match(s,/function _validateRestoreShape\(imp\)/);
 assert.match(s,/arrayKeys=\['transactions','accounts'/);
 assert.ok(s.includes("Field 'categories' harus berupa objek") || s.includes('Field "categories" harus berupa objek'));
 assert.match(s,/const _shape=_validateRestoreShape\(imp\)/);
});

test('S1828: JSON transaction import key stabil berdasarkan id atau row index',()=>{
 const s=read();
 assert.match(s,/row\.id\?`json:\$\{row\.id\}`:`json-row:\$\{i\}/);
});

test('S1828: car CSV import juga memakai splitCSVRecords',()=>{
 const s=read();
 assert.match(s,/const lines=splitCSVRecords\(content\);\nif\(lines\.length<2\)\{resultEl/);
});

test('S1828 smoke: quoted newline tetap menjadi satu record',()=>{
 const s=read();
 const start=s.indexOf('function splitCSVRecords(content){');
 const end=s.indexOf('const CAT_EMOJI_GUESS=',start);
 assert.ok(start>=0&&end>start);
 const vm=require('vm');
 const ctx={};
 vm.runInNewContext(s.slice(start,end)+';this.splitCSVRecords=splitCSVRecords;this.splitCSVLine=splitCSVLine;',ctx);
 const rows=ctx.splitCSVRecords('a,b\n"hello\nworld",2\n');
 assert.equal(rows.length,2);
 assert.equal(JSON.stringify(ctx.splitCSVLine(rows[1])),JSON.stringify(['hello\nworld','2']));
});
