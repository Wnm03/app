'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('fs'); const path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'); const A=r('modules/ai/kategorisasi-ai.js'), G=r('modules/asset/aset-emas-impor.js');
test('SA18e: AutoKat migrated buttons use data-action and window exposure',()=>{assert.match(A,/data-action="AutoKat\.apply"/); assert.match(A,/data-action="AutoKat\.hideSuggest"/); assert.match(A,/window\.AutoKat\s*=\s*AutoKat/); assert.doesNotMatch(A,/onclick="AutoKat\.(?:apply|hideSuggest)\(\)/);});
test('SA18e: GoldZakat price field uses dispatcher-safe handlers',()=>{assert.match(G,/data-oninput="GoldZakat\.onHargaInput"/); assert.match(G,/data-onblur="_gzHargaOnBlur"/); assert.doesNotMatch(G,/onblur="evalAmtExpr\([^\n]*GoldZakat\.onHargaInput\(\)/);});
