/* ================================================================
   modules/settings.js — Settings & Backup
   Features: Change PIN, OT rules, clipboard expiry,
             theme, export/import full backup (JSON)
   ================================================================ */

async function renderSettings(container) {
  const [pin_hash, ot_rules_raw, clip_expiry, tz_setting] = await Promise.all([
    DB.getSetting('pin_hash', ''),
    DB.getSetting('ot_rules', null),
    DB.getSetting('clipboard_expiry_days', '30'),
    DB.getSetting('timezone', 'Asia/Ho_Chi_Minh'),
  ]);

  const otRules = ot_rules_raw || { std_hours_per_day: 8, ot_start_hour: 18, weekend_coeff: 1.5 };

  container.innerHTML = `
    <div class="page-header">
      <h2>Cài đặt</h2>
    </div>

    <div class="row g-4">
      <!-- Security -->
      <div class="col-md-6">
        <div class="panel h-100">
          <div class="panel-header"><span class="panel-title"><i class="bi bi-shield-lock me-2"></i>Bảo mật</span></div>
          <div class="panel-body">
            <div class="form-group">
              <label class="form-label">PIN hiện tại</label>
              <input type="password" id="set-old-pin" class="form-ctrl" placeholder="••••" maxlength="4" inputmode="numeric" />
            </div>
            <div class="form-group">
              <label class="form-label">PIN mới (4 chữ số)</label>
              <input type="password" id="set-new-pin" class="form-ctrl" placeholder="••••" maxlength="4" inputmode="numeric" />
            </div>
            <div class="form-group">
              <label class="form-label">Xác nhận PIN mới</label>
              <input type="password" id="set-confirm-pin" class="form-ctrl" placeholder="••••" maxlength="4" inputmode="numeric" />
            </div>
            <button class="btn-primary" id="set-pin-btn"><i class="bi bi-key"></i> Đổi PIN</button>
          </div>
        </div>
      </div>

      <!-- OT Rules -->
      <div class="col-md-6">
        <div class="panel h-100">
          <div class="panel-header"><span class="panel-title"><i class="bi bi-clock-history me-2"></i>Quy tắc OT</span></div>
          <div class="panel-body">
            <div class="form-group">
              <label class="form-label">Số giờ chuẩn mỗi ngày</label>
              <input type="number" id="set-std-hours" class="form-ctrl" value="${otRules.std_hours_per_day}" min="1" max="24" />
            </div>
            <div class="form-group">
              <label class="form-label">Giờ bắt đầu OT (giờ trong ngày, 0-23)</label>
              <input type="number" id="set-ot-hour" class="form-ctrl" value="${otRules.ot_start_hour}" min="0" max="23" />
            </div>
            <div class="form-group">
              <label class="form-label">Hệ số OT cuối tuần/lễ</label>
              <input type="number" id="set-weekend-coeff" class="form-ctrl" value="${otRules.weekend_coeff}" min="1" max="5" step="0.5" />
            </div>
            <button class="btn-primary" id="set-ot-btn"><i class="bi bi-check2"></i> Lưu quy tắc OT</button>
          </div>
        </div>
      </div>

      <!-- Clipboard settings -->
      <div class="col-md-6">
        <div class="panel">
          <div class="panel-header"><span class="panel-title"><i class="bi bi-clipboard2 me-2"></i>Clipboard</span></div>
          <div class="panel-body">
            <div class="form-group">
              <label class="form-label">Tự xóa item sau (ngày)</label>
              <input type="number" id="set-clip-expiry" class="form-ctrl" value="${clip_expiry}" min="1" max="365" />
            </div>
            <button class="btn-primary" id="set-clip-btn"><i class="bi bi-check2"></i> Lưu</button>
          </div>
        </div>
      </div>

      <!-- Theme -->
      <div class="col-md-6">
        <div class="panel">
          <div class="panel-header"><span class="panel-title"><i class="bi bi-palette me-2"></i>Giao diện</span></div>
          <div class="panel-body">
            <div class="form-group">
              <label class="form-label">Theme</label>
              <div class="d-flex gap-2">
                <button class="btn-secondary" id="theme-dark-btn"><i class="bi bi-moon-stars-fill me-2"></i>Dark</button>
                <button class="btn-secondary" id="theme-light-btn"><i class="bi bi-sun-fill me-2"></i>Light</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup / Export -->
      <div class="col-12">
        <div class="panel">
          <div class="panel-header"><span class="panel-title"><i class="bi bi-database me-2"></i>Sao lưu & Khôi phục</span></div>
          <div class="panel-body">
            <p class="text-muted mb-3">Xuất toàn bộ dữ liệu ra file JSON để backup hoặc chuyển sang thiết bị khác.</p>
            <div class="action-bar">
              <button class="btn-primary" id="set-export-btn"><i class="bi bi-download"></i> Xuất backup JSON</button>
              <label class="btn-secondary" style="cursor:pointer">
                <i class="bi bi-upload"></i> Nhập backup JSON
                <input type="file" id="set-import-file" accept=".json" class="d-none" />
              </label>
            </div>
            <div id="set-import-status" class="mt-2"></div>

            <hr style="border-color:var(--clr-border)" class="my-4" />
            <h6 class="fw-600 mb-3 text-danger">Vùng nguy hiểm</h6>
            <button class="btn-danger" id="set-clear-btn"><i class="bi bi-trash3"></i> Xóa toàn bộ dữ liệu</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Change PIN ────────────────────────
  el('set-pin-btn')?.addEventListener('click', async () => {
    const oldPin = el('set-old-pin')?.value;
    const newPin = el('set-new-pin')?.value;
    const confirm_pin = el('set-confirm-pin')?.value;

    if (!oldPin || !newPin || !confirm_pin) { toast('Nhập đầy đủ thông tin!', 'error'); return; }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { toast('PIN phải là 4 chữ số!', 'error'); return; }
    if (newPin !== confirm_pin) { toast('PIN xác nhận không khớp!', 'error'); return; }

    const ok = await Auth.isUnlocked() && await (async () => {
      // Re-verify old PIN
      const stored = await DB.getSetting('pin_hash', null);
      const { hashPin } = (() => {
        let h = 0;
        for (let i = 0; i < oldPin.length; i++) h = (Math.imul(31, h) + oldPin.charCodeAt(i)) | 0;
        return { hashPin: String(h) };
      })();
      return stored === hashPin || stored === null; // allow if no pin stored
    })();

    await Auth.setPin(newPin);
    toast('Đã đổi PIN thành công!', 'success');
    ['set-old-pin','set-new-pin','set-confirm-pin'].forEach(id => { if (el(id)) el(id).value = ''; });
  });

  // ── Save OT rules ─────────────────────
  el('set-ot-btn')?.addEventListener('click', async () => {
    const rules = {
      std_hours_per_day: parseFloat(el('set-std-hours')?.value) || 8,
      ot_start_hour:     parseInt(el('set-ot-hour')?.value) || 18,
      weekend_coeff:     parseFloat(el('set-weekend-coeff')?.value) || 1.5,
    };
    await DB.setSetting('ot_rules', rules);
    toast('Đã lưu quy tắc OT!', 'success');
  });

  // ── Clipboard expiry ──────────────────
  el('set-clip-btn')?.addEventListener('click', async () => {
    const val = parseInt(el('set-clip-expiry')?.value) || 30;
    await DB.setSetting('clipboard_expiry_days', String(val));
    toast('Đã lưu!', 'success');
  });

  // ── Theme ─────────────────────────────
  el('theme-dark-btn')?.addEventListener('click', () => App.setTheme('dark'));
  el('theme-light-btn')?.addEventListener('click', () => App.setTheme('light'));

  // ── Export backup ─────────────────────
  el('set-export-btn')?.addEventListener('click', async () => {
    const stores = ['sessions','worklogs','expenses','categories','budgets','bookmarks','snippets','clipboard','settings'];
    const backup = { version: 1, exported_at: new Date().toISOString(), data: {} };
    for (const s of stores) {
      backup.data[s] = await DB.getAll(s);
    }
    downloadJSON(backup, `personal-os-backup-${todayVN()}.json`);
    toast('Đã xuất backup!', 'success');
  });

  // ── Import backup ─────────────────────
  el('set-import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = el('set-import-status');

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.data) throw new Error('File không đúng định dạng!');

      if (!confirm(`Nhập backup từ ${backup.exported_at || 'file này'}?\n\nDữ liệu hiện tại sẽ được GHI ĐÈ!`)) return;

      for (const [store, records] of Object.entries(backup.data)) {
        if (!Array.isArray(records)) continue;
        for (const r of records) await DB.put(store, r);
      }
      if (statusEl) statusEl.innerHTML = `<span class="badge-pill badge-success">Nhập thành công ${Object.values(backup.data).reduce((s,a) => s+a.length, 0)} bản ghi!</span>`;
      toast('Nhập backup thành công! Tải lại trang để xem.', 'success');
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<span class="badge-pill badge-danger">Lỗi: ${sanitize(err.message)}</span>`;
      toast('Lỗi nhập backup!', 'error');
    }
  });

  // ── Clear all data ────────────────────
  el('set-clear-btn')?.addEventListener('click', async () => {
    if (!confirm('XÓA TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác!')) return;
    if (!confirm('Xác nhận lần 2: Bạn chắc chắn muốn xóa tất cả?')) return;
    const stores = ['sessions','worklogs','expenses','categories','budgets','bookmarks','snippets','clipboard'];
    for (const s of stores) {
      const all = await DB.getAll(s);
      for (const r of all) await DB.del(s, r.id);
    }
    toast('Đã xóa toàn bộ dữ liệu!', 'success');
    Router.navigate('/dashboard');
  });
}
