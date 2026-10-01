const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

const ROOT=path.resolve(__dirname,'..');
const productionFiles=[
  'modules/finance/piutang-utang.js',
  'modules/finance/tagihan-kalender.js',
  'modules/finance/titipan-sync.js',
  'modules/finance/titipan-reconcile.js',
  'modules/asset/investasi.js',
  'modules/asset/aset.js'
];

test('S2187 production sweep: no direct collection replacement/push/splice remains for canonical Bill/Debt/Piutang arrays',()=>{
  const patterns=[
    /D\.(bills|billsArchive|debts|piutang)\s*=/,
    /D\.(bills|billsArchive|debts|piutang)\.(?:push|splice)\s*\(/,
    /D\.(bills|billsArchive|debts|piutang)\[[^\]]+\]\s*=/
  ];
  const hits=[];
  for(const rel of productionFiles){
    const text=fs.readFileSync(path.join(ROOT,rel),'utf8').split(/\r?\n/);
    text.forEach((line,i)=>{
      if(line.trim().startsWith('//'))return;
      if(patterns.some(re=>re.test(line)))hits.push(`${rel}:${i+1}:${line.trim()}`);
    });
  }
  assert.deepEqual(hits,[]);
});

test('S2187 writer boundary: property mutation remains addressable through updateById',()=>{
  const ctx=loadSource(['modules/finance/bill-debt-piutang-canonical-writer.js'],{D:{debts:[{id:'d1',nilai:100,lunas:false}],bills:[{id:'b1',amount:50}],billsArchive:[],piutang:[]}},['BillDebtPiutangCanonicalWriter']);
  ctx.BillDebtPiutangCanonicalWriter.updateById('debts','d1',d=>{d.nilai=0;d.lunas=true;});
  assert.deepEqual(ctx.D.debts[0],{id:'d1',nilai:0,lunas:true});
});
