'use strict';
/**
 * Deterministic/resumable full-test runner.
 *
 * Usage:
 *   node scripts/run-full-test.js
 *   TEST_SHARDS=32 node scripts/run-full-test.js
 *   TEST_SHARD_INDEX=5 TEST_SHARDS=32 node scripts/run-full-test.js
 *
 * Each shard writes a checkpoint under .test-checkpoints/. A later run can
 * reuse successful shard checkpoints; set TEST_FORCE_RERUN=1 to invalidate.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const testsDir=path.join(ROOT,'tests');
const checkpointDir=path.join(ROOT,'.test-checkpoints');
const shardCount=Math.max(1,Math.min(Number(process.env.TEST_SHARDS)||32,64));
const requestedIndex=process.env.TEST_SHARD_INDEX==null?null:Number(process.env.TEST_SHARD_INDEX);
const timeoutMs=Math.max(10000,Number(process.env.TEST_SHARD_TIMEOUT_MS)||120000);
const force=process.env.TEST_FORCE_RERUN==='1';
const files=fs.readdirSync(testsDir).filter(f=>f.endsWith('.test.js')).sort().map(f=>path.join(testsDir,f));
if(!files.length){console.error('No test files found');process.exit(2);}
const shards=Array.from({length:Math.min(shardCount,files.length)},()=>[]);
files.forEach((f,i)=>shards[i%shards.length].push(f));
if(requestedIndex!=null && (!Number.isInteger(requestedIndex)||requestedIndex<0||requestedIndex>=shards.length)){console.error(`Invalid TEST_SHARD_INDEX=${requestedIndex}; valid 0..${shards.length-1}`);process.exit(2);}
fs.mkdirSync(checkpointDir,{recursive:true});
const manifest={shards:shards.length,files:files.map(f=>path.relative(ROOT,f)),timeoutMs};
fs.writeFileSync(path.join(checkpointDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
function checkpointPath(i){return path.join(checkpointDir,`shard-${i+1}.json`);}
function parse(out){const get=k=>{const m=out.match(new RegExp(`# ${k} (\\d+)`));return m?Number(m[1]):0};return {tests:get('tests'),pass:get('pass'),fail:get('fail'),cancelled:get('cancelled'),skipped:get('skipped'),todo:get('todo')};}
function runShard(list,index){return new Promise(resolve=>{
 const cp=checkpointPath(index); if(!force&&fs.existsSync(cp)){try{const old=JSON.parse(fs.readFileSync(cp,'utf8'));if(old.status==='pass')return resolve({...old,checkpoint:true});}catch(e){ console.warn(`Ignoring invalid checkpoint for shard ${index+1}: ${e.message}`); }}
 const child=spawn(process.execPath,['--test','--test-force-exit',...list],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
 let out='',err='',timedOut=false; const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),3000)},timeoutMs);
 child.stdout.on('data',b=>out+=b); child.stderr.on('data',b=>err+=b);
 child.on('close',code=>{clearTimeout(timer);const stats=parse(out+err);const result={shard:index+1,status:(!timedOut&&code===0&&stats.fail===0&&stats.cancelled===0)?'pass':'fail',code,timeout:timedOut,files:list.map(f=>path.relative(ROOT,f)),...stats};fs.writeFileSync(cp,JSON.stringify(result,null,2)+'\n');resolve(result);});
 });}
(async()=>{
 const started=Date.now();
 const indices=requestedIndex==null?shards.map((_,i)=>i):[requestedIndex];
 const results=[];
 // Run shards concurrently by default, but each shard has an independent watchdog/checkpoint.
 for(let i=0;i<indices.length;i+=Math.max(1,Number(process.env.TEST_CONCURRENCY)||8)){
   const batch=indices.slice(i,i+Math.max(1,Number(process.env.TEST_CONCURRENCY)||8));
   results.push(...await Promise.all(batch.map(j=>runShard(shards[j],j))));
 }
 let totals={tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0};
 for(const r of results)for(const k of Object.keys(totals))totals[k]+=r[k]||0;
 const failed=results.filter(r=>r.status!=='pass');
 console.log(`FULL TEST: ${totals.tests} tests, ${totals.pass} pass, ${totals.fail} fail, ${totals.cancelled} cancelled, ${totals.skipped} skipped, ${totals.todo} todo; ${Math.round((Date.now()-started)/1000)}s`);
 if(failed.length){for(const r of failed)console.error(`SHARD ${r.shard} FAILED${r.timeout?' (TIMEOUT)':''} exit=${r.code}`);process.exit(1);}
 if(requestedIndex!=null){console.log(`SHARD ${requestedIndex+1}/${shards.length} PASS — checkpoint saved.`);process.exit(0);}
 // Verify all checkpoints, including shards reused from prior runs.
 const all=Array.from({length:shards.length},(_,i)=>JSON.parse(fs.readFileSync(checkpointPath(i),'utf8')));
 const bad=all.filter(r=>r.status!=='pass');
 if(bad.length){console.error(`FULL TEST INCOMPLETE — ${bad.length} shard checkpoint(s) not PASS.`);process.exit(1);}
 const grand=all.reduce((a,r)=>{for(const k of Object.keys(totals))a[k]+=r[k]||0;return a},{tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0});
 console.log(`FULL TEST ALL SHARDS: ${grand.tests} tests, ${grand.pass} pass, ${grand.fail} fail, ${grand.cancelled} cancelled, ${grand.skipped} skipped, ${grand.todo} todo.`);
 process.exit(grand.fail||grand.cancelled?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
