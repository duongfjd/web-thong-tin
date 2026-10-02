/* ================================================================
   modules/expenses.js
   Features: Quick input ("cafe 35k"), categories, budgets,
             dashboard charts (CSS-only), alerts, CSV export
   ================================================================ */

async function renderExpenses(container) {
  let [expenses, categories, budgets] = await Promise.all([
    DB.getAll('expenses'),
    DB.getAll('categories'),
    DB.getAll('budgets'),
  ]);

  // Seed default categories if none
  if (categories.length === 0) {
    const defaults = [
      { id: genId(), name: 'Ăn uống',    color: '#3fb950', icon: 'bi-cup-hot' },
      { id: genId(), name: 'Di chuyển',  color: '#2f81f7', icon: 'bi-bicycle' },
      { id: genId(), name: 'Mua sắm',    color: '#bc8cff', icon: 'bi-bag' },
      { id: genId(), name: 'Hóa đơn',    color: '#f0883e', icon: 'bi-file-text' },
      { id: genId(), name: 'Giải trí',   color: '#d29922', icon: 'bi-controller' },
      { id: genId(), name: 'Khác',       color: '#8b949e', icon: 'bi-three-dots' },
    ];
    for (const c of defaults) await DB.put('categories', c);
    categories = defaults;
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  // ── Monthly data ──────────────────────
  const selMonth = currentMonth();
  const { start, end } = monthRange(selMonth);
  const monthExp = expenses
    .filter(e => e.spent_on >= start.slice(0,10) && e.spent_on <= end.slice(0,10))
    .sort((a,b) => b.spent_on.localeCompare(a.spent_on));
  const totalMonth = monthExp.reduce((s, e) => s + (e.amount || 0), 0);

  // Per category totals
  const catTotals = {};
  monthExp.forEach(e => {
    catTotals[e.category_id] = (catTotals[e.category_id] || 0) + e.amount;
  });

  // Budget alerts
  const monthBudgets = budgets.filter(b => b.month === selMonth);

  container.innerHTML = `
    <div class="page-header">
      <h2>Chi tiêu</h2>
      <div class="action-bar">
        <button class="btn-secondary" id="exp-export-btn"><i class="bi bi-download"></i> Xuất CSV</button>
        <button class="btn-secondary" id="exp-cat-btn"><i class="bi bi-tags"></i> Danh mục</button>
      </div>
    </div>

    <!-- Quick input -->
    <div class="quick-input-wrap mb-4">
      <div class="text-muted small mb-2 fw-600">Nhập nhanh: <code>"cafe 35k"</code>, <code>"xang 80000"</code>, <code>"net 1tr2"</code></div>
      <div class="quick-input-row">
        <input id="exp-quick" class="form-ctrl quick-input-big" placeholder='Ví dụ: "ca phe 25k"' />
        <select id="exp-quick-cat" class="form-ctrl" style="flex:0 0 auto;width:140px">
          ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <input id="exp-quick-date" type="date" class="form-ctrl" style="flex:0 0 auto;width:150px" value="${todayVN()}" />
        <button class="btn-primary" id="exp-quick-save"><i class="bi bi-plus-lg"></i> Thêm</button>
      </div>
    </div>

    <!-- Budget alerts -->
    <div id="exp-alerts" class="mb-3"></div>

    <!-- Summary + chart -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="stat-card h-100">
          <div class="stat-label">Tổng tháng ${selMonth}</div>
          <div class="stat-value text-warning">${fmtVND(totalMonth)}</div>
          <div class="stat-meta">${monthExp.length} khoản chi</div>
        </div>
      </div>
      <div class="col-md-8">
        <div class="panel h-100">
          <div class="panel-header"><span class="panel-title">Theo danh mục</span></div>
          <div class="panel-body">
            ${categories.map(c => {
              const amt = catTotals[c.id] || 0;
              const pct = totalMonth ? Math.round((amt / totalMonth) * 100) : 0;
              const budget = monthBudgets.find(b => b.category_id === c.id);
              const budgetPct = budget ? Math.min(Math.round((amt / budget.limit_vnd) * 100), 100) : null;
              const barClass = budgetPct >= 100 ? 'crit' : budgetPct >= 80 ? 'warn' : '';
              return `
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span style="color:${c.color}"><i class="bi ${c.icon} me-1"></i>${sanitize(c.name)}</span>
                    <span class="fw-600">${fmtVND(amt)} <span class="text-muted">(${pct}%)</span></span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill ${barClass}" style="width:${pct}%;background:${c.color}"></div>
                  </div>
                  ${budget ? `<div class="text-muted" style="font-size:11px">Ngân sách: ${fmtVND(budget.limit_vnd)} (còn ${fmtVND(Math.max(0, budget.limit_vnd - amt))})</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Expense list -->
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Danh sách chi tiêu</span>
        <select id="exp-month-sel" class="form-ctrl" style="width:auto">
          ${(() => {
            const months = new Set(expenses.map(e => e.spent_on.slice(0,7)));
            months.add(currentMonth());
            return [...months].sort().reverse().map(m => `<option value="${m}"${m===selMonth?' selected':''}>${m}</option>`).join('');
          })()}
        </select>
      </div>
      <div id="exp-list" class="panel-body p-0"></div>
    </div>
  `;

  // Render budget alerts
  function renderAlerts() {
    const alertsEl = el('exp-alerts');
    if (!alertsEl) return;
    const alerts = [];
    monthBudgets.forEach(b => {
      const spent = catTotals[b.category_id] || 0;
      const pct = b.limit_vnd ? Math.round((spent / b.limit_vnd) * 100) : 0;
      const cat = catMap[b.category_id];
      if (!cat) return;
      if (pct >= 100) alerts.push(`<div class="badge-pill badge-danger me-2 mb-2"><i class="bi bi-exclamation-triangle-fill"></i> ${sanitize(cat.name)}: Đã vượt ngân sách tháng (${fmtVND(spent)} / ${fmtVND(b.limit_vnd)})</div>`);
      else if (pct >= 80) alerts.push(`<div class="badge-pill badge-warning me-2 mb-2"><i class="bi bi-exclamation-circle-fill"></i> ${sanitize(cat.name)}: Đạt ${pct}% ngân sách (${fmtVND(spent)} / ${fmtVND(b.limit_vnd)})</div>`);
    });
    alertsEl.innerHTML = alerts.join('');
  }
  renderAlerts();

  // Render expense list
  async function renderExpList(month) {
    const { start, end } = monthRange(month);
    const filtered = expenses
      .filter(e => e.spent_on >= start.slice(0,10) && e.spent_on <= end.slice(0,10))
      .sort((a,b) => b.spent_on.localeCompare(a.spent_on));

    const listEl = el('exp-list');
    if (!listEl) return;
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><i class="bi bi-wallet2"></i><p>Không có khoản chi nào tháng ${month}</p></div>`;
      return;
    }
    listEl.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Ngày</th><th>Danh mục</th><th>Ghi chú</th><th class="text-end">Số tiền</th><th></th></tr></thead>
          <tbody>
            ${filtered.map(e => {
              const cat = catMap[e.category_id];
              return `<tr>
                <td>${fmtDateShort(e.spent_on + 'T00:00:00')}</td>
                <td>${cat ? `<span style="color:${cat.color}"><i class="bi ${cat.icon} me-1"></i>${sanitize(cat.name)}</span>` : '—'}</td>
                <td>${sanitize(e.note || '—')}</td>
                <td class="text-end fw-600">${fmtVND(e.amount)}</td>
                <td>
                  <button class="btn-icon" data-del-exp="${sanitize(e.id)}" title="Xóa"><i class="bi bi-trash3"></i></button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--clr-surface-2)">
              <td colspan="3" class="text-end fw-600 p-3">Tổng:</td>
              <td class="text-end fw-700 text-warning p-3">${fmtVND(filtered.reduce((s,e) => s+e.amount, 0))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    listEl.querySelectorAll('[data-del-exp]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xóa khoản chi này?')) return;
        await DB.del('expenses', btn.dataset.delExp);
        expenses = expenses.filter(e => e.id !== btn.dataset.delExp);
        await renderExpList(month);
      });
    });
  }

  await renderExpList(selMonth);
  el('exp-month-sel')?.addEventListener('change', e => renderExpList(e.target.value));

  // ── Quick add ─────────────────────────
  el('exp-quick-save')?.addEventListener('click', async () => {
    const raw = el('exp-quick')?.value.trim();
    if (!raw) { toast('Nhập số tiền!', 'error'); return; }
    const { amount, note } = parseQuickExpense(raw);
    if (!amount) { toast('Không đọc được số tiền. Ví dụ: "cafe 35k"', 'error'); return; }

    const exp = {
      id: genId(),
      amount,
      note: note || raw,
      category_id: el('exp-quick-cat')?.value,
      spent_on: el('exp-quick-date')?.value || todayVN(),
      created_at: new Date().toISOString(),
    };
    await DB.put('expenses', exp);
    expenses.push(exp);
    catTotals[exp.category_id] = (catTotals[exp.category_id] || 0) + exp.amount;

    el('exp-quick').value = '';
    toast(`Đã thêm: ${fmtVND(amount)} — ${note || raw}`, 'success');
    renderAlerts();
    await renderExpList(el('exp-month-sel')?.value || currentMonth());
  });

  // Quick add on Enter
  el('exp-quick')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') el('exp-quick-save')?.click();
  });

  // ── Export CSV ────────────────────────
  el('exp-export-btn')?.addEventListener('click', () => {
    const month = el('exp-month-sel')?.value || currentMonth();
    const { start, end } = monthRange(month);
    const filtered = expenses
      .filter(e => e.spent_on >= start.slice(0,10) && e.spent_on <= end.slice(0,10))
      .sort((a,b) => a.spent_on.localeCompare(b.spent_on));
    const rows = [
      ['Ngay', 'Danh muc', 'Ghi chu', 'So tien (VND)'],
      ...filtered.map(e => [
        e.spent_on,
        catMap[e.category_id]?.name || '',
        e.note || '',
        e.amount,
      ])
    ];
    downloadCSV(rows, `expenses-${month}.csv`);
  });

  // ── Manage categories modal ───────────
  el('exp-cat-btn')?.addEventListener('click', () => {
    // Simple inline category manager
    const modal = new bootstrap.Modal(document.createElement('div'));
    const div = document.createElement('div');
    div.className = 'modal fade';
    div.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Quản lý danh mục</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${categories.map(c => `
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi ${c.icon}" style="color:${c.color}"></i>
                <span>${sanitize(c.name)}</span>
                <span class="ms-auto text-muted small">Ngân sách tháng này:</span>
                <input type="number" class="form-ctrl" style="width:120px"
                  placeholder="0"
                  value="${monthBudgets.find(b => b.category_id === c.id)?.limit_vnd || ''}"
                  data-cat-budget="${c.id}" />
              </div>
            `).join('')}
          </div>
          <div class="modal-footer">
            <button class="btn-primary" id="cat-budget-save">Lưu ngân sách</button>
            <button class="btn-secondary" data-bs-dismiss="modal">Đóng</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div);
    const bsModal = new bootstrap.Modal(div);
    bsModal.show();

    div.querySelector('#cat-budget-save')?.addEventListener('click', async () => {
      for (const inp of div.querySelectorAll('[data-cat-budget]')) {
        const catId = inp.dataset.catBudget;
        const val = parseInt(inp.value);
        if (!val) continue;
        const existing = monthBudgets.find(b => b.category_id === catId);
        const rec = existing
          ? { ...existing, limit_vnd: val }
          : { id: genId(), month: currentMonth(), category_id: catId, limit_vnd: val };
        await DB.put('budgets', rec);
      }
      toast('Đã lưu ngân sách!', 'success');
      bsModal.hide();
      div.remove();
      await renderExpenses(container);
    });

    div.addEventListener('hidden.bs.modal', () => div.remove());
  });
}
