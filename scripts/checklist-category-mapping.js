#!/usr/bin/env node
/**
 * Read-only checklist mapping audit.
 * Scans a JS source file supplied as argv[2] and reports occurrences of
 * masterCategoryId inside SERVICE_CHECKLIST_GROUPS.
 */
const fs = require('node:fs');
const f = process.argv[2];
if (!f) {
  console.log(JSON.stringify({status:'READY', message:'Pass checklist source path as argv[2].'}, null, 2));
  process.exit(0);
}
const t = fs.readFileSync(f,'utf8');
const groups = (t.match(/masterCategoryId\s*:/g) || []).length;
const itemBlocks = (t.match(/\bitems\s*:/g) || []).length;
console.log(JSON.stringify({
  status:'AUDIT_ONLY',
  masterCategoryId_declarations: groups,
  item_arrays_detected: itemBlocks,
  destructive:false
}, null, 2));
