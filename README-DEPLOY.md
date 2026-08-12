# S574 DEPLOY PATCH — v1304

Sudah dikonfirmasi: `app-bundle-b.min.js` yang live di GitHub Pages **tidak**
mengandung "Pemilik Sumber Potongan" → GitHub Pages belum menerima v1304
(Root Cause E — deployment problem, bukan cache/SW).

Ini bukan `git diff` patch (environment saya tidak punya akses ke `.git`
repo Anda), melainkan **5 file production final v1304** — byte-identik
dengan `S574-F-FINAL-RELEASE.zip` yang sudah diverifikasi PASS S574:

- `app-bundle-a.min.js` (1x "Pemilik Sumber Potongan")
- `app-bundle-b.min.js` (9x "Pemilik Sumber Potongan")
- `index.html`
- `app_production.html`
- `sw.js` (`kw-cache-v1304`, skipWaiting + clientsClaim + network-first)

## Cara pakai

Di repo lokal Anda (yang punya `.git` dan remote ke GitHub):

```bash
# 1. Pastikan di branch/folder yang jadi source GitHub Pages
git status --short
git branch --show-current
git remote -v

# 2. Copy 5 file ini ke root repo, timpa yang lama
cp /path/ke/S574-DEPLOY-PATCH/app-bundle-a.min.js .
cp /path/ke/S574-DEPLOY-PATCH/app-bundle-b.min.js .
cp /path/ke/S574-DEPLOY-PATCH/index.html .
cp /path/ke/S574-DEPLOY-PATCH/app_production.html .
cp /path/ke/S574-DEPLOY-PATCH/sw.js .

# 3. Cek diff — pastikan HANYA 5 file ini yang berubah
git status --short
git diff --stat

# 4. Commit & push
git add app-bundle-a.min.js app-bundle-b.min.js index.html app_production.html sw.js
git commit -m "S574: deploy account deduction owner UI (v1304)"
git push
```

## Setelah push

1. Tunggu GitHub Pages selesai redeploy (biasanya 1–2 menit, cek tab
   Actions kalau pakai workflow, atau langsung refresh setelah beberapa
   menit kalau deploy-from-branch).
2. Buka `https://wnm03.github.io/app/app-bundle-b.min.js` langsung di
   tab browser, `Ctrl+F` → "Pemilik Sumber Potongan" — harus ketemu.
3. Kalau langkah 2 sudah ketemu tapi UI di aplikasi masih lama: itu baru
   giliran Service Worker — hard refresh, atau DevTools → Application →
   Service Workers → Unregister, lalu reload.

## Yang TIDAK disentuh oleh patch ini

`modules/modals.js`, `modules/shop/modals.js`, `finance/*` (top-level,
orphan) — tidak termasuk dalam 5 file di atas, tetap seperti semula.
