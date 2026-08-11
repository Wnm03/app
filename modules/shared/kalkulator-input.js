// kalkulator-input.js — Kalkulator ekspresi angka: parser aman (safeCalc), popup kalkulator (openCalc/calcPress/dst),
// Dipindah ke modules/shared/kalkulator-input.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// dan preview nilai input jumlah (calcPreviewValue/updateAmtPreview/evalAmtExpr).
// Dipindah dari features-helpers-global-security.js (v69) — domain mandiri, cuma pakai document.getElementById
// & openModal/closeModal (variabel global dari features-helpers-global-security.js, diakses saat runtime lewat
// klik tombol, bukan saat file dimuat, jadi aman ada di file terpisah). Dipanggil dari banyak file lain
// (modals.js, renovasi.js, transaksi.js, tukang-absensi.js, dst) lewat
// nama global (data-action="openCalc" dll di HTML modal, atau evalAmtExpr('id') di onblur).
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh fmt(), openModal/closeModal).
function calcPreviewValue(str){
if(!str)return 0;
const r=safeCalc(String(str));
return isNaN(r)?0:r;
}
function updateAmtPreview(inputId,previewId){
const el=document.getElementById(inputId);
const prev=document.getElementById(previewId);
if(!el||!prev)return;
const v=calcPreviewValue(el.value);
prev.textContent=(v&&v>0)?('= '+fmt(v)):'';
}
function normalizeAmtToken(tok){
if(tok.indexOf('.')===-1)return tok;
const parts=tok.split('.');
const last=parts[parts.length-1];
if(last.length>=1&&last.length<=2){
const intPart=parts.slice(0,-1).join('');
return intPart+'.'+last;
}
return parts.join('');
}
function safeCalc(expr){
if(typeof expr!=='string')return NaN;
expr=expr.trim();
if(!expr)return NaN;
if(!/^[0-9+\-*/().\s]+$/.test(expr))return NaN;
expr=expr.replace(/\d+(?:\.\d+)*/g,m=>normalizeAmtToken(m));
let i=0;
function skipWs(){while(expr[i]===' ')i++;}
function parseExpr(){
let v=parseTerm();
while(true){
skipWs();
if(expr[i]==='+'){i++;v+=parseTerm();}
else if(expr[i]==='-'){i++;v-=parseTerm();}
else break;
}
return v;
}
function parseTerm(){
let v=parseFactor();
while(true){
skipWs();
if(expr[i]==='*'){i++;v*=parseFactor();}
else if(expr[i]==='/'){i++;const d=parseFactor();v=d===0?NaN:v/d;}
else break;
}
return v;
}
function parseFactor(){
skipWs();
if(expr[i]==='('){i++;const v=parseExpr();skipWs();if(expr[i]===')')i++;return v;}
if(expr[i]==='-'){i++;return -parseFactor();}
if(expr[i]==='+'){i++;return parseFactor();}
const start=i;
while(i<expr.length&&/[0-9.]/.test(expr[i]))i++;
if(start===i)return NaN;
return parseFloat(expr.slice(start,i));
}
try{
const result=parseExpr();
skipWs();
if(i<expr.length)return NaN;
return result;
}catch(e){return NaN;}
}
function evalAmtExpr(id){
const el=document.getElementById(id);
if(!el)return;
const raw=el.value;
if(!raw||!/[+\-*/.]/.test(raw))return;
const r=safeCalc(raw);
if(!isNaN(r)&&isFinite(r)){
el.value=String(Math.round(r*100)/100);
el.dispatchEvent(new Event('input',{bubbles:true}));
}
}
let calcTargetId=null, calcExpr='';
function openCalc(targetId){
calcTargetId=targetId;
const el=document.getElementById(targetId);
calcExpr=(el&&el.value&&/^[0-9.]+$/.test(el.value))?el.value:'';
calcRenderDisplay();
openModal('calcModal');
}
function closeCalc(){ closeModal('calcModal'); }
function calcRenderDisplay(){
const exprEl=document.getElementById('calcExprEl');
const valEl=document.getElementById('calcValEl');
if(!exprEl||!valEl)return;
if(!calcExpr){ exprEl.textContent=''; valEl.textContent='0'; return; }
if(/[+\-*/]$/.test(calcExpr)||(!/[+\-*/]/.test(calcExpr)&&!/\./.test(calcExpr))){
exprEl.textContent='';
valEl.textContent=calcExpr;
}else{
const r=safeCalc(calcExpr);
exprEl.textContent=calcExpr;
valEl.textContent=isNaN(r)?calcExpr:String(Math.round(r*100)/100);
}
}
function calcPress(ch){
if('+-*/'.includes(ch)){
if(!calcExpr)calcExpr='0';
if(/[+\-*/]$/.test(calcExpr))calcExpr=calcExpr.slice(0,-1);
calcExpr+=ch;
}else{
calcExpr+=ch;
}
calcRenderDisplay();
}
function calcClear(){ calcExpr=''; calcRenderDisplay(); }
function calcBackspace(){ calcExpr=calcExpr.slice(0,-1); calcRenderDisplay(); }
function calcEquals(){
const r=safeCalc(calcExpr);
if(!isNaN(r)&&isFinite(r)) calcExpr=String(Math.round(r*100)/100);
calcRenderDisplay();
}
function calcUseResult(){
if(!calcTargetId){ closeCalc(); return; }
let val=calcExpr;
if(/[+\-*/.]/.test(val)){
const r=safeCalc(val);
val=isNaN(r)?'':String(Math.round(r*100)/100);
}
const el=document.getElementById(calcTargetId);
if(el&&val!==''){
el.value=val;
el.dispatchEvent(new Event('input',{bubbles:true}));
}
closeCalc();
}
