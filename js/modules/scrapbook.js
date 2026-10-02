/* ================================================================
   modules/scrapbook.js — Second Brain / Omni-Scrapbook
   Storage: IndexedDB (files/blobs) + Supabase (important items)
   Features:
   - Paste (Ctrl+V): image, link, text auto-detection
   - Drag & Drop: PDF, PNG, JPG, DOCX, TXT
   - Preview: PDF viewer, image zoom, link info, note display
   - Filter tabs: All, Link, Document, Image, Note
   - Tag system + Pin to top
   - Realtime search
   - Sync important items to Supabase
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
      starred:   false,     // starred = synced to Supabase
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

  // ── Render ───────────────────────────────────────────────────────
  async function render(container) {
    container_ref = container;
    allItems = await idbGetAll();
    allItems.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.createdAt.localeCompare(a.createdAt);
    });

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="bi bi-journal-bookmark me-2"></i>Second Brain</h2>
        <div class="action-bar">
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
            <div class="d-flex gap-1">
              <button class="btn-icon" id="sb-preview-pin" title="Ghim"><i class="bi bi-pin"></i></button>
              <button class="btn-icon" id="sb-preview-star" title="Lưu Supabase"><i class="bi bi-star"></i></button>
              <button class="btn-icon" id="sb-preview-download" title="Tải về"><i class="bi bi-download"></i></button>
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
    if (filterType !== 'all') {
      items = items.filter(i => i.type === filterType);
    }

    // Search
    if (searchQ) {
      const q = searchQ.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="bi bi-journal-x"></i>
        <p>Chưa có mục nào. Kéo thả file, dán link, hoặc thêm ghi chú!</p>
      </div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const thumb = getThumb(item);
      const icon  = getIcon(item);
      const pinBadge = item.pinned ? `<span class="badge-pill badge-warning" style="position:absolute;top:6px;left:6px;font-size:10px"><i class="bi bi-pin-fill"></i></span>` : '';
      const starBadge = item.starred ? `<span class="badge-pill badge-success" style="position:absolute;top:6px;left:${item.pinned ? '56px' : '6px'};font-size:10px"><i class="bi bi-star-fill"></i></span>` : '';

      return `
        <div class="scrap-card ${item.pinned ? 'pinned' : ''}" data-id="${item.id}" data-type="${item.type}">
          ${pinBadge}${starBadge}
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
            ${item.tags.length ? `<div class="tag-list mt-1" style="flex-wrap:nowrap;overflow:hidden">
              ${item.tags.slice(0,3).map(t => `<span class="badge-pill badge-muted" style="font-size:10px">#${sanitize(t)}</span>`).join('')}
            </div>` : ''}
          </div>
          <div class="scrap-card-actions">
            <button class="btn-icon" style="width:28px;height:28px;background:var(--clr-surface)" data-pin="${item.id}" title="Ghim"><i class="bi bi-pin${item.pinned ? '-fill' : ''}"></i></button>
            <button class="btn-icon" style="width:28px;height:28px;background:var(--clr-surface);color:var(--clr-danger)" data-del="${item.id}" title="Xóa"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      `;
    }).join('');

    // Card click → preview
    grid.querySelectorAll('.scrap-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-pin]') || e.target.closest('[data-del]')) return;
        const id = card.dataset.id;
        const item = allItems.find(i => i.id === id);
        if (item) showPreview(item);
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
      const preview = item.content.slice(0, 80);
      return `<div style="padding:8px;font-size:11px;color:var(--clr-muted);text-align:left;overflow:hidden;max-height:100%">${sanitize(preview)}</div>`;
    }
    return '<i class="bi bi-file-earmark"></i>';
  }

  function getIcon(item) {
    const icons = { link: '🔗', image: '🖼️', document: '📄', note: '📝', file: '📁' };
    return icons[item.type] || '📁';
  }

  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return m + ' phút trước';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' giờ trước';
    const d = Math.floor(h / 24);
    return d + ' ngày trước';
  }

  // ── Preview ─────────────────────────────────────────────────────
  let _previewItem = null;

  function showPreview(item) {
    _previewItem = item;
    const modal = el('sb-preview-modal');
    const body  = el('sb-preview-body');
    const titleEl = el('sb-preview-title');
    if (!modal || !body) return;

    titleEl.textContent = item.title || 'Xem trước';
    modal.classList.remove('d-none');

    // Render preview content
    if (item.type === 'image') {
      body.innerHTML = `<img class="img-viewer" src="${item.content}" alt="${sanitize(item.title)}" />`;
    } else if (item.type === 'document' && item.mimeType === 'application/pdf') {
      body.innerHTML = `<iframe class="pdf-viewer" src="${item.content}"></iframe>`;
    } else if (item.type === 'link') {
      body.innerHTML = `
        <div class="text-center py-3">
          <i class="bi bi-globe2" style="font-size:48px;color:var(--clr-primary)"></i>
          <h5 class="mt-3">${sanitize(item.title)}</h5>
          <p class="text-muted mb-4">${sanitize(item.content)}</p>
          <div class="d-flex gap-2 justify-content-center flex-wrap">
            <button class="btn-primary" onclick="WebOpener.openModal('${sanitize(item.content)}')">
              <i class="bi bi-window"></i> Mở trong cửa sổ
            </button>
            <button class="btn-secondary" onclick="window.open('${sanitize(item.content)}','_blank')">
              <i class="bi bi-box-arrow-up-right"></i> Tab mới
            </button>
            <button class="btn-secondary" onclick="navigator.clipboard.writeText('${sanitize(item.content)}')">
              <i class="bi bi-copy"></i> Copy URL
            </button>
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `<div class="note-viewer">${sanitize(item.content)}</div>
        <div class="d-flex justify-content-end mt-2">
          <button class="btn-ghost btn-sm" onclick="navigator.clipboard.writeText(\`${item.content.replace(/`/g,'\\`')}\`)">
            <i class="bi bi-copy"></i> Copy
          </button>
        </div>`;
    }

    // Render tags
    renderPreviewTags(item);

    // Pin / star buttons
    const pinBtn  = el('sb-preview-pin');
    const starBtn = el('sb-preview-star');
    if (pinBtn)  { pinBtn.innerHTML  = `<i class="bi bi-pin${item.pinned ? '-fill' : ''}"></i>`; }
    if (starBtn) { starBtn.innerHTML = `<i class="bi bi-star${item.starred ? '-fill' : ''}"></i>`; }
  }

  function renderPreviewTags(item) {
    const tagsEl = el('sb-preview-tags');
    if (!tagsEl) return;
    tagsEl.innerHTML = item.tags.map((t, i) => `
      <span class="tag-item">
        #${sanitize(t)}
        <button class="tag-remove" data-ti="${i}">×</button>
      </span>
    `).join('');
    tagsEl.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        item.tags.splice(+btn.dataset.ti, 1);
        await idbPut(item);
        renderPreviewTags(item);
      });
    });
  }

  // ── Bind events ─────────────────────────────────────────────────
  function bindEvents(container) {
    // Filter tabs
    el('sb-filter-tabs')?.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        filterType = btn.dataset.type;
        el('sb-filter-tabs').querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGrid();
      });
    });

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
      if (!document.querySelector('#sb-grid')) return; // only active on scrapbook page

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

    // Cleanup paste on navigation
    container.dataset.pasteCleanup = 'true';
    container._pasteHandler = pasteHandler;

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
      allItems = await idbGetAll();
      allItems.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned - a.pinned;
        return b.createdAt.localeCompare(a.createdAt);
      });
      el('sb-preview-pin').innerHTML = `<i class="bi bi-pin${_previewItem.pinned ? '-fill' : ''}"></i>`;
      renderGrid();
      toast(_previewItem.pinned ? 'Đã ghim!' : 'Bỏ ghim', 'success');
    });

    // Preview star (sync to Supabase)
    el('sb-preview-star')?.addEventListener('click', async () => {
      if (!_previewItem) return;
      try {
        if (!_previewItem.starred) {
          // Sync to Supabase snippets table
          await DB.put('snippets', {
            id:         _previewItem.id,
            title:      _previewItem.title,
            content:    _previewItem.content,
            lang:       _previewItem.type,
            tags:       _previewItem.tags,
            pinned:     _previewItem.pinned,
            created_at: _previewItem.createdAt,
          });
          _previewItem.starred = true;
          toast('Đã lưu lên Supabase!', 'success');
        } else {
          await DB.del('snippets', _previewItem.id);
          _previewItem.starred = false;
          toast('Đã xóa khỏi Supabase', 'success');
        }
        await idbPut(_previewItem);
        el('sb-preview-star').innerHTML = `<i class="bi bi-star${_previewItem.starred ? '-fill text-warning' : ''}"></i>`;
        renderGrid();
      } catch (err) {
        toast('Lỗi đồng bộ Supabase: ' + err.message, 'error');
      }
    });

    // Preview delete
    el('sb-preview-del')?.addEventListener('click', async () => {
      if (!_previewItem || !confirm('Xóa mục này?')) return;
      await idbDel(_previewItem.id);
      allItems = allItems.filter(i => i.id !== _previewItem.id);
      el('sb-preview-modal')?.classList.add('d-none');
      renderGrid();
      toast('Đã xóa', 'success');
    });

    // Preview download
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
      if (!content) { toast('Nhập nội dung!', 'warning'); return; }
      const tags = (el('sb-note-tags')?.value || '').split(/[,\s#]+/).filter(Boolean);
      const item = makeItem('note', { title: title || content.slice(0, 50), content, tags });
      await idbPut(item);
      allItems.unshift(item);
      el('sb-note-modal')?.classList.add('d-none');
      el('sb-note-title').value = el('sb-note-content').value = el('sb-note-tags').value = '';
      renderGrid();
      toast('Đã lưu ghi chú!', 'success');
    });

    // Add link
    el('sb-add-link-btn')?.addEventListener('click', () => el('sb-link-modal')?.classList.remove('d-none'));
    el('sb-link-close')?.addEventListener('click', () => el('sb-link-modal')?.classList.add('d-none'));
    el('sb-link-cancel')?.addEventListener('click', () => el('sb-link-modal')?.classList.add('d-none'));
    el('sb-link-save')?.addEventListener('click', async () => {
      const url   = el('sb-link-url')?.value.trim();
      const title = el('sb-link-title')?.value.trim();
      if (!url) { toast('Nhập URL!', 'warning'); return; }
      const tags = (el('sb-link-tags')?.value || '').split(/[,\s#]+/).filter(Boolean);
      let finalTitle = title;
      if (!finalTitle) {
        try { finalTitle = new URL(url).hostname; } catch { finalTitle = url.slice(0, 60); }
      }
      const item = makeItem('link', { title: finalTitle, content: url, tags });
      await idbPut(item);
      allItems.unshift(item);
      el('sb-link-modal')?.classList.add('d-none');
      el('sb-link-url').value = el('sb-link-title').value = el('sb-link-tags').value = '';
      renderGrid();
      toast('Đã lưu link!', 'success');
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

  function detectPasteType(text) {
    if (/^https?:\/\//i.test(text)) return 'link';
    return 'note';
  }

  return { render };
})();
