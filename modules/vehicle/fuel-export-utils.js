// fuel-export-utils.js — shared presenter-only export helpers.
// No domain/storage mutation. Local calendar date is used for filenames.
const FuelExportUtils={
  dateTag(){return (typeof todayStr==='function'?todayStr():(()=>{const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');})());},
  downloadFile(filename,content,mime){
    if(typeof document==='undefined'||typeof document.createElement!=='function')return false;
    if(typeof Blob==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')return false;
    try{const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();if(typeof a.remove==='function')a.remove();else if(a.parentNode&&typeof a.parentNode.removeChild==='function')a.parentNode.removeChild(a);if(typeof URL.revokeObjectURL==='function')URL.revokeObjectURL(url);return true;}catch(_e){return false;}
  },
};
if(typeof window!=='undefined')window.FuelExportUtils=FuelExportUtils;
