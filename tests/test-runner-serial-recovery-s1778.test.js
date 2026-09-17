const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const runner=fs.readFileSync(path.join(root,'scripts/run-full-test.js'),'utf8');

test('S1778 runner: empty TAP is retried after concurrent batches drain',()=>{
 assert.match(runner,/const emptyTap=!timedOut&&code===0&&list\.length&&stats\.tests===0/);
 assert.match(runner,/const emptyResults=results\.filter\(r=>r\.emptyTap\)/);
 assert.match(runner,/serial recovery retry after empty TAP result/);
});

test('S1778 runner: checkpoint integrity remains hash-bound',()=>{
 assert.match(runner,/crypto/);
 assert.match(runner,/fileHashes/);
 assert.match(runner,/old\.fileHashes/);
});

test('S1805 runner: serial recovery memakai timeout penuh secara default agar shard pulih tidak dipotong 30 detik',()=>{
 assert.match(runner,/Number\(process\.env\.TEST_RECOVERY_TIMEOUT_MS\)\|\|timeoutMs/);
});

test('S1805 runner: aggregate FULL TEST dihitung setelah serial recovery',()=>{
 const recovery=runner.indexOf('for(const empty of emptyResults)');
 const aggregate=runner.indexOf('let totals={tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0};');
 assert.ok(recovery>=0&&aggregate>recovery,'aggregation harus terjadi setelah recovery empty-TAP');
});


test('S1805 runner: default concurrency dibatasi 4 untuk menghindari empty-TAP akibat contention',()=>assert.match(runner,/Math\.min\(4,typeof os\.availableParallelism/));
