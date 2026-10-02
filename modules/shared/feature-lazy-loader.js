// feature-lazy-loader.js — S2253 safe residency loader.
// Feature-only vehicle scanner/catalog-import modules are loaded on demand.
// Uses the existing CSP-aware _loadScriptOnce() loader; no eval/import() and
// no new storage/SOT contract. Loading order is explicit because these legacy
// modules communicate through window/global function namespaces.
const VEHICLE_CATALOG_FEATURE_SCRIPTS = [
  'modules/vehicle/vehicle-scanner.js',
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
];
let _vehicleCatalogFeatureLoadPromise = null;
function ensureVehicleCatalogFeatureScripts() {
  if (_vehicleCatalogFeatureLoadPromise) return _vehicleCatalogFeatureLoadPromise;
  _vehicleCatalogFeatureLoadPromise = (async () => {
    for (const src of VEHICLE_CATALOG_FEATURE_SCRIPTS) {
      await _loadScriptOnce(src);
    }
    return true;
  })().catch((err) => {
    _vehicleCatalogFeatureLoadPromise = null;
    throw err;
  });
  return _vehicleCatalogFeatureLoadPromise;
}
if (typeof window !== 'undefined') window.ensureVehicleCatalogFeatureScripts = ensureVehicleCatalogFeatureScripts;


// S2258: Honda PDF catalog/import pipeline is feature-only. Keep the complete
// dependency order behind the existing CSP-aware loader so no PDF module is
// resident in GROUP_B until the catalog/import feature is actually opened.
const HONDA_PDF_FEATURE_SCRIPTS = [
  'modules/vehicle/honda-pdf-catalog-auto-import.js',
  'modules/vehicle/honda-pdf-import.js',
  'modules/vehicle/honda-pdf-import-extract.js',
  'modules/vehicle/honda-pdf-import-parse.js',
  'modules/vehicle/honda-pdf-import-commit.js',
  'modules/vehicle/honda-pdf-import-ui.js',
];
let _hondaPdfFeatureLoadPromise = null;
function ensureHondaPdfImportScripts() {
  if (_hondaPdfFeatureLoadPromise) return _hondaPdfFeatureLoadPromise;
  _hondaPdfFeatureLoadPromise = (async () => {
    if (typeof ensureVehicleCatalogFeatureScripts === 'function') {
      await ensureVehicleCatalogFeatureScripts();
    }
    for (const src of HONDA_PDF_FEATURE_SCRIPTS) await _loadScriptOnce(src);
    return true;
  })().catch((err) => {
    _hondaPdfFeatureLoadPromise = null;
    throw err;
  });
  return _hondaPdfFeatureLoadPromise;
}
if (typeof window !== 'undefined') window.ensureHondaPdfImportScripts = ensureHondaPdfImportScripts;


// S2262: Data Health is a diagnostic-only surface. It is opened explicitly
// from the Settings/maintenance UI and is not required by normal runtime.
// Keep its large cross-domain scan out of eager GROUP_B while preserving the
// existing global runDataHealthCheck/DataHealth API after demand load.
const DATA_HEALTH_FEATURE_SCRIPTS = [
  'data-health-check.js',
];
let _dataHealthFeatureLoadPromise = null;
function ensureDataHealthScripts() {
  if (_dataHealthFeatureLoadPromise) return _dataHealthFeatureLoadPromise;
  _dataHealthFeatureLoadPromise = (async () => {
    for (const src of DATA_HEALTH_FEATURE_SCRIPTS) await _loadScriptOnce(src);
    return true;
  })().catch((err) => {
    _dataHealthFeatureLoadPromise = null;
    throw err;
  });
  return _dataHealthFeatureLoadPromise;
}
if (typeof window !== 'undefined') window.ensureDataHealthScripts = ensureDataHealthScripts;

// S2264: report PDF/image export is an explicit user action. Keep the
// report builder out of eager GROUP_B; its data dependencies remain eager.
const LAPORAN_EXPORT_FEATURE_SCRIPTS = [
  'laporan-export.js',
];
let _laporanExportFeatureLoadPromise = null;
function ensureLaporanExportScripts() {
  if (_laporanExportFeatureLoadPromise) return _laporanExportFeatureLoadPromise;
  _laporanExportFeatureLoadPromise = (async () => {
    for (const src of LAPORAN_EXPORT_FEATURE_SCRIPTS) await _loadScriptOnce(src);
    return true;
  })().catch((err) => {
    _laporanExportFeatureLoadPromise = null;
    throw err;
  });
  return _laporanExportFeatureLoadPromise;
}
if (typeof window !== 'undefined') window.ensureLaporanExportScripts = ensureLaporanExportScripts;


// S2266: Shop PDF import UI is only needed when the user explicitly opens
// the supplier-PDF importer. VehicleCatalogImport remains behind its existing
// feature loader, so load that dependency first and then the Shop UI layer.
const SHOP_PDF_IMPORT_FEATURE_SCRIPTS = [
  'modules/business/shop-pdf-import-ui.js',
];
let _shopPdfImportFeatureLoadPromise = null;
function ensureShopPdfImportScripts() {
  if (_shopPdfImportFeatureLoadPromise) return _shopPdfImportFeatureLoadPromise;
  _shopPdfImportFeatureLoadPromise = (async () => {
    if (typeof ensureVehicleCatalogFeatureScripts === 'function') {
      await ensureVehicleCatalogFeatureScripts();
    }
    for (const src of SHOP_PDF_IMPORT_FEATURE_SCRIPTS) await _loadScriptOnce(src);
    return true;
  })().catch((err) => {
    _shopPdfImportFeatureLoadPromise = null;
    throw err;
  });
  return _shopPdfImportFeatureLoadPromise;
}
if (typeof window !== 'undefined') window.ensureShopPdfImportScripts = ensureShopPdfImportScripts;

