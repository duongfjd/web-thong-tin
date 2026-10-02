/* ================================================================
   modules/scrapbook.js — Second Brain / Omni-Scrapbook
   Storage: IndexedDB (files/blobs) + Supabase Cloud Sync
   Features:
   - Paste (Ctrl+V): image, link, text auto-detection
   - Drag & Drop: PDF, PNG, JPG, DOCX, TXT
   - Preview: PDF viewer, image zoom, link info, note display
   - Filter tabs: All, Link, Document, Image, Note
   - Tag system + Pin to top
   - Realtime search
   - Sync & Pull with Supabase Cloud
   ================================================================ */

const Scrapbook = (() => {

  // ── IndexedDB setup ──────────────────────────────────────────────
  let _idb = null;
  const IDB_NAME    = 'pos_scrapbook';
  const IDB_VERSION = 1;
  const STORE       = 'items';

  async function openIDB() {
    if (_idb) return _idb;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('type',      'type',      { unique: false });
          store.createIndex('pinned',    'pinned',    { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = (e) => { _idb = e.target.result; resolve(_idb); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async function idbGetAll() {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => resolve([]);
    });
  }

  async function idbPut(item) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(item);
      req.onsuccess = () => resolve();
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async function idbDel(id) {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
    });
  }

  // ── Supabase Cloud Sync Helpers ──────────────────────────────────
  async function syncItemToSupabase(item) {
    const user = Auth.getUser();
    if (!user || user.id === 'local_user') {
      if (confirm('Bạn đang dùng chế độ Khách (Lưu trên máy). Đăng nhập tài khoản Supabase để lưu lên đám mây?')) {
        Auth.signOut();
      }
      return false;
    }

    try {
      // 1. Try scrapbook table
      const scrapRecord = {
        id:         item.id,
        user_id:    user.id,
        title:      item.title || 'Không có tiêu đề',
        content:    item.content || '',
        type:       item.type || 'note',
        mime_type:  item.mimeType || '',
        tags:       item.tags || [],
        pinned:     !!item.pinned,
        starred:    true,
        size:       item.size || 0,
        created_at: item.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await SB.from('scrapbook').upsert(scrapRecord);
      if (error) {
        // Fallback to snippets table if scrapbook table isn't created yet
        if (error.code === '42P01') {
          const snipRecord = {
            id:          item.id,
            user_id:     user.id,
            title:       item.title || 'Không có tiêu đề',
            body:        item.content || '',
            language:    item.type || 'text',
            tags:        item.tags || [],
            is_pinned:   !!item.pinned,
            created_at:  item.createdAt || new Date().toISOString(),
          };
          const { error: err2 } = await SB.from('snippets').upsert(snipRecord);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }

      item.starred = true;
      await idbPut(item);
      return true;
    } catch (err) {
      console.error('Supabase sync error', err);
      toast('Lỗi lưu Supabase: ' + (err.message || 'Không thành công'), 'error');
      return false;
    }
  }

  async function deleteItemFromSupabase(id) {
    try {
      await SB.from('scrapbook').delete().eq('id', id);
      await SB.from('snippets').delete().eq('id', id);
    } catch (e) {
      console.warn('Delete from Supabase warning', e);
    }
  }

  async function pullFromSupabase() {
    const user = Auth.getUser();
    if (!user || user.id === 'local_user') {
      toast('Vui lòng đăng nhập tài khoản Supabase để kéo dữ liệu', 'warning');
      return;
    }

    toast('Đang tải dữ liệu từ Supabase Cloud...', 'info');

    let cloudItems = [];
    try {
      const { data: sData, error: sErr } = await SB.from('scrapbook').select('*');
      if (!sErr && sData && sData.length > 0) {
        cloudItems = sData.map(r => ({
          id:        r.id,
          title:     r.title,
          content:   r.content,
          type:      r.type || 'note',
          mimeType:  r.mime_type || '',
          tags:      r.tags || [],
          pinned:    !!r.pinned,
          starred:   true,
          size:      r.size || 0,
          createdAt: r.created_at,
        }));
      } else {
        const { data: snipData, error: snipErr } = await SB.from('snippets').select('*');
        if (!snipErr && snipData && snipData.length > 0) {
          cloudItems = snipData.map(r => ({
            id:        r.id,
            title:     r.title,
            content:   r.body,
            type:      r.language || 'note',
            mimeType:  '',
            tags:      r.tags || [],
            pinned:    !!r.is_pinned,
            starred:   true,
            size:      0,
            createdAt: r.created_at,
          }));
        }
      }
    } catch (e) {
      console.error('Pull from Supabase failed', e);
    }

    if (cloudItems.length === 0) {
      toast('Chưa có dữ liệu nào trên Supabase Cloud', 'info');
      return;
    }

    for (const item of cloudItems) {
      await idbPut(item);
      const existingIdx = allItems.findIndex(i => i.id === item.id);
      if (existingIdx >= 0) allItems[existingIdx] = item;
      else allItems.unshift(item);
    }

    renderGrid();
    toast(`Đã kéo thành công ${cloudItems.length} mục từ Supabase!`, 'success');
  }

  async function syncAllToSupabase() {
    const user = Auth.getUser();
    if (!user || user.id === 'local_user') {
      if (confirm('Bạn cần đăng nhập tài khoản Supabase để đồng bộ. Đăng nhập ngay?')) {
        Auth.signOut();
      }
      return;
    }

    if (allItems.length === 0) {
      toast('Chưa có mục nào để đồng bộ', 'info');
      return;
    }

    toast(`Đang đồng bộ ${allItems.length} mục lên Supabase...`, 'info');
    let successCount = 0;
    for (const item of allItems) {
      const ok = await syncItemToSupabase(item);
      if (ok) successCount++;
    }
    renderGrid();
    toast(`Đã đồng bộ ${successCount}/${allItems.length} mục lên Supabase!`, 'success');
  }

  // ── Create item helpers ──────────────────────────────────────────
  function makeItem(type, data) {
    return {
      id:        genId(),
      type,      // 'link' | 'image' | 'document' | 'note' | 'file'
      title:     data.title  || '',
      content:   data.content || '',  // text/url/dataURL
      mimeType:  data.mimeType || '',
      tags:      data.tags || [],
      pinned:    false,
      starred:   !!data.starred,     // starred = synced to Supabase
      createdAt: new Date().toISOString(),
      size:      data.size || 0,
    };
  }

  function detectPasteType(text) {
    if (/^https?:\/\//i.test(text)) return 'link';
    return 'note';
  }

  // ── State ────────────────────────────────────────────────────────
  let allItems  = [];
  let filterType = 'all';
  let searchQ    = '';
  let container_ref = null;
  let _previewItem  = null;

  // ── Render ───────────────────────────────────────────────────────
  async function render(container) {
    container_ref = container;
    allItems = await idbGetAll();
    allItems.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const user = Auth.getUser();
    const isCloudUser = user && user.id !== 'local_user';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2><i class="bi bi-journal-bookmark me-2"></i>Second Brain</h2>
          <div class="small text-muted mt-1">
            <span class="badge-pill ${isCloudUser ? 'badge-success' : 'badge-muted'}" style="font-size:11px">
              <i class="bi ${isCloudUser ? 'bi-cloud-check-fill' : 'bi-hdd'} me-1"></i>
              ${isCloudUser ? `Supabase: ${sanitize(user.email || 'Đã kết nối')}` : 'Chế độ lưu cục bộ (Offline)'}
            </span>
          </div>
        </div>

        <div class="action-bar">
          <!-- Supabase Sync Actions -->
          <button class="btn-secondary btn-sm" id="sb-sync-all-btn" title="Tải tất cả lên Supabase Cloud">
            <i class="bi bi-cloud-arrow-up text-primary"></i> <span class="d-none d-sm-inline">Lưu</span> Supabase
          </button>
          <button class="btn-secondary btn-sm" id="sb-pull-cloud-btn" title="Kéo dữ liệu từ Supabase Cloud về máy">
            <i class="bi bi-cloud-download text-success"></i> <span class="d-none d-sm-inline">Kéo về</span>
          </button>

          <button class="btn-primary btn-sm" id="sb-add-note-btn"><i class="bi bi-plus-lg"></i> Ghi chú</button>
          <button class="btn-secondary btn-sm" id="sb-add-link-btn"><i class="bi bi-link-45deg"></i> Link</button>
        </div>
      </div>

      <!-- Drop zone -->
      <div class="drop-zone mb-4" id="sb-drop-zone">
        <i class="bi bi-cloud-arrow-up"></i>
        <p class="mb-1"><strong>Kéo & Thả file vào đây</strong> (PDF, ảnh, Word, TXT...)</p>
        <p class="text-muted" style="font-size:12px">Hoặc nhấn <kbd class="kbd">Ctrl+V</kbd> để dán link / ảnh từ clipboard</p>
      </div>

      <!-- Filter + Search -->
      <div class="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <div class="filter-tabs" id="sb-filter-tabs">
          <button class="filter-tab ${filterType === 'all'      ? 'active' : ''}" data-type="all">Tất cả <span class="badge-pill badge-muted ms-1">${allItems.length}</span></button>
          <button class="filter-tab ${filterType === 'link'     ? 'active' : ''}" data-type="link">🔗 Link</button>
          <button class="filter-tab ${filterType === 'document' ? 'active' : ''}" data-type="document">📄 Tài liệu</button>
          <button class="filter-tab ${filterType === 'image'    ? 'active' : ''}" data-type="image">🖼️ Hình</button>
          <button class="filter-tab ${filterType === 'note'     ? 'active' : ''}" data-type="note">📝 Ghi chú</button>
          <button class="filter-tab ${filterType === 'cloud'    ? 'active' : ''}" data-type="cloud">☁️ Supabase Cloud</button>
        </div>
        <div class="search-wrap" style="flex:1;min-width:160px">
          <i class="bi bi-search"></i>
          <input class="search-input" id="sb-search" placeholder="Tìm kiếm..." value="${sanitize(searchQ)}" />
        </div>
      </div>

      <!-- Grid -->
      <div class="scrap-grid" id="sb-grid"></div>

      <!-- Preview Modal (shared) -->
      <div class="modal-overlay preview-modal d-none" id="sb-preview-modal">
        <div class="modal-box modal-lg">
          <div class="modal-header">
            <span class="modal-title" id="sb-preview-title">Xem trước</span>
            <div class="d-flex gap-2 align-items-center">
              <button class="btn-secondary btn-sm d-flex align-items-center gap-1" id="sb-preview-star" title="Lưu/Gỡ khỏi Supabase Cloud">
                <i class="bi bi-cloud-arrow-up"></i>
                <span id="sb-preview-star-text">Lưu Supabase</span>
              </button>
              <button class="btn-icon" id="sb-preview-pin" title="Ghim"><i class="bi bi-pin"></i></button>
              <button class="btn-icon" id="sb-preview-download" title="Tải về / Copy"><i class="bi bi-download"></i></button>
              <button class="btn-icon" id="sb-preview-del" title="Xóa" style="color:var(--clr-danger)"><i class="bi bi-trash3"></i></button>
              <button class="btn-icon" id="sb-preview-close"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>
          <div class="modal-body" id="sb-preview-body"></div>
          <div class="modal-footer">
            <div id="sb-preview-tags" class="tag-list" style="flex:1"></div>
            <input id="sb-tag-input" class="form-ctrl btn-sm" style="width:auto" placeholder="#tag" />
            <button class="btn-secondary btn-sm" id="sb-tag-add-btn"><i class="bi bi-plus"></i></button>
          </div>
        </div>
      </div>

      <!-- Add Note Modal -->
      <div class="modal-overlay d-none" id="sb-note-modal">
        <div class="modal-box">
          <div class="modal-header">
            <span class="modal-title">Thêm ghi chú / code</span>
            <button class="btn-icon" id="sb-note-close"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Tiêu đề</label>
              <input id="sb-note-title" class="form-ctrl" placeholder="Tên ghi chú..." />
            </div>
            <div class="form-group">
              <label class="form-label">Nội dung</label>
              <textarea id="sb-note-content" class="form-ctrl" rows="8" placeholder="Nhập ghi chú, code, text..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Tags</label>
              <input id="sb-note-tags" class="form-ctrl" placeholder="#congviec, #quantrong" />
            </div>
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" id="sb-note-sync-supabase" ${isCloudUser ? 'checked' : ''}>
              <label class="form-check-label text-muted small" for="sb-note-sync-supabase">
                <i class="bi bi-cloud-arrow-up text-primary me-1"></i>Đồng thời lưu lên Supabase Cloud
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" id="sb-note-cancel">Hủy</button>
            <button class="btn-primary" id="sb-note-save">Lưu</button>
          </div>
        </div>
      </div>

      <!-- Add Link Modal -->
      <div class="modal-overlay d-none" id="sb-link-modal">
        <div class="modal-box">
          <div class="modal-header">
            <span class="modal-title">Thêm Link</span>
            <button class="btn-icon" id="sb-link-close"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">URL</label>
              <input id="sb-link-url" class="form-ctrl" type="url" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label class="form-label">Tiêu đề (tùy chọn)</label>
              <input id="sb-link-title" class="form-ctrl" placeholder="Tự động lấy từ URL nếu bỏ trống" />
            </div>
            <div class="form-group">
              <label class="form-label">Tags</label>
              <input id="sb-link-tags" class="form-ctrl" placeholder="#congviec, #docs" />
            </div>
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" id="sb-link-sync-supabase" ${isCloudUser ? 'checked' : ''}>
              <label class="form-check-label text-muted small" for="sb-link-sync-supabase">
                <i class="bi bi-cloud-arrow-up text-primary me-1"></i>Đồng thời lưu lên Supabase Cloud
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" id="sb-link-cancel">Hủy</button>
            <button class="btn-primary" id="sb-link-save">Lưu</button>
          </div>
        </div>
      </div>
    `;

    renderGrid();
    bindEvents(container);
  }

  // ── Render grid ─────────────────────────────────────────────────
  function renderGrid() {
    const grid = el('sb-grid');
    if (!grid) return;

    let items = allItems;

    // Filter
    if (filterType === 'cloud') {
      items = items.filter(i => i.starred);
    } else if (filterType !== 'all') {
      items = items.filter(i => i.type === filterType);
    }

    // Search
    if (searchQ) {
      const q = searchQ.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.content || '').toLowerCase().includes(q) ||
        (i.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="bi bi-journal-x"></i>
        <p>Chưa có mục nào ${filterType === 'cloud' ? 'được lưu trên Supabase Cloud' : ''}. Kéo thả file, dán link, hoặc thêm ghi chú!</p>
      </div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const thumb = getThumb(item);
      const icon  = getIcon(item);
      const pinBadge = item.pinned ? `<span class="badge-pill badge-warning" style="position:absolute;top:6px;left:6px;font-size:10px;z-index:2"><i class="bi bi-pin-fill"></i></span>` : '';
      const cloudBadge = item.starred ? `<span class="badge-pill badge-success" style="position:absolute;top:6px;right:6px;font-size:10px;z-index:2" title="Đã lưu Supabase Cloud"><i class="bi bi-cloud-check-fill me-1"></i>Cloud</span>` : '';

      return `
        <div class="scrap-card ${item.pinned ? 'pinned' : ''}" data-id="${item.id}" data-type="${item.type}">
          ${pinBadge}
          ${cloudBadge}
          <div class="scrap-card-thumb">
            ${thumb}
          </div>
          <div class="scrap-card-body">
            <div class="scrap-card-title">${sanitize(item.title || 'Không có tiêu đề')}</div>
            <div class="scrap-card-meta">
              <span>${icon}</span>
              <span class="truncate">${sanitize(item.type)}</span>
              <span class="ms-auto" style="white-space:nowrap">${relativeTime(item.createdAt)}</span>
            </div>
            ${item.tags && item.tags.length ? `<div class="tag-list mt-1" style="flex-wrap:nowrap;overflow:hidden">
              ${item.tags.slice(0,3).map(t => `<span class="badge-pill badge-muted" style="font-size:10px">#${sanitize(t)}</span>`).join('')}
            </div>` : ''}
          </div>
          <div class="scrap-card-actions">
            <button class="btn-icon ${item.starred ? 'text-success' : ''}" style="width:28px;height:28px;background:var(--clr-surface)" data-cloud="${item.id}" title="${item.starred ? 'Đã lưu trên Supabase Cloud (Click để gỡ)' : 'Lưu vào Supabase Cloud'}">
              <i class="bi bi-cloud-${item.starred ? 'check-fill text-success' : 'arrow-up'}"></i>
            </button>
            <button class="btn-icon" style="width:28px;height:28px;background:var(--clr-surface)" data-pin="${item.id}" title="Ghim"><i class="bi bi-pin${item.pinned ? '-fill text-warning' : ''}"></i></button>
            <button class="btn-icon" style="width:28px;height:28px;background:var(--clr-surface);color:var(--clr-danger)" data-del="${item.id}" title="Xóa"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      `;
    }).join('');

    // Card click → preview
    grid.querySelectorAll('.scrap-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-pin]') || e.target.closest('[data-del]') || e.target.closest('[data-cloud]')) return;
        const id = card.dataset.id;
        const item = allItems.find(i => i.id === id);
        if (item) showPreview(item);
      });
    });

    // Cloud direct toggle
    grid.querySelectorAll('[data-cloud]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.cloud;
        const item = allItems.find(i => i.id === id);
        if (!item) return;

        if (!item.starred) {
          btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;
          const ok = await syncItemToSupabase(item);
          if (ok) {
            toast('Đã lưu vào Supabase Cloud!', 'success');
          }
        } else {
          await deleteItemFromSupabase(item.id);
          item.starred = false;
          await idbPut(item);
          toast('Đã gỡ khỏi Supabase Cloud', 'info');
        }
        renderGrid();
      });
    });

    // Pin
    grid.querySelectorAll('[data-pin]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = allItems.find(i => i.id === btn.dataset.pin);
        if (!item) return;
        item.pinned = !item.pinned;
        await idbPut(item);
        allItems = await idbGetAll();
        allItems.sort((a, b) => {
          if (a.pinned !== b.pinned) return b.pinned - a.pinned;
          return b.createdAt.localeCompare(a.createdAt);
        });
        renderGrid();
        toast(item.pinned ? 'Đã ghim!' : 'Đã bỏ ghim', 'success');
      });
    });

    // Delete
    grid.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Xóa mục này?')) return;
        await idbDel(btn.dataset.del);
        await deleteItemFromSupabase(btn.dataset.del);
        allItems = allItems.filter(i => i.id !== btn.dataset.del);
        renderGrid();
        toast('Đã xóa', 'success');
      });
    });
  }

  function getThumb(item) {
    if (item.type === 'image' && item.content) {
      return `<img src="${item.content}" alt="${sanitize(item.title)}" style="width:100%;height:100%;object-fit:cover" loading="lazy" />`;
    }
    if (item.type === 'link') {
      try {
        const domain = new URL(item.content).hostname;
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <i class="bi bi-globe2" style="font-size:28px;color:var(--clr-primary)"></i>
          <span style="font-size:11px;color:var(--clr-muted)">${domain}</span>
        </div>`;
      } catch { return '<i class="bi bi-link-45deg"></i>'; }
    }
    if (item.type === 'document') {
      const isP = item.mimeType === 'application/pdf';
      return `<i class="bi bi-${isP ? 'file-pdf text-danger' : 'file-earmark-word text-primary'}" style="font-size:36px"></i>`;
    }
    if (item.type === 'note') {
      const preview = (item.content || '').slice(0, 80);
      return `<div style="padding:8px;font-size:11px;color:var(--clr-muted);text-align:left;overflow:hidden;max-height:100%">${sanitize(preview)}</div>`;
    }
    return '<i class="bi bi-file-earmark"></i>';
  }

  function getIcon(item) {
    const icons = { link: '🔗', image: '🖼️', document: '📄', note: '📝', file: '📁' };
    return icons[item.type] || '📁';
  }

  // ── Show Preview ─────────────────────────────────────────────────
  function showPreview(item) {
    _previewItem = item;
    const modal = el('sb-preview-modal');
    if (!modal) return;

    el('sb-preview-title').textContent = item.title || 'Xem trước';

    // Update cloud button in preview
    const cloudBtn  = el('sb-preview-star');
    const cloudText = el('sb-preview-star-text');
    if (cloudBtn && cloudText) {
      cloudBtn.className = `btn btn-sm d-flex align-items-center gap-1 ${item.starred ? 'btn-success text-white' : 'btn-secondary'}`;
      cloudBtn.querySelector('i').className = `bi bi-cloud-${item.starred ? 'check-fill' : 'arrow-up'}`;
      cloudText.textContent = item.starred ? 'Đã lưu Supabase' : 'Lưu Supabase';
    }

    const pinBtn = el('sb-preview-pin');
    if (pinBtn) pinBtn.innerHTML = `<i class="bi bi-pin${item.pinned ? '-fill text-warning' : ''}"></i>`;

    const body = el('sb-preview-body');
    if (item.type === 'image') {
      body.innerHTML = `<img src="${item.content}" class="img-viewer" alt="${sanitize(item.title)}" />`;
    } else if (item.type === 'document' && item.mimeType === 'application/pdf') {
      body.innerHTML = `<iframe src="${item.content}" class="pdf-viewer"></iframe>`;
    } else if (item.type === 'link') {
      body.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-link-45deg fs-1 text-primary"></i>
          <h5 class="mt-2">${sanitize(item.title)}</h5>
          <a href="${sanitize(item.content)}" target="_blank" rel="noopener" class="text-break">${sanitize(item.content)}</a>
          <div class="mt-3">
            <button class="btn-primary btn-sm" onclick="WebOpener.openModal('${sanitize(item.content)}')">
              <i class="bi bi-window me-1"></i> Mở trong Web Opener
            </button>
            <a href="${sanitize(item.content)}" target="_blank" rel="noopener" class="btn-secondary btn-sm ms-2">
              <i class="bi bi-box-arrow-up-right me-1"></i> Mở tab mới
            </a>
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `<div class="note-viewer">${sanitize(item.content)}</div>`;
    }

    renderPreviewTags(item);
    modal.classList.remove('d-none');
  }

  function renderPreviewTags(item) {
    const wrap = el('sb-preview-tags');
    if (!wrap) return;
    wrap.innerHTML = (item.tags || []).map((t, idx) => `
      <span class="badge-pill badge-muted" style="font-size:11px">
        #${sanitize(t)}
        <span style="cursor:pointer;margin-left:4px" data-rmtag="${idx}">×</span>
      </span>
    `).join('');

    wrap.querySelectorAll('[data-rmtag]').forEach(btn => {
      btn.addEventListener('click', async () => {
        item.tags.splice(+btn.dataset.rmtag, 1);
        await idbPut(item);
        if (item.starred) await syncItemToSupabase(item);
        renderPreviewTags(item);
        renderGrid();
      });
    });
  }

  // ── Bind Events ──────────────────────────────────────────────────
  function bindEvents(container) {
    // Filter tabs
    el('sb-filter-tabs')?.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        el('sb-filter-tabs').querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterType = btn.dataset.type;
        renderGrid();
      });
    });

    // Supabase actions
    el('sb-sync-all-btn')?.addEventListener('click', syncAllToSupabase);
    el('sb-pull-cloud-btn')?.addEventListener('click', pullFromSupabase);

    // Search
    el('sb-search')?.addEventListener('input', (e) => {
      searchQ = e.target.value;
      renderGrid();
    });

    // Drop zone
    const dropZone = el('sb-drop-zone');
    dropZone?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '*/*';
      input.onchange = (e) => handleFiles([...e.target.files]);
      input.click();
    });
    dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFiles([...e.dataTransfer.files]);
    });

    // Paste handler (global when on this page)
    const pasteHandler = async (e) => {
      if (!document.querySelector('#sb-grid')) return;

      const items = [...(e.clipboardData?.items || [])];

      // Check for image
      const imgItem = items.find(i => i.type.startsWith('image/'));
      if (imgItem) {
        const blob = imgItem.getAsFile();
        await handleFiles([blob]);
        return;
      }

      // Text
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text) {
        const type = detectPasteType(text);
        let title = type === 'link' ? text : text.slice(0, 60);
        const item = makeItem(type, { title, content: text });
        await idbPut(item);
        allItems.unshift(item);
        renderGrid();
        toast(`Đã dán ${type === 'link' ? 'link' : 'ghi chú'}!`, 'success');
      }
    };
    document.addEventListener('paste', pasteHandler);

    // Preview close
    el('sb-preview-close')?.addEventListener('click', () => el('sb-preview-modal')?.classList.add('d-none'));
    el('sb-preview-modal')?.addEventListener('click', (e) => {
      if (e.target === el('sb-preview-modal')) el('sb-preview-modal').classList.add('d-none');
    });

    // Preview pin
    el('sb-preview-pin')?.addEventListener('click', async () => {
      if (!_previewItem) return;
      _previewItem.pinned = !_previewItem.pinned;
      await idbPut(_previewItem);
      if (_previewItem.starred) await syncItemToSupabase(_previewItem);
      allItems = await idbGetAll();
      allItems.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned - a.pinned;
        return b.createdAt.localeCompare(a.createdAt);
      });
      el('sb-preview-pin').innerHTML = `<i class="bi bi-pin${_previewItem.pinned ? '-fill text-warning' : ''}"></i>`;
      renderGrid();
      toast(_previewItem.pinned ? 'Đã ghim!' : 'Bỏ ghim', 'success');
    });

    // Preview cloud sync button
    el('sb-preview-star')?.addEventListener('click', async () => {
      if (!_previewItem) return;
      const cloudBtn  = el('sb-preview-star');
      const cloudText = el('sb-preview-star-text');

      if (!_previewItem.starred) {
        cloudBtn.disabled = true;
        cloudText.textContent = 'Đang lưu...';
        const ok = await syncItemToSupabase(_previewItem);
        cloudBtn.disabled = false;
        if (ok) {
          toast('Đã lưu lên Supabase Cloud!', 'success');
          cloudBtn.className = 'btn btn-sm btn-success text-white d-flex align-items-center gap-1';
          cloudBtn.querySelector('i').className = 'bi bi-cloud-check-fill';
          cloudText.textContent = 'Đã lưu Supabase';
        } else {
          cloudText.textContent = 'Lưu Supabase';
        }
      } else {
        await deleteItemFromSupabase(_previewItem.id);
        _previewItem.starred = false;
        await idbPut(_previewItem);
        toast('Đã gỡ khỏi Supabase Cloud', 'info');
        cloudBtn.className = 'btn btn-sm btn-secondary d-flex align-items-center gap-1';
        cloudBtn.querySelector('i').className = 'bi bi-cloud-arrow-up';
        cloudText.textContent = 'Lưu Supabase';
      }
      renderGrid();
    });

    // Preview delete
    el('sb-preview-del')?.addEventListener('click', async () => {
      if (!_previewItem || !confirm('Xóa mục này?')) return;
      await idbDel(_previewItem.id);
      await deleteItemFromSupabase(_previewItem.id);
      allItems = allItems.filter(i => i.id !== _previewItem.id);
      el('sb-preview-modal')?.classList.add('d-none');
      renderGrid();
      toast('Đã xóa', 'success');
    });

    // Preview download / copy
    el('sb-preview-download')?.addEventListener('click', () => {
      if (!_previewItem) return;
      if (_previewItem.content.startsWith('data:') || _previewItem.content.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = _previewItem.content;
        a.download = _previewItem.title || 'download';
        a.click();
      } else {
        navigator.clipboard.writeText(_previewItem.content);
        toast('Đã copy nội dung!', 'success');
      }
    });

    // Tag add
    el('sb-tag-add-btn')?.addEventListener('click', async () => {
      if (!_previewItem) return;
      const tag = el('sb-tag-input')?.value.replace(/^#/, '').trim();
      if (tag && !_previewItem.tags.includes(tag)) {
        _previewItem.tags.push(tag);
        await idbPut(_previewItem);
        if (_previewItem.starred) await syncItemToSupabase(_previewItem);
        renderPreviewTags(_previewItem);
      }
      if (el('sb-tag-input')) el('sb-tag-input').value = '';
    });

    // Add note
    el('sb-add-note-btn')?.addEventListener('click', () => el('sb-note-modal')?.classList.remove('d-none'));
    el('sb-note-close')?.addEventListener('click', () => el('sb-note-modal')?.classList.add('d-none'));
    el('sb-note-cancel')?.addEventListener('click', () => el('sb-note-modal')?.classList.add('d-none'));
    el('sb-note-save')?.addEventListener('click', async () => {
      const title   = el('sb-note-title')?.value.trim();
      const content = el('sb-note-content')?.value.trim();
      const syncCloud = el('sb-note-sync-supabase')?.checked;

      if (!content) { toast('Nhập nội dung!', 'warning'); return; }
      const tags = (el('sb-note-tags')?.value || '').split(/[,\s#]+/).filter(Boolean);
      const item = makeItem('note', { title: title || content.slice(0, 50), content, tags });
      await idbPut(item);

      if (syncCloud) {
        await syncItemToSupabase(item);
      }

      allItems.unshift(item);
      el('sb-note-modal')?.classList.add('d-none');
      el('sb-note-title').value = el('sb-note-content').value = el('sb-note-tags').value = '';
      renderGrid();
      toast('Đã lưu ghi chú' + (syncCloud ? ' và đồng bộ Supabase!' : '!'), 'success');
    });

    // Add link
    el('sb-add-link-btn')?.addEventListener('click', () => el('sb-link-modal')?.classList.remove('d-none'));
    el('sb-link-close')?.addEventListener('click', () => el('sb-link-modal')?.classList.add('d-none'));
    el('sb-link-cancel')?.addEventListener('click', () => el('sb-link-modal')?.classList.add('d-none'));
    el('sb-link-save')?.addEventListener('click', async () => {
      const url   = el('sb-link-url')?.value.trim();
      const title = el('sb-link-title')?.value.trim();
      const syncCloud = el('sb-link-sync-supabase')?.checked;

      if (!url) { toast('Nhập URL!', 'warning'); return; }
      const tags = (el('sb-link-tags')?.value || '').split(/[,\s#]+/).filter(Boolean);
      let finalTitle = title;
      if (!finalTitle) {
        try { finalTitle = new URL(url).hostname; } catch { finalTitle = url.slice(0, 60); }
      }
      const item = makeItem('link', { title: finalTitle, content: url, tags });
      await idbPut(item);

      if (syncCloud) {
        await syncItemToSupabase(item);
      }

      allItems.unshift(item);
      el('sb-link-modal')?.classList.add('d-none');
      el('sb-link-url').value = el('sb-link-title').value = el('sb-link-tags').value = '';
      renderGrid();
      toast('Đã lưu link' + (syncCloud ? ' và đồng bộ Supabase!' : '!'), 'success');
    });
  }

  // ── Handle file drop / select ────────────────────────────────────
  async function handleFiles(files) {
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isPDF   = file.type === 'application/pdf';
      const type    = isImage ? 'image' : isPDF ? 'document' : 'file';

      const dataURL = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const item = makeItem(type, {
        title:    file.name,
        content:  dataURL,
        mimeType: file.type,
        size:     file.size,
      });
      await idbPut(item);
      allItems.unshift(item);
    }
    renderGrid();
    toast(`Đã lưu ${files.length} file!`, 'success');
  }

  return { render };
})();
