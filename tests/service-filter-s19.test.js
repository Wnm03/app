// S19: reminder/stock/catalog read-only category+component filters + trend rows.
const fs=require('fs');
const assert=require('assert');
function has(p,t){return fs.readFileSync(p,'utf8').includes(t);}
assert(has('car-notes.js','activeReminderMasterCategoryFilter:null'),'Reminder category filter state missing');
assert(has('car-notes.js','setReminderComponentFilter(id)'),'Reminder component filter handler missing');
assert(has('car-notes.js','filteredRemindableCats'),'Reminder filtered view missing');
assert(has('modules/vehicle/sparepart-servis.js','activeStockMasterCategoryFilter:null'),'Stock category filter state missing');
assert(has('modules/vehicle/sparepart-servis.js','activeStockComponentFilter:null'),'Stock component filter state missing');
assert(has('modules/vehicle/sparepart-servis.js','renderStockFilters(beforeEl)'),'Stock filter UI missing');
assert(has('modules/vehicle/vehicle-catalog-ui.js','_catMasterFilter'),'Catalog master filter state missing');
assert(has('modules/vehicle/vehicle-catalog-ui.js','onSearchInput: catalogUiOnSearchInput'),'Catalog search handler missing');
const trend=fs.readFileSync('modules/vehicle/vehicle-service-trend.js','utf8');
assert(trend.includes('const hasFilter = !!(filters.masterCategoryId || filters.serviceComponentId);'),'Trend filter branch missing');
assert(trend.includes('return { ...r, value }'),'Filtered trend row recomputation missing');
console.log('S19 static SoT/filter checks: 10/10 PASS');
