#!/usr/bin/env node
// DIBUAT OTOMATIS oleh build.js — unminified bundle marker.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { computeGroupHash, markerLine } = require('./bundle-hash');
const ROOT = path.join(__dirname, '..');
const GROUP_A = [
  'modules/shared/pwa-ux-performance.js',
  'modules/shared/pwa-production-hardening.js',
  'modules/shared/modules-render.js',
  'modules/shared/modules-render-b.js',
  'modules/shared/modals.js',
  'modules/shared/modules-calc.js',
  'modules/shop/cobek-etalase.js',
  'modules/shop/cobek-pricing.js',
  'modules/shop/cobek-order.js',
  'modules/shop/cobek-tx-cart.js',
  'modules/shop/cobek-io.js',
  'modules/business/shop-data-io-api.js',
  'modules/business/kasir.js',
  'modules/finance/piutang-utang.js',
  'modules/finance/pajak-pbb-zakat.js',
  'modules/finance/zakat-reminder.js',
  'budget.js',
  'car-notes.js',
  'chat-action-handlers.js',
  'modules/finance/edukasi-dana.js',
  'modules/home/hidup-seimbang.js',
  'modules/finance/linktx.js',
  'modules/asset/aset-owners.js',
  'modules/asset/aset.js',
  'modules/asset/aset-reports.js',
  'modules/asset/aset-misc.js',
  'modules/asset/aset-keluarga.js',
  'modules/ai/feature-insights.js',
  'modules/asset/invest-ai-widget.js',
  'modules/asset/penyusutan-ai-widget.js',
  'modules/asset/aset-emas-impor.js',
  'modules/asset/property-management-api.js',
  'modules/asset/property-management-presenter.js',
  'modules/asset/rental-management-api.js',
  'modules/asset/rental-management-presenter.js',
  'modules/asset/asset-maintenance-api.js',
  'modules/asset/asset-maintenance-presenter.js',
  'modules/finance/worthit.js',
  'modules/shared/ripple-position.js',
];
const GROUP_B = [
  'modules/shared/data-default.js',
  'modules/shared/ownership-engine.js',
  'modules/shared/ownership-settings-presenter.js',
  'modules/shared/multi-owner-engine.js',
  'modules/shared/owner-registry.js',
  'modules/shared/filter-prefs-store.js',
  'modules/shared/owner-registry-settings-ui.js',
  'modules/shared/ghost-asset-cleanup-ui.js',
  'modules/shared/custodian-registry.js',
  'modules/asset/asset-ownership-split-presenter.js',
  'modules/shared/features-helpers-global-security.js',
  'modules/shared/action-wrappers.js',
  'diagnostik-versi.js',
  'modules/shared/format-tema.js',
  'modules/shared/error-handler.js',
  'modules/shared/helper-teks.js',
  'modules/shared/keamanan-pin.js',
  'modules/home/refleksi-selfcare.js',
  'modules/shared/modal-navigasi.js',
  'modules/shared/scanner-session.js',
  'modules/business/reset-gaji-mingguan.js',
  'modules/shared/debug-console.js',
  'modules/shared/pengaturan-search.js',
  'modules/shared/onboarding.js',
  'modules/shared/kalkulator-input.js',
  'modules/shared/scan-ocr.js',
  'modules/shared/scan-ocr-b.js',
  'modules/finance/filter-laporan.js',
  'modules/finance/akun.js',
  'modules/business/gaji-calc.js',
  'modules/business/gaji-bulanan.js',
  'modules/finance/cicilan.js',
  'modules/finance/tx-bbm.js',
  'modules/vehicle/service-event-lifecycle.js',
  'modules/vehicle/service-event-adapter.js',
  'modules/vehicle/service-history-integrity-audit.js',
  'modules/vehicle/finance-service-adapter.js',
  'modules/vehicle/service-photo-validator.js',
  'modules/vehicle/reminder-lifecycle.js',
  'modules/vehicle/service-integrity-reconciler.js',
  'modules/vehicle/car-notes-final-audit.js',
    'modules/vehicle/service-stock-ledger.js',
    'modules/vehicle/odometer-audit.js',
    'modules/vehicle/car-notes-integrity-suite.js',
  'modules/vehicle/fuel-integrity-reconciler.js',
  'modules/vehicle/vehicle-tax-integrity-reconciler.js',
  'modules/finance/tx-servis.js',
  'modules/finance/tx-stok-sparepart.js',
  'modules/finance/tx-renov.js',
  'modules/finance/tx-transfer.js',
  'modules/finance/tx-cobek.js',
  'modules/finance/tx-target.js',
  'modules/finance/tx-list-cashflow.js',
  'modules/finance/transaksi.js',
  'modules/finance/transaksi-b.js',
  'modules/shared/profil-pengaturan.js',
  'modules/finance/kategori.js',
  'modules/ai/kategorisasi-ai.js',
  'modules/finance/tagihan-kalender.js',
  'modules/finance/cash-projection.js',
  'modules/finance/deficit-notif-bridge.js',
  'modules/shared/backup-restore.js',
  'modules/shared/backup-history-api.js',
  'modules/shared/backup-health-api.js',
  'modules/shared/backup-history-presenter.js',
  'modules/shared/backup-health-presenter.js',
  'modules/business/payroll-absensi.js',
  'modules/business/tukang-absensi.js',
  'modules/business/insight-target-mingguan.js',
  'modules/vehicle/car-notes-performance.js',
  'modules/vehicle/vehicle-car-notes-sot-s2071.js',
  'modules/vehicle/vehicle-active-sot-s2061.js',
  'modules/vehicle/vehicle-core.js',
  'modules/vehicle/fuel-price-ref.js',
  'modules/vehicle/vehicle-catalog.js',
  'modules/vehicle/vehicle-catalog-write-sot.js',
  'modules/vehicle/vehicle-catalog-health-sot.js',
  'modules/vehicle/vehicle-catalog-scope-sot.js',
  'modules/vehicle/vehicle-catalog-e2e-sot.js',
  'modules/vehicle/vehicle-catalog-lifecycle-sot.js',
  'modules/vehicle/vehicle-catalog-migration-sot.js',
  'modules/vehicle/vehicle-catalog-identity-sot.js',
  'modules/vehicle/vehicle-catalog-certification-sot.js',
  'modules/vehicle/vehicle-part-sot.js',
  'modules/vehicle/vehicle-service-sot.js',
  'modules/vehicle/vehicle-service-reminder-sot.js','modules/vehicle/service-reminder-package-sot.js',
  'modules/vehicle/vehicle-sot-fleet-integrity.js',
  'modules/vehicle/vehicle-category-sot.js',
  'modules/vehicle/vehicle-stock-sot.js',
  'modules/vehicle/vehicle-model-registry-sot.js',
  'modules/vehicle/vehicle-model-resolver-sot.js',
  'modules/vehicle/vehicle-sot-provisioning.js',
  'modules/vehicle/honda-oem-catalog-master.js',
  'modules/vehicle/vehicle-scanner.js',
  'modules/vehicle/vehicle-catalog-ui.js',
  'modules/vehicle/sparepart-scanner.js',
  'modules/vehicle/sparepart-scanner-ui.js',
  'modules/vehicle/sparepart-ocr.js',
  'modules/vehicle/sparepart-ocr-parser.js',
  'modules/vehicle/sparepart-ocr-catalog-link.js',
  'modules/vehicle/sparepart-ocr-catalog-detail.js',
  'modules/vehicle/sparepart-ocr-catalog-add.js',
  'modules/vehicle/sparepart-ocr-orchestrator.js',
  'modules/vehicle/vehicle-catalog-import.js',
  'modules/vehicle/vehicle-catalog-import-ui.js',
  'modules/vehicle/vehicle-catalog-import-stock-push.js',
  'modules/vehicle/vehicle-catalog-web-import.js',
  'modules/vehicle/vehicle-catalog-web-import-ui.js',
  'modules/vehicle/vehicle-catalog-servis-link.js',
  'modules/finance/vehicle-catalog-tx-link.js',
  'modules/vehicle/honda-pdf-import.js',
  'modules/vehicle/honda-pdf-import-extract.js',
  'modules/vehicle/honda-pdf-import-parse.js',
  'modules/vehicle/honda-pdf-import-commit.js',
  'modules/vehicle/honda-pdf-import-ui.js',
  'modules/business/shop-pdf-import-ui.js',
  'modules/business/shop-scan-ui.js',
  'modules/ai/chat-action.js',
  'modules/shared/data-archive.js',
  'modules/vehicle/category-canonical-ref.js',
  'modules/vehicle/service-interval-policy.js',
  'modules/vehicle/service-interval-sot.js',
  'modules/vehicle/service-history-reminder-reconciliation-sot.js', 'modules/vehicle/service-category-sot-reconciliation-s2007.js',
  'modules/vehicle/service-category-component-history-audit-s2034.js',
  'modules/vehicle/sparepart-servis.js',
  'modules/vehicle/sparepart-servis-ui.js',
  'modules/engine/database-api.js',
  'modules/vehicle/service-master-data.generated.js',
  'modules/vehicle/service-master-database.js',
  'modules/vehicle/service-taxonomy-sot.js',
  'modules/vehicle/service-history-context-s2018.js',
  'modules/vehicle/service-history-sot-normalizer.js',
  'modules/vehicle/service-history-sot-review.js',
  'modules/vehicle/service-session-sot.js',
  'modules/vehicle/service-history-audit-package.js',
  'modules/vehicle/service-event-sot.js',
  'modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js',
  'modules/vehicle/service-checklist-execution-sot.js',
  'modules/vehicle/service-checklist-integrity-sot.js',
  'modules/vehicle/parts-catalog-database.js',
  'modules/vehicle/vehicle-maintenance-template-engine.js',
  'modules/vehicle/honda-pdf-catalog-auto-import.js',
  'modules/vehicle/sparepart-servis-b.js',
  'modules/vehicle/servis-checklist.js',
  'modules/vehicle/service-input-catalog.js',
  'modules/vehicle/service-history-component-identity-sot.js',
  'modules/vehicle/servis.js',
  'modules/vehicle/service-history-checklist-edit-s2036.js',
  'modules/vehicle/service-history-multicategory-sync-s2037.js',
  'modules/vehicle/service-session-integrity-s2045.js',
  'modules/vehicle/service-session-reconcile-s2051.js',
  'modules/vehicle/service-session-recovery-s2050.js',
  'modules/vehicle/service-session-mutation-s2047.js',
  'modules/vehicle/service-history-bulk-identity-editor.js',
  'modules/vehicle/service-maintenance-engine.js',
  'modules/vehicle/service-maintenance-repository.js',
  'modules/vehicle/servis-b.js',
  'modules/vehicle/service-history-component-explorer-s2006.js',
  'modules/vehicle/service-maintenance-guidance.js',
  'modules/vehicle/shop-katalog-dinamis-api.js',
  'modules/vehicle/shop-katalog-dinamis-presenter.js',
  'modules/vehicle/torsi-vehicle-api.js',
  'ai-chat.js',
  'reminder-notif.js',
  'laporan-export.js',
  'gdrive-backup.js',
  'data-health-check.js',
  'global-search.js',
  'sheets-schema.js',
  'sheets-sync.js',
  'pwa-setup.js',
  'modules/shared/app-init-runtime.js',
  'modules/shared/self-test-cases-a.js',
  'modules/shared/self-test-cases-b.js',
  'self-test.js',
  'pajak-aset-ui-wrappers.js',
  'modules/finance/finance-intelligence.js',
  'modules/finance/financial-audit-engine.js',
  'modules/finance/financial-audit-presenter.js',
  'modules/finance/financial-audit-annotations.js',
  'modules/finance/finance-dashboard.js',
  'modules/finance/financial-forecast-api.js',
  'modules/finance/financial-forecast-presenter.js',
  'modules/finance/budget-recommendation-api.js',
  'modules/finance/budget-recommendation-presenter.js',
  'modules/finance/cashflow-projection-settings.js',
  'modules/finance/cashflow-projection-api.js',
  'modules/finance/cashflow-projection-presenter.js',
  'modules/finance/financial-goal-api.js',
  'modules/finance/financial-goal-presenter.js',
  'modules/finance/investment-planner-api.js',
  'modules/finance/investment-planner-presenter.js',
  'modules/finance/debt-optimizer-api.js',
  'modules/finance/debt-optimizer-presenter.js',
  'modules/finance/retirement-planner-api.js',
  'modules/finance/retirement-planner-presenter.js',
  'modules/finance/financial-health-score-api.js',
  'modules/finance/financial-health-score-presenter.js',
  'modules/finance/financial-risk-dashboard-api.js',
  'modules/finance/financial-risk-dashboard-presenter.js',
  'modules/vehicle/vehicle-intelligence.js',
  'modules/vehicle/vehicle-dashboard.js',
  'modules/vehicle/vehicle-reminder.js',
  'modules/vehicle/vehicle-notif-bridge.js',
  'modules/vehicle/vehicle-ai-hook.js',
  'modules/vehicle/vehicle-insight-presenter.js',
  'modules/vehicle/vehicle-daily-brief.js',
  'modules/vehicle/vehicle-alert-panel.js',
  'modules/vehicle/vehicle-insight-feed.js',
  'modules/vehicle/vehicle-trend-api.js',
  'modules/vehicle/vehicle-cost-summary.js',
  'modules/vehicle/vehicle-fuel-trend.js',
  'modules/vehicle/vehicle-service-trend.js',
  'modules/vehicle/vehicle-analytics-presenter.js',
  'modules/vehicle/fuel-storage.js',
  'modules/vehicle/fuel-state-history.js',
  'modules/vehicle/fuel-tank-profile.js',
  'modules/vehicle/fuel-intelligence-engine.js',
  'modules/vehicle/fuel-gauge-engine.js',
  'modules/vehicle/fuel-state-estimator.js',
  'modules/vehicle/fuel-history.js',
  'modules/vehicle/fuel-analytics.js',
  'modules/vehicle/fuel-modal.js',
  'modules/vehicle/fuel-card.js',
  'modules/vehicle/fuel-intelligence-ui.js',
  'modules/vehicle/fuel-tank-profile-ui.js',
  'modules/vehicle/fuel-prediction-engine.js',
  'modules/vehicle/fuel-cost-analytics.js',
  'modules/vehicle/fuel-maintenance-engine.js',
  'modules/vehicle/fuel-insight-engine.js',
  'modules/vehicle/fuel-fleet-selector.js',
  'modules/vehicle/fuel-notif-bridge.js',
  'modules/vehicle/fuel-dashboard.js',
  'modules/vehicle/fuel-compare.js',
  'modules/vehicle/fuel-trend-dashboard.js',
  'modules/vehicle/vehicle-decision-api.js',
  'modules/vehicle/vehicle-recommendation-engine.js',
  'modules/vehicle/vehicle-priority-scoring.js',
  'modules/vehicle/vehicle-action-recommendation.js',
  'modules/vehicle/vehicle-decision-presenter.js',
  'modules/vehicle/vehicle-attention-presenter.js',
  'modules/vehicle/vehicle-automation-api.js',
  'modules/vehicle/vehicle-reminder-scheduler.js',
  'modules/vehicle/vehicle-maintenance-automation.js',
  'modules/vehicle/vehicle-tax-document-automation.js',
  'modules/vehicle/vehicle-automation-presenter.js',
  'modules/cross/finance-vehicle-cross-summary.js',
  'modules/cross/cross-ai-hook.js',
  'modules/cross/cross-dashboard-card.js',
  'modules/cross/cross-insight-presenter.js',
  'modules/cross/unified-summary-api.js',
  'modules/cross/unified-ai-briefing.js',
  'modules/cross/unified-briefing-presenter.js',
  'modules/finance/piutang-utang-reminder.js',
  'modules/finance/tagihan-reminder.js',
  'modules/cross/life-dashboard-summary-api.js',
  'modules/cross/priority-engine.js',
  'modules/cross/personal-overview-presenter.js',
  'modules/cross/cross-module-widgets.js',
  'modules/cross/life-priority-panel.js',
  'modules/cross/unified-dashboard-home.js',
  'modules/cross/decision-center-api.js',
  'modules/cross/recommendation-panel.js',
  'modules/cross/action-queue.js',
  'modules/cross/decision-center-home.js',
  'app-bootstrap.js',
  'modules/shared/feature-icons.js',
  'modules/dashboard-hub/dashboard-hub-registry.js',
  'modules/dashboard-hub/dashboard-hub.js',
  'modules/dashboard-hub/dashboard-hub-search.js',
  'modules/dashboard-hub/dashboard-hub-favorit.js',
  'modules/dashboard-hub/dashboard-hub-favorit-view.js',
  'modules/dashboard-hub/dashboard-hub-settings.js',
  'modules/dashboard-hub/dashboard-insight-dedup.js',
  'modules/ai/ai-command-center.js',
  'modules/self-reward/self-reward-engine.js',
  'modules/self-reward/self-reward-view.js',
  'modules/self-reward/self-reward-ai-widget.js',
  'modules/asset/investasi.js',
  'modules/asset/investasi-view.js',
  'modules/asset/investasi-list-view.js',
  'modules/asset/investasi-tx-view.js',
  'modules/asset/investasi-watch-view.js',
  'modules/asset/asset-portfolio-api.js',
  'modules/asset/asset-portfolio-presenter.js',
  'lifeos/lifeos-store.js',
  'lifeos/lifeos-registry.js',
  'lifeos/lifeos-link-registry.js',
  'lifeos/plugins/lifeos-plugin-manifest.js',
  'lifeos/plugins/lifeos-plugin-validation.js',
  'lifeos/plugins/lifeos-plugin-registry.js',
  'lifeos/plugins/lifeos-plugin-loader.js',
  'lifeos/plugins/lifeos-plugin-runtime.js',
  'lifeos/adapters/area-adapter.js',
  'lifeos/adapters/goal-adapter.js',
  'lifeos/adapters/project-adapter.js',
  'lifeos/adapters/today-adapter.js',
  'lifeos/adapters/review-adapter.js',
  'lifeos/adapters/knowledge-adapter.js',
  'lifeos/lifeos-object-ref.js',
  'lifeos/services/project-service.js',
  'lifeos/services/review-service.js',
  'lifeos/services/knowledge-service.js',
  'lifeos/services/life-object-service.js',
  'lifeos/ui/lifeos-home.js',
  'lifeos/ui/areas.js',
  'lifeos/ui/today.js',
  'lifeos/ui/goals.js',
  'lifeos/ui/projects.js',
  'lifeos/ui/review.js',
  'lifeos/ui/life-objects.js',
  'lifeos/ui/plugins.js',
  'lifeos/ui/knowledge.js',
  'lifeos/lifeos-nav.js',
  'economic-intelligence/eie-bus.js',
  'economic-intelligence/eie-store.js',
  'economic-intelligence/domain/entities.js',
  'economic-intelligence/domain/scoring-formulas.js',
  'economic-intelligence/domain/status-classifier.js',
  'economic-intelligence/adapters/user-finance-adapter.js',
  'economic-intelligence/adapters/macro-data-adapter.js',
  'economic-intelligence/rules/rule-schema.js',
  'economic-intelligence/rules/rule-definitions.js',
  'economic-intelligence/engine/rule-engine.js',
  'economic-intelligence/engine/scoring-engine.js',
  'economic-intelligence/engine/insight-generator.js',
  'economic-intelligence/services/macro-sync-service.js',
  'economic-intelligence/services/notification-service.js',
  'economic-intelligence/services/recommendation-service.js',
  'economic-intelligence/scheduler/eie-scheduler.js',
  'economic-intelligence/ui/eie-dashboard.js',
  'economic-intelligence/ui/eie-insight-feed.js',
  'economic-intelligence/ui/eie-notif-settings.js',
  'economic-intelligence/eie-registry.js',
  'modules/ai/ai-core.js',
  'modules/ai/ai-decision-engine.js',
  'modules/ai/ai-service.js',
  'modules/logistics/logistics-engine.js',
  'modules/logistics/logistics-service.js',
  'modules/shop/purchase-engine.js',
  'modules/shop/trip-engine.js',
  'modules/shop/inventory-engine.js',
  'modules/shop/shop-restock-reminder.js',
  'modules/shop/profit-engine.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/generic/pricing-service.js',
  'modules/shop/generic/inventory-service.js',
  'modules/shop/shop-inventory-ledger.js',
  'modules/shop/generic/product-repository.js',
  'modules/shop/delivery-plan-ui.js',
  'modules/shop/shop-business-engine-presenter.js',
  'modules/shop/trip-presenter.js',
  'modules/shop/business-flow-presenter-inventory.js',
  'modules/shop/business-flow-presenter.js',
  'modules/finance/dana-kelolaan.js',
  'modules/finance/dana-kelolaan-presenter.js',
  'modules/finance/titipan-reconcile.js',
  'modules/finance/titipan-sync.js',
  'modules/finance/dana-titipan-pool-api.js',
  'modules/finance/dana-titipan-aggregation-api.js',
  'modules/finance/dana-titipan-commitment-return-api.js',
  'modules/finance/dana-titipan-portfolio-render.js',
  'modules/shared/realokasi-sisa-kuota.js',
  'modules/finance/dana-titipan-portfolio-render-b.js',
  'modules/finance/titipan-expense-flow.js',
  'modules/finance/titipan-expense-ui.js',
  'modules/vehicle/ride-activity-metrics.js',
  'modules/vehicle/ride-gps-recorder.js',
  'modules/vehicle/ride-storage.js',
  'modules/vehicle/ride-ui.js',
  'modules/vehicle/ride-map.js',
  'modules/vehicle/ride-history.js',
  'modules/vehicle/ride-vehicle-integration.js',
];
const ALL_SOURCE = [...GROUP_A, ...GROUP_B];
const HTML_FILES = ['index.html', 'app_production.html'];
function readFile(f) {
  return fs.readFileSync(path.join(ROOT, f), 'utf8');
}
function writeFile(f, content) {
  fs.writeFileSync(path.join(ROOT, f), content);
}
const {
  detectCurrentVersion,
  computeNextVersion,
  bumpVersionEverywhere,
  verifyVersionConstantsSynced,
  buildBundle,
} = require('./build-core')({
  ROOT,
  ALL_SOURCE,
  readFile,
  writeFile,
  fs,
  path,
  computeGroupHash,
  markerLine,
  Buffer,
});
const {
  LINT_REGISTRY,
  runLintRegistry,
  syntaxCheck,
  bumpCacheVersion,
} = require('./build-lints')({
  ROOT,
  HTML_FILES,
  ALL_SOURCE,
  readFile,
  fs,
  path,
  execSync,
});
function preflightPatchManifest() {
  const manifestPath = process.env.PATCH_MANIFEST;
  if (!manifestPath) return;
  const file = path.resolve(ROOT, manifestPath);
  if (!fs.existsSync(file)) throw new Error(`PATCH_MANIFEST tidak ditemukan: ${manifestPath}`);
  const text = fs.readFileSync(file, 'utf8');
  const a=text.lastIndexOf('\nBEGIN_APPLY_FILES\n'), b=text.indexOf('\nEND_APPLY_FILES',a);
  if(a<0 || b<a) throw new Error(`PATCH_MANIFEST ${manifestPath} tidak memiliki blok BEGIN_APPLY_FILES/END_APPLY_FILES`);
  const listed=text.slice(a+'\nBEGIN_APPLY_FILES\n'.length,b).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  const missing=listed.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));
  if(missing.length) throw new Error('PATCH PREFLIGHT FAILED — semua file manifest harus sudah diterapkan sebelum build/version bump.\n'+missing.map(x=>'  - '+x).join('\n'));
  console.log(`✓ Patch preflight: ${listed.length} manifest files present (${manifestPath})`);
}
function main() {
  preflightPatchManifest();
  execSync('node scripts/generate-service-master-data.js', { cwd: ROOT, stdio: 'inherit' });
  runLintRegistry(LINT_REGISTRY);
  const explicitVersion = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const oldVersion = detectCurrentVersion();
  const newVersion = computeNextVersion(oldVersion, explicitVersion);
  console.log(`Versi lama : ${oldVersion}`);
  console.log(`Versi baru : ${newVersion}`);
  console.log('');
  const changedFiles = bumpVersionEverywhere(oldVersion, newVersion);
  console.log(`✓ Versi disamakan di ${changedFiles.length} file source: ${changedFiles.join(', ')}`);
  const versionSyncProblems = verifyVersionConstantsSynced(newVersion);
  if (versionSyncProblems.length) {
    console.error(`\n❌ BUILD DIHENTIKAN — ${versionSyncProblems.length} konstanta versi TIDAK sinkron setelah bump:\n`);
    versionSyncProblems.forEach((p) => console.error('  - ' + p));
    console.error(
      '\nPerbaiki manual konstanta di atas supaya nilainya persis \'' + newVersion + '\', ' +
      'lalu jalankan ulang node build.js. (Lihat catatan di verifyVersionConstantsSynced() ' +
      'utk kenapa ini bisa terjadi walau bumpVersionEverywhere() sudah jalan.)'
    );
    process.exit(1);
  }
  console.log('✓ Semua konstanta versi (MODULE_RENDER_VERSION/MODAL_VERSION/MODULE_CALC_VERSION/MODULE_FEATURES_VERSION/APP_BUILD_VERSION/PRODUCTION_BUILD_SYNCED_VERSION) terverifikasi sinkron\n');
  const buildRequireMinify = process.argv.includes('--require-minify') || process.env.REQUIRE_MINIFY === '1';
  const resA = buildBundle(GROUP_A, 'app-bundle-a.min.js', oldVersion, buildRequireMinify);
  const resB = buildBundle(GROUP_B, 'app-bundle-b.min.js', oldVersion, buildRequireMinify);
  console.log(`✓ app-bundle-a.min.js ditulis (${(resA.size / 1024).toFixed(1)} KB${resA.minified ? ', diminify pakai esbuild' : ' — TANPA minifikasi, esbuild tidak ditemukan'})`);
  console.log(`✓ app-bundle-b.min.js ditulis (${(resB.size / 1024).toFixed(1)} KB${resB.minified ? ', diminify pakai esbuild' : ' — TANPA minifikasi, esbuild tidak ditemukan'})`);
  if (resA.backupName || resB.backupName) {
    console.log(`✓ Backup bundle lama disimpan di backups/ (${[resA.backupName, resB.backupName].filter(Boolean).join(', ')})`);
  }
  if (buildRequireMinify && (!resA.minified || !resB.minified)) {
    console.error(
      '\n❌ BUILD DIHENTIKAN — --require-minify aktif tapi esbuild tidak terdeteksi/tidak jalan,\n' +
      'jadi bundle di atas TIDAK diminify. Ini biasanya berarti `npm install` di environment ini\n' +
      'gagal memasang esbuild (optionalDependencies) secara diam-diam. Cek log `npm install`,\n' +
      'pastikan esbuild benar-benar terpasang, lalu jalankan ulang.'
    );
    process.exit(1);
  }
  console.log('');
  console.log(bumpCacheVersion(newVersion).trim());
  console.log('Mengecek sintaks bundle hasil build...');
  const checkA = syntaxCheck('app-bundle-a.min.js');
  const checkB = syntaxCheck('app-bundle-b.min.js');
  if (!checkA.ok || !checkB.ok) {
    console.error('\n❌ BUILD GAGAL — ada syntax error:');
    if (!checkA.ok) console.error('app-bundle-a.min.js:\n' + checkA.error);
    if (!checkB.ok) console.error('app-bundle-b.min.js:\n' + checkB.error);
    console.error('\nBundle di atas TIDAK ditimpa dgn versi rusak akan tetap ada di disk — cek source-nya dulu sebelum upload.');
    process.exit(1);
  }
  console.log('✓ Sintaks kedua bundle valid (node --check lolos)');
  const AUTOGEN_MARKER =
    '<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.\n' +
    '     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->\n';
  const productionContent = readFile('index.html').replace('<head>', '<head>\n' + AUTOGEN_MARKER);
  if (readFile('app_production.html') !== productionContent) {
    writeFile('app_production.html', productionContent);
    console.log('\n✓ app_production.html ditulis ulang jadi cermin index.html (+ penanda AUTO-GENERATED).');
  } else {
    console.log('\n✓ index.html & app_production.html sudah sinkron.');
  }
  console.log(`\n✅ Build "${newVersion}" selesai & lolos cek sintaks. Siap di-upload (jangan lupa upload SEMUA file yang berubah, bukan cuma HTML).`);
  try {
    const { main: generateFileMap } = require('./generate-file-map');
    generateFileMap();
  } catch (e) {
    console.log(`\n⚠️  FILE-MAP.md gagal digenerate ulang (non-fatal, build tetap lanjut): ${e.message}`);
  }
  try {
    const { main: generateCoveragePerModule } = require('./generate-coverage-per-module');
    generateCoveragePerModule();
  } catch (e) {
    console.log(`\n⚠️  COVERAGE-PER-MODULE.md gagal digenerate ulang (non-fatal, build tetap lanjut): ${e.message}`);
  }
  if (!resA.minified) {
    console.log(
      '\nCatatan: esbuild belum terpasang di environment ini, jadi bundle di atas belum diminify\n' +
      '(ukurannya lebih besar dari build sebelumnya, tapi 100% valid & aman dipakai).\n' +
      'Kalau mau ukuran sekecil versi lama, jalankan sekali (butuh internet):\n' +
      '  npm install --save-dev esbuild\n' +
      'lalu jalankan ulang "node build.js" — otomatis kepakai kalau terdeteksi ada.'
    );
  }
}
main();
