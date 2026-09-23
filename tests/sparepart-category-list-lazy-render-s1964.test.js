const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const renderB=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sparepart=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');

describe('S1964 Car Notes — kategori sparepart + komponen lazy-render SOT',()=>{
  it('servis tab memanggil renderer kategori sparepart canonical',()=>{
    assert.match(
      renderB,
      /else if\(activeTab==='servis'\)\{[\s\S]*?renderSparepartCatList\(\)/,
      'tab Servis harus merender daftar kategori sparepart yang sudah menjadi SOT'
    );
  });

  it('renderer tetap lazy: tidak dipanggil di branch BBM/Insight/Pajak/Jalan',()=>{
    const servis=renderB.match(/else if\(activeTab==='servis'\)\{([\s\S]*?)\n\}\s*else if\(activeTab==='pajak'\)/);
    assert.ok(servis,'branch Servis harus ada');
    assert.match(servis[1],/renderSparepartCatList(?:\(|,)/);
    const before=renderB.slice(0,renderB.indexOf("else if(activeTab==='servis')"));
    assert.doesNotMatch(before,/carnotes\.render\.sparepartCategoryList/);
  });

  it('container UI dan tombol tambah kategori tetap memakai jalur canonical yang sama',()=>{
    assert.match(index,/id="sparepartCatList"/);
    assert.match(index,/data-action="openSparepartModal"[^>]*aria-label="Edit\/Buka"/);
    assert.match(index,/\+ Tambah Kategori Sparepart/);
  });

  it('wrapper renderer mendelegasikan ke Sparepart.renderCatList, bukan membuat daftar kedua',()=>{
    assert.match(renderB,/function renderSparepartCatList\(\)\{return Sparepart\.renderCatList\(\);\}/);
    assert.doesNotMatch(renderB,/function renderSparepartCatList\([^)]*\)\{[\s\S]{0,800}D\.sparepartCats\.map/);
  });

  it('renderer daftar tetap menampilkan komponen canonical dan tombol edit kategori yang sama',()=>{
    assert.match(sparepart,/ServiceInputCatalog\.itemById\(c\.serviceComponentId\)/);
    assert.match(sparepart,/const compLabel=compRef&&compRef\.item\?\(' • '\+compRef\.item\.name\):'';/);
    assert.match(sparepart,/data-action=\"(?:openSparepartModal|openSparepartModalById)\"/);
  });
});
