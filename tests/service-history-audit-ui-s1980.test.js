const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const ui=fs.readFileSync(require.resolve('../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');const sb=fs.readFileSync(require.resolve('../modules/vehicle/servis-b.js'),'utf8');
test('S1980 package button is selection-gated at 2 records',()=>{assert.match(ui,/id="serviceCreateHistoryAuditPackageBtn"[^>]*disabled/);assert.match(fs.readFileSync(require.resolve('../modules/vehicle/servis.js'),'utf8'),/pkg\.disabled=n<2/);});
test('S1980 filter rendering does not delete valid selection state',()=>{assert.match(sb,/selection is operation state, not filter state/);assert.doesNotMatch(sb,/visibleCandidateIds\.includes\(String\(id\)\)\)Servis\._selectedHistoryIds\.delete/);});
test('S1980 Job Type editor runtime uses reassignable box',()=>{assert.match(ui,/let box=document\.getElementById\('serviceHistoryJobTypeEditor'\)/);});
