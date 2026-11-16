# AB ihale kazananları: radyatör, havlupan ve tesisat işleri

TED (AB resmi ihale bülteni) sözleşme sonuç ilanlarından, ısıtma/radyatör/sıhhi tesisat işlerini kazanan firmaları her pazartesi otomatik toplar ve puanlar.

- Panel: `docs/index.html` (GitHub Pages ile yayınlanır)
- Veri: `docs/data.json` (haftalık güncellenir)
- Puanlama ve TED sorgusu: `lib/ted.js`
- Zamanlama: `.github/workflows/weekly.yml` (Pazartesi 07:00 İstanbul). Elle çalıştırmak için Actions > "Haftalik TED guncellemesi" > Run workflow.
