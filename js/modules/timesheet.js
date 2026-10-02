/* ================================================================
   modules/timesheet.js
   Features: Check-in/out, view sessions, worklog per day,
             calculate work summary, export CSV
   ================================================================ */

const Timesheet = (() => {

  // ── Business logic ────────────────────────────────────────────────
  /**
   * calculateWorkSummary(sessions, rules)
   * sessions: array of {check_in_at, check_out_at}
   * rules: {std_hours_per_day: 8, ot_start_hour: 18, weekend_coeff: 1.5}
   * returns: {total_ms, ot_ms, sessions_with_issues}
   */
  function calculateWorkSummary(sessions, rules = {}) {
    const stdMs  = (rules.std_hours_per_day ?? 8) * 3600000;
    let total_ms = 0;
    let ot_ms    = 0;
    const issues = [];

    sessions.forEach(s => {
      if (!s.check_out_at) {
        issues.push({ id: s.id, issue: 'missing_checkout' });
        return;
      }
      const dur = msDiff(s.check_in_at, s.check_out_at);
      if (dur < 0) {
        issues.push({ id: s.id, issue: 'checkout_before_checkin' });
        return;
      }
      total_ms += dur;

      // Simple OT: anything beyond std_hours_per_day across all sessions in a day
      const day = toVNDate(s.check_in_at);
      const isWeekend = [0, 6].includes(new Date(s.check_in_at).getDay());
      if (isWeekend) ot_ms += dur; // whole session is OT on weekends
    });

    // OT = total beyond standard
    if (!ot_ms && total_ms > stdMs) ot_ms = total_ms - stdMs;

    return { total_ms, ot_ms, sessions_with_issues: issues };
  }

  // ── Check-in ──────────────────────────────────────────────────────
  async function checkIn() {
    const existing = (await DB.getAll('sessions')).find(s => !s.check_out_at);
    if (existing) {
      toast('Bạn đang có phiên chưa check-out!', 'error');
      return null;
    }
    const session = {
      id: genId(),
      check_in_at: new Date().toISOString(),
      check_out_at: null,
      source: 'web',
      created_at: new Date().toISOString(),
    };
    await DB.put('sessions', session);
    toast('Check-in thành công!', 'success');
    return session;
  }

  // ── Check-out ─────────────────────────────────────────────────────
  async function checkOut() {
    const sessions = await DB.getAll('sessions');
    const open = sessions.find(s => !s.check_out_at);
    if (!open) {
      toast('Không có phiên nào đang mở!', 'error');
      return null;
    }
    open.check_out_at = new Date().toISOString();
    await DB.put('sessions', open);
    const dur = msDiff(open.check_in_at, open.check_out_at);
    toast(`Check-out! Thời gian: ${fmtDurationHuman(dur)}`, 'success');
    return open;
  }

  // ── Render ────────────────────────────────────────────────────────
  async function render(container) {
    const [sessions, worklogs] = await Promise.all([
      DB.getAll('sessions'),
      DB.getAll('worklogs'),
    ]);

    const openSession = sessions.find(s => !s.check_out_at);
    const checkinDur  = openSession ? Date.now() - new Date(openSession.check_in_at).getTime() : 0;

    const todaySess = sessions
      .filter(s => toVNDate(s.check_in_at) === todayVN())
      .sort((a,b) => b.check_in_at.localeCompare(a.check_in_at));

    const summary = calculateWorkSummary(
      sessions.filter(s => s.check_in_at >= thisWeekRange().start)
    );

    // Month selector
    const monthOpts = (() => {
      const months = new Set(sessions.map(s => s.check_in_at.slice(0,7)));
      months.add(currentMonth());
      return [...months].sort().reverse();
    })();

    container.innerHTML = `
      <div class="page-header">
        <h2>Timesheet</h2>
        <div class="action-bar">
          <button class="btn-secondary" id="ts-export-btn"><i class="bi bi-download"></i> Xuất CSV</button>
        </div>
      </div>

      <!-- Check-in widget -->
      <div class="panel mb-4">
        <div class="panel-body text-center py-4">
          ${openSession ? `
            <div class="badge-pill badge-success mb-2"><i class="bi bi-circle-fill"></i> Đang làm việc</div>
            <div class="timer-display" id="ts-timer">${fmtDuration(checkinDur)}</div>
            <div class="text-muted small my-2">Check-in lúc ${fmtTime(openSession.check_in_at)}</div>
            <div class="d-flex gap-3 justify-content-center mt-3">
              <button class="checkin-btn out" style="max-width:180px" id="ts-checkout-btn">
                <i class="bi bi-stop-circle-fill"></i> Check-out
              </button>
            </div>
          ` : `
            <div class="badge-pill badge-muted mb-3"><i class="bi bi-circle"></i> Chưa check-in</div>
            <br>
            <button class="checkin-btn in" id="ts-checkin-btn">
              <i class="bi bi-play-circle-fill"></i> Check-in ngay
            </button>
          `}
        </div>
      </div>

      <!-- Summary row -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">Tuần này</div>
            <div class="stat-value text-primary">${fmtDurationHuman(summary.total_ms)}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">OT tuần này</div>
            <div class="stat-value text-warning">${fmtDurationHuman(summary.ot_ms)}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">Phiên hôm nay</div>
            <div class="stat-value">${todaySess.length}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">Cảnh báo</div>
            <div class="stat-value text-danger">${summary.sessions_with_issues.length}</div>
          </div>
        </div>
      </div>

      <!-- Month filter + session list -->
      <div class="panel mb-4">
        <div class="panel-header">
          <span class="panel-title">Lịch sử phiên làm việc</span>
          <select class="form-ctrl" id="ts-month-sel" style="width:auto">
            ${monthOpts.map(m => `<option value="${m}"${m === currentMonth() ? ' selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div id="ts-session-list" class="panel-body p-0"></div>
      </div>

      <!-- Worklog section -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Worklog hôm nay</span>
          <button class="btn-primary btn-sm" id="ts-wl-add-btn"><i class="bi bi-plus"></i> Thêm</button>
        </div>
        <div id="ts-wl-list" class="panel-body p-0"></div>
        <!-- Add worklog form (hidden by default) -->
        <div id="ts-wl-form" class="panel-body d-none" style="border-top:1px solid var(--clr-border)">
          <div class="form-group">
            <label class="form-label">Nội dung (Markdown)</label>
            <textarea id="ts-wl-content" class="form-ctrl" rows="4" placeholder="- Hoàn thành UI Dashboard&#10;- Fix bug login..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tags (cách nhau bằng dấu phẩy)</label>
            <input id="ts-wl-tags" class="form-ctrl" placeholder="frontend, bugfix" />
          </div>
          <div class="action-bar">
            <button class="btn-primary" id="ts-wl-save-btn"><i class="bi bi-check2"></i> Lưu</button>
            <button class="btn-secondary" id="ts-wl-cancel-btn">Hủy</button>
          </div>
        </div>
      </div>
    `;

    // Render sessions for selected month
    async function renderSessionList(month) {
      const { start, end } = monthRange(month);
      const filtered = sessions
        .filter(s => s.check_in_at >= start && s.check_in_at <= end)
        .sort((a,b) => b.check_in_at.localeCompare(a.check_in_at));

      const listEl = el('ts-session-list');
      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i><p>Không có phiên nào tháng ${month}</p></div>`;
        return;
      }
      listEl.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>Ngày</th><th>Check-in</th><th>Check-out</th><th>Thời lượng</th><th>Nguồn</th><th></th></tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const dur = s.check_out_at ? fmtDurationHuman(msDiff(s.check_in_at, s.check_out_at)) : '—';
                const isOpen = !s.check_out_at;
                return `<tr>
                  <td>${fmtDateShort(s.check_in_at)}</td>
                  <td>${fmtTime(s.check_in_at)}</td>
                  <td>${isOpen ? `<span class="badge-pill badge-success">đang mở</span>` : fmtTime(s.check_out_at)}</td>
                  <td>${isOpen ? '—' : dur}</td>
                  <td><span class="badge-pill badge-muted">${sanitize(s.source || 'web')}</span></td>
                  <td>
                    <button class="btn-icon" data-del-session="${sanitize(s.id)}" title="Xóa"><i class="bi bi-trash3"></i></button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }

    await renderSessionList(currentMonth());

    el('ts-month-sel')?.addEventListener('change', e => renderSessionList(e.target.value));

    // ── Check-in/out events ───────────────
    let elapsed = checkinDur;
    let tick;
    if (openSession) {
      const timerEl = el('ts-timer');
      tick = setInterval(() => {
        elapsed += 1000;
        if (timerEl) timerEl.textContent = fmtDuration(elapsed);
        else clearInterval(tick);
      }, 1000);

      el('ts-checkout-btn')?.addEventListener('click', async () => {
        clearInterval(tick);
        await checkOut();
        await render(container);
      });
    } else {
      el('ts-checkin-btn')?.addEventListener('click', async () => {
        await checkIn();
        await render(container);
      });
    }

    // ── Delete session ────────────────────
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-del-session]');
      if (!btn) return;
      if (!confirm('Xóa phiên làm việc này?')) return;
      await DB.del('sessions', btn.dataset.delSession);
      await render(container);
    }, { once: true });

    // ── Worklog ───────────────────────────
    async function renderWlList() {
      const todayWls = worklogs
        .filter(w => w.date === todayVN())
        .sort((a,b) => b.created_at.localeCompare(a.created_at));

      const listEl = el('ts-wl-list');
      if (!listEl) return;
      listEl.innerHTML = todayWls.length === 0
        ? `<div class="empty-state"><i class="bi bi-pencil-square"></i><p>Chưa có worklog hôm nay</p></div>`
        : todayWls.map(w => `
          <div class="item-row">
            <div class="item-row-body">
              <div class="wl-content">${mdToHtml(w.content)}</div>
              ${w.tags?.length ? `<div class="mt-1">${w.tags.map(t => `<span class="badge-pill badge-primary me-1">${sanitize(t)}</span>`).join('')}</div>` : ''}
              <div class="item-row-sub mt-1">${fmtTime(w.created_at)}</div>
            </div>
            <div class="item-row-actions">
              <button class="btn-icon" data-del-wl="${sanitize(w.id)}" title="Xóa"><i class="bi bi-trash3"></i></button>
            </div>
          </div>
        `).join('');

      // delete wl events
      listEl.querySelectorAll('[data-del-wl]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Xóa worklog này?')) return;
          await DB.del('worklogs', btn.dataset.delWl);
          worklogs.splice(worklogs.findIndex(w => w.id === btn.dataset.delWl), 1);
          await renderWlList();
        });
      });
    }

    await renderWlList();

    el('ts-wl-add-btn')?.addEventListener('click', () => {
      el('ts-wl-form')?.classList.toggle('d-none');
      el('ts-wl-content')?.focus();
    });

    el('ts-wl-cancel-btn')?.addEventListener('click', () => {
      el('ts-wl-form')?.classList.add('d-none');
    });

    el('ts-wl-save-btn')?.addEventListener('click', async () => {
      const content = el('ts-wl-content')?.value.trim();
      if (!content) { toast('Nội dung không được trống', 'error'); return; }
      const tagsRaw = el('ts-wl-tags')?.value.trim();
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
      const wl = {
        id: genId(),
        date: todayVN(),
        content,
        tags,
        created_at: new Date().toISOString(),
      };
      await DB.put('worklogs', wl);
      worklogs.push(wl);
      el('ts-wl-content').value = '';
      el('ts-wl-tags').value = '';
      el('ts-wl-form')?.classList.add('d-none');
      toast('Đã lưu worklog!', 'success');
      await renderWlList();
    });

    // ── Export CSV ────────────────────────
    el('ts-export-btn')?.addEventListener('click', async () => {
      const month = el('ts-month-sel')?.value || currentMonth();
      const { start, end } = monthRange(month);
      const filtered = sessions
        .filter(s => s.check_in_at >= start && s.check_in_at <= end)
        .sort((a,b) => a.check_in_at.localeCompare(b.check_in_at));

      const rows = [
        ['Ngày', 'Check-in', 'Check-out', 'Thoi luong (phut)', 'Nguon'],
        ...filtered.map(s => [
          toVNDate(s.check_in_at),
          fmtTime(s.check_in_at),
          s.check_out_at ? fmtTime(s.check_out_at) : '',
          s.check_out_at ? Math.floor(msDiff(s.check_in_at, s.check_out_at) / 60000) : '',
          s.source || 'web',
        ])
      ];
      downloadCSV(rows, `timesheet-${month}.csv`);
    });
  }

  return { render, checkIn, checkOut, calculateWorkSummary };
})();
