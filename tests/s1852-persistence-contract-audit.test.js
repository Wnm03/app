const fs=require('fs');
const path=require('path');
function read(p){return fs.readFileSync(p,'utf8');}
function ok(c,m){if(!c)throw new Error(m);}
const root=process.cwd();
const files=[
 'modules/shared/features-helpers-global-security.js',
 'modules/asset/features-helpers-global-security.js',
 'modules/finance/features-helpers-global-security.js',
 'modules/shop/features-helpers-global-security.js'
];
for(const f of files){
 const s=read(path.join(root,f));
 ok(s.includes('_savePersistChain'),'S1852 '+f+': persistence queue missing');
 ok(s.includes('_saveStateVersion'),'S1852 '+f+': mutation version missing');
 ok(s.includes('kw_v4_persistence'),'S1852 '+f+': BroadcastChannel contract missing');
 ok(s.includes('function _getSaveSnapshotForVersion(version){'),'S1852 '+f+': snapshot cache helper missing');
 ok(!s.includes('_writeLocalSnapshot(_buildSaveJson())'),'S1852 '+f+': duplicate snapshot pattern remains');
 function functionBody(src,name){
 const start=src.indexOf(name);
 if(start<0)return '';
 const brace=src.indexOf('{',start);
 if(brace<0)return '';
 let depth=0, quote=null, esc=false;
 for(let i=brace;i<src.length;i++){
  const c=src[i];
  if(quote){ if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(c===quote)quote=null; continue; }
  if(c==='\"'||c==="'"){quote=c;continue;}
  if(c==='{')depth++; else if(c==='}'&&--depth===0)return src.slice(brace,i+1);
 }
 return '';
}
 const flush=functionBody(s,'function saveFlush()');
 ok((flush.match(/\n\s*_saveImmediate\(/g)||[]).length===1,'S1852 '+f+': saveFlush must call _saveImmediate exactly once');
 ok(flush.includes('_writeLocalSnapshot(json)'),'S1852 '+f+': hard flush localStorage safety net missing');
}
const bundle=read(path.join(root,'app-bundle-b.min.js'));
const docs=read(path.join(root,'docs/app-bundle-b.min.js'));
for(const [name,s] of [['app-bundle-b.min.js',bundle],['docs/app-bundle-b.min.js',docs]]){
 ok(s.includes('_savePersistChain'),'S1852 '+name+': persistence queue missing');
 ok(s.includes('kw_v4_persistence'),'S1852 '+name+': cross-tab channel missing');
 ok(s.includes('if(_crossTabStateStale)'), 'S1852 '+name+': stale-state save/flush guard missing');
 ok(!s.includes('_writeLocalSnapshot(_buildSaveJson())'),'S1852 '+name+': duplicate snapshot pattern remains');
}
const dbg=read(path.join(root,'modules/shared/debug-console.js'));
ok(dbg.includes("const KW_DEBUG_CONSOLE_KEY='kw_debug_console';"),'S1852 debug: explicit key missing');
ok(dbg.includes('function toggleDebugConsole(){'),'S1852 debug: explicit toggle missing');
ok(!/^[^\n]*eruda\.init\(\)/m.test(dbg.split('function toggleDebugConsole(){')[0]),'S1852 debug: Eruda initializes before explicit toggle');
console.log('S1852 persistence contract audit: 20+ checks PASS');
