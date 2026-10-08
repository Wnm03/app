'use strict';
// CSP-P2-1 release gate: production bundles must not contain inline DOM event attributes.
// Ignore JavaScript comments so documentation examples such as
// <input onchange="..."> do not become false-positive release failures.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const EVENT_ATTR_RE = /<[^>]+\s(on[a-z]+)\s*=\s*(?:"|')/gi;

function stripJsComments(src){
  let out='';
  let state='code';
  let esc=false;
  for(let i=0;i<src.length;i++){
    const c=src[i], n=src[i+1];
    if(state==='code'){
      if(c==='/'&&n==='/'){state='line-comment';out+='  ';i++;continue;}
      if(c==='/'&&n==='*'){state='block-comment';out+='  ';i++;continue;}
      if(c==='"'||c==="'"||c==='`'){state=c;esc=false;out+=c;continue;}
      out+=c;
      continue;
    }
    if(state==='line-comment'){
      if(c==='\n'){state='code';out+='\n';}else out+=' ';
      continue;
    }
    if(state==='block-comment'){
      if(c==='*'&&n==='/'){state='code';out+='  ';i++;}
      else out+=(c==='\n'?'\n':' ');
      continue;
    }
    out+=c;
    if(esc){esc=false;continue;}
    if(c==='\\'){esc=true;continue;}
    if(c===state)state='code';
  }
  return out;
}

function findInlineEventAttrs(src){
  const uncommented=stripJsComments(src);
  const hits=[];
  let m;
  while((m=EVENT_ATTR_RE.exec(uncommented))) hits.push(m[1].toLowerCase());
  EVENT_ATTR_RE.lastIndex=0;
  return hits;
}

function main(){
  const files=['app-bundle-a.min.js','app-bundle-b.min.js']
    .map((f)=>path.join(ROOT,f)).filter(fs.existsSync);
  const hits=[];
  for(const file of files){
    const attrs=findInlineEventAttrs(fs.readFileSync(file,'utf8'));
    attrs.forEach((attr)=>hits.push(`${path.basename(file)}:${attr}`));
  }
  if(!files.length){
    console.error('BLOCKED: production bundles not found');
    process.exitCode=2;
  }else if(hits.length){
    console.error(`FAIL: ${hits.length} inline event attribute(s) remain in production bundles`);
    [...new Set(hits)].slice(0,100).forEach((h)=>console.error(`  - ${h}`));
    process.exitCode=1;
  }else{
    console.log(`PASS: ${files.length} production bundle(s) contain no inline event attributes`);
  }
}

if(require.main===module)main();
module.exports={stripJsComments,findInlineEventAttrs};
