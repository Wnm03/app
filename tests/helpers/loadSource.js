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
    for(const key of exports){
      // Only bridge top-level lexical bindings (let/const). Ordinary global
      // function/var bindings already live on ctx; wrapping them would recurse.
      if(Object.prototype.hasOwnProperty.call(ctx,key)) continue;
      try {
        const exists = vm.runInContext(`typeof ${key} !== 'undefined'`,ctx);
        if(!exists) continue;
        Object.defineProperty(ctx,key,{configurable:true,enumerable:true,
          get(){ return vm.runInContext(key,ctx); },
          set(v){ vm.runInContext(`${key}=v`,ctx); }
        });
      } catch {
        // Ignore names that are not lexical bindings in this source.
      }
    }
    return ctx;
  }
  return ctx;
}
module.exports={loadSource};
