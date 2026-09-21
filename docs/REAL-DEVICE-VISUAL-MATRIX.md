# S1900 Real-Device Visual Matrix

Tujuan: verifikasi visual nyata untuk regresi mobile yang tidak dapat dibuktikan hanya dari Node/DOM tests.

## Matrix

| Device/viewport | Orientation | Shop | Uang Mobil | Pajak & Zakat | Keyboard | Modal/Drawer | Offline | Light/Dark |
|---|---|---|---|---|---|---|---|---|
| 360x800 | Portrait | □ | □ | □ | □ | □ | □ | □ |
| 390x844 | Portrait | □ | □ | □ | □ | □ | □ | □ |
| 430x932 | Portrait | □ | □ | □ | □ | □ | □ | □ |
| tablet | Portrait | □ | □ | □ | □ | □ | □ | □ |
| tablet | Landscape | □ | □ | □ | □ | □ | □ | □ |
| phone | Landscape | □ | □ | □ | □ | □ | □ | □ |

## Interaction checklist

- Open/close bottom navigation.
- Switch every domain tab.
- Open Quick Settings.
- Open and close modal/drawer repeatedly (50 cycles).
- Open keyboard in Kasir/search/form and verify no content/FAB is obscured.
- Rotate portrait → landscape → portrait.
- Use long product/customer/vehicle names and very large numbers.
- Toggle online/offline while a local workflow is open.
- Verify no horizontal page scroll is introduced.
- Verify focus-visible with hardware keyboard/accessibility navigation.

This matrix is a manual/device gate. Node tests only verify that the matrix and structural contracts exist; they do not claim real-device visual PASS.
