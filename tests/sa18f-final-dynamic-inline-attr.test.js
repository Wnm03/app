'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('fs'); const path=require('path');
const files=['modules/shared/data-archive.js','modules/vehicle/vehicle-core.js','modules/shop/cobek-order.js','modules/finance/filter-laporan.js','modules/business/tukang-absensi.js','car-notes.js'];
const legacy=/(?<!data-)on(?:click|change|input|blur|keydown|keyup|focus|submit|load|mouseover|mouseout|touchstart|touchend)\s*=\s*["\']/i;
for(const f of files){test(`SA18f: ${f} has no active inline event attributes`,()=>{const s=fs.readFileSync(path.join(__dirname,'..',f),'utf8'); const active=s.split('\n').filter(x=>!/^\s*(?:\/\/|\*|\/\*)/.test(x)).join('\n'); assert.doesNotMatch(active,legacy);});}
test('SA18f: vehicle current-KM keydown logic is named and dispatcher-safe',()=>{const s=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/vehicle-core.js'),'utf8'); assert.ok(s.includes('data-onkeydown="_vehCnCurKmKeydown"')); assert.match(s,/function _vehCnCurKmKeydown\(e\)/); assert.match(s,/e\.target\.blur\(\)/);});
