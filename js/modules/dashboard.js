/* ================================================================
   modules/dashboard.js — Dashboard page
   Shows: check-in status, work hours this week, expenses this month,
          unread bookmarks, recent clipboard, recent activity
   ================================================================ */

async function renderDashboard(container) {
  // Load all data in parallel
  const [sessions, expenses, bookmarks, clipItems] = await Promise.all([
    DB.getAll('sessions'),
    DB.getAll('expenses'),
    DB.getAll('bookmarks'),
    DB.getAll('clipboard'),
  ]);

  // ── Check-in status ───────────────────
  const openSession = sessions.find(s => !s.check_out_at);
  const checkinDuration = openSession
    ? Date.now() - new Date(openSession.check_in_at).getTime()
    : 0;

  // ── Weekly hours ──────────────────────
  const week = thisWeekRange();
  const weekSessions = sessions.filter(s =>
    s.check_in_at >= week.start && s.check_in_at <= week.end
  );
  let weekMs = 0;
  weekSessions.forEach(s => {
    const out = s.check_out_at || (openSession?.id === s.id ? new Date().toISOString() : null);
    if (out) weekMs += msDiff(s.check_in_at, out);
  });

  // ── Monthly expenses ──────────────────
  const mon = thisMonthRange();
  const monthExpenses = expenses.filter(e => e.spent_on >= mon.start.slice(0,10));
  const totalExp = monthExpenses.reduce((a, b) => a + (b.amount || 0), 0);

  // ── Unread bookmarks ──────────────────
  const unread = bookmarks.filter(b => b.status === 'unread').length;

  // ── Recent clipboard ──────────────────
  const recentClip = [...clipItems]
    .sort((a,b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  // ── Recent sessions (today) ───────────
  const today = todayVN();
  const todaySessions = sessions
    .filter(s => toVNDate(s.check_in_at) === today)
    .sort((a,b) => b.check_in_at.localeCompare(a.check_in_at));

  container.innerHTML = `
    <div class="page-header">
      <h2>Dashboard</h2>
      <span class="text-muted">${fmtDate(new Date().toISOString(), 'full')}</span>
    </div>

    <!-- Check-in big button -->
    <div class="text-center mb-4">
      ${openSession ? `
        <div class="mb-2">
          <span class="badge-pill badge-success"><i class="bi bi-circle-fill"></i> Đang làm việc</span>
        </div>
        <div class="timer-display mb-1" id="dash-timer">${fmtDuration(checkinDuration)}</div>
        <div class="text-muted small mb-3">Check-in lúc ${fmtTime(openSession.check_in_at)}</div>
        <button class="checkin-btn out" id="dash-checkout-btn">
          <i class="bi bi-stop-circle-fill"></i> Check-out
        </button>
      ` : `
        <div class="mb-3">
          <span class="badge-pill badge-muted"><i class="bi bi-circle"></i> Chưa check-in</span>
        </div>
        <button class="checkin-btn in" id="dash-checkin-btn">
          <i class="bi bi-play-circle-fill"></i> Check-in
        </button>
      `}
    </div>

    <!-- Stat cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-label"><i class="bi bi-clock"></i> Giờ làm tuần này</div>
          <div class="stat-value text-primary">${fmtDurationHuman(weekMs)}</div>
          <div class="stat-meta">${weekSessions.length} phiên</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-label"><i class="bi bi-wallet2"></i> Chi tiêu tháng này</div>
          <div class="stat-value text-warning">${fmtVND(totalExp)}</div>
          <div class="stat-meta">${monthExpenses.length} khoản</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-label"><i class="bi bi-bookmark"></i> Bookmark chưa đọc</div>
          <div class="stat-value text-purple" style="color:var(--clr-purple)">${unread}</div>
          <div class="stat-meta">${bookmarks.length} tổng cộng</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-label"><i class="bi bi-clipboard2"></i> Clipboard items</div>
          <div class="stat-value">${clipItems.length}</div>
          <div class="stat-meta">Đang lưu</div>
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="row g-3">
      <!-- Today sessions -->
      <div class="col-md-6">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title"><i class="bi bi-clock-history me-2"></i>Hôm nay</span>
            <a href="#/timesheet" class="btn-ghost btn-sm">Xem tất cả</a>
          </div>
          <div class="panel-body p-0">
            ${todaySessions.length === 0 ? `
              <div class="empty-state"><i class="bi bi-moon-stars"></i><p>Chưa có phiên nào hôm nay</p></div>
            ` : todaySessions.map(s => `
              <div class="item-row">
                <div class="item-row-icon bg-success bg-opacity-10" style="background:var(--clr-success-dim);color:var(--clr-success)">
                  <i class="bi bi-play-fill"></i>
                </div>
                <div class="item-row-body">
                  <div class="item-row-title">${fmtTime(s.check_in_at)} → ${s.check_out_at ? fmtTime(s.check_out_at) : '<span class="badge-pill badge-success">đang</span>'}</div>
                  <div class="item-row-sub">${s.check_out_at ? fmtDurationHuman(msDiff(s.check_in_at, s.check_out_at)) : 'Chưa check-out'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Recent clipboard -->
      <div class="col-md-6">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title"><i class="bi bi-clipboard2-pulse me-2"></i>Clipboard gần đây</span>
            <a href="#/clipboard" class="btn-ghost btn-sm">Xem tất cả</a>
          </div>
          <div class="panel-body p-0">
            ${recentClip.length === 0 ? `
              <div class="empty-state"><i class="bi bi-clipboard2"></i><p>Clipboard trống</p></div>
            ` : recentClip.map(c => `
              <div class="item-row">
                <div class="item-row-icon" style="background:var(--clr-primary-dim);color:var(--clr-primary)">
                  <i class="bi bi-${c.kind === 'link' ? 'link-45deg' : c.kind === 'image' ? 'image' : 'fonts'}"></i>
                </div>
                <div class="item-row-body">
                  <div class="item-row-title" style="max-width:240px">${sanitize(c.content.slice(0, 60))}${c.content.length > 60 ? '…' : ''}</div>
                  <div class="item-row-sub">${timeAgo(c.created_at)}</div>
                </div>
                <div class="item-row-actions">
                  <button class="btn-icon" onclick="copyToClipboard(${JSON.stringify(c.content)})" title="Copy"><i class="bi bi-copy"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Timer tick ────────────────────────
  if (openSession) {
    let elapsed = checkinDuration;
    const timerEl = el('dash-timer');
    const tick = setInterval(() => {
      elapsed += 1000;
      if (timerEl) timerEl.textContent = fmtDuration(elapsed);
      else clearInterval(tick);
    }, 1000);

    el('dash-checkout-btn')?.addEventListener('click', async () => {
      clearInterval(tick);
      await Timesheet.checkOut();
      await renderDashboard(container);
    });
  } else {
    el('dash-checkin-btn')?.addEventListener('click', async () => {
      await Timesheet.checkIn();
      await renderDashboard(container);
    });
  }
}
