const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1924: showPage clears a stale render-recovery card before retrying a page',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const clear=src.indexOf("pageEl.querySelector('.page-render-error')");
  const tryRender=src.indexOf('try{\n  renderPageContent(name);',clear);
  assert.ok(clear>=0,'showPage harus mencari recovery card lama');
  assert.ok(src.indexOf("_staleRenderError.remove()",clear)<tryRender,
    'recovery card lama harus dihapus sebelum retry render');
  assert.ok(src.indexOf("delete pageEl.dataset.renderError",clear)<tryRender,
    'flag renderError lama harus dibersihkan sebelum retry render');
  assert.ok(src.indexOf("box.className='page-render-error card'")>tryRender,
    'catch tetap harus membuat recovery card baru bila retry gagal');
});

test('S1924: already-active nav detection happens before active-state cleanup',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const detectDecl=src.indexOf('const _sameActiveNav=');
  const detectPageActive=src.indexOf("pageEl.classList.contains('active')",detectDecl);
  const detectNavActive=src.indexOf("el.classList.contains('nav-item')",detectDecl);
  const clear=src.indexOf("pageEl.querySelector('.page-render-error')");
  assert.ok(detectDecl>=0&&detectPageActive>detectDecl&&detectNavActive>detectDecl,'guard already-active nav harus ada');
  assert.ok(clear>=0,'active page cleanup harus tetap ada');
  assert.ok(detectDecl<clear,
    'guard already-active nav harus dihitung sebelum active classes dihapus');
});

test('S1924: navigation recovery contract still validates destination before destructive cleanup',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const guard=src.indexOf("if(!pageEl){");
  const destructiveScan=src.indexOf("document.querySelectorAll('.page').forEach(p=>");
  const destructive=src.indexOf("p.classList.remove('active')",destructiveScan);
  assert.ok(guard>=0&&destructiveScan>guard&&destructive>destructiveScan);
  assert.match(src,/return false;/);
});
