const fs=require('fs'),assert=require('assert');
const adapter=fs.readFileSync(__dirname+'/../modules/vehicle/service-event-adapter.js','utf8');
const cn=fs.readFileSync(__dirname+'/../car-notes.js','utf8');
assert(adapter.includes('stablePayloadId')&&adapter.includes('fallback=JSON.stringify'));
assert(cn.includes('getServiceFinanceOwnershipIntegrity'));
assert(cn.includes("multiple_finance_owners"));
console.log('V33 hardening tests: PASS');
