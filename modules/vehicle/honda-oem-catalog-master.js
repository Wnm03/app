// honda-oem-catalog-master.js — canonical READ-ONLY adapter for Honda parts-catalog text.
// Tidak menulis D/VehicleCatalog/IDBStore. Sumber tetap PDF/text hasil extract.
// Tujuan: normalisasi metadata OEM katalog (kode unik, nama, blok, halaman,
// ref relatif) tanpa mengklaim bahwa catalogBlock otomatis menjadi kategori servis.

const HONDA_OEM_CODE_RE = /\b[A-Z0-9]{4,6}-[A-Z0-9]{2,4}-[A-Z0-9]{3}\b/;
const HONDA_CATALOG_BLOCK_RE = /^\s*(E-\d{1,2}(?:-\d{1,2})?)\s+(.+?)\s*$/i;
const HONDA_PART_ROW_RE = /^\s*(?:(\d{1,3})\s+)?(\S+)\s+(.+?)\s*$/;

function hondaOemCatalogCleanDescription(s) {
  return String(s || '')
    .replace(/\s*\.{3,}.*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+$/, '')
    .trim();
}

function hondaOemCatalogParse(text, opts) {
  opts = opts || {};
  const pages = String(text || '').split('\f');
  const startPage = Number.isInteger(opts.startPage) ? opts.startPage : 34;
  const endPage = Number.isInteger(opts.endPage) ? opts.endPage : 94;
  const byCode = new Map();
  let block = '';
  let blockName = '';

  for (let pageNo = startPage; pageNo <= endPage && pageNo <= pages.length; pageNo++) {
    const lines = pages[pageNo - 1].split(/\r?\n/);
    for (const rawLine of lines) {
      const line = String(rawLine || '').trimEnd();
      const blockMatch = line.match(HONDA_CATALOG_BLOCK_RE);
      if (blockMatch && /^E-\d/.test(blockMatch[1])) {
        const candidate = blockMatch[2].trim();
        // Hindari menangkap heading navigasi/fragmen yang bukan judul blok.
        if (candidate && candidate.length <= 80 && !/^(No\.|Kode|Jumlah|Ref|Deskripsi)$/i.test(candidate)) {
          block = blockMatch[1].toUpperCase();
          blockName = candidate.replace(/\s{2,}/g, ' ').trim();
        }
      }

      const partMatch = line.match(HONDA_PART_ROW_RE);
      if (!partMatch) continue;
      const refNo = partMatch[1] ? Number(partMatch[1]) : null;
      const code = partMatch[2].toUpperCase();
      if (!HONDA_OEM_CODE_RE.test(code)) continue;
      const description = hondaOemCatalogCleanDescription(partMatch[3]);

      const existing = byCode.get(code);
      if (!existing) {
        byCode.set(code, {
          oemCode: code,
          partName: description,
          catalogBlock: block,
          catalogBlockName: blockName,
          catalogRefNo: refNo,
          sourcePage: pageNo,
          source: 'Honda Vario Techno 125 parts catalog 2013',
          occurrenceCount: 1,
        });
      } else {
        existing.occurrenceCount += 1;
      }
    }
  }
  return Array.from(byCode.values());
}

function hondaOemCatalogStats(items) {
  const list = Array.isArray(items) ? items : [];
  const blocks = new Set(list.map(x => x.catalogBlock).filter(Boolean));
  return {
    uniqueOemCount: list.length,
    blockCount: blocks.size,
    occurrenceCount: list.reduce((n, x) => n + (Number(x.occurrenceCount) || 0), 0),
  };
}

const HondaOemCatalogMaster = {
  parse: hondaOemCatalogParse,
  stats: hondaOemCatalogStats,
};
if (typeof window !== 'undefined') window.HondaOemCatalogMaster = HondaOemCatalogMaster;
