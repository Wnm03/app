const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const primary=['dashboard-hub','keuangan','shop','aset','carnotes','pajak','settings','ai'];

test('S1929: scrollRoot is a real mobile vertical scroller, not a fixed-root trap',()=>{
  const css=read('styles.css');
  assert.match(css,/position:absolute;[^}]*height:100dvh/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/touch-action:pan-y/);
  assert.match(css,/overscroll-behavior-y:auto/);
  assert.match(css,/scroll-padding-bottom:calc\(108px/);
  assert.match(css,/@supports not \(height:100dvh\)/);
});

test('S1929: every primary page is width-contained on mobile',()=>{
  const css=read('styles.css');
  assert.match(css,/@media \(max-width:899px\)\{[\s\S]*?\.page\{min-width:0;max-width:100%;overflow-x:hidden;\}/);
  assert.match(css,/\.pwa-domain-page\{overflow-x:hidden;\}/);
});

test('S1929: Shop workflow tabs cannot remain as a clipped nowrap rail',()=>{
  for(const f of ['index.html','app_production.html']){
    const html=read(f);
    assert.match(html,/id="page-shop"/);
    assert.doesNotMatch(html,/class="cn-tabs" style="overflow-x:auto;flex-wrap:nowrap/);
  }
  const css=read('styles.css');
  assert.match(css,/#page-shop>\.pwa-domain-page>\.cn-tabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/#page-shop>\.pwa-domain-page>\.cn-tabs \.cn-tab\{min-width:0;width:100%/);
});

test('S1929: domain UI keeps the last content reachable above the floating bottom nav',()=>{
  const css=read('styles.css');
  const pwa=read('pwa-ui-layer.css');
  assert.match(css,/padding-bottom:calc\(108px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(pwa,/padding-bottom:calc\(108px\+env\(safe-area-inset-bottom,0px\)\)/);
});

test('S1929: Feature Insight preserves intentional bold markup without rendering raw HTML tags',()=>{
  const src=read('modules/ai/feature-insights.js');
  assert.match(src,/const safeInsightText=/);
  assert.ok(src.includes("replace(/&lt;b&gt;/g,'<strong>')"));
  assert.ok(src.includes("replace(/&lt;\\/b&gt;/g,'</strong>')"));
  assert.ok(src.includes('escapeHtml(x.icon)} ${safeInsightText(x.text)}'));
  assert.doesNotMatch(src,/text:`[^`]*escapeHtml\([^)]*\)[^`]*`/);
  assert.match(src,/menipis\.slice\(0,2\)\.map\(p=>p\.name\)/);
});

test('S1929: index and production shell keep the Shop tab rail markup synchronized',()=>{
  for(const f of ['index.html','app_production.html']){
    const html=read(f);
    const start=html.indexOf('<div class="page" id="page-shop">');
    const end=html.indexOf('<div class="page" id="page-carnotes">',start);
    assert.ok(start>=0&&end>start);
    const shop=html.slice(start,end);
    assert.match(shop,/<div class="cn-tabs">/);
    assert.doesNotMatch(shop,/overflow-x:auto;flex-wrap:nowrap/);
  }
});


test('S1929: insight destinations resolve to their owning page/tab, not a stale nav address',()=>{
  const src=read('modules/ai/feature-insights.js');
  assert.match(src,/Lihat Piutang[^\n]*page:'keuangan'[^\n]*tab:'utangpiutang'/);
  assert.match(src,/Lihat Utang[^\n]*page:'keuangan'[^\n]*tab:'utangpiutang'/);
  assert.match(src,/Lihat Anggaran[^\n]*page:'keuangan'[^\n]*tab:'budget'/);
  assert.match(src,/Lihat Zakat[^\n]*page:'pajak'[^\n]*tab:'zakat'/);
  assert.match(src,/Lihat PBB[^\n]*page:'pajak'[^\n]*tab:'pajak'[^\n]*subtab:'pbb'/);
  assert.match(src,/Lihat Shop[^\n]*page:'shop'[^\n]*tab:'etalase'/);
  assert.match(src,/Lihat Pajak Kendaraan[^\n]*page:'carnotes'[^\n]*tab:'pajak'/);
  const calc=read('modules/shared/modules-calc.js');
  assert.match(calc,/openAction\(action\)/);
  assert.match(calc,/data-action="FinCoach\.openAction"/);
  assert.match(calc,/setKeuanganTab\(action\.tab/);
  assert.match(calc,/setShopTab\(action\.tab/);
  assert.match(calc,/setCnTab\(action\.tab/);
  assert.match(calc,/setPajakTab\(action\.tab/);
});

test('S1929: retired Pro UI layer is explicitly deleted by patch',()=>{
  const manifest=read('DELETE-FILES.txt');
  assert.match(manifest,/pro-ui-layer\.css/);
});
