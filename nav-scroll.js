/* nav-scroll.js
   Selective liquid glass - floating nav scroll behavior.
   Berdiri sendiri, tidak import/bergantung ke modul lain, tidak
   mengubah app-bundle-a/b.min.js, jadi resiko regresi ke test suite
   yang ada = nol. Hanya toggle class 'nav-hidden' di elemen #mainNav
   berdasar arah scroll pada #scrollRoot.
   - Scroll ke bawah > threshold -> sembunyikan nav (translateY)
   - Scroll ke atas, atau dekat top/bottom -> tampilkan nav lagi
   - Menghormati prefers-reduced-motion: kalau aktif, nav selalu tampil
     (perilaku hide/show dimatikan total, bukan cuma transisinya)
*/
(function () {
  'use strict';
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var root = document.getElementById('scrollRoot');
  var nav = document.getElementById('mainNav');
  if (!root || !nav) return;

  var THRESHOLD = 8;
  var lastY = root.scrollTop;
  var ticking = false;

  function onScroll() {
    var y = root.scrollTop;
    var delta = y - lastY;
    var nearBottomGuard = 24;
    var maxScroll = root.scrollHeight - root.clientHeight;

    if (y <= 0 || y >= maxScroll - nearBottomGuard) {
      nav.classList.remove('nav-hidden');
    } else if (delta > THRESHOLD) {
      nav.classList.add('nav-hidden');
    } else if (delta < -THRESHOLD) {
      nav.classList.remove('nav-hidden');
    }
    lastY = y;
    ticking = false;
  }

  root.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();
