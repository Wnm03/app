'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
const projection=fs.readFileSync(path.join(root,'modules/vehicle/service-runtime-projection-sot-s2166.js'),'utf8');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const servisB=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
const checks={
 sourceExists:fs.existsSync(path.join(root,'modules/vehicle/service-runtime-projection-sot-s2166.js')),
 buildListsProjection:build.includes("'modules/vehicle/service-runtime-projection-sot-s2166.js'"),
 afterTaxonomy:build.indexOf("'modules/vehicle/service-runtime-projection-sot-s2166.js'")>build.indexOf("'modules/vehicle/service-taxonomy-sot.js'"),
 noSecondStorage:!(/D\.(serviceRuntimeProjection|runtimeProjection)\s*=/.test(projection)),
 projectionReadOnly:!(/D\.[A-Za-z0-9_]+\s*=|D\.[A-Za-z0-9_]+\.(?:push|splice|pop)\(/.test(projection)),
 reminderUsesProjection:/ServiceRuntimeProjectionSOT\.reminderCatalog\(D,curVehicleId\)/.test(servisB),
 historyUsesProjection:/ServiceRuntimeProjectionSOT\.historyRows\(D,curVehicleId\)/.test(servisB),
 reminderHistoryNavigationUsesProjection:/ServiceRuntimeProjectionSOT\.historyRows\(D,vehicleId\)/.test(servisB),
 servisBundleConsumerPresent:build.includes("'modules/vehicle/servis.js'")||build.includes("'modules/vehicle/servis-b.js'"),
};
if(!Object.values(checks).every(Boolean)) throw new Error(JSON.stringify({checks},null,2));
console.log(JSON.stringify({version:'S2167-PRODUCTION-RUNTIME-WIRING',pass:true,checks},null,2));
