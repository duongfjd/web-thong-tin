/* ================================================================
   modules/timesheet.js — Excel-like spreadsheet timesheet
   Features:
   - Excel-like grid: add/remove rows & columns
   - Manual entry of all fields (date, task, hours, etc.)
   - Custom categories (work types) — add by hand
   - Formula evaluation: SUM, AVG, MIN, MAX, COUNT on any range
   - Context menu on cells (copy, clear, formula)
   - Per-day view with tabs
   - Export CSV
   - Stats: total hours, by category, by month
   ================================================================ */

const Timesheet = (() => {

  // ─── State ──────────────────────────────────────────────────────
  let sheets   = [];     // array of {id, name, cols[], rows[][]}
  let curSheet = 0;
  let selCell  = null;   // {r, c}
  let editCell = null;
  let categories = [];
  let isDirty  = false;

  const DEFAULT_COLS = [
    { id: 'date',  label: 'Ngày',         width: 110, type: 'date' },
    { id: 'task',  label: 'Công việc',    width: 200, type: 'text' },
    { id: 'cat',   label: 'Danh mục',     width: 130, type: 'text' },
    { id: 'start', label: 'Giờ bắt đầu', width: 90,  type: 'text' },
    { id: 'end',   label: 'Giờ kết thúc', width: 90,  type: 'text' },
    { id: 'hours', label: 'Giờ',          width: 70,  type: 'number' },
    { id: 'note',  label: 'Ghi chú',      width: 200, type: 'text' },
  ];

  function newSheet(name) {
    const today = todayVN();
    return {
      id:   genId(),
      name: name || `Sheet ${sheets.length + 1}`,
      cols: DEFAULT_COLS.map(c => ({ ...c })),
      rows: Array.from({ length: 20 }, () => Array(DEFAULT_COLS.length).fill('')),
    };
  }

  // ─── Persistence ────────────────────────────────────────────────
  async function load() {
    try {
      const raw = localStorage.getItem('pos_timesheet_v2');
      if (raw) {
        const saved = JSON.parse(raw);
        sheets     = saved.sheets     || [newSheet()];
        curSheet   = saved.curSheet   || 0;
        categories = saved.categories || defaultCategories();
      } else {
        sheets     = [newSheet()];
        categories = defaultCategories();
      }
      if (curSheet >= sheets.length) curSheet = 0;
    } catch {
      sheets = [newSheet()]; categories = defaultCategories();
    }
  }

  function save() {
    try {
      localStorage.setItem('pos_timesheet_v2', JSON.stringify({ sheets, curSheet, categories }));
    } catch (e) {
      console.warn('Timesheet save error', e);
    }
    isDirty = false;
  }

  function defaultCategories() {
    return ['Lập trình', 'Họp', 'Thiết kế', 'Review', 'Học tập', 'Khác'];
  }

  // ─── Formula Engine ─────────────────────────────────────────────
  const sheet = () => sheets[curSheet];

  /**
   * Parse cell ref like A1 → {r:0,c:0}
   * A=0, B=1, AA=26, …
   */
  function parseRef(ref) {
    const m = ref.trim().match(/^([A-Z]+)(\d+)$/i);
    if (!m) return null;
    const letters = m[1].toUpperCase();
    let c = 0;
    for (let i = 0; i < letters.length; i++) c = c * 26 + letters.charCodeAt(i) - 64;
    c -= 1; // zero-indexed, skip row-hdr col
    const r = parseInt(m[2]) - 1;
    return { r, c };
  }

  /**
   * Parse range like A1:C3 → flat array of numeric values
   */
  function rangeValues(rangeStr) {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) {
      const single = parseRef(rangeStr);
      if (!single) return [];
      const v = getCellValue(single.r, single.c);
      return [parseFloat(v)].filter(n => !isNaN(n));
    }
    const from = parseRef(parts[0]);
    const to   = parseRef(parts[1]);
    if (!from || !to) return [];
    const vals = [];
    const s = sheet();
    for (let r = Math.min(from.r, to.r); r <= Math.max(from.r, to.r); r++) {
      for (let c = Math.min(from.c, to.c); c <= Math.max(from.c, to.c); c++) {
        if (!s.rows[r]) continue;
        const v = parseFloat(s.rows[r][c] || '');
        if (!isNaN(v)) vals.push(v);
      }
    }
    return vals;
  }

  function getCellValue(r, c) {
    const s = sheet();
    if (!s.rows[r]) return '';
    const raw = s.rows[r][c] || '';
    if (raw.startsWith('=')) return String(evalFormula(raw.slice(1)));
    return raw;
  }

  function evalFormula(expr) {
    expr = expr.trim().toUpperCase();
    // SUM(range)
    if (/^SUM\((.+)\)$/.test(expr)) {
      const vals = rangeValues(expr.replace(/^SUM\(|\)$/g, ''));
      return vals.reduce((a, b) => a + b, 0);
    }
    // AVG / AVERAGE
    if (/^(AVG|AVERAGE)\((.+)\)$/.test(expr)) {
      const vals = rangeValues(expr.replace(/^(AVG|AVERAGE)\(|\)$/g, ''));
      return vals.length ? +(vals.reduce((a,b)=>a+b,0) / vals.length).toFixed(2) : 0;
    }
    // MIN / MAX / COUNT
    if (/^MIN\((.+)\)$/.test(expr)) {
      const vals = rangeValues(expr.replace(/^MIN\(|\)$/g, ''));
      return vals.length ? Math.min(...vals) : 0;
    }
    if (/^MAX\((.+)\)$/.test(expr)) {
      const vals = rangeValues(expr.replace(/^MAX\(|\)$/g, ''));
      return vals.length ? Math.max(...vals) : 0;
    }
    if (/^COUNT\((.+)\)$/.test(expr)) {
      return rangeValues(expr.replace(/^COUNT\(|\)$/g, '')).length;
    }
    // Basic arithmetic fallback (safe)
    try {
      // Only allow numbers, operators, spaces
      if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(expr)) {
        return +new Function('return ' + expr)();
      }
    } catch {}
    return '#ERR';
  }

  // ─── Column label (A, B, … Z, AA, AB, …) ────────────────────────
  function colLabel(i) {
    let label = '';
    let n = i + 1;
    while (n > 0) {
      label = String.fromCharCode(64 + (n % 26 || 26)) + label;
      n = Math.floor((n - 1) / 26);
    }
    return label;
  }

  // ─── Render ──────────────────────────────────────────────────────
  async function render(container) {
    await load();

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="bi bi-table me-2"></i>Timesheet</h2>
        <div class="action-bar">
          <button class="btn-secondary btn-sm" id="ts-stats-btn"><i class="bi bi-bar-chart"></i> Thống kê</button>
          <button class="btn-secondary btn-sm" id="ts-cat-btn"><i class="bi bi-tags"></i> Danh mục</button>
          <button class="btn-secondary btn-sm" id="ts-export-btn"><i class="bi bi-download"></i> Xuất CSV</button>
          <button class="btn-primary btn-sm" id="ts-save-btn"><i class="bi bi-floppy"></i> Lưu</button>
        </div>
      </div>

      <!-- Category chips -->
      <div class="panel mb-3" id="ts-cat-panel" style="display:none">
        <div class="panel-header">
          <span class="panel-title">Danh mục công việc</span>
          <button class="btn-primary btn-sm" id="ts-cat-add-btn"><i class="bi bi-plus"></i> Thêm</button>
        </div>
        <div class="panel-body">
          <div class="tag-list" id="ts-cat-list"></div>
          <div class="d-flex gap-2 mt-3 d-none" id="ts-cat-input-row">
            <input id="ts-cat-input" class="form-ctrl" placeholder="Tên danh mục..." style="max-width:200px" />
            <button class="btn-primary btn-sm" id="ts-cat-confirm">Thêm</button>
            <button class="btn-ghost btn-sm" id="ts-cat-cancel">Hủy</button>
          </div>
        </div>
      </div>

      <!-- Formula bar -->
      <div class="sheet-formula-bar" id="ts-formula-bar">
        <span class="formula-label" id="ts-cell-ref">A1</span>
        <span style="color:var(--clr-muted);margin:0 4px">fx</span>
        <input class="formula-input" id="ts-formula-input" placeholder="Nhập giá trị hoặc công thức (=SUM(A1:A5))" />
      </div>

      <!-- Toolbar -->
      <div class="sheet-toolbar" style="flex-wrap:wrap;gap:4px">
        <button class="btn-secondary btn-sm" id="ts-add-row-btn" title="Thêm hàng"><i class="bi bi-plus-lg"></i> Hàng</button>
        <button class="btn-secondary btn-sm" id="ts-add-col-btn" title="Thêm cột"><i class="bi bi-plus-lg"></i> Cột</button>
        <button class="btn-secondary btn-sm" id="ts-today-btn" title="Điền ngày hôm nay vào ô đang chọn"><i class="bi bi-calendar-check"></i> Hôm nay</button>
        <button class="btn-secondary btn-sm" id="ts-sum-btn" title="Tính SUM cho cột hiện tại"><i class="bi bi-sigma"></i> SUM cột</button>
        <button class="btn-ghost btn-sm text-danger" id="ts-del-row-btn" title="Xóa hàng đang chọn"><i class="bi bi-trash3"></i> Xóa hàng</button>
        <div style="flex:1;min-width:10px"></div>
        <select class="form-ctrl btn-sm" id="ts-date-filter" style="width:auto;font-size:12px">
          <option value="">Tất cả ngày</option>
        </select>
      </div>

      <!-- Sheet grid -->
      <div class="sheet-wrap" id="ts-sheet-wrap">
        <table class="sheet-table" id="ts-grid"></table>
      </div>

      <!-- Sheet tabs -->
      <div class="sheet-tabs" id="ts-tabs">
        <button class="btn-icon btn-sm" id="ts-add-sheet-btn" title="Thêm sheet"><i class="bi bi-plus-lg"></i></button>
      </div>

      <!-- Stats panel (hidden by default) -->
      <div class="panel mt-4 d-none" id="ts-stats-panel">
        <div class="panel-header">
          <span class="panel-title">📊 Thống kê</span>
          <button class="btn-ghost btn-sm" id="ts-stats-close"><i class="bi bi-x"></i></button>
        </div>
        <div class="panel-body" id="ts-stats-body"></div>
      </div>
    `;

    renderGrid();
    renderTabs();
    populateDateFilter();
    bindEvents(container);
  }

  // ─── Grid render ─────────────────────────────────────────────────
  function renderGrid() {
    const s   = sheet();
    const grid = el('ts-grid');
    if (!grid) return;

    // Ensure enough rows
    while (s.rows.length < 20) s.rows.push(Array(s.cols.length).fill(''));

    const colCount = s.cols.length;

    const headRow = `<tr>
      <th class="col-hdr corner-hdr" style="width:36px"></th>
      ${s.cols.map((col, ci) => `
        <th class="col-hdr" style="width:${col.width}px;min-width:${col.width}px" data-ci="${ci}">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:0 4px">
            <span>${colLabel(ci)}</span>
            <span style="color:var(--clr-muted);font-size:10px;font-weight:400">${sanitize(col.label)}</span>
          </div>
          <div class="col-resize-handle" data-ci="${ci}"></div>
        </th>
      `).join('')}
    </tr>`;

    const bodyRows = s.rows.map((row, ri) => `
      <tr data-ri="${ri}">
        <td class="row-hdr">${ri + 1}</td>
        ${s.cols.map((col, ci) => {
          const raw = row[ci] || '';
          const isFormula = raw.startsWith('=');
          const displayed = isFormula ? evalFormula(raw.slice(1)) : raw;
          const isNum = col.type === 'number' || (!isNaN(parseFloat(displayed)) && displayed !== '');
          const sel = selCell && selCell.r === ri && selCell.c === ci ? ' cell-selected' : '';
          const isCat = col.id === 'cat' || col.label.toLowerCase().includes('danh mục');
          return `<td class="${isFormula ? 'cell-formula' : ''}${isNum ? ' cell-number' : ''}${sel}" 
                      data-ri="${ri}" data-ci="${ci}">
            <input class="cell-input" 
                   value="${sanitize(String(displayed))}"
                   data-raw="${sanitize(raw)}"
                   data-ri="${ri}" data-ci="${ci}"
                   placeholder="${isFormula ? '' : col.type === 'date' ? 'YYYY-MM-DD' : ''}"
                   ${isCat ? 'list="ts-cat-datalist"' : ''}
                   ${col.type === 'date' ? 'type="date"' : 'type="text"'} />
          </td>`;
        }).join('')}
      </tr>
    `).join('');

    // Total row
    const totalRow = `<tr class="total-row">
      <td class="row-hdr"><i class="bi bi-sigma" style="font-size:11px"></i></td>
      ${s.cols.map((col, ci) => {
        if (col.type === 'number') {
          const sum = s.rows.reduce((acc, row) => {
            const v = parseFloat(row[ci] || '');
            return acc + (isNaN(v) ? 0 : v);
          }, 0);
          return `<td><span style="padding:0 6px;font-size:12px">${sum % 1 === 0 ? sum : sum.toFixed(2)}</span></td>`;
        }
        if (ci === 0) return `<td><span style="padding:0 6px;font-size:11px;color:var(--clr-muted)">Tổng</span></td>`;
        return `<td></td>`;
      }).join('')}
    </tr>`;

    const datalist = `<datalist id="ts-cat-datalist">${categories.map(c => `<option value="${sanitize(c)}">`).join('')}</datalist>`;
    grid.innerHTML = `${datalist}<thead>${headRow}</thead><tbody>${bodyRows}${totalRow}</tbody>`;

    // Bind cell events
    grid.querySelectorAll('.cell-input').forEach(inp => {
      const ri = +inp.dataset.ri;
      const ci = +inp.dataset.ci;

      inp.addEventListener('focus', () => {
        selCell = { r: ri, c: ci };
        const raw = sheet().rows[ri]?.[ci] || '';
        const refInput = el('ts-formula-input');
        if (refInput) refInput.value = raw;
        const refLabel = el('ts-cell-ref');
        if (refLabel) refLabel.textContent = `${colLabel(ci)}${ri + 1}`;
        // Highlight selected
        el('ts-grid')?.querySelectorAll('.cell-selected').forEach(td => td.classList.remove('cell-selected'));
        inp.closest('td')?.classList.add('cell-selected');
      });

      inp.addEventListener('change', () => {
        const s = sheet();
        if (!s.rows[ri]) s.rows[ri] = [];
        s.rows[ri][ci] = inp.type === 'date' ? inp.value : inp.value;
        isDirty = true;
        // If formula, re-render
        if (inp.value.startsWith('=')) {
          renderGrid();
        }
        // Sync formula bar
        if (selCell?.r === ri && selCell?.c === ci) {
          const refInput = el('ts-formula-input');
          if (refInput) refInput.value = inp.value;
        }
        renderTotalRow();
      });

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const allInputs = [...el('ts-grid').querySelectorAll('.cell-input')];
          const idx = allInputs.indexOf(inp);
          const next = e.key === 'Tab'
            ? allInputs[e.shiftKey ? idx - 1 : idx + 1]
            : allInputs[idx + s.cols.length];
          next?.focus();
          next?.select();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (inp.value === '' && e.key === 'Backspace') {
            sheet().rows[ri][ci] = '';
            isDirty = true;
          }
        }
      });

      inp.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCellContextMenu(e, ri, ci);
      });
    });

    // Column resize
    grid.querySelectorAll('.col-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const ci = +handle.dataset.ci;
        const startX = e.clientX;
        const startW = sheet().cols[ci].width;
        function onMove(ev) {
          sheet().cols[ci].width = Math.max(50, startW + (ev.clientX - startX));
          handle.classList.add('col-resizing');
          renderGrid();
        }
        function onUp() {
          handle.classList.remove('col-resizing');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });

    // Right-click column header to rename/delete
    grid.querySelectorAll('.col-hdr[data-ci]').forEach(th => {
      th.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const ci = +th.dataset.ci;
        showColContextMenu(e, ci);
      });
    });
  }

  function renderTotalRow() {
    // Lightweight update of total row
    const totalCells = el('ts-grid')?.querySelectorAll('.total-row td');
    if (!totalCells) return;
    const s = sheet();
    s.cols.forEach((col, ci) => {
      if (col.type !== 'number') return;
      const sum = s.rows.reduce((acc, row) => {
        const v = parseFloat(row[ci] || '');
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      const td = totalCells[ci + 1]; // +1 for row-hdr
      if (td) td.innerHTML = `<span style="padding:0 6px;font-size:12px">${sum % 1 === 0 ? sum : sum.toFixed(2)}</span>`;
    });
  }

  // ─── Tabs render ─────────────────────────────────────────────────
  function renderTabs() {
    const tabsEl = el('ts-tabs');
    if (!tabsEl) return;
    const addBtn = tabsEl.querySelector('#ts-add-sheet-btn');
    tabsEl.querySelectorAll('.sheet-tab').forEach(t => t.remove());
    sheets.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.className = 'sheet-tab' + (i === curSheet ? ' active' : '');
      btn.textContent = s.name;
      btn.title = 'Click để chọn, double-click để đổi tên';
      btn.addEventListener('click', () => {
        if (i !== curSheet) { curSheet = i; renderGrid(); renderTabs(); }
      });
      btn.addEventListener('dblclick', () => {
        const name = prompt('Đổi tên sheet:', s.name);
        if (name && name.trim()) { s.name = name.trim(); save(); renderTabs(); }
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (sheets.length <= 1) return;
        if (confirm(`Xóa sheet "${s.name}"?`)) {
          sheets.splice(i, 1);
          if (curSheet >= sheets.length) curSheet = sheets.length - 1;
          save();
          renderGrid();
          renderTabs();
        }
      });
      tabsEl.insertBefore(btn, addBtn);
    });
  }

  // ─── Date filter ─────────────────────────────────────────────────
  function populateDateFilter() {
    const sel = el('ts-date-filter');
    if (!sel) return;
    const s = sheet();
    const dates = new Set();
    s.rows.forEach(row => { if (row[0]) dates.add(row[0]); });
    [...dates].sort().reverse().forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      sel.appendChild(opt);
    });
  }

  // ─── Context menus ───────────────────────────────────────────────
  function removeCtxMenu() {
    document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
  }

  function showCellContextMenu(e, ri, ci) {
    removeCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';

    const raw = sheet().rows[ri]?.[ci] || '';

    menu.innerHTML = `
      <div class="ctx-item" id="ctx-copy"><i class="bi bi-copy"></i> Copy</div>
      <div class="ctx-item" id="ctx-clear"><i class="bi bi-eraser"></i> Xóa ô</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item" id="ctx-sum-col"><i class="bi bi-sigma"></i> SUM cột này</div>
      <div class="ctx-item" id="ctx-ins-today"><i class="bi bi-calendar-day"></i> Điền ngày hôm nay</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item danger" id="ctx-del-row"><i class="bi bi-trash3"></i> Xóa hàng này</div>
    `;

    document.body.appendChild(menu);

    menu.querySelector('#ctx-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(raw).catch(() => {});
      removeCtxMenu();
    });
    menu.querySelector('#ctx-clear')?.addEventListener('click', () => {
      sheet().rows[ri][ci] = '';
      isDirty = true;
      renderGrid();
      removeCtxMenu();
    });
    menu.querySelector('#ctx-sum-col')?.addEventListener('click', () => {
      const last = sheet().rows.length;
      const formula = `=SUM(${colLabel(ci)}1:${colLabel(ci)}${last})`;
      // Put formula in cell below data or prompt
      const newR = prompt('Đặt công thức ở hàng nào?', String(last + 1));
      const targetR = parseInt(newR) - 1;
      if (!isNaN(targetR) && targetR >= 0) {
        while (sheet().rows.length <= targetR) sheet().rows.push(Array(sheet().cols.length).fill(''));
        sheet().rows[targetR][ci] = formula;
        isDirty = true;
        renderGrid();
      }
      removeCtxMenu();
    });
    menu.querySelector('#ctx-ins-today')?.addEventListener('click', () => {
      sheet().rows[ri][ci] = todayVN();
      isDirty = true;
      renderGrid();
      removeCtxMenu();
    });
    menu.querySelector('#ctx-del-row')?.addEventListener('click', () => {
      sheet().rows.splice(ri, 1);
      isDirty = true;
      renderGrid();
      removeCtxMenu();
    });

    document.addEventListener('click', removeCtxMenu, { once: true });
  }

  function showColContextMenu(e, ci) {
    removeCtxMenu();
    const col = sheet().cols[ci];
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';
    menu.innerHTML = `
      <div class="ctx-item" id="ctx-col-rename"><i class="bi bi-pencil"></i> Đổi tên cột</div>
      <div class="ctx-item" id="ctx-col-type"><i class="bi bi-123"></i> Loại: ${col.type}</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item danger" id="ctx-col-del"><i class="bi bi-trash3"></i> Xóa cột</div>
    `;
    document.body.appendChild(menu);
    menu.querySelector('#ctx-col-rename')?.addEventListener('click', () => {
      const name = prompt('Tên cột mới:', col.label);
      if (name?.trim()) { col.label = name.trim(); renderGrid(); }
      removeCtxMenu();
    });
    menu.querySelector('#ctx-col-type')?.addEventListener('click', () => {
      const types = ['text','number','date'];
      const cur = types.indexOf(col.type);
      col.type = types[(cur + 1) % types.length];
      renderGrid();
      removeCtxMenu();
    });
    menu.querySelector('#ctx-col-del')?.addEventListener('click', () => {
      if (sheet().cols.length <= 1) { toast('Phải có ít nhất 1 cột!', 'warning'); removeCtxMenu(); return; }
      if (!confirm(`Xóa cột "${col.label}"?`)) { removeCtxMenu(); return; }
      sheet().cols.splice(ci, 1);
      sheet().rows.forEach(row => row.splice(ci, 1));
      isDirty = true;
      renderGrid();
      removeCtxMenu();
    });
    document.addEventListener('click', removeCtxMenu, { once: true });
  }

  // ─── Stats ───────────────────────────────────────────────────────
  function renderStats() {
    const panel = el('ts-stats-panel');
    const body  = el('ts-stats-body');
    if (!panel || !body) return;

    const s = sheet();
    // Find hours column
    const hoursCi = s.cols.findIndex(c => c.type === 'number');
    const catCi   = s.cols.findIndex(c => c.id === 'cat' || c.label.toLowerCase().includes('danh mục') || c.label.toLowerCase().includes('category'));
    const dateCi  = 0;

    const totalHours = s.rows.reduce((acc, row) => {
      const v = parseFloat(row[hoursCi] || '');
      return acc + (isNaN(v) ? 0 : v);
    }, 0);

    const byCategory = {};
    s.rows.forEach(row => {
      const cat   = catCi >= 0 ? (row[catCi] || 'Khác') : 'Khác';
      const hours = parseFloat(hoursCi >= 0 ? row[hoursCi] || '' : '');
      if (!isNaN(hours)) byCategory[cat] = (byCategory[cat] || 0) + hours;
    });

    const byDate = {};
    s.rows.forEach(row => {
      const d = row[dateCi] || '';
      if (!d) return;
      const hours = parseFloat(hoursCi >= 0 ? row[hoursCi] || '' : '');
      if (!isNaN(hours)) byDate[d] = (byDate[d] || 0) + hours;
    });

    body.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">Tổng giờ (sheet)</div>
            <div class="stat-value text-primary">${totalHours.toFixed(1)}h</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">Số ngày làm</div>
            <div class="stat-value">${Object.keys(byDate).length}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">Danh mục</div>
            <div class="stat-value">${Object.keys(byCategory).length}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">TB/ngày</div>
            <div class="stat-value text-success">${Object.keys(byDate).length ? (totalHours / Object.keys(byDate).length).toFixed(1) : 0}h</div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <div class="panel">
            <div class="panel-header"><span class="panel-title">Theo danh mục</span></div>
            <div class="panel-body">
              ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, h]) => `
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span style="flex:1;font-size:13px">${sanitize(cat)}</span>
                  <span class="badge-pill badge-primary">${h.toFixed(1)}h</span>
                </div>
                <div class="progress-bar-wrap mb-3">
                  <div class="progress-bar-fill" style="width:${Math.min(100, (h/totalHours)*100).toFixed(1)}%;background:var(--clr-primary)"></div>
                </div>
              `).join('') || '<p class="text-muted">Chưa có dữ liệu</p>'}
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="panel">
            <div class="panel-header"><span class="panel-title">Theo ngày</span></div>
            <div class="panel-body" style="max-height:280px;overflow:auto">
              ${Object.entries(byDate).sort((a,b) => b[0].localeCompare(a[0])).map(([d, h]) => `
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span style="font-size:12.5px;color:var(--clr-muted)">${d}</span>
                  <span class="badge-pill badge-${h >= 8 ? 'success' : h >= 4 ? 'warning' : 'muted'}">${h.toFixed(1)}h</span>
                </div>
              `).join('') || '<p class="text-muted">Chưa có dữ liệu</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Bind events ─────────────────────────────────────────────────
  function bindEvents(container) {
    // Save
    el('ts-save-btn')?.addEventListener('click', () => {
      save();
      toast('Đã lưu Timesheet!', 'success');
    });

    // Auto-save shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
        toast('Đã lưu!', 'success');
      }
    });

    // Add row
    el('ts-add-row-btn')?.addEventListener('click', () => {
      sheet().rows.push(Array(sheet().cols.length).fill(''));
      renderGrid();
    });

    // Delete selected row
    el('ts-del-row-btn')?.addEventListener('click', () => {
      if (!selCell) { toast('Chọn một ô trước', 'warning'); return; }
      if (!confirm('Xóa hàng ' + (selCell.r + 1) + '?')) return;
      sheet().rows.splice(selCell.r, 1);
      selCell = null;
      isDirty = true;
      renderGrid();
    });

    // Fill today
    el('ts-today-btn')?.addEventListener('click', () => {
      const today = todayVN();
      if (selCell) {
        sheet().rows[selCell.r][selCell.c] = today;
      } else {
        // Find first empty date cell or add to last row
        const emptyRow = sheet().rows.find(r => !r[0]);
        if (emptyRow) emptyRow[0] = today;
        else sheet().rows.push([today, ...Array(sheet().cols.length - 1).fill('')]);
      }
      isDirty = true;
      renderGrid();
      toast('Đã điền ngày hôm nay: ' + today, 'success');
    });

    // Quick SUM column
    el('ts-sum-btn')?.addEventListener('click', () => {
      const ci = selCell ? selCell.c : sheet().cols.findIndex(c => c.type === 'number');
      if (ci < 0) { toast('Không tìm thấy cột số', 'warning'); return; }
      const last = sheet().rows.length;
      const formula = `=SUM(${colLabel(ci)}1:${colLabel(ci)}${last})`;
      sheet().rows.push(Array(sheet().cols.length).fill(''));
      sheet().rows[sheet().rows.length - 1][ci] = formula;
      isDirty = true;
      renderGrid();
      toast(`Đã thêm công thức ${formula}`, 'success');
    });

    // Add column
    el('ts-add-col-btn')?.addEventListener('click', () => {
      const name = prompt('Tên cột mới:', 'Cột mới');
      if (!name?.trim()) return;
      sheet().cols.push({ id: genId(), label: name.trim(), width: 130, type: 'text' });
      sheet().rows.forEach(row => row.push(''));
      isDirty = true;
      renderGrid();
    });

    // Add sheet
    el('ts-add-sheet-btn')?.addEventListener('click', () => {
      const name = prompt('Tên sheet:', `Sheet ${sheets.length + 1}`);
      sheets.push(newSheet(name || undefined));
      curSheet = sheets.length - 1;
      save();
      renderGrid();
      renderTabs();
    });

    // Formula bar
    el('ts-formula-input')?.addEventListener('change', (e) => {
      if (!selCell) return;
      sheet().rows[selCell.r][selCell.c] = e.target.value;
      isDirty = true;
      renderGrid();
    });

    // Date filter
    el('ts-date-filter')?.addEventListener('change', (e) => {
      const dateVal = e.target.value;
      el('ts-grid')?.querySelectorAll('tbody tr:not(.total-row)').forEach(tr => {
        const ri = +tr.dataset.ri;
        const rowDate = sheet().rows[ri]?.[0] || '';
        if (dateVal && rowDate !== dateVal) {
          tr.style.display = 'none';
        } else {
          tr.style.display = '';
        }
      });
    });

    // Stats toggle
    el('ts-stats-btn')?.addEventListener('click', () => {
      const panel = el('ts-stats-panel');
      if (!panel) return;
      panel.classList.toggle('d-none');
      if (!panel.classList.contains('d-none')) renderStats();
    });
    el('ts-stats-close')?.addEventListener('click', () => el('ts-stats-panel')?.classList.add('d-none'));

    // Categories toggle
    el('ts-cat-btn')?.addEventListener('click', () => {
      const panel = el('ts-cat-panel');
      panel.style.display = panel.style.display === 'none' ? '' : 'none';
      if (panel.style.display !== 'none') renderCategories();
    });

    el('ts-cat-add-btn')?.addEventListener('click', () => {
      el('ts-cat-input-row')?.classList.remove('d-none');
      el('ts-cat-input')?.focus();
    });
    el('ts-cat-cancel')?.addEventListener('click', () => {
      el('ts-cat-input-row')?.classList.add('d-none');
    });
    el('ts-cat-confirm')?.addEventListener('click', () => {
      const val = el('ts-cat-input')?.value.trim();
      if (val && !categories.includes(val)) {
        categories.push(val);
        save();
        renderCategories();
        toast('Đã thêm danh mục!', 'success');
      }
      el('ts-cat-input').value = '';
      el('ts-cat-input-row')?.classList.add('d-none');
    });

    // Export CSV
    el('ts-export-btn')?.addEventListener('click', () => {
      const s = sheet();
      const rows = [
        s.cols.map(c => c.label),
        ...s.rows.filter(r => r.some(v => v)).map(row =>
          row.map((cell, ci) => {
            if (cell.startsWith('=')) return String(evalFormula(cell.slice(1)));
            return cell;
          })
        ),
      ];
      downloadCSV(rows, `timesheet-${s.name}-${todayVN()}.csv`);
      toast('Đã xuất CSV!', 'success');
    });
  }

  function renderCategories() {
    const list = el('ts-cat-list');
    if (!list) return;
    list.innerHTML = categories.map((cat, i) => `
      <span class="tag-item">
        ${sanitize(cat)}
        <button class="tag-remove" data-idx="${i}" title="Xóa">×</button>
      </span>
    `).join('');
    list.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        categories.splice(+btn.dataset.idx, 1);
        save();
        renderCategories();
      });
    });
  }

  return { render };
})();
