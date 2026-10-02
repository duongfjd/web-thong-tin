/* ================================================================
   modules/clipboard.js — Universal Clipboard
   Features: Add text/link items, pin, copy, delete, auto-expire
   ================================================================ */

async function renderClipboard(container) {
  let items = await DB.getAll('clipboard');

  // Auto-expire: delete items older than configured days
  const expiryDays = parseInt(await DB.getSetting('clipboard_expiry_days', '30'));
  const expiryCutoff = new Date(Date.now() - expiryDays * 86400000).toISOString();
  const expired = items.filter(i => !i.pinned && i.created_at < expiryCutoff);
  for (const i of expired) await DB.del('clipboard', i.id);
  if (expired.length) items = items.filter(i => !expired.find(e => e.id === i.id));

  let filterKind = 'all';
  let searchQ    = '';

  function filtered() {
    return items
      .filter(i => filterKind === 'all' || i.kind === filterKind)
      .filter(i => !searchQ || i.content.toLowerCase().includes(searchQ.toLowerCase()))
      .sort((a,b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }

  function detectKind(text) {
    try {
      const url = new URL(text);
      if (['http:', 'https:'].includes(url.protocol)) return 'link';
    } catch { }
    return 'text';
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>Clipboard</h2>
      <div class="text-muted small">Tự xóa sau ${expiryDays} ngày (trừ item đã ghim)</div>
    </div>

    <!-- Add item -->
    <div class="quick-input-wrap mb-4">
      <textarea id="clip-input" class="form-ctrl" rows="3"
        placeholder="Dán text hoặc link vào đây rồi nhấn Thêm...&#10;&#10;Shortcut: Ctrl+Enter"></textarea>
      <div class="action-bar mt-2">
        <button class="btn-primary" id="clip-add-btn"><i class="bi bi-clipboard-plus"></i> Thêm</button>
        <button class="btn-secondary" id="clip-paste-btn"><i class="bi bi-clipboard"></i> Dán từ clipboard</button>
        <button class="btn-danger btn-sm ms-auto" id="clip-clear-btn" title="Xóa tất cả không ghim">
          <i class="bi bi-trash3"></i> Xóa cũ
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="d-flex gap-2 mb-3 flex-wrap align-items-center">
      <input id="clip-search" class="form-ctrl" style="max-width:240px" placeholder="Tìm kiếm..." />
      <button class="btn-ghost btn-sm ${filterKind==='all'?'active':''}" data-clip-kind="all">Tất cả</button>
      <button class="btn-ghost btn-sm" data-clip-kind="text"><i class="bi bi-fonts me-1"></i>Text</button>
      <button class="btn-ghost btn-sm" data-clip-kind="link"><i class="bi bi-link-45deg me-1"></i>Link</button>
      <span class="text-muted small ms-auto">${items.length} items</span>
    </div>

    <!-- List -->
    <div id="clip-list" class="panel"></div>
  `;

  // ── Render list ───────────────────────
  function renderList() {
    const listEl = el('clip-list');
    if (!listEl) return;
    const result = filtered();
    if (result.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><i class="bi bi-clipboard2-x"></i><p>Clipboard trống</p></div>`;
      return;
    }
    listEl.innerHTML = result.map(i => `
      <div class="item-row">
        <div class="item-row-icon" style="background:var(--clr-${i.kind==='link'?'primary':'success'}-dim);color:var(--clr-${i.kind==='link'?'primary':'success'})">
          <i class="bi bi-${i.kind === 'link' ? 'link-45deg' : 'fonts'} fs-5"></i>
        </div>
        <div class="item-row-body" style="min-width:0">
          ${i.kind === 'link'
            ? `<a href="${sanitize(i.content)}" target="_blank" rel="noopener noreferrer" class="item-row-title d-block">${sanitize(i.content)}</a>`
            : `<div class="item-row-title" style="white-space:pre-wrap;word-break:break-all;max-height:80px;overflow:hidden">${sanitize(i.content)}</div>`
          }
          <div class="item-row-sub mt-1">
            ${i.pinned ? `<span class="badge-pill badge-warning me-1"><i class="bi bi-pin-fill"></i> Ghim</span>` : ''}
            ${timeAgo(i.created_at)}
            • ${i.content.length} ký tự
          </div>
        </div>
        <div class="item-row-actions flex-column gap-1">
          <button class="btn-icon" data-clip-copy="${sanitize(i.id)}" title="Copy"><i class="bi bi-copy"></i></button>
          <button class="btn-icon" data-clip-pin="${sanitize(i.id)}" data-pinned="${i.pinned}" title="${i.pinned?'Bỏ ghim':'Ghim'}">
            <i class="bi bi-${i.pinned?'pin-angle':'pin'}"></i>
          </button>
          <button class="btn-icon" data-del-clip="${sanitize(i.id)}" title="Xóa"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-clip-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(i => i.id === btn.dataset.clipCopy);
        if (item) copyToClipboard(item.content);
      });
    });

    listEl.querySelectorAll('[data-clip-pin]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = items.find(i => i.id === btn.dataset.clipPin);
        if (!item) return;
        item.pinned = !item.pinned;
        await DB.put('clipboard', item);
        renderList();
      });
    });

    listEl.querySelectorAll('[data-del-clip]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await DB.del('clipboard', btn.dataset.delClip);
        items = items.filter(i => i.id !== btn.dataset.delClip);
        renderList();
      });
    });
  }

  renderList();

  // ── Filter events ─────────────────────
  el('clip-search')?.addEventListener('input', debounce(e => { searchQ = e.target.value; renderList(); }));

  container.querySelectorAll('[data-clip-kind]').forEach(btn => {
    btn.addEventListener('click', () => {
      filterKind = btn.dataset.clipKind;
      container.querySelectorAll('[data-clip-kind]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderList();
    });
  });

  // ── Add item ──────────────────────────
  async function addItem(content) {
    content = content.trim();
    if (!content) { toast('Nội dung trống!', 'error'); return; }
    if (items.some(i => i.content === content)) { toast('Đã có item này!', 'info'); return; }

    const item = {
      id: genId(),
      content,
      kind: detectKind(content),
      pinned: false,
      created_at: new Date().toISOString(),
    };
    await DB.put('clipboard', item);
    items.unshift(item);
    if (el('clip-input')) el('clip-input').value = '';
    toast('Đã thêm!', 'success');
    renderList();
  }

  el('clip-add-btn')?.addEventListener('click', () => {
    const val = el('clip-input')?.value || '';
    addItem(val);
  });

  el('clip-input')?.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') addItem(e.target.value);
  });

  el('clip-paste-btn')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (el('clip-input')) el('clip-input').value = text;
        toast('Đã dán từ clipboard!', 'info');
      }
    } catch {
      toast('Không thể đọc clipboard. Hãy dán tay!', 'error');
    }
  });

  el('clip-clear-btn')?.addEventListener('click', async () => {
    if (!confirm('Xóa tất cả item không ghim?')) return;
    const unpinned = items.filter(i => !i.pinned);
    for (const i of unpinned) await DB.del('clipboard', i.id);
    items = items.filter(i => i.pinned);
    toast(`Đã xóa ${unpinned.length} items!`, 'success');
    renderList();
  });
}
