#!/usr/bin/env node
'use strict';
// Inventaris: handler inline SUNGGUHAN (harus 0; diblokir CSP script-src-attr 'none') vs data-on* terdelegasi (aman).
const { scan } = require('./inline-handler-scan');
const rows = scan();
console.log('| File | Inline sungguhan | data-on* (aman) |\n|---|---:|---:|');
for (const r of rows.sort((a, b) => b.real - a.real || b.delegated - a.delegated)) console.log(`| ${r.file} | ${r.real} | ${r.delegated} |`);
const real = rows.reduce((a, r) => a + r.real, 0), del = rows.reduce((a, r) => a + r.delegated, 0);
console.log(`\nTotal inline sungguhan: ${real} | total data-on* terdelegasi: ${del}`);
