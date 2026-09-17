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
const os=require('node:os');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const testsDir=path.join(ROOT,'tests');
const checkpointDir=process.env.TEST_CHECKPOINT_DIR?path.resolve(ROOT,process.env.TEST_CHECKPOINT_DIR):path.join(ROOT,'.test-checkpoints');
const shardCount=Math.max(1,Math.min(Number(process.env.TEST_SHARDS)||32,64));
const requestedIndex=process.env.TEST_SHARD_INDEX==null?null:Number(process.env.TEST_SHARD_INDEX);
const timeoutMs=Math.max(10000,Number(process.env.TEST_SHARD_TIMEOUT_MS)||120000);
const recoveryTimeoutMs=Math.max(10000,Math.min(timeoutMs,Number(process.env.TEST_RECOVERY_TIMEOUT_MS)||timeoutMs));
const defaultConcurrency=Math.max(1,Math.min(4,typeof os.availableParallelism==='function'?os.availableParallelism():os.cpus().length||1));
const concurrency=Math.max(1,Math.min(8,Number(process.env.TEST_CONCURRENCY)||defaultConcurrency));
const force=process.env.TEST_FORCE_RERUN==='1';
const tmpToken=crypto.randomBytes(8).toString('hex');
const CHECKPOINT_SCHEMA=2;
const files=fs.readdirSync(testsDir).filter(f=>f.endsWith('.test.js')).sort().map(f=>path.join(testsDir,f));
function sha256(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
const fileHashes=Object.fromEntries(files.map(f=>[path.relative(ROOT,f),sha256(f)]));
if(!files.length){console.error('No test files found');process.exit(2);}
const shards=Array.from({length:Math.min(shardCount,files.length)},()=>[]);
files.forEach((f,i)=>shards[i%shards.length].push(f));
if(requestedIndex!=null && (!Number.isInteger(requestedIndex)||requestedIndex<0||requestedIndex>=shards.length)){console.error(`Invalid TEST_SHARD_INDEX=${requestedIndex}; valid 0..${shards.length-1}`);process.exit(2);}
fs.mkdirSync(checkpointDir,{recursive:true});
const manifest={schema:CHECKPOINT_SCHEMA,shards:shards.length,files:files.map(f=>path.relative(ROOT,f)),fileHashes,timeoutMs};
const manifestFingerprint=crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
function atomicWrite(file,data){const tmp=`${file}.${process.pid}.${tmpToken}.${crypto.randomBytes(6).toString('hex')}.tmp`;fs.writeFileSync(tmp,data,{encoding:'utf8',flag:'wx'});fs.renameSync(tmp,file);}
atomicWrite(path.join(checkpointDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
function checkpointPath(i){return path.join(checkpointDir,`shard-${i+1}.json`);}
// S1778 compatibility contract: legacy checkpoints expose old.fileHashes; current records use r.fileHashes.
function isValidCheckpoint(r,index){
 const expectedFiles=shards[index].map(f=>path.relative(ROOT,f));
 const hashesOk=expectedFiles.every(f=>r&&r.fileHashes&&r.fileHashes[f]===fileHashes[f]);
 return !!(r&&r.schema===CHECKPOINT_SCHEMA&&r.manifestFingerprint===manifestFingerprint&&r.status==='pass'&&r.tests>0&&r.pass===r.tests&&r.fail===0&&r.cancelled===0&&JSON.stringify(r.files||[])===JSON.stringify(expectedFiles)&&hashesOk);
}
function parse(out){const get=k=>{const m=out.match(new RegExp(`# ${k} (\\d+)`));return m?Number(m[1]):0};return {tests:get('tests'),pass:get('pass'),fail:get('fail'),cancelled:get('cancelled'),skipped:get('skipped'),todo:get('todo')};}
function runShard(list,index,options={}){return new Promise(resolve=>{
 const cp=checkpointPath(index); if(!force&&fs.existsSync(cp)){try{const old=JSON.parse(fs.readFileSync(cp,'utf8')); if(isValidCheckpoint(old,index))return resolve({...old,checkpoint:true});}catch(e){ console.warn(`Ignoring invalid checkpoint for shard ${index+1}: ${e.message}`); }}
 // S1766: under concurrent load, Node's test child can occasionally exit 0
 // without emitting its TAP summary (observed as a false PASS with 0 tests).
 // A shard containing files MUST produce a non-zero test count. Retry that
 // specific transport/infrastructure anomaly once before marking the shard bad.
 const attempt=(retryEmpty,attemptTimeoutMs=timeoutMs)=>{
  const child=spawn(process.execPath,['--test',...list],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  let out='',err='',timedOut=false; const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),3000)},attemptTimeoutMs);
  child.stdout.on('data',b=>out+=b); child.stderr.on('data',b=>err+=b);
  child.on('close',code=>{clearTimeout(timer);const stats=parse(out+err);
   if(!timedOut&&code===0&&list.length&&stats.tests===0&&retryEmpty){
    console.warn(`SHARD ${index+1}: child exited 0 without TAP test count; retrying once.`);
    return attempt(false,attemptTimeoutMs);
   }
   const emptyTap=!timedOut&&code===0&&list.length&&stats.tests===0;
   const result={schema:CHECKPOINT_SCHEMA,manifestFingerprint,shard:index+1,status:(!timedOut&&code===0&&stats.tests>0&&stats.fail===0&&stats.cancelled===0)?'pass':'fail',code,timeout:timedOut,emptyTap,files:list.map(f=>path.relative(ROOT,f)),fileHashes:Object.fromEntries(list.map(f=>[path.relative(ROOT,f),fileHashes[path.relative(ROOT,f)]])),...stats};
   atomicWrite(cp,JSON.stringify(result,null,2)+'\n');resolve(result);
  });
 };
 attempt(true,options.timeoutMs||timeoutMs);
 });}
(async()=>{
 const started=Date.now();
 const indices=requestedIndex==null?shards.map((_,i)=>i):[requestedIndex];
 const results=[];
 // Run shards concurrently by default, but each shard has an independent watchdog/checkpoint.
 for(let i=0;i<indices.length;i+=Math.max(1,concurrency)){
   const batch=indices.slice(i,i+Math.max(1,concurrency));
   results.push(...await Promise.all(batch.map(j=>runShard(shards[j],j))));
 }
 // S1778: an empty TAP result is an infrastructure contention signal, not an
 // application failure. Retry such shards serially after concurrent work has
 // drained; this avoids repeating the same process-level resource pressure.
 const emptyResults=results.filter(r=>r.emptyTap);
 for(const empty of emptyResults){
   const idx=empty.shard-1;
   console.warn(`SHARD ${empty.shard}: serial recovery retry after empty TAP result.`);
   const recovered=await runShard(shards[idx],idx,{timeoutMs:recoveryTimeoutMs});
   const pos=results.indexOf(empty);
   if(pos>=0)results[pos]=recovered;
 }
 // Aggregate only after serial recovery has replaced every empty-TAP result.
 // Otherwise a successfully recovered shard would remain missing from the
 // printed totals even though its checkpoint is now valid.
 let totals={tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0};
 for(const r of results)for(const k of Object.keys(totals))totals[k]+=r[k]||0;
 const failed=results.filter(r=>r.status!=='pass');
 console.log(`FULL TEST: ${totals.tests} tests, ${totals.pass} pass, ${totals.fail} fail, ${totals.cancelled} cancelled, ${totals.skipped} skipped, ${totals.todo} todo; ${Math.round((Date.now()-started)/1000)}s`);
 if(failed.length){for(const r of failed)console.error(`SHARD ${r.shard} FAILED${r.timeout?' (TIMEOUT)':''} exit=${r.code}`);process.exit(1);}
 if(requestedIndex!=null){
   const r=results[0];
   const expectedFiles=shards[requestedIndex].map(f=>path.relative(ROOT,f));
   const hashesOk=expectedFiles.every(f=>r.fileHashes&&r.fileHashes[f]===fileHashes[f]);
   if(!(r.schema===CHECKPOINT_SCHEMA&&r.manifestFingerprint===manifestFingerprint&&r.status==='pass'&&r.tests>0&&r.pass===r.tests&&r.fail===0&&r.cancelled===0&&JSON.stringify(r.files||[])===JSON.stringify(expectedFiles)&&hashesOk)){console.error('SHARD CHECKPOINT INTEGRITY FAILED');process.exit(1);}
   console.log(`SHARD ${requestedIndex+1}/${shards.length} PASS — checkpoint saved.`);process.exit(0);
}
 // Verify all checkpoints, including shards reused from prior runs, against the
 // exact current manifest. This is an independent final gate: a shard cannot
 // become PASS merely because its JSON says status=pass.
 const all=[];
 for(let i=0;i<shards.length;i++){
   try{
     const r=JSON.parse(fs.readFileSync(checkpointPath(i),'utf8'));
     if(!isValidCheckpoint(r,i)) throw new Error('checkpoint integrity mismatch');
     all.push(r);
   }catch(e){console.error(`FULL TEST INCOMPLETE — shard ${i+1} checkpoint invalid: ${e.message}`);process.exit(1);}
 }
 const grand=all.reduce((a,r)=>{for(const k of Object.keys(totals))a[k]+=r[k]||0;return a},{tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0});
 console.log(`FULL TEST ALL SHARDS: ${grand.tests} tests, ${grand.pass} pass, ${grand.fail} fail, ${grand.cancelled} cancelled, ${grand.skipped} skipped, ${grand.todo} todo.`);
 process.exit(grand.fail||grand.cancelled?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
