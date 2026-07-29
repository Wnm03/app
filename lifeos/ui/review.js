// ui/review.js — render lewat review-adapter.js; aksi mulai/selesai sesi
// review HANYA lewat services/review-service.js.

const LifeOSReview = {
  render() {
    const el = document.getElementById('lifeOSReviewPanel');
    if (!el) return;
    const store = lifeOSGetStore();
    const snapshots = reviewAdapterLatestSnapshots(D);
    const weeklyOverdue = reviewAdapterIsOverdue(store, 'weekly', 7);
    const monthlyOverdue = reviewAdapterIsOverdue(store, 'monthly', 30);

    el.innerHTML = `
      <div class="lifeos-review-nudge">
        ${weeklyOverdue ? '<div class="lifeos-review-badge">Weekly Review jatuh tempo</div>' : ''}
        ${monthlyOverdue ? '<div class="lifeos-review-badge">Monthly Review jatuh tempo</div>' : ''}
      </div>
      <div class="lifeos-review-snapshot">
        ${snapshots.wealth ? `<div>Kekayaan terakhir: ${escapeHtml(String(snapshots.wealth.netWorth ?? ''))}</div>` : ''}
        ${snapshots.lifeBalance ? `<div>Skor Hidup Seimbang terakhir tercatat</div>` : ''}
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:4px" data-action="LifeOSReview.startWeekly">🔁 Mulai Weekly Review</button>
    `;
  },

  async startWeekly() {
    const periodKey = `weekly-${new Date().toISOString().slice(0, 10)}`;
    await reviewServiceStartSession('weekly', periodKey);
    LifeOSReview.render();
  },
};
