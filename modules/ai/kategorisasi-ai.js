// kategorisasi-ai.js — AI Auto-Kategorisasi Transaksi dari Catatan Bebas
// Dipindah ke modules/ai/kategorisasi-ai.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// FITUR BARU: saat user mengetik Keterangan transaksi bebas di Input Transaksi (mis. "bayar
// galon+beras warung"), modul ini menebak Kategori & Subkategori yang paling cocok — jauh lebih
// akurat dari sekadar keyword-matching yang sudah ada (CAT_EMOJI_GUESS/guessCategoryFromReceiptText
// di scan-ocr.js), yang cuma bisa menebak kalau NAMA kategori itu sendiri mengandung kata kuncinya
// (mis. kategori "Belanja Dapur" cocok krn ada kata "belanja"), bukan dari ISI belanjaan yang
// sebenarnya ditulis user (galon, beras, dst tidak ada di daftar keyword itu).
//
// ALUR:
//  1) onNoteInput() dipanggil tiap user mengetik. Instan (gratis, tanpa AI) coba tebakan lokal
//     lewat guessCategoryFromReceiptText() yang sudah ada, buat quick feedback kalau kebetulan cocok.
//  2) Debounce 750ms setelah user berhenti mengetik: kalau API key AI sudah diisi di Pengaturan
//     (dipakai bareng fitur AI lain — lihat callAIProviderRaw di
//     features-aiwidget-reminder-gdrive-search.js, SATU-SATUNYA tempat fetch ke Claude/Gemini),
//     kirim catatan + daftar kategori/subkategori MILIK USER SENDIRI ke AI, minta JSON kategori
//     paling cocok. AI cuma boleh pilih dari daftar yang ada (tidak boleh ngarang nama baru) —
//     supaya hasilnya selalu valid & bisa langsung dipakai.
//  3) Hasil ditampilkan sbg kotak saran non-intrusive (id="txCatAiSuggest") di bawah field
//     Keterangan, user tinggal tap "✅ Pakai" atau "✕ Abaikan". Tidak pernah auto-terapkan
//     tanpa persetujuan user.
//  4) Kalau user tap "Pakai", kata-kata kunci dari catatan itu "diajarkan" ke D.learnedItemCat
//     (kamus yang sama dipakai guessCategoryFromReceiptText utk Scan Struk) — jadi transaksi
//     serupa berikutnya bisa langsung ketebak dari heuristik lokal GRATIS, tanpa perlu panggil AI
//     lagi tiap kali.
// PENTING: file ini HARUS dimuat SETELAH kategori.js (getCatsByType) & scan-ocr.js
// (guessCategoryFromReceiptText) tapi urutan pemanggilan fungsi terjadi belakangan (event input
// user), jadi posisi di build.js cukup di GROUP_B setelah kategori.js.

const AutoKat = {
  _timer: null,
  _reqToken: 0,
  _lastNoteQueried: '',

  // Kata umum yang TIDAK dipakai sbg kata kunci belajar (terlalu generik, bisa nyasar ke kategori
  // manapun kalau dijadikan key — mis. "bayar" muncul di hampir semua catatan pengeluaran).
  STOPWORDS: new Set(['bayar','bayarin','beli','belanja','untuk','buat','dari','sama','dengan',
    'yang','ini','itu','hari','tadi','tolong','minta','order','pesan','bulan','biaya','buka',
    'sekalian','juga','lagi','masih','belum','sudah','buat','plus']),

  onNoteInput(){
    const noteEl = document.getElementById('txNote');
    const box = document.getElementById('txCatAiSuggest');
    if(!noteEl || !box) return;
    const text = noteEl.value.trim();
    clearTimeout(this._timer);
    if(text.length < 3){ this.hideSuggest(); return; }

    // 1) Tebakan lokal instan (gratis) — hanya kalau field Kategori masih kosong & tipe expense
    //    (guessCategoryFromReceiptText hanya menebak dari D.categories.expense).
    const catFieldEmpty = !(document.getElementById('txCat')||{}).value?.trim();
    if(curTxType==='expense' && catFieldEmpty && typeof guessCategoryFromReceiptText==='function'){
      const localCat = guessCategoryFromReceiptText(text);
      if(localCat){
        this.renderSuggest({categoryName:localCat.name, subName:null, emoji:localCat.emoji, source:'lokal', reasoning:null});
      } else {
        this.hideSuggest();
      }
    } else {
      this.hideSuggest();
    }

    // 2) Setelah user berhenti mengetik, minta tebakan AI yang lebih akurat (kalau API key ada)
    this._timer = setTimeout(()=>{ this.runAiSuggest(text); }, 750);
  },

  hideSuggest(){
    const box = document.getElementById('txCatAiSuggest');
    if(!box) return;
    box.classList.add('u-dnone');
    box.innerHTML='';
    delete box.dataset.catName;
    delete box.dataset.subName;
    delete box.dataset.note;
  },

  async runAiSuggest(text){
    if(!text || text.length < 4) return;
    if(text === this._lastNoteQueried) return;
    const apiKey = D.profile && D.profile.apiKey;
    if(!apiKey) return; // tanpa API key AI, cukup andalkan tebakan lokal (langkah 1) di atas
    this._lastNoteQueried = text;
    const myToken = ++this._reqToken;

    const type = (curTxType==='income') ? 'income' : 'expense';
    const cats = (typeof getCatsByType==='function') ? getCatsByType(type) : [];
    if(!cats || !cats.length) return;
    const catList = cats.map(c=>({kategori:c.name, subkategori:(c.subs||[]).map(s=>s.name)}));

    const systemPrompt =
      'Kamu asisten kategorisasi transaksi keuangan rumah tangga & bisnis kecil di Indonesia. '+
      'Tugas: dari catatan transaksi '+(type==='income'?'PEMASUKAN':'PENGELUARAN')+' yang ditulis bebas oleh user '+
      '(sering berisi beberapa barang belanjaan sekaligus, mis. "bayar galon+beras warung", atau singkatan/typo umum), '+
      'pilih SATU kategori & (kalau ada yang cocok) SATU subkategori yang PALING SESUAI, HANYA dari daftar kategori '+
      'milik user berikut — JANGAN membuat nama kategori baru di luar daftar ini:\n'+JSON.stringify(catList)+'\n\n'+
      'Balas HANYA dengan JSON valid, tanpa markdown/teks lain, format persis: '+
      '{"category":"<nama kategori PERSIS dari daftar, atau null kalau tidak ada yang cukup cocok>",'+
      '"subcategory":"<nama subkategori PERSIS dari daftar milik kategori itu, atau null>",'+
      '"confidence":"tinggi"|"sedang"|"rendah",'+
      '"alasan":"<alasan singkat 1 kalimat, bahasa Indonesia santai>"}';

    let res;
    try{
      res = await callAIProviderRaw(systemPrompt, [{role:'user', content:`Catatan transaksi: "${text}"`}], {maxTokens:300});
    }catch(e){ return; }
    if(myToken !== this._reqToken) return; // ada request lebih baru menyusul, buang hasil basi ini
    if(!res || !res.ok || !res.text) return; // gagal diam-diam, tidak ganggu user dgn error popup

    let parsed;
    try{
      const cleaned = res.text.replace(/```json|```/g,'').trim();
      parsed = JSON.parse(cleaned);
    }catch(e){ return; }
    if(!parsed || !parsed.category) return;

    const cat = cats.find(c=>c.name===parsed.category);
    if(!cat) return; // AI keluar dari daftar yang diizinkan -> abaikan drpd nyesatkan user
    const sub = parsed.subcategory ? (cat.subs||[]).find(s=>s.name===parsed.subcategory) : null;

    // Kalau field Keterangan sudah berubah lagi sejak request dikirim (user lanjut mengetik/hapus),
    // saran ini sudah basi — jangan ditampilkan supaya tidak membingungkan.
    const curNote = (document.getElementById('txNote')||{}).value?.trim();
    if(curNote !== text) return;

    this.renderSuggest({
      categoryName: cat.name,
      subName: sub ? sub.name : null,
      emoji: cat.emoji,
      source: 'ai',
      reasoning: parsed.alasan || null,
      note: text
    });
  },

  renderSuggest(info){
    const box = document.getElementById('txCatAiSuggest');
    if(!box) return;
    const label = info.source==='ai' ? '🤖 Saran AI' : '💡 Tebakan cepat';
    const subTxt = info.subName ? ` → ${escapeHtml(info.subName)}` : '';
    const reasonTxt = info.reasoning ? `<div style="font-size:11px;color:var(--text2);margin-top:3px">${escapeHtml(info.reasoning)}</div>` : '';
    box.dataset.catName = info.categoryName;
    box.dataset.subName = info.subName || '';
    box.dataset.note = info.note || '';
    box.innerHTML = `<div><b>${label}:</b> ${escapeHtml(info.emoji||'📦')} ${escapeHtml(info.categoryName)}${subTxt}</div>`+
      reasonTxt+
      `<div style="display:flex;gap:8px;margin-top:8px">`+
      `<button type="button" class="btn btn-primary btn-sm" style="flex:1;padding:8px" onclick="AutoKat.apply()">✅ Pakai</button>`+
      `<button type="button" class="btn btn-ghost btn-sm" style="flex:1;padding:8px" onclick="AutoKat.hideSuggest()">✕ Abaikan</button>`+
      `</div>`;
    box.classList.remove('u-dnone');
  },

  apply(){
    const box = document.getElementById('txCatAiSuggest');
    if(!box || !box.dataset.catName) return;
    const catName = box.dataset.catName;
    const subName = box.dataset.subName;
    const note = box.dataset.note;
    if(typeof selectTxCat==='function') selectTxCat(catName);
    else { const el=document.getElementById('txCat'); if(el) el.value=catName; }
    if(subName){
      const subEl=document.getElementById('txSubCat'); if(subEl) subEl.value=subName;
      if(typeof selectTxSubCat==='function') selectTxSubCat(subName);
    }
    this.learnFromNote(note, catName);
    this.hideSuggest();
    toast('✅ Kategori'+(subName?' & subkategori':'')+' terisi dari saran AI');
  },

  // "Ajari" heuristik lokal (D.learnedItemCat, dipakai bareng Scan Struk) dari kata-kata kunci di
  // catatan ini, supaya pola serupa ke depan bisa langsung ketebak GRATIS tanpa panggil AI lagi.
  // Beda dari learnCatFromItemName() bawaan (scan-ocr.js) yang cuma ambil 1 kata pertama —
  // di sini ambil beberapa kata sekaligus & buang kata generik (STOPWORDS), supaya kata kunci yang
  // tersimpan lebih spesifik & tidak gampang salah nebak transaksi lain yg tidak nyambung.
  learnFromNote(note, catName){
    if(!note || !catName) return;
    const words = String(note).toLowerCase()
      .replace(/[^a-z0-9\s]/g,' ')
      .split(/\s+/)
      .filter(w=>w.length>=4 && !this.STOPWORDS.has(w) && !/^\d+$/.test(w));
    if(!words.length) return;
    if(!D.learnedItemCat) D.learnedItemCat={};
    words.slice(0,4).forEach(w=>{ D.learnedItemCat[w]=catName; });
    if(typeof save==='function') save();
  }
};
