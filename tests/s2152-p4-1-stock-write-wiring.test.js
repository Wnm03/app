'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const src=f=>fs.readFileSync(path.join(root,f),'utf8');
test('P4.1 finance new-stock write prefers StockCommandSOT',()=>{const s=src('modules/finance/tx-stok-sparepart.js');assert.match(s,/StockCommandSOT\.create\(np\)/);});
test('P4.1 stock modal edit/create prefers StockCommandSOT',()=>{const s=src('modules/vehicle/sparepart-servis-ui.js');assert.match(s,/StockCommandSOT\.update\(D\.partsStock\[Sparepart\.stockEditIdx\]\.id/);assert.match(s,/StockCommandSOT\.create\(np\)/);});
test('P4.5 removes direct stock-write fallback from finance and stock UI',()=>{for(const f of ['modules/finance/tx-stok-sparepart.js','modules/vehicle/sparepart-servis-ui.js']){const s=src(f);assert.doesNotMatch(s,/else D\.partsStock\.(?:push|splice)/);assert.match(s,/StockCommandSOT\.(?:create|remove|replaceSnapshot)/);}});
