const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const files=[
  'modules/finance/tx-list-cashflow.js',
  'modules/shared/modules-render.js',
  'modules/shop/modules-render.js',
  'modules/vehicle/vehicle-core.js',
  'modules/vehicle/servis.js',
  'modules/finance/tagihan-kalender.js',
  'modules/finance/kategori.js',
  'modules/finance/filter-laporan.js',
  'modules/finance/tx-bbm.js',
];

test('S2441: persisted emoji rendered into HTML is HTML-encoded',()=>{
  for(const rel of files){
    const src=fs.readFileSync(path.join(ROOT,rel),'utf8');
    assert.ok(!/\$\{(?:a|c|v|t|r\.veh|guessedCat\??[^}]*)\.emoji\}/.test(src),`${rel}: raw emoji interpolation remains`);
  }
  const tx=fs.readFileSync(path.join(ROOT,'modules/finance/tx-list-cashflow.js'),'utf8');
  assert.match(tx,/\$\{escapeHtml\(icon\)\}/);
  assert.match(tx,/\$\{escapeHtml\(acc\.emoji\)\}/);
});

test('S2441: vehicle/category/account select emoji sinks are encoded',()=>{
  const checks=[
    ['modules/vehicle/vehicle-core.js','escapeHtml(v.emoji)'],
    ['modules/vehicle/servis.js','escapeHtml(a.emoji)'],
    ['modules/finance/tagihan-kalender.js','escapeHtml(c.emoji)'],
    ['modules/finance/tagihan-kalender.js','escapeHtml(a.emoji)'],
    ['modules/finance/kategori.js','escapeHtml(emoji)'],
    ['modules/finance/filter-laporan.js','escapeHtml(a.emoji)'],
    ['modules/finance/tx-bbm.js','escapeHtml(v.emoji)'],
  ];
  for(const [rel,needle] of checks) assert.match(fs.readFileSync(path.join(ROOT,rel),'utf8'),new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
