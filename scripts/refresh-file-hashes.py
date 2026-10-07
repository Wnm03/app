#!/usr/bin/env python3
"""S256AU — sinkronkan FILE-HASHES-SHA256.txt dengan isi file sebenarnya.

Pemakaian (dari root proyek):
  python3 scripts/refresh-file-hashes.py --check   # exit 1 bila ada hash basi / path hilang
  python3 scripts/refresh-file-hashes.py --write   # tulis ulang hash; entri path hilang dibuang

Hanya mengelola path yang SUDAH terdaftar (tidak menambah file baru). Format tetap
kompatibel `sha256sum -c`: "<hash><dua spasi><path>". Jalankan --write setelah
`npm run build`: build menulis ulang bundle A/B, app_production.html, index.html, sw.js,
lima source berkonstanta versi, serta docs/FILE-MAP.md dan docs/COVERAGE-PER-MODULE.md.
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, 'FILE-HASHES-SHA256.txt')
LINE = re.compile(r'^([0-9a-f]{64})\s+\*?(.+)$')


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def main(argv):
    mode = argv[1] if len(argv) > 1 else '--check'
    if mode not in ('--check', '--write'):
        print('usage: refresh-file-hashes.py [--check|--write]')
        return 2
    rows, stale, missing = [], [], []
    with open(LIST, encoding='utf-8') as f:
        for raw in f:
            m = LINE.match(raw.rstrip('\n'))
            if not m:
                continue
            old, rel = m.groups()
            fp = os.path.join(ROOT, rel)
            if not os.path.isfile(fp):
                missing.append(rel)
                continue
            new = sha(fp)
            if new != old:
                stale.append(rel)
            rows.append((new, rel))
    print('entri ok=%d basi=%d hilang=%d' % (len(rows) - len(stale), len(stale), len(missing)))
    for p in stale:
        print('  BASI   ' + p)
    for p in missing:
        print('  HILANG ' + p)
    if mode == '--check':
        return 1 if (stale or missing) else 0
    with open(LIST, 'w', encoding='utf-8', newline='\n') as f:
        for h, rel in rows:
            f.write('%s  %s\n' % (h, rel))
    print('ditulis: %d entri' % len(rows))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
