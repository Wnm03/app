const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const renderB=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
const vehicleCore=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-core.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const actions=fs.readFileSync(path.join(root,'modules/shared/action-wrappers.js'),'utf8');
const shopRender=fs.readFileSync(path.join(root,'modules/shop/modules-render.js'),'utf8');
const catalogUi=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-catalog-ui.js'),'utf8');
const modals=fs.readFileSync(path.join(root,'modules/shared/modals.js'),'utf8');

describe('S1970 Car Notes — sparepart dashboard/stock lazy SOT + katalog single modal',()=>{
  it('Servis tab lazy-renders canonical kategori + stok; other Car Notes tabs do not',()=>{
    const branch=renderB.match(/else if\(activeTab==='servis'\)\{([\s\S]*?)\n\}\s*else if\(activeTab==='pajak'\)/);
    assert.ok(branch,'branch Servis harus ada');
    assert.match(branch[1],/renderSparepartCatList/);
    assert.match(branch[1],/renderStockList/);
    const before=renderB.slice(0,renderB.indexOf("else if(activeTab==='servis')"));
    assert.doesNotMatch(before,/carnotes\.render\.sparepart(?:Categories|Stock)/);
    const settingsBody=renderB.match(/function renderSettings\(\)\{([\s\S]*?)\n\}/);
    assert.ok(settingsBody,'renderSettings shared harus ada');
    assert.doesNotMatch(settingsBody[1],/renderSparepartCatList\(\)|renderStockList\(\)/);
    const shopSettings=shopRender.match(/function renderSettings\(\)\{([\s\S]*?)\n\}/);
    assert.ok(shopSettings,'renderSettings shop harus ada');
    assert.doesNotMatch(shopSettings[1],/renderSparepartCatList\(\)|renderStockList\(\)/);
  });

  it('stok memakai renderer canonical yang sama dan dashboard berasal dari renderer stok, bukan daftar kedua',()=>{
    assert.match(renderB,/function renderStockList\(\)\{return Sparepart\.renderStockList\(\);\}/);
    const stockUi=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis-ui.js'),'utf8');
    const stockFn=stockUi.indexOf('renderStockList(){');
    assert.notEqual(stockFn,-1,'renderStockList canonical harus ada');
    assert.match(stockUi.slice(stockFn,stockFn+700),/Sparepart\.renderDashboard\(\)/);
  });

  it('Katalog Part Car Notes memakai satu modal catalogModal; form edit adalah panel di modal yang sama',()=>{
    assert.match(index,/data-action="VehicleCatalogUI\.open"/);
    assert.doesNotMatch(index,/qsCarnotesKatalogDinamis/);
    assert.match(actions,/function qsCarnotesKatalog\(\)\{[^}]*VehicleCatalogUI\.open\(\)/);
    assert.match(actions,/function qsCarnotesKatalogDinamis\(/);
    assert.match(catalogUi,/openModal\('catalogModal'\)/);
    assert.match(catalogUi,/getElementById\('catalogFormWrap'\)/);
    assert.doesNotMatch(catalogUi,/openModal\(['"]catalogForm/);
    assert.match(modals,/catalogModal/);
    assert.doesNotMatch(modals,/id=\\"catalogFormModal\\"/);
  });

  it('dua entry point visual Car Notes menuju presenter katalog yang sama, bukan dua SOT',()=>{
    const hits=(index.match(/data-action="VehicleCatalogUI\.open"/g)||[]).length;
    assert.ok(hits>=2,'hero + summary Katalog harus tetap tersedia');
    assert.match(index,/id="qsCarnotes"[\s\S]*?data-action="qsCarnotesKatalog"/);
    assert.match(actions,/function qsCarnotesKatalog\(\)\{ closeQS\('qsCarnotes'\); VehicleCatalogUI\.open\(\); \}/);
  });
});
