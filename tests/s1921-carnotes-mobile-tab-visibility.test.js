'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1921: Car Notes mobile top-level tabs must wrap so BBM and Servis stay visible',()=>{
  const css=read('styles.css');
  assert.match(css,/@media\(max-width:560px\)\{[\s\S]*?#page-carnotes > \.cn-tabs:not\(\.cni-subtabs\):not\(\.cnb-subtabs\)\{[\s\S]*?display:grid;[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/,
    'mobile Car Notes rail harus menjadi grid 3 kolom');
  assert.match(css,/#page-carnotes > \.cn-tabs:not\(\.cni-subtabs\):not\(\.cnb-subtabs\)\{[\s\S]*?overflow:visible;/,
    'mobile Car Notes rail tidak boleh mengandalkan horizontal scroll untuk BBM/Servis');
  assert.match(css,/#page-carnotes > \.cn-tabs:not\(\.cni-subtabs\):not\(\.cnb-subtabs\) \.cn-tab\{[\s\S]*?min-width:0;/,
    'tab mobile harus boleh menyusut agar semua tab tetap masuk viewport');
});

test('S1921: semua 5 Car Notes tabs tetap menjadi top-level actions + pane contracts',()=>{
  const html=read('index.html');
  const start=html.indexOf('<div class="page" id="page-carnotes">');
  const end=html.indexOf('<div class="page" id="page-pajak">',start);
  assert.ok(start>=0&&end>start,'Car Notes page harus ada');
  const page=html.slice(start,end);
  const tabContracts = [
    ['insight','🧠 Insight AI'],
    ['bbm','⛽ BBM'],
    ['servis','🔧 Servis'],
    ['pajak','🚦 Pajak &amp; SIM'],
    ['jalan','🚴 Jalan']
  ];
  for (const [tab,label] of tabContracts) {
    assert.ok(page.includes(`data-action=\"setCnTab\" data-args='[\"${tab}\", \"$el\"]'`), `${tab} top-level action harus ada`);
    assert.ok(page.includes(`>${label}</button>`), `${tab} label harus ada`);
  }
  for (const [tab,hidden] of [['insight',false],['bbm',false],['servis',true],['pajak',true],['jalan',true]]) {
    const re = hidden ? new RegExp('<div id=\"cnTab-'+tab+'\" class=\"u-dnone\">') : new RegExp('<div id=\"cnTab-'+tab+'\"(?: class=\"u-dnone\")?>');
    assert.match(page,re);
  }
});

test('S1921: active BBM/Servis renderer paths remain intact',()=>{
  const r=read('modules/shared/modules-render-b.js');
  assert.match(r,/else if\(activeTab==='bbm'\)\{[\s\S]*?renderBbmList\(\);/);
  assert.match(r,/else if\(activeTab==='servis'\)\{[\s\S]*?renderServisList\(\{skipReminder:true\}\)/);
});

test('S1921: setCnTab still controls both BBM and Servis panes',()=>{
  const r=read('modules/vehicle/vehicle-core.js');
  assert.ok(r.includes("['beranda','insight','bbm','servis','pajak','jalan'].forEach(x=>{"));
  assert.ok(r.includes("document.getElementById('cnTab-'+x)"));
  assert.ok(r.includes("elx.classList.toggle('u-dnone', x!==t)"));
});
