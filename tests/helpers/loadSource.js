'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function loadSource(files,globals={},exports=[]){
  const ctx={console,setTimeout:()=>{},clearTimeout:()=>{},queueMicrotask:fn=>{if(typeof fn==='function')fn();},structuredClone:global.structuredClone};
  Object.assign(ctx,globals);
  ctx.window=ctx;
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  for(const file of files){
    const src=fs.readFileSync(path.resolve(process.cwd(),file),'utf8');
    vm.runInContext(src,ctx,{filename:file});
  }
  if(exports.length){
    const out={};
    for(const key of exports){
      // Classic scripts may declare cross-file APIs with top-level `const`/`let`.
      // Those bindings are global-lexical rather than window properties, so
      // ctx[key] is undefined even though the binding is valid to later scripts.
      // Resolve the binding through the VM global lexical environment first,
      // then fall back to the property for ordinary `var`/window APIs.
      try{ out[key]=vm.runInContext(key,ctx); }catch(_e){ out[key]=ctx[key]; }
    }
    return Object.assign(ctx,out);
  }
  return ctx;
}
module.exports={loadSource};
