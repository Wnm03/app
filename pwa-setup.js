// pwa-setup.js — Setup PWA: registrasi manifest (via Blob kalau tidak di-hosting https) &
// service worker (sw.js, fallback inline Blob). Dipisah dari features-sheets-pwa-selftest.js
// (Sesi 2 restrukturisasi folder, blok 2/5 — lihat docs/AUDIT-SESI-1-features-sheets-pwa-selftest.js)
// murni pengelompokan ulang file, BUKAN perubahan perilaku.

function setupPWA(){
try{
const isHosted=location.protocol==='https:'||location.hostname==='localhost';
const link=document.getElementById('pwaManifestLink');
if(!isHosted){
const manifest={
name:'Keluarga '+(D.profile.nama||'W'),
short_name:'Keluarga '+(D.profile.nama||'W'),
start_url:location.href.split('#')[0],
display:'standalone',
background_color:'#0d0d1a',
theme_color:'#7c6fef',
icons:[{src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%237c6fef"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">W</text></svg>'),sizes:'192x192',type:'image/svg+xml'}]
};
const blob=new Blob([JSON.stringify(manifest)],{type:'application/json'});
if(link) link.href=URL.createObjectURL(blob);
}
if(('serviceWorker' in navigator) && isHosted){
if(link){
}
navigator.serviceWorker.register('sw.js').catch(()=>{
const swCode=`
        const CACHE='kw-cache-v1';
        self.addEventListener('install',e=>{self.skipWaiting();});
        self.addEventListener('activate',e=>{self.clients.claim();});
        self.addEventListener('fetch',e=>{
          if(e.request.method!=='GET')return;
          e.respondWith(
            fetch(e.request).then(res=>{
              const resClone=res.clone();
              caches.open(CACHE).then(c=>c.put(e.request,resClone));
              return res;
            }).catch(()=>caches.match(e.request))
          );
        });
      `;
const swBlob=new Blob([swCode],{type:'application/javascript'});
const swUrl=URL.createObjectURL(swBlob);
navigator.serviceWorker.register(swUrl).catch(e=>console.warn('SW gagal:',e.message));
});
}
}catch(e){console.warn('Setup PWA gagal:',e);}
}
