// ALAT AUDIT (bukan kode aplikasi): geser jam ticking untuk proses ini DAN semua konteks vm baru. Pakai: SHIFT_TO=<ISO> NODE_OPTIONS="--require scripts/uji-geser-jam-preload.js" node --test tests/*.test.js
const vm=require('node:vm'); const R=Date; const off=new R(process.env.SHIFT_TO).getTime()-R.now();
class SD extends R{constructor(...a){a.length?super(...a):super(R.now()+off);} static now(){return R.now()+off;}}
global.Date=SD;
const cc=vm.createContext; vm.createContext=function(o,...r){const c=cc.call(vm,o||{},...r); try{ if(c&&!Object.prototype.hasOwnProperty.call(c,'Date')) c.Date=SD; }catch(e){ c.__shiftClockError=String(e&&e.message||e); /* konteks beku: Date tidak bisa disuntik; dicatat, tidak ditelan */ } return c;};
