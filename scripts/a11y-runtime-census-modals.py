#!/usr/bin/env python3
"""S256AN: uji interaktif grup pressed/toggle DI DALAM modal + data contoh 2 kendaraan (grup dinamis).
Usage: python3 scripts/a11y-runtime-census-modals.py [app_production.html] [--strict-first-session]. Butuh playwright + chromium. Exit code 1 bila ada temuan/page error.
Beda dgn a11y-runtime-census-pages.py (S256AM): modal dibuka lewat opener aplikasi, tiap tombol grup di-KLIK sungguhan (mouse event
Playwright, bukan el.click() JS) sehingga tombol yang tertutup/tak terjangkau ikut terdeteksi; kendaraan ke-2 dibuat lewat saveVehicle() asli."""
import sys, threading, http.server, socketserver, functools, os, json
from playwright.sync_api import sync_playwright
_args = [x for x in sys.argv[1:] if not x.startswith('--')]
page_file = _args[0] if _args else 'app_production.html'
# S256AR: mode ketat opsional. Default TETAP informasional (perilaku S256AN tidak berubah). Aktifkan SETELAH bundle dibangun ulang
# (fix S256AO aktif): --strict-first-session atau CENSUS_STRICT_FIRST_SESSION=1 -> firstSessionBbm selain 'ok' membuat exit code 1.
STRICT_FIRST_SESSION = '--strict-first-session' in sys.argv[1:] or os.environ.get('CENSUS_STRICT_FIRST_SESSION') == '1'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
http.server.SimpleHTTPRequestHandler.log_message = lambda *a, **k: None
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
# (id modal, JS pembuka). Opener khusus dipakai bila modal butuh state awal (tipe transaksi, mode tambah); sisanya openModal(id).
MODALS = [
 ('txModal', "openTxModal('expense')"), ('backupModal', None), ('budgetModal', None), ('fiSettingsModal', None), ('assetModal', None),
 ('accModal', None), ('piutangModal', None), ('debtModal', None), ('productModal', None), ('worthItModal', None),
 ('titipanExpenseModal', None), ('importKatalogModal', None), ('importShopExcelModal', None), ('shopPdfImportModal', None),
 ('shopScanModal', None), ('shopJsonModal', None), ('deliveryPlanModal', None),
 # modal kendaraan: grup/select-nya bergantung D.vehicles (dinamis)
 ('bbmModal', 'openBbmModal()'), ('kmModal', None), ('servisModal', None), ('fuelIntelModal', None), ('fuelBarCorrectionModal', None),
 ('sparepartModal', None), ('stockModal', None), ('vehicleModal', 'openVehicleModal()'),
]
SEED = """async () => {
 const before = D.vehicles.length;
 if (before < 2) {
  openVehicleModal();
  document.getElementById('vehName').value = 'Beat 110'; document.getElementById('vehEmoji').value = '🛵';
  const km = document.getElementById('vehKmAwal'); if (km) km.value = '12000';
  await saveVehicle();
  document.getElementById('vehicleModal').classList.remove('open');
 }
 return { before, after: D.vehicles.length, ids: D.vehicles.map(v => v.id) };
}"""
# Skema kontrol yang dihitung: pressed (aria-pressed), tab (aria-selected), segmented root, chip-btn tanpa state (kecuali tombol aksi).
SCAN = """(id) => {
 const el = document.getElementById(id); if (!el) return { missing: true };
 const q = (s) => [...el.querySelectorAll(s)]; const vis = (e) => !!(e.offsetParent || e.getClientRects().length);
 const pr = q('[aria-pressed]'), tb = q('[aria-selected]');
 const act = /^(pickAssetScanCandidate|applyQuickScan|BusinessFlowPresenter\\.tap|Servis\\.(selectCatalog|confirmPartial)|BudgetReko\\.applyByIndex)/;
 return { open: el.classList.contains('open'),
  pressed: pr.length, pressedVis: pr.filter(vis).length,
  pressedMismatch: pr.filter(b => (b.getAttribute('aria-pressed') === 'true') !== b.classList.contains('active')).map(b => (b.id || b.dataset.action || b.className).toString().slice(0, 50)),
  tabs: tb.length,
  tabMismatch: tb.filter(b => (b.getAttribute('aria-selected') === 'true') !== b.classList.contains('active')).map(b => (b.id || b.dataset.action || b.className).toString().slice(0, 50)),
  noState: q('button.chip-btn').filter(b => !b.hasAttribute('aria-pressed') && !b.hasAttribute('aria-selected') && !b.closest('.segmented-control') && !act.test(b.dataset.action || '')).map(b => (b.id || '') + '|' + (b.dataset.action || '')),
  segNoSemantic: q('.segmented-control').filter(r => !r.querySelector('[aria-pressed],[aria-selected],[role]')).map(r => r.id || r.className).slice(0, 10),
  // grup dinamis: <select> yg berisi id kendaraan harus memuat SEMUA kendaraan aktif
  vehSelectsChecked: q('select').filter(s => [...s.options].some(o => (D.vehicles || []).some(v => v.id === o.value))).length,
  vehSelectMissing: q('select').filter(s => [...s.options].some(o => (D.vehicles || []).some(v => v.id === o.value)))
    .filter(s => (D.vehicles || []).some(v => ![...s.options].some(o => o.value === v.id))).map(s => s.id || s.name || 'select') };
}"""
STATE = """(id) => [...document.getElementById(id).querySelectorAll('[aria-pressed]')].map(b => [b.id || b.dataset.action || b.className.toString().slice(0, 30), b.getAttribute('aria-pressed'), b.classList.contains('active')])"""
res = {'seed': None, 'firstSessionBbm': None, 'modals': {}, 'dynamic': {}, 'errors': [], 'dialogs': 0}; fail = False
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=False).new_page()
    pg.on('pageerror', lambda e: res['errors'].append(str(e)[:200]))
    def _dlg(d):
        res['dialogs'] += 1; d.dismiss()  # confirm()/prompt() dari tombol aksi: batalkan supaya tidak menulis data
    pg.on('dialog', _dlg)
    pg.goto(f'http://127.0.0.1:{port}/{page_file}'); pg.wait_for_timeout(3000)
    # Onboarding ASLI (finishOnboard) lalu cek informasional: modal BBM di sesi pertama TANPA reload. D.fuelPriceRef baru di-seed di load(),
    # sedangkan jalur pengguna baru kembali sebelum load() -> TypeError (bug pra-eksisting, di luar cakupan S256AN; TIDAK membuat exit code 1).
    pg.evaluate("() => { document.getElementById('ob_nama').value = 'Uji'; document.getElementById('ob_pin').value = '1234'; }")
    pg.evaluate("async () => { await finishOnboard(); }"); pg.wait_for_timeout(1000)
    res['firstSessionBbm'] = pg.evaluate("() => { try { openBbmModal(); return 'ok'; } catch (e) { return 'ERR ' + String(e).slice(0, 90); } finally { const m = document.getElementById('bbmModal'); if (m) m.classList.remove('open'); } }")
    # Reload = kondisi app terpasang normal (kw_setup ada -> load() jalan -> data default/migrasi lengkap). Census modal berjalan di kondisi ini.
    pg.reload(); pg.wait_for_timeout(3500)
    # showMain() = jalur resmi setelah onboarding (sembunyikan #onboard z=950, tampilkan header/nav/main). Hanya membuang u-dnone di
    # #mainApp (cara S256AM) membiarkan #onboard menutup layar: aman utk el.click() JS, tapi klik mouse sungguhan timeout "not visible".
    reveal = "() => { try { showMain(); } catch (e) { const o = document.getElementById('onboard'); if (o) o.style.display = 'none'; const m = document.getElementById('mainApp'); if (m) { m.classList.remove('u-dnone'); m.style.display = 'block'; } } }"
    pg.evaluate(reveal)
    # warm-up: kunjungi tiap halaman sekali agar render malas (lazy) selesai sebelum seed -> tidak salah dikira efek kendaraan
    for n in ['dashboard-hub', 'keuangan', 'shop', 'carnotes', 'pajak', 'aset', 'ai', 'settings']:
        pg.evaluate("(n) => showPage(n)", n); pg.wait_for_timeout(500); pg.evaluate(reveal)
    res['seed'] = pg.evaluate(SEED); pg.wait_for_timeout(800)
    if res['seed']['after'] < 2: fail = True
    # --- grup dinamis di halaman: chip kendaraan harus ada 1 per kendaraan, tepat 1 aktif, klik mengganti curVehicleId ---
    pg.evaluate("(n) => showPage(n)", 'carnotes'); pg.wait_for_timeout(800); pg.evaluate(reveal)
    nchips = len(pg.query_selector_all('#vehicleSelect .vehicle-chip'))
    dyn = {'chipCount': nchips, 'vehicleCount': res['seed']['after'], 'clicks': []}
    for i in range(nchips):
        # query ulang tiap iterasi: renderVehicleSelect() mengganti innerHTML saat chip aktif berubah -> handle lama "not attached"
        try: pg.query_selector_all('#vehicleSelect .vehicle-chip')[i].click(timeout=2500)
        except Exception as e: dyn['clicks'].append({'chip': i, 'error': str(e).split(chr(10))[0][:90]}); fail = True; continue
        pg.wait_for_timeout(400)
        st = pg.evaluate("() => { const cs = [...document.querySelectorAll('#vehicleSelect .vehicle-chip')]; return { active: cs.filter(c => c.classList.contains('active')).length, pressedTrue: cs.filter(c => c.getAttribute('aria-pressed') === 'true').length, mismatch: cs.filter(c => (c.getAttribute('aria-pressed') === 'true') !== c.classList.contains('active')).length, cur: curVehicleId, activeId: (cs.find(c => c.classList.contains('active')) || {dataset:{}}).dataset.args || null }; }")
        ok = st['active'] == 1 and st['pressedTrue'] == 1 and st['mismatch'] == 0 and st['activeId'] and st['cur'] in st['activeId']
        dyn['clicks'].append({'chip': i, 'ok': bool(ok), **st})
        if not ok: fail = True
    if dyn['chipCount'] != dyn['vehicleCount'] or len([c for c in dyn['clicks'] if c.get('ok')]) != nchips: fail = True
    res['dynamic']['vehicleChips'] = dyn
    # --- grup dinamis level halaman: tiap <select> berisi id kendaraan (mis. carImportVehicle) harus memuat SEMUA kendaraan; pilih tiap opsi ---
    VSEL = "() => [...document.querySelectorAll('select')].filter(s => [...s.options].some(o => D.vehicles.some(v => v.id === o.value))).map(s => ({ id: s.id || s.name || '?', missing: D.vehicles.filter(v => ![...s.options].some(o => o.value === v.id)).map(v => v.id), count: s.options.length, visible: !!(s.offsetParent || s.getClientRects().length) }))"
    vs = {}
    for n in ['dashboard-hub', 'keuangan', 'shop', 'carnotes', 'pajak', 'aset', 'ai', 'settings']:
        pg.evaluate("(n) => showPage(n)", n); pg.wait_for_timeout(500); pg.evaluate(reveal)
        for row in pg.evaluate(VSEL):
            vs[row['id']] = row
            if row['missing']: fail = True
    for sid in list(vs):
        # select tersembunyi (di tab/section tertutup) hanya diperiksa ISI-nya (semua kendaraan ada); memilih opsi butuh elemen terlihat
        if not vs[sid]['visible']: vs[sid]['selectSkipped'] = 'tersembunyi di carnotes: hanya isi opsi yang diperiksa'; continue
        for v in res['seed']['ids']:
            try:
                pg.evaluate("(n) => showPage(n)", 'carnotes'); pg.wait_for_timeout(300)
                pg.select_option(f'#{sid}', v, timeout=2500)
                got = pg.evaluate("(id) => document.getElementById(id) && document.getElementById(id).value", sid)
                if got != v: vs[sid].setdefault('selectFail', []).append(v)
            except Exception as e:
                vs[sid].setdefault('selectFail', []).append(v + ': ' + str(e).split(chr(10))[0][:60])
        if vs[sid].get('selectFail'): fail = True
    res['dynamic']['vehicleSelects'] = vs
    if not vs: res['dynamic']['vehicleSelectsNote'] = 'tidak ada <select> kendaraan terlihat di 8 halaman'
    # --- modal: buka, scan, KLIK sungguhan tiap tombol pressed yang terlihat, scan ulang ---
    for mid, opener in MODALS:
        r = {}
        try:
            pg.evaluate("([id, js]) => { if (js) { (0, eval)(js); } else { openModal(id); } }", [mid, opener]); pg.wait_for_timeout(450)
            s1 = pg.evaluate(SCAN, mid)
            if s1.get('missing'): res['modals'][mid] = {'error': 'modal tidak ada di DOM'}; fail = True; continue
            r['openedOk'] = s1['open']; r['pressedVisible'] = s1['pressedVis']; r['tabs'] = s1['tabs']
            handles = [h for h in pg.query_selector_all(f'#{mid} [aria-pressed]') if h.is_visible()]
            unreachable = []; clicked = 0
            for h in handles:
                try: h.click(timeout=2500, no_wait_after=True); clicked += 1
                except Exception as e: unreachable.append(((h.get_attribute('id') or h.get_attribute('data-action') or '?') + ': ' + str(e).split('\n')[0])[:110])
                pg.wait_for_timeout(120)
            pg.wait_for_timeout(300)
            # tab (role=tab / aria-selected): klik sungguhan tiap tab terlihat; sesudah tiap klik tepat 1 tab per induk bernilai true & cocok class active
            tabBad = []; tabClicked = 0
            for ti in range(len(pg.query_selector_all(f'#{mid} [aria-selected]'))):
                try:
                    th = pg.query_selector_all(f'#{mid} [aria-selected]')[ti]
                    if not th.is_visible(): continue
                    th.click(timeout=2500, no_wait_after=True); tabClicked += 1; pg.wait_for_timeout(150)
                    tabBad += pg.evaluate("(id) => [...document.getElementById(id).querySelectorAll('[aria-selected]')].map(t => t.parentElement).filter((p, i, a) => a.indexOf(p) === i).filter(p => { const ts = [...p.querySelectorAll(':scope > [aria-selected]')]; return ts.length && (ts.filter(t => t.getAttribute('aria-selected') === 'true').length !== 1 || ts.some(t => (t.getAttribute('aria-selected') === 'true') !== t.classList.contains('active'))); }).map(p => (p.id || p.className).toString().slice(0, 40))", mid)
                except Exception as e: tabBad.append('klik tab #%d: %s' % (ti, str(e).split(chr(10))[0][:70]))
            s2 = pg.evaluate(SCAN, mid)
            r['tabClicked'] = tabClicked; r['tabGroupBad'] = sorted(set(tabBad))
            if r['tabGroupBad']: fail = True
            r.update({'clicked': clicked, 'unreachable': unreachable, 'stillOpen': s2['open'],
                      'pressedMismatch': s1['pressedMismatch'] + s2['pressedMismatch'], 'tabMismatch': s1['tabMismatch'] + s2['tabMismatch'],
                      'noState': s2['noState'], 'segNoSemantic': s2['segNoSemantic'], 'vehSelectMissing': s2['vehSelectMissing'], 'vehSelectsChecked': s2['vehSelectsChecked'],
                      'pressedCountStable': s1['pressed'] == s2['pressed']})
            if (not r['openedOk'] or unreachable or r['pressedMismatch'] or r['tabMismatch'] or r['noState'] or r['segNoSemantic'] or r['vehSelectMissing']): fail = True
            # modal yang tiba-tiba tertutup oleh klik grup = temuan (grup tidak boleh menutup modal)
            if s1['open'] and not s2['open'] and clicked: r['closedByClick'] = True; fail = True
            res['modals'][mid] = r
        except Exception as e:
            res['modals'][mid] = {'error': str(e)[:200]}; fail = True
        finally:
            pg.evaluate("(id) => { const e = document.getElementById(id); if (e) e.classList.remove('open'); }", mid)
    b.close()
if res['errors']: fail = True
if STRICT_FIRST_SESSION and res['firstSessionBbm'] != 'ok': fail = True; res['strictFirstSessionFailed'] = True
res['strictFirstSession'] = STRICT_FIRST_SESSION
tot = {'modals': len(res['modals']), 'clicked': sum(m.get('clicked', 0) for m in res['modals'].values()), 'tabClicked': sum(m.get('tabClicked', 0) for m in res['modals'].values()), 'vehSelectsChecked': sum(m.get('vehSelectsChecked', 0) for m in res['modals'].values()), 'withPressedGroups': sum(1 for m in res['modals'].values() if m.get('pressedVisible'))}
res['summary'] = tot
print(json.dumps(res, indent=1, ensure_ascii=False)); sys.exit(1 if fail else 0)
