# AUDIT S2022 — Evidence Lifecycle & Component Isolation

Baseline: cumulative S2009–S2021.

## Tujuan

Memastikan evidence komponen pada satu service session tidak bocor ke komponen lain, tanpa mengubah `servisLogs`, transaksi finance, stok, foto, atau schema lama.

## Temuan kode nyata

1. Checklist snapshot yang dipersist sudah membawa evidence per komponen, antara lain `conditionResult`, `conditionNote`, `costBreakdown`, `catalogPartRefs`, `usedPartId`, `usedPartQty`, dan pada jalur checklist juga `photos`/`foto`.
2. History row tetap memiliki field session/history-level seperti `cost`, `foto`, `note`, `accountId`, dan `txLinkId`.
3. Saat multi-checklist dipersist, biaya komponen sudah mempunyai sumber `component` melalui `costBreakdown`; total sesi juga diproyeksikan terpisah.
4. `txLinkId` tetap berada pada history/session linkage. S2022 tidak mengklaim transaksi sebagai milik component tertentu.
5. S2019 tetap menjadi SOT enumerasi component. S2021 tetap menjadi identity layer. S2022 hanya membuat projection lifecycle di atas keduanya.

## Klasifikasi ownership

- `component-owned`: evidence berada pada checklist snapshot komponen.
- `attributable-single-component`: history hanya mempunyai satu component sehingga field history-level dapat diatribusikan tanpa pembagian nilai.
- `history-level`: evidence tidak cukup spesifik untuk component.
- `none`: tidak ada evidence.

## Guardrail

S2022 TIDAK:

- memindahkan `foto` history menjadi foto component;
- membagi `cost` ke beberapa component;
- memindahkan `txLinkId` ke component;
- melakukan legacy backfill;
- mengubah import/export;
- mengubah schema `servisLogs`;
- membuat transaksi finance baru;
- membuat SOT baru.

## UI

Audit tab mendapatkan blok `Evidence lifecycle` read-only untuk component fokus. Blok memperlihatkan status checklist, kondisi, foto, biaya, part, catatan, dan finance serta memberi tanda bila scope masih history-level.

## Status

**Aman untuk satu tahap additive/read-only.** Perubahan persistence/model ditahan untuk tahap terpisah.
