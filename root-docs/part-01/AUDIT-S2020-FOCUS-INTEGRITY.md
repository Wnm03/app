# AUDIT S2020 — Focus Integrity / Context Hardening

## Temuan audit

S2019 sudah memisahkan Session → Component, tetapi audit lebih dalam menemukan empat gap UI/state:

1. **Filter komponen manual dapat meninggalkan focus lama.** Jika user berpindah dari komponen A ke B, resolver focus S2019 masih dapat membawa A.
2. **Label SOT pada Riwayat masih membaca `serviceComponentId` row utama.** Pada multi-checklist, row utama dapat mewakili checklist pertama sementara user sedang melihat checklist kedua.
3. **Integrity Audit S2018 masih menghitung komponen pertama (`checklist[0]`)**, sehingga status Audit dapat berbeda dengan komponen yang diberi tanda fokus oleh S2019.
4. **Context S2018 dan S2019 dapat tampil bersamaan**, sehingga UI memiliki dua context block untuk satu tab.

## Perbaikan S2020

- Menjadikan perubahan filter komponen sebagai perubahan **focus context**.
- Mengosongkan focus saat filter dihapus atau target tidak terdapat pada record aktif.
- Saat History dirender dalam focus component, `resolveCanonicalServiceSelection()` sementara diproyeksikan ke checklist component yang sedang difokuskan; data sumber tidak diubah.
- Audit Integrity dihitung berdasarkan component focus yang sama dengan Riwayat/Reminder.
- Context/integrity block legacy S2018 dibersihkan ketika S2019 context aktif agar satu tab memiliki satu projection context.
- Semua perubahan read-only; tidak menulis ulang `D.servisLogs`.
- Service Worker dinaikkan ke `kw-cache-v2020` dan asset S2020 diprecache.

## Invariant

```text
Session = parent context
Component = navigation identity
History = evidence projection
Reminder = policy projection
Audit = identity + policy + integrity explanation
```

Untuk satu sesi dengan banyak checklist:

```text
Session #1
 ├─ Component A → History A / Reminder A / Audit A
 ├─ Component B → History B / Reminder B / Audit B
 └─ Component C → History C / Reminder C / Audit C
```

## Batas aman

Tidak dilakukan:

- penghapusan histori;
- split/merge histori;
- perubahan sessionId;
- perubahan serviceComponentId pada data lama;
- pembuatan reminder baru;
- perubahan finance/stock;
- SOT baru.

## Rekomendasi lanjutan

S2020 menutup **context correctness**. Audit berikutnya yang layak dipertimbangkan adalah `Evidence Identity`: jika satu checklist item memiliki foto, kondisi, biaya, part, atau teknisi yang berbeda, identitas evidence sebaiknya dapat ditelusuri sampai `historyId + checklistItemId`. Itu sebaiknya diaudit terpisah dan belum diubah pada S2020.
