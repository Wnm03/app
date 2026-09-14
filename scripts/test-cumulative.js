#!/usr/bin/env node
/**
 * Cumulative test runner.
 *
 * Runs the complete tests/*.test.js inventory in deterministic chunks so a
 * large suite cannot be killed by a single-process timeout. Every chunk is a
 * normal Node test invocation; a non-zero chunk immediately fails the gate.
 * No test files are modified or skipped.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests');
const CHUNK_SIZE = Math.max(1, Number(process.env.TEST_CHUNK_SIZE || 100));
const START_CHUNK = Math.max(1, Number(process.env.TEST_START_CHUNK || 1));
const END_CHUNK = Math.min(Number(process.env.TEST_END_CHUNK || Number.POSITIVE_INFINITY), 0x7fffffff);
const REPORT_PATH = process.env.TEST_CUMULATIVE_REPORT || '';
const PLAN_ONLY = /^(1|true|yes)$/i.test(process.env.TEST_CUMULATIVE_PLAN || '');


const files = fs.readdirSync(TEST_DIR)
  .filter(name => name.endsWith('.test.js'))
  .sort()
  .map(name => path.join('tests', name));

if (START_CHUNK > END_CHUNK) {
  console.error(`CUMULATIVE TEST GATE: invalid chunk range ${START_CHUNK}-${END_CHUNK}`);
  process.exit(2);
}

if (!files.length) {
  console.error('CUMULATIVE TEST GATE: no tests/*.test.js found');
  process.exit(2);
}

const chunks = [];
for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  chunks.push(files.slice(i, i + CHUNK_SIZE));
}

const inventoryHash = crypto.createHash('sha256').update(files.join('\n') + '\n').digest('hex');
const effectiveEndChunk = Math.min(END_CHUNK, chunks.length);
const selectedFiles = chunks.slice(START_CHUNK - 1, effectiveEndChunk).flat();
const duplicateFiles = selectedFiles.filter((file, index) => selectedFiles.indexOf(file) !== index);
const missingFiles = selectedFiles.length === files.length && START_CHUNK === 1 && effectiveEndChunk === chunks.length
  ? files.filter((file, index) => selectedFiles[index] !== file)
  : [];

console.log(`CUMULATIVE TEST GATE: ${files.length} test files in ${chunks.length} chunks (chunk size ${CHUNK_SIZE}); ${PLAN_ONLY ? 'planning' : 'running'} chunks ${START_CHUNK}-${effectiveEndChunk}`);

if (duplicateFiles.length || missingFiles.length) {
  console.error('CUMULATIVE TEST GATE: inventory coverage mismatch detected before execution.');
  if (duplicateFiles.length) console.error(`  duplicate files: ${duplicateFiles.join(', ')}`);
  if (missingFiles.length) console.error(`  missing/out-of-order files: ${missingFiles.join(', ')}`);
  process.exit(2);
}

if (PLAN_ONLY) {
  const plan = {
    status: 'PLAN',
    testFiles: files.length,
    inventoryHash,
    chunkSize: CHUNK_SIZE,
    totalChunks: chunks.length,
    startChunk: Math.min(START_CHUNK, chunks.length),
    endChunk: effectiveEndChunk,
    filesRun: selectedFiles.length,
    chunks: chunks.slice(Math.min(START_CHUNK, chunks.length) - 1, effectiveEndChunk).map((chunk, index) => ({
      chunk: Math.min(START_CHUNK, chunks.length) + index,
      files: chunk.map(file => file.replaceAll('\\', '/')),
    })),
  };
  if (REPORT_PATH) {
    fs.writeFileSync(path.resolve(ROOT, REPORT_PATH), JSON.stringify(plan, null, 2) + '\n');
    console.log(`CUMULATIVE TEST GATE: plan written to ${REPORT_PATH}`);
  }
  console.log(`CUMULATIVE TEST GATE: PLAN OK — ${selectedFiles.length}/${files.length} files selected, inventory ${inventoryHash.slice(0, 16)}.`);
  process.exit(0);
}

let totalDurationMs = 0;
const results = [];
let totalTests = 0;
let totalPass = 0;
let totalFail = 0;
let totalCancelled = 0;
let totalSkipped = 0;
let totalTodo = 0;
const ranStartForReport = (failedIndex) => Math.min(START_CHUNK, failedIndex + 1);
for (let i = START_CHUNK - 1; i < Math.min(END_CHUNK, chunks.length); i++) {
  const chunk = chunks[i];
  const started = Date.now();
  console.log(`\n[${i + 1}/${chunks.length}] ${chunk[0]} .. ${chunk[chunk.length - 1]} (${chunk.length} files)`);

  const result = spawnSync(process.execPath, ['--test', ...chunk], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const tap = String(result.stdout || '') + '\n' + String(result.stderr || '');
  const metric = (name) => {
    const m = tap.match(new RegExp('^# ' + name + ' (\\d+)$', 'm'));
    return m ? Number(m[1]) : 0;
  };
  const chunkMetrics = {
    tests: metric('tests'),
    pass: metric('pass'),
    fail: metric('fail'),
    cancelled: metric('cancelled'),
    skipped: metric('skipped'),
    todo: metric('todo'),
  };
  totalTests += chunkMetrics.tests;
  totalPass += chunkMetrics.pass;
  totalFail += chunkMetrics.fail;
  totalCancelled += chunkMetrics.cancelled;
  totalSkipped += chunkMetrics.skipped;
  totalTodo += chunkMetrics.todo;

  const duration = Date.now() - started;
  totalDurationMs += duration;
  if (result.error) {
    console.error(`\nCUMULATIVE TEST GATE: chunk ${i + 1} failed to start: ${result.error.message}`);
    process.exit(2);
  }
  results.push({ chunk: i + 1, files: chunk.map(file => file.replaceAll('\\', '/')), durationMs: duration, exitCode: result.status, ...chunkMetrics });
  if (result.status !== 0) {
    console.error(`\nCUMULATIVE TEST GATE: FAIL at chunk ${i + 1}/${chunks.length} (exit ${result.status})`);
    if (REPORT_PATH) {
      const failedReport = { status: 'FAIL', testFiles: files.length, inventoryHash, chunkSize: CHUNK_SIZE, totalChunks: chunks.length, startChunk: ranStartForReport(i), endChunk: i + 1, filesRun: results.reduce((n, c) => n + c.files.length, 0), totalTests, totalPass, totalFail, totalCancelled, totalSkipped, totalTodo, totalDurationMs, chunks: results };
      fs.writeFileSync(path.resolve(ROOT, REPORT_PATH), JSON.stringify(failedReport, null, 2) + '\n');
    }
    process.exit(result.status || 1);
  }
  console.log(`[${i + 1}/${chunks.length}] PASS (${duration} ms)`);
}

const ranStart = Math.min(START_CHUNK, chunks.length);
const ranEnd = Math.min(END_CHUNK, chunks.length);
// Hardening: the persisted report must reconcile with its chunk manifest.
// This catches partial/misaligned reports even when every child process exited 0.
const reportChunkFiles = results.reduce((n, c) => n + c.files.length, 0);
const reportChunkTests = results.reduce((n, c) => n + c.tests, 0);
const reportChunkPass = results.reduce((n, c) => n + c.pass, 0);
const reportChunkFail = results.reduce((n, c) => n + c.fail, 0);
const reportChunkCancelled = results.reduce((n, c) => n + c.cancelled, 0);
const reportChunkSkipped = results.reduce((n, c) => n + c.skipped, 0);
const reportChunkTodo = results.reduce((n, c) => n + c.todo, 0);
if (reportChunkFiles !== chunks.slice(ranStart - 1, ranEnd).reduce((n, c) => n + c.length, 0) ||
    reportChunkTests !== totalTests || reportChunkPass !== totalPass || reportChunkFail !== totalFail ||
    reportChunkCancelled !== totalCancelled || reportChunkSkipped !== totalSkipped || reportChunkTodo !== totalTodo) {
  console.error('CUMULATIVE TEST GATE: internal report reconciliation failed');
  process.exit(2);
}
if (ranStart === 1 && ranEnd === chunks.length && reportChunkFiles !== files.length) {
  console.error(`CUMULATIVE TEST GATE: full-range report covers ${reportChunkFiles}/${files.length} files`);
  process.exit(2);
}
const report = {
  status: 'PASS',
  testFiles: files.length,
  inventoryHash,
  chunkSize: CHUNK_SIZE,
  totalChunks: chunks.length,
  startChunk: ranStart,
  endChunk: ranEnd,
  filesRun: chunks.slice(ranStart - 1, ranEnd).reduce((n, c) => n + c.length, 0),
  totalDurationMs,
  totalTests,
  totalPass,
  totalFail,
  totalCancelled,
  totalSkipped,
  totalTodo,
  chunks: results,
};
if (REPORT_PATH) {
  fs.writeFileSync(path.resolve(ROOT, REPORT_PATH), JSON.stringify(report, null, 2) + '\n');
  console.log(`CUMULATIVE TEST GATE: report written to ${REPORT_PATH}`);
}
console.log(`\nCUMULATIVE TEST GATE: PASS — chunks ${ranStart}-${ranEnd}/${chunks.length}, ${report.filesRun} files, ${totalDurationMs} ms wall-clock across child processes.`);
