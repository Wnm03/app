/* S1900 — production hardening helpers. No framework/dependency. */
(function(g){
  'use strict';
  const api=g.PWAProductionHardening=g.PWAProductionHardening||{};
  const MAX_IMPORT_BYTES=25*1024*1024;
  const ALLOWED_JSON=['application/json','text/json',''];
  const text=v=>String(v==null?'':v).trim().toLowerCase();
  api.MAX_IMPORT_BYTES=MAX_IMPORT_BYTES;
  api.validateImportFile=function(file,opts){
    opts=opts||{};
    if(!file)return{ok:false,msg:'File tidak dipilih.'};
    const name=text(file.name);
    const ext=name.includes('.')?name.slice(name.lastIndexOf('.')):'';
    const allowed=Array.isArray(opts.extensions)&&opts.extensions.length?opts.extensions.map(text):['.json'];
    if(!allowed.includes(ext))return{ok:false,msg:'Format file tidak didukung. Gunakan '+allowed.join(', ')+'.'};
    const max=Number(opts.maxBytes)||MAX_IMPORT_BYTES;
    if(Number.isFinite(file.size)&&file.size>max)return{ok:false,msg:'File terlalu besar. Batas '+Math.round(max/1024/1024)+' MB.'};
    if(ext==='.json'&&file.type&&!ALLOWED_JSON.includes(text(file.type)))return{ok:false,msg:'Tipe file JSON tidak valid.'};
    return{ok:true,extension:ext,size:Number(file.size)||0};
  };
  api.validateJsonRoot=function(value,opts){
    opts=opts||{};
    if(!value||typeof value!=='object'||Array.isArray(value))return{ok:false,msg:'Root JSON harus berupa objek.'};
    if(Array.isArray(opts.requiredAny)&&opts.requiredAny.length&&!opts.requiredAny.some(k=>value[k]!==undefined))return{ok:false,msg:'Struktur JSON tidak dikenali.'};
    if(Array.isArray(opts.arrayKeys))for(const k of opts.arrayKeys)if(value[k]!==undefined&&!Array.isArray(value[k]))return{ok:false,msg:'Field "'+k+'" harus berupa array.'};
    return{ok:true};
  };
  api.downloadBlob=function(blob,name){
    if(!blob||typeof document==='undefined')return false;
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name||'download';a.rel='noopener';
    document.body&&document.body.appendChild(a);a.click();if(typeof a.remove==='function')a.remove();else if(a.parentNode&&typeof a.parentNode.removeChild==='function')a.parentNode.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),0);
    return true;
  };
  api.sanitizeErrorMessage=function(err){
    const raw=String(err&&err.message!=null?err.message:err==null?'':err);
    return raw.replace(/(?:https?:\/\/|file:\/\/)[^\s)]+/gi,'[resource]').replace(/(?:[A-Za-z]:\\|\\\\)[^\s)]+/g,'[path]').slice(0,120);
  };
  api.sha256Hex=async function(value){
    const textValue=typeof value==='string'?value:JSON.stringify(value);
    if(typeof crypto==='undefined'||!crypto.subtle||typeof TextEncoder==='undefined')return null;
    const bytes=new TextEncoder().encode(textValue);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  };
  api.sealBackupPayload=async function(payload){
    if(!payload||typeof payload!=='object')return payload;
    const copy={...payload};
    delete copy._integrity;
    const canonical=JSON.stringify(copy);
    const hash=await api.sha256Hex(canonical);
    if(!hash)return copy;
    copy._integrity={algorithm:'SHA-256',payloadHash:hash,createdAt:new Date().toISOString()};
    return copy;
  };
  api.verifyBackupPayload=async function(payload){
    if(!payload||typeof payload!=='object')return{ok:false,msg:'Payload backup tidak valid.'};
    const meta=payload._integrity;
    if(!meta)return{ok:true,legacy:true};
    if(meta.algorithm!=='SHA-256'||typeof meta.payloadHash!=='string')return{ok:false,msg:'Metadata integritas backup tidak valid.'};
    const copy={...payload};
    delete copy._integrity;
    const hash=await api.sha256Hex(JSON.stringify(copy));
    if(!hash)return{ok:false,msg:'Verifikasi integritas backup membutuhkan browser dengan Web Crypto.'};
    return hash===meta.payloadHash?{ok:true,legacy:false}:{ok:false,msg:'Checksum backup tidak cocok. File mungkin berubah atau rusak.'};
  };
  api.isSecureHosted=function(){return typeof location==='undefined'||location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';};
})(typeof window!=='undefined'?window:globalThis);
