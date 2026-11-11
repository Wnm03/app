'use strict';
// tests/servis-mastercategory-dashbadge-sesi-d-lanjutan1.test.js
//
// Sesi D-lanjutan1 (UI consumer #1 dari 2 sesi, lanjutan Sesi D v1666 --
// "masterCategoryId/-Name/-Icon" (13 kategori terkunci, DatabaseAPI.
// masterCategory) yang sesi v1666 baru wiring data+belum ada consumer,
// lihat SESSION-NOTE-sesi-d-mastercategory-v1666.md "Sengaja TIDAK
// dikerjakan sesi ini > UI"). Sesi ini murni badge READ-ONLY (0 field
// tersimpan baru, 0 DOM interaktif) di 1 titik: kartu "🔧 Pengingat
// Servis" Beranda (renderDashboardServisReminder(), modules-render.js).
// Sesi berikutnya (D-lanjutan2, lebih kompleks krn DOM-touching interaktif
// di modal) akan menyusul terpisah.
//
// Yang dites:
// (1) Sparepart.dashReminderMasterCatBadgeHTML(cat,vehicleId) -- pure
//     function baru, 0 DOM -- reuse resolveCatGroup() apa adanya, balikin
//     '' kalau 0 match (tidak menebak), balikin span kecil kalau match.
// (2) renderDashboardServisReminder() -- badge baru MUNCUL di HTML utk
//     kategori yang namanya match keyword master category, dan TIDAK
//     muncul (0 elemen tambahan nyasar) utk kategori yang 0 match.
// (3) Static source gate -- badge dipanggil dari titik render yang benar
//     (guard typeof, 0 titik lama diubah selain 1 baris span nama
//     kategori).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_A_FILE = 'modules/vehicle/sparepart-servis.js';
const RENDER_FILE = 'modules/shared/modules-render.js';

// ---------------------------------------------------------------------
// (1) Sparepart.dashReminderMasterCatBadgeHTML() -- pure function
// ---------------------------------------------------------------------

test('dashReminderMasterCatBadgeHTML() -- nama item MATCH keyword -> balikin span berisi icon+nama kategori master', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);
  const html = ctx.Sparepart.dashReminderMasterCatBadgeHTML({ name: 'Oli mesin' }, null);
  assert.ok(html.includes('Servis Mesin'), 'harus mengandung nama kategori master yang match');
  assert.ok(html.includes('🔧'), 'harus mengandung icon kategori master');
});

test('dashReminderMasterCatBadgeHTML() -- nama item 0 MATCH keyword mana pun -> balikin string kosong (tidak menebak)', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);
  const html = ctx.Sparepart.dashReminderMasterCatBadgeHTML({ name: 'Item aneh yang tidak ada di keyword manapun xyz123' }, null);
  assert.equal(html, '');
});

test('dashReminderMasterCatBadgeHTML() -- cat null -> balikin string kosong, tidak throw', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);
  assert.equal(ctx.Sparepart.dashReminderMasterCatBadgeHTML(null, null), '');
});

test('dashReminderMasterCatBadgeHTML() -- 0 DatabaseAPI sama sekali (file sparepart-servis.js dimuat sendirian) -> balikin string kosong, 0 error', () => {
  const ctx = loadSource([SERVIS_A_FILE], {
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);
  assert.equal(ctx.Sparepart.dashReminderMasterCatBadgeHTML({ name: 'Oli mesin' }, null), '');
});

test('dashReminderMasterCatBadgeHTML() -- cat.group tersimpan (kategori custom lama) -- group/icon LAMA tidak dibaca fungsi ini, badge tetap murni dari classifyItemName(cat.name)', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_A_FILE], {
    escapeHtml: (s) => String(s),
  }, ['Sparepart']);
  const html = ctx.Sparepart.dashReminderMasterCatBadgeHTML({ name: 'Kampas rem depan', group: 'Grup Custom Lama', groupIcon: '📦' }, null);
  // "kampas rem" tidak persis match keyword sistem-pengereman (cek keyword asli di bawah) --
  // yang penting: badge TIDAK pernah menampilkan 'Grup Custom Lama' (field lama),
  // hanya nama kategori master (atau kosong).
  assert.ok(!html.includes('Grup Custom Lama'));
});

// (2) DIHAPUS (B13): renderDashboardServisReminder() kode mati (#dashServisReminderCard tidak ada di HTML).

// ---------------------------------------------------------------------
// (3) Static source gate
// ---------------------------------------------------------------------

test('static source gate -- dashReminderMasterCatBadgeHTML() reuse resolveCatGroup() (0 logic classify baru/duplikat)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', SERVIS_A_FILE), 'utf8');
  const fnStart = src.indexOf('dashReminderMasterCatBadgeHTML(cat,vehicleId){');
  assert.ok(fnStart !== -1, 'fungsi harus ada di sparepart-servis.js');
  const fnBody = src.slice(fnStart, fnStart + 400);
  assert.ok(fnBody.includes('resolveCatGroup'), 'harus reuse resolveCatGroup(), bukan classify ulang manual');
});
