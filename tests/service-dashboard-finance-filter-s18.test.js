const fs=require('fs');
const trend=fs.readFileSync('modules/vehicle/vehicle-service-trend.js','utf8');
const ana=fs.readFileSync('modules/vehicle/vehicle-analytics-presenter.js','utf8');
const f=fs.readFileSync('modules/finance/filter-laporan.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
  ['service trend accepts filters',/summary\(vehicleId, months = 6, filters = \{\}\)/.test(trend)],
  ['analytics category/component selectors',/vehicleServiceAnalyticsFilter/.test(ana)&&/setServiceFilterCategory/.test(ana)&&/setServiceFilterComponent/.test(ana)],
  ['finance service filter fields',/kfServiceCategory/.test(f)&&/kfServiceComponent/.test(f)],
  ['finance filters canonical service log',/D\.servisLogs/.test(f)&&/servisLinkId/.test(f)],
  ['html dashboard filter',/vehicleServiceAnalyticsFilter/.test(html)],
  ['html finance filter',/id="kfServiceCategory"/.test(html)&&/id="kfServiceComponent"/.test(html)],
];
for(const [n,ok] of checks)console.log((ok?'PASS':'FAIL')+' '+n);
if(checks.some(x=>!x[1]))process.exit(1);
