// insight-target-mingguan.js — S132: Insight Target Mingguan (kirim uang ke istri).
// Domain BARU, tapi 100% reuse data & fungsi yang sudah ada:
//   - Target = D.profile.kiriman (field "Kiriman Mingguan (Rp)" yang SUDAH ADA di
//     Pengaturan → Profil, dulu cuma dipakai di preview onboarding & AI context —
//     SEKARANG juga jadi dasar Insight ini. TIDAK ada field target baru dibuat,
//     supaya tidak ada 2 sumber kebenaran utk 1 angka yang sama).
//   - Periode Minggu–Sabtu = getWeekRange() (reset-gaji-mingguan.js) — SAMA PERSIS
//     definisi minggu yang sudah dipakai Payroll (Absensi Harian).
//   - Total gaji minggu ini = D.workDays milik minggu berjalan (SAMA PERSIS sumber
//     data yang dipakai Payroll.renderDashMini() utk "Estimasi Gaji Minggu Ini").
//   - Aktif/Nonaktif = D.profile.insightMingguanAktif (default true kalau belum
//     pernah diisi — field baru, HANYA toggle on/off, tidak ada engine gaji baru).
// TIDAK mengubah business logic Payroll/gaji sama sekali — modul ini murni BACA
// data yang sudah dihitung Payroll & menyimpulkan status/pesan.
// PENTING: file ini HARUS dimuat SETELAH reset-gaji-mingguan.js (butuh
// getWeekRange) & features-helpers-global-security.js (butuh D, fmtFull) — lihat
// urutan GROUP_B di scripts/build.js, ditaruh tepat setelah payroll-absensi.js/
// tukang-absensi.js (dependency logis: baca hasil Payroll, bukan mengubahnya).

const InsightTargetMingguan={
compute(now){
const target=(D.profile&&D.profile.kiriman)||0;
const {start,end}=getWeekRange(now||new Date());
end.setHours(23,59,59,999);
const thisWeek=(D.workDays||[]).filter(w=>{const d=new Date(w.date);return d>=start&&d<=end;});
const totalGaji=thisWeek.reduce((s,w)=>s+(w.total||0),0);
const selisih=totalGaji-target;
const progress=target>0?Math.round(totalGaji/target*100):0;
let status,pesan;
if(target<=0){
status='belum_diatur';
pesan='Atur dulu "Kiriman Mingguan (Rp)" di Pengaturan → Profil supaya insight ini bisa dihitung.';
} else if(selisih>=0){
status='tercapai';
pesan=selisih>0?('🎉 Sudah tercapai, malah surplus '+fmtFull(selisih)+'! Mantap kerja minggu ini.'):'🎉 Pas banget sama target kiriman minggu ini!';
} else {
status='kurang';
pesan='⏳ Masih kurang '+fmtFull(-selisih)+' dari target minggu ini. Semangat, masih ada waktu sampai Sabtu!';
}
return {target,totalGaji,progress,selisih,status,pesan,weekStart:start,weekEnd:end,hariCount:thisWeek.length};
},
isAktif(){
return !(D.profile&&D.profile.insightMingguanAktif===false);
},
render(){
const box=document.getElementById('dashInsightMingguanBox');
if(!box)return;
if(!InsightTargetMingguan.isAktif()){box.innerHTML='';return;}
const r=InsightTargetMingguan.compute();
if(r.status==='belum_diatur'){
box.innerHTML='<div class="u-fs11 u-t2" style="margin-top:8px;line-height:1.5">💡 '+escapeHtml(r.pesan)+'</div>';
return;
}
const pct=Math.max(0,Math.min(100,r.progress));
const barColor=r.status==='tercapai'?'var(--accent3)':'var(--accent4)';
const selisihLabel=r.selisih>=0?('Surplus '+fmtFull(r.selisih)):('Kurang '+fmtFull(-r.selisih));
const selisihColor=r.selisih>=0?'var(--accent3)':'var(--accent4)';
const statusLabel=r.status==='tercapai'?'✅ Tercapai':'⏳ Belum Tercapai';
box.innerHTML=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
<div class="u-flex u-jcb u-aic u-mb6"><span class="u-fs11 u-t2 u-fw700" style="text-transform:uppercase;letter-spacing:0.5px">🎯 Insight Target Mingguan</span><span class="u-fs11 u-fw700" style="color:${statusLabel.indexOf('✅')===0?'var(--accent3)':'var(--accent4)'}">${statusLabel}</span></div>
<div class="grid2 u-mb0" style="margin-bottom:8px">
<div class="stat-box"><div class="stat-label">Target Kiriman</div><div class="stat-val u-fs13" id="insMingguanTarget">${fmtFull(r.target)}</div></div>
<div class="stat-box"><div class="stat-label">Gaji Minggu Ini</div><div class="stat-val green u-fs13" id="insMingguanGaji">${fmtFull(r.totalGaji)}</div></div>
</div>
<div class="budget-bar-track" style="height:8px;margin-bottom:4px"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
<div class="u-flex u-jcb u-aic u-mb6"><span class="u-fs11 u-t2">${r.progress}% dari target</span><span class="u-fs11 u-fw700" style="color:${selisihColor}">${selisihLabel}</span></div>
<div class="u-fs11 u-t2" style="line-height:1.5">${escapeHtml(r.pesan)}</div>
</div>`;
}
};
