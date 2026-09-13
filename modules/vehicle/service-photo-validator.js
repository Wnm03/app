/* Pure photo payload validation; storage/compression is UI-owned. */
(function(g){'use strict';
 function validate(photo,opts){const o=opts||{},maxBytes=Number(o.maxBytes||2*1024*1024);if(typeof photo!=='string'||!photo.startsWith('data:image/'))return{ok:false,code:'INVALID_IMAGE_DATA'};if(photo.length>maxBytes*1.37)return{ok:false,code:'IMAGE_TOO_LARGE'};return{ok:true};}
 const api={validate};if(typeof window!=='undefined')window.ServicePhotoValidator=api;if(typeof globalThis!=='undefined')globalThis.ServicePhotoValidator=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
