'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// Compatibility reader for source-level tests during the mechanical Servis split.
// Runtime code is NOT changed here: tests that historically read car-notes.js
// as one monolith now see the exact shipped load order across the split files.
function readServisSource() {
  return [
    'modules/vehicle/servis.js',
    'modules/vehicle/servis-b.js',
  ].map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
}

function readCarNotesSource() {
  const files = [
    'car-notes.js',
    'modules/vehicle/servis-checklist.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js',
    'modules/vehicle/servis-b.js',
  ];
  return files.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
}
module.exports = { readCarNotesSource, readServisSource };
