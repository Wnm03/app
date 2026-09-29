const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');

test('S2098 history mobile grid assigns explicit action areas so buttons cannot create implicit columns',()=>{
  assert.match(css,/\.servis-history-item\s*\{[^}]*grid-template-areas:\s*"select icon info amount"\s*"select icon edit del"/s);
  assert.match(css,/\.servis-history-item\s*>\s*\.servis-history-edit[^\n]*\{?[^}]*grid-area:\s*edit/s);
  });

test('S2098 service session summary has separate edit/add/delete areas',()=>{
  assert.match(css,/\.servis-history-session-summary\s*\{[^}]*grid-template-areas:\s*"icon info amount"\s*"icon info edit"\s*"icon info add"\s*"icon info del"/s);
  assert.match(css,/\.servis-history-session-summary\s*>\s*\.servis-history-edit-session[^\n]*\{?[^}]*grid-area:\s*edit/s);
  assert.match(css,/\.servis-history-session-summary\s*>\s*\.servis-history-add-session[^\n]*\{?[^}]*grid-area:\s*add/s);
});


test('S2099 mobile history title overrides global tx-name nowrap so two-line clamp can actually work',()=>{
  assert.match(css,/\.servis-history-title\s*\{[^}]*-webkit-line-clamp:\s*2[^}]*white-space:\s*normal/s);
});

test('S2099 narrow-phone layout removes the fixed action column and gives info the full remaining width',()=>{
  assert.match(css,/@media \(max-width:\s*380px\)[\s\S]*?\.servis-history-item\s*\{[^}]*grid-template-columns:\s*28px 32px minmax\(0, 1fr\)/s);
  assert.match(css,/@media \(max-width:\s*380px\)[\s\S]*?grid-template-areas:\s*"select icon amount"\s*"select icon info"\s*"select icon edit"\s*"select icon del"/s);
});

test('S2099 narrow-phone session summary also gets a full-width info column and stacked actions',()=>{
  assert.match(css,/@media \(max-width:\s*380px\)[\s\S]*?\.servis-history-session-summary\s*\{[^}]*grid-template-columns:\s*36px minmax\(0, 1fr\)[^}]*grid-template-areas:\s*"icon amount"\s*"icon info"\s*"icon edit"\s*"icon add"\s*"icon del"/s);
});


test('S2100 history metadata and badges must not hard-clip user-visible text on mobile',()=>{
  assert.match(css,/\.servis-history-primary\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*word-break:\s*break-word/s);
  assert.match(css,/\.servis-history-badge\s*\{[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere[^}]*word-break:\s*break-word/s);
  assert.match(css,/\.servis-history-note\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*word-break:\s*break-word/s);
  assert.doesNotMatch(css,/\.servis-history-badge\s*\{[^}]*white-space:\s*nowrap/s);
});
