#!/usr/bin/env node
/**
 * DATA-MIGRATION-08: read-only audit/classifier.
 * Input: JSON export with {servisLogs:[], sparepartCats:[]}
 */
const fs = require('node:fs');

const f = process.argv[2];
if (!f) {
  console.log(JSON.stringify({
    status: 'READY',
    mode: 'read-only',
    input: 'JSON export containing servisLogs and sparepartCats'
  }, null, 2));
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(f, 'utf8'));
const logs = Array.isArray(data.servisLogs) ? data.servisLogs : [];
const cats = Array.isArray(data.sparepartCats) ? data.sparepartCats : [];
const byId = new Map(cats.filter(Boolean).map(c => [c.id, c]));

const report = {
  total_logs: logs.length,
  mapped: 0,
  missing_category: 0,
  orphan_category: 0,
  missing_master_category: 0,
  candidates: []
};

for (const log of logs) {
  const categoryId = log?.categoryId ?? log?.catId ?? null;
  const category = categoryId ? byId.get(categoryId) : null;
  const masterCategoryId = log?.masterCategoryId ?? category?.masterCategoryId ?? null;

  const issue = [];
  if (!categoryId) issue.push('MISSING_CATEGORY');
  else if (!category) issue.push('ORPHAN_CATEGORY');
  if (!masterCategoryId) issue.push('MISSING_MASTER_CATEGORY');

  if (!issue.length) report.mapped++;
  if (issue.includes('MISSING_CATEGORY')) report.missing_category++;
  if (issue.includes('ORPHAN_CATEGORY')) report.orphan_category++;
  if (issue.includes('MISSING_MASTER_CATEGORY')) report.missing_master_category++;

  if (issue.length) {
    report.candidates.push({
      id: log?.id ?? null,
      item: log?.item ?? log?.name ?? null,
      categoryId,
      issue
    });
  }
}

console.log(JSON.stringify(report, null, 2));
