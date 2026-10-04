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
    for(const key of exports)out[key]=ctx[key];
    return Object.assign(ctx,out);
  }
  return ctx;
}
module.exports={loadSource};
