'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const master=require(path.join(ROOT,'modules/vehicle/service-master-data.generated.js'));
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
global.__SERVICE_CHECKLIST_GROUPS__=master.SERVICE_CHECKLIST_GROUPS;
global.ServiceTaxonomySOT=require(path.join(ROOT,'modules/vehicle/service-taxonomy-sot.js'));
const Reconcile=require(path.join(ROOT,'modules/vehicle/service-data-reconciliation-s2161.js'));
const input=process.argv[2];
let data;
if(input){data=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));}
else {data={vehicles:[],servisLogs:[],sparepartCats:[]};}
const report=Reconcile.audit(data);
const out={version:report.version,summary:report.summary,duplicateIds:report.duplicateIds,issues:report.rows.filter(x=>x.status!=='clean').concat(report.checklist.filter(x=>x.status!=='clean')).map(x=>({path:x.path,id:x.id,status:x.status,reason:x.reason,source:x.source,after:x.after}))};
console.log(JSON.stringify(out,null,2));
process.exit(report.duplicateIds.length||report.summary.conflict?1:0);
