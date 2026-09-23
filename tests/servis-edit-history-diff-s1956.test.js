const assert=require('assert');const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
assert.match(src,/const _editAuditFieldLabels=\{/);
assert.match(src,/const _editAuditFields=Object\.keys\(_editAuditFieldLabels\)/);
assert.match(src,/const _changedAuditFields=_editAuditFields\.filter/);
assert.doesNotMatch(src,/fields:\['categoryId','masterCategoryId','serviceComponentId','item','note','foto','checklist','cost','accountId'\]/);
console.log('S1956 edit-history true diff contract: PASS');
