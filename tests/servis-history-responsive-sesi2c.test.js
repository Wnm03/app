const fs = require('fs');
const js = fs.readFileSync('car-notes.js','utf8');
const css = fs.readFileSync('styles.css','utf8');
function assert(c,m){if(!c)throw new Error(m)}
assert(js.includes('servis-history-item'),'row class missing');
assert(js.includes('servis-history-badges'),'badge container missing');
assert(js.includes('servis-history-check'),'checklist badge missing');
assert(js.includes('servis-history-delete'),'delete class missing');
assert(js.includes('ServisChecklist.summaryFromLog(s)'),'summary still comes from checklist SoT');
assert(css.includes('@media (max-width: 600px)'),'mobile breakpoint missing');
assert(css.includes('#servisActionTypeChipRow, #servisMasterCategoryChipRow'),'filter mobile rule missing');
assert(css.includes('#servisListLoadMoreWrap .btn'),'load-more mobile rule missing');
console.log('Sesi 2C responsive UX checks: PASS');
