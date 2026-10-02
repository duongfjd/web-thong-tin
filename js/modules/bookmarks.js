/* ================================================================
   modules/bookmarks.js
   Features: Add URL (with OG metadata fetch attempt),
             categories/tags, status (unread/read/archived),
             search, SSRF guard
   ================================================================ */

async function renderBookmarks(container) {
  let bookmarks = await DB.getAll('bookmarks');

  // Status labels
  const statusLabel = { unread: 'Chưa đọc', read: 'Đã đọc', archived: 'Lưu trữ' };
  const statusBadge = { unread: 'badge-warning', read: 'badge-success', archived: 'badge-muted' };

  const categories = ['Kỹ thuật', 'Bài viết hay', 'Tài liệu', 'Nghiên cứu', 'Video', 'Khác'];

  let filterStatus = 'all';
  let filterCat    = 'all';
  let searchQ      = '';

  function filtered() {
    return bookmarks
      .filter(b => filterStatus === 'all' || b.status === filterStatus)
      .filter(b => filterCat === 'all' || b.category === filterCat)
      .filter(b => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return (b.title || '').toLowerCase().includes(q) ||
               (b.url || '').toLowerCase().includes(q) ||
               (b.description || '').toLowerCase().includes(q) ||
               (b.tags || []).some(t => t.toLowerCase().includes(q));
      })
      .sort((a,b) => b.created_at.localeCompare(a.created_at));
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>Bookmarks</h2>
      <button class="btn-primary" id="bk-add-btn"><i class="bi bi-plus-lg"></i> Thêm URL</button>
    </div>

    <!-- Search + filters -->
    <div class="panel mb-4">
      <div class="panel-body">
        <div class="row g-2">
          <div class="col-12 col-md-5">
            <input id="bk-search" class="form-ctrl" placeholder="Tìm kiếm tiêu đề, URL, tag..." />
          </div>
          <div class="col-6 col-md-3">
            <select id="bk-status-filter" class="form-ctrl">
              <option value="all">Tất cả trạng thái</option>
              <option value="unread">Chưa đọc</option>
              <option value="read">Đã đọc</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>
          <div class="col-6 col-md-4">
            <select id="bk-cat-filter" class="form-ctrl">
              <option value="all">Tất cả danh mục</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Add form (hidden) -->
    <div id="bk-add-form" class="panel mb-4 d-none">
      <div class="panel-header"><span class="panel-title">Thêm bookmark mới</span></div>
      <div class="panel-body">
        <div class="row g-3">
          <div class="col-12">
            <div class="form-group">
              <label class="form-label">URL *</label>
              <input id="bk-url" class="form-ctrl" type="url" placeholder="https://..." />
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label class="form-label">Tiêu đề</label>
              <input id="bk-title" class="form-ctrl" placeholder="Tự động lấy từ trang nếu để trống" />
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label class="form-label">Danh mục</label>
              <select id="bk-cat" class="form-ctrl">
                ${categories.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="col-12">
            <div class="form-group">
              <label class="form-label">Mô tả</label>
              <textarea id="bk-desc" class="form-ctrl" rows="2" placeholder="Tóm tắt ngắn gọn..."></textarea>
            </div>
          </div>
          <div class="col-12">
            <div class="form-group">
              <label class="form-label">Tags (cách nhau bằng dấu phẩy)</label>
              <input id="bk-tags" class="form-ctrl" placeholder="javascript, tutorial, react" />
            </div>
          </div>
        </div>
        <div class="action-bar mt-2">
          <button class="btn-primary" id="bk-save-btn"><i class="bi bi-bookmark-plus"></i> Lưu</button>
          <button class="btn-secondary" id="bk-cancel-btn">Hủy</button>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="row g-2 mb-3">
      <div class="col-4">
        <div class="stat-card text-center py-2">
          <div class="stat-value" style="font-size:20px">${bookmarks.filter(b=>b.status==='unread').length}</div>
          <div class="stat-label">Chưa đọc</div>
        </div>
      </div>
      <div class="col-4">
        <div class="stat-card text-center py-2">
          <div class="stat-value" style="font-size:20px">${bookmarks.filter(b=>b.status==='read').length}</div>
          <div class="stat-label">Đã đọc</div>
        </div>
      </div>
      <div class="col-4">
        <div class="stat-card text-center py-2">
          <div class="stat-value" style="font-size:20px">${bookmarks.length}</div>
          <div class="stat-label">Tổng cộng</div>
        </div>
      </div>
    </div>

    <!-- Bookmark list -->
    <div class="panel">
      <div id="bk-list" class="panel-body p-0"></div>
    </div>
  `;

  // ── Render list ───────────────────────
  function renderList() {
    const listEl = el('bk-list');
    if (!listEl) return;
    const items = filtered();
    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><i class="bi bi-bookmark-x"></i><p>Không có bookmark nào phù hợp</p></div>`;
      return;
    }
    listEl.innerHTML = items.map(b => `
      <div class="item-row">
        <div class="item-row-icon" style="background:var(--clr-primary-dim);color:var(--clr-primary);font-size:18px">
          ${b.favicon ? `<img src="${sanitize(b.favicon)}" width="20" height="20" style="border-radius:4px;object-fit:cover" onerror="this.style.display='none'" />` : `<i class="bi bi-globe2"></i>`}
        </div>
        <div class="item-row-body">
          <div class="item-row-title">
            <a href="${sanitize(b.url)}" target="_blank" rel="noopener noreferrer">${sanitize(b.title || b.url)}</a>
          </div>
          ${b.description ? `<div class="item-row-sub">${sanitize(b.description.slice(0, 120))}</div>` : ''}
          <div class="mt-1 d-flex flex-wrap gap-1 align-items-center">
            <span class="badge-pill ${statusBadge[b.status] || 'badge-muted'}">${statusLabel[b.status] || b.status}</span>
            ${b.category ? `<span class="badge-pill badge-muted">${sanitize(b.category)}</span>` : ''}
            ${(b.tags||[]).map(t => `<span class="badge-pill badge-primary">${sanitize(t)}</span>`).join('')}
            <span class="text-muted ms-1" style="font-size:11px">${timeAgo(b.created_at)}</span>
          </div>
        </div>
        <div class="item-row-actions flex-column gap-1">
          <button class="btn-icon" data-bk-status="${b.id}" data-status="${b.status}" title="Đổi trạng thái">
            <i class="bi bi-${b.status === 'unread' ? 'eye' : b.status === 'read' ? 'archive' : 'arrow-counterclockwise'}"></i>
          </button>
          <button class="btn-icon" data-del-bk="${b.id}" title="Xóa"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    `).join('');

    // Status toggle: unread → read → archived → unread
    listEl.querySelectorAll('[data-bk-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.bkStatus;
        const cur = btn.dataset.status;
        const next = cur === 'unread' ? 'read' : cur === 'read' ? 'archived' : 'unread';
        const bk = bookmarks.find(b => b.id === id);
        if (!bk) return;
        bk.status = next;
        await DB.put('bookmarks', bk);
        renderList();
      });
    });

    // Delete
    listEl.querySelectorAll('[data-del-bk]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xóa bookmark này?')) return;
        await DB.del('bookmarks', btn.dataset.delBk);
        bookmarks = bookmarks.filter(b => b.id !== btn.dataset.delBk);
        renderList();
      });
    });
  }

  renderList();

  // ── Search & filter events ────────────
  el('bk-search')?.addEventListener('input', debounce(e => { searchQ = e.target.value; renderList(); }));
  el('bk-status-filter')?.addEventListener('change', e => { filterStatus = e.target.value; renderList(); });
  el('bk-cat-filter')?.addEventListener('change', e => { filterCat = e.target.value; renderList(); });

  // ── Add form toggle ───────────────────
  el('bk-add-btn')?.addEventListener('click', () => {
    el('bk-add-form')?.classList.toggle('d-none');
    el('bk-url')?.focus();
  });
  el('bk-cancel-btn')?.addEventListener('click', () => {
    el('bk-add-form')?.classList.add('d-none');
  });

  // Auto-fill title on URL blur
  el('bk-url')?.addEventListener('blur', async () => {
    const url = el('bk-url')?.value.trim();
    if (!url || !isSafeUrl(url)) return;
    // Try to fetch metadata via allorigins proxy (CORS bypass, public service)
    if (!el('bk-title')?.value) {
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const html = data.contents || '';
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const ogTitle    = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
        const ogDesc     = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
        if (el('bk-title')) el('bk-title').value = (ogTitle?.[1] || titleMatch?.[1] || '').trim();
        if (el('bk-desc') && !el('bk-desc').value) el('bk-desc').value = (ogDesc?.[1] || '').trim();
      } catch { /* silent fail */ }
    }
  });

  // ── Save bookmark ─────────────────────
  el('bk-save-btn')?.addEventListener('click', async () => {
    const url = el('bk-url')?.value.trim();
    if (!url) { toast('Nhập URL!', 'error'); return; }
    if (!isSafeUrl(url)) { toast('URL không hợp lệ hoặc không an toàn!', 'error'); return; }

    // Check duplicate
    if (bookmarks.some(b => b.url === url)) {
      toast('URL này đã được lưu!', 'error'); return;
    }

    const tagsRaw = el('bk-tags')?.value.trim();
    const bk = {
      id: genId(),
      url,
      title: el('bk-title')?.value.trim() || url,
      description: el('bk-desc')?.value.trim() || '',
      category: el('bk-cat')?.value || 'Khác',
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: 'unread',
      favicon: `https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}`,
      created_at: new Date().toISOString(),
    };

    await DB.put('bookmarks', bk);
    bookmarks.unshift(bk);

    // Reset form
    ['bk-url','bk-title','bk-desc','bk-tags'].forEach(id => { if (el(id)) el(id).value = ''; });
    el('bk-add-form')?.classList.add('d-none');
    toast('Đã lưu bookmark!', 'success');
    renderList();
  });
}
