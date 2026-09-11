const fs=require('fs');
const js=fs.readFileSync('car-notes.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
function assert(c,m){if(!c)throw new Error(m)}
assert(js.includes('const fotoOrIcon=fotoThumb||`<div class="tx-icon u-bgaccsoft">🔧</div>`;'),'photo/icon fallback missing');
assert(js.includes('${fotoOrIcon}<div class="tx-info servis-history-info">'),'row must render exactly one leading visual cell');
assert(js.includes('data-stop="1" data-action="delServis"'),'delete action must stop row click');
assert(js.includes('Servis.setActionTypeFilter'),'action filter dispatcher intact');
assert(js.includes('Servis.renderMasterCategoryChips(el)'),'master filter dispatcher intact');
assert(js.includes('const visibleCount=Math.min(logs.length,Servis.listPage*TX_PAGE_SIZE);'),'pagination semantics intact');
assert(css.includes('grid-template-areas: "icon info amount" "icon info del"'),'mobile interaction grid intact');
assert(css.includes('#servisActionTypeChipRow, #servisMasterCategoryChipRow'),'filter scroll rule intact');
console.log('Sesi 2D regression/interaction checks: PASS');
