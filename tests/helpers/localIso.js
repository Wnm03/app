'use strict';
// S256AV — format tanggal LOKAL 'YYYY-MM-DD' untuk fixture test.
// Jangan pakai `new Date(y, m, d).toISOString()` di fixture: itu tengah malam LOKAL,
// sehingga di zona waktu positif (mis. WIB, UTC+7) hasilnya mundur sehari.
function localIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
module.exports = { localIso };
