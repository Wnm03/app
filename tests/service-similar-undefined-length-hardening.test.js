'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function extractMethod(source,name){
  const start=source.indexOf(name+'(){');
  assert.ok(start>=0,`method ${name} not found`);
  const open=source.indexOf('{',start);
  let depth=0,quote=null,esc=false,line=false,block=false;
  for(let i=open;i<source.length;i++){
    const c=source[i],n=source[i+1];
    if(line){if(c==='\n')line=false;continue;}
    if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
    if(c==='/'&&n==='/'){line=true;i++;continue;}
    if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return source.slice(open+1,i);
  }
  throw new Error('unterminated');
}

test('service item suggestion renderer treats malformed getItemSuggestions() as empty list',()=>{
  const src=fs.readFileSync('modules/vehicle/servis.js','utf8');
  const body=extractMethod(src,'onItemInputSuggest');
  const box={style:{display:''},innerHTML:''};
  const item={value:'servis'};
  const ctx={
    console,
    document:{getElementById(id){return id==='servisItem'?item:id==='servisItemSuggestBox'?box:null;}},
    Sparepart:{getItemSuggestions(){return undefined;}},
    hideSuggestBox(){},
  };
  vm.createContext(ctx);
  const fn=vm.runInContext(`(function(){${body}})`,ctx);
  assert.doesNotThrow(()=>fn());
  assert.equal(box.style.display,'none');
});
