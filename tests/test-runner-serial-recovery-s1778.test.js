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
