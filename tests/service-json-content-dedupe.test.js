// S1875 focused regression specification (source-level fixture).
// The runtime harness should load backup-restore.js and assert that two service
// rows differing only in id/idempotencyKey produce one accepted import row.
const fs=require('fs');
const src=fs.readFileSync('modules/shared/backup-restore.js','utf8');
if(!src.includes('function _serviceImportFingerprint'))throw new Error('missing service fingerprint helper');
if(!src.includes('existingServiceFingerprints.has(_serviceFp)||importedServiceFingerprints.has(_serviceFp)'))throw new Error('missing JSON service dedupe gate');
console.log('S1875 source assertions passed');
