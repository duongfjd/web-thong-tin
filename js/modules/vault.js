/* ================================================================
   modules/vault.js — Developer Vault (Snippets)
   Features: Title, code body, language, tags, pin, search,
             copy 1-click, syntax highlight (basic)
   ================================================================ */

async function renderVault(container) {
  let snippets = await DB.getAll('snippets');
  let searchQ  = '';
  let filterLang = 'all';

  const langs = ['bash', 'sql', 'javascript', 'typescript', 'python', 'json', 'yaml', 'nginx', 'docker', 'css', 'html', 'text'];

  const langColors = {
    bash: '#3fb950', sql: '#2f81f7', javascript: '#d29922', typescript: '#2f81f7',
    python: '#3fb950', json: '#bc8cff', yaml: '#f0883e', nginx: '#8b949e',
    docker: '#2f81f7', css: '#bc8cff', html: '#f0883e', text: '#8b949e',
  };

  function filtered() {
    return snippets
      .filter(s => filterLang === 'all' || s.language === filterLang)
      .filter(s => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return (s.title||'').toLowerCase().includes(q) ||
               (s.body||'').toLowerCase().includes(q) ||
               (s.description||'').toLowerCase().includes(q) ||
               (s.tags||[]).some(t => t.toLowerCase().includes(q));
      })
      .sort((a,b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>Developer Vault</h2>
      <button class="btn-primary" id="vault-add-btn"><i class="bi bi-plus-lg"></i> Thêm Snippet</button>
    </div>

    <!-- Search + filter -->
    <div class="panel mb-4">
      <div class="panel-body">
        <div class="row g-2">
          <div class="col-12 col-md-7">
            <input id="vault-search" class="form-ctrl" placeholder="Tìm tiêu đề, nội dung, tag..." />
          </div>
          <div class="col-12 col-md-5">
            <select id="vault-lang-filter" class="form-ctrl">
              <option value="all">Tất cả ngôn ngữ</option>
              ${langs.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit form (hidden) -->
    <div id="vault-form" class="panel mb-4 d-none">
      <div class="panel-header">
        <span class="panel-title" id="vault-form-title">Thêm snippet mới</span>
      </div>
      <div class="panel-body">
        <div class="row g-3">
          <div class="col-md-8">
            <div class="form-group">
              <label class="form-label">Tiêu đề *</label>
              <input id="vault-title" class="form-ctrl" placeholder="Nginx reverse proxy config" />
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label class="form-label">Ngôn ngữ</label>
              <select id="vault-lang" class="form-ctrl">
                ${langs.map(l => `<option>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="col-12">
            <div class="form-group">
              <label class="form-label">Nội dung *</label>
              <textarea id="vault-body" class="form-ctrl" rows="8" placeholder="Paste code here..." style="font-family:monospace;font-size:13px"></textarea>
            </div>
          </div>
          <div class="col-md-8">
            <div class="form-group">
              <label class="form-label">Mô tả</label>
              <input id="vault-desc" class="form-ctrl" placeholder="Mô tả ngắn gọn..." />
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label class="form-label">Tags</label>
              <input id="vault-tags" class="form-ctrl" placeholder="nginx, proxy, config" />
            </div>
          </div>
        </div>
        <div class="action-bar mt-2">
          <button class="btn-primary" id="vault-save-btn"><i class="bi bi-check2"></i> Lưu</button>
          <button class="btn-secondary" id="vault-cancel-btn">Hủy</button>
        </div>
        <input type="hidden" id="vault-edit-id" />
      </div>
    </div>

    <!-- Stats -->
    <div class="row g-2 mb-3">
      <div class="col-4"><div class="stat-card text-center py-2">
        <div class="stat-value" style="font-size:20px">${snippets.length}</div>
        <div class="stat-label">Tổng Snippets</div>
      </div></div>
      <div class="col-4"><div class="stat-card text-center py-2">
        <div class="stat-value" style="font-size:20px">${snippets.filter(s=>s.is_pinned).length}</div>
        <div class="stat-label">Đã ghim</div>
      </div></div>
      <div class="col-4"><div class="stat-card text-center py-2">
        <div class="stat-value" style="font-size:20px">${new Set(snippets.map(s=>s.language)).size}</div>
        <div class="stat-label">Ngôn ngữ</div>
      </div></div>
    </div>

    <!-- Snippet list -->
    <div id="vault-list"></div>
  `;

  // ── Render list ───────────────────────
  function renderList() {
    const listEl = el('vault-list');
    if (!listEl) return;
    const items = filtered();
    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><i class="bi bi-code-square"></i><p>Chưa có snippet nào. Hãy thêm mới!</p></div>`;
      return;
    }
    listEl.innerHTML = items.map(s => `
      <div class="panel mb-3">
        <div class="panel-header">
          <div class="d-flex align-items-center gap-2 flex-wrap flex-1">
            ${s.is_pinned ? `<i class="bi bi-pin-fill text-warning" title="Đã ghim"></i>` : ''}
            <span class="panel-title">${sanitize(s.title)}</span>
            <span class="badge-pill" style="background:${langColors[s.language]||'#8b949e'}22;color:${langColors[s.language]||'#8b949e'}">${sanitize(s.language)}</span>
            ${(s.tags||[]).map(t => `<span class="badge-pill badge-muted">${sanitize(t)}</span>`).join('')}
          </div>
          <div class="d-flex gap-1">
            <button class="btn-icon" data-vault-copy="${sanitize(s.id)}" title="Copy code"><i class="bi bi-copy"></i></button>
            <button class="btn-icon" data-vault-pin="${sanitize(s.id)}" data-pinned="${s.is_pinned}" title="${s.is_pinned ? 'Bỏ ghim' : 'Ghim'}">
              <i class="bi bi-${s.is_pinned ? 'pin-angle' : 'pin'}"></i>
            </button>
            <button class="btn-icon" data-vault-edit="${sanitize(s.id)}" title="Sửa"><i class="bi bi-pencil"></i></button>
            <button class="btn-icon" data-del-vault="${sanitize(s.id)}" title="Xóa"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
        ${s.description ? `<div class="panel-body py-2" style="border-bottom:1px solid var(--clr-border)"><span class="text-muted small">${sanitize(s.description)}</span></div>` : ''}
        <pre class="code-block m-0" style="border:none;border-radius:0;max-height:200px;overflow:auto">${sanitize(s.body)}</pre>
        <div class="panel-body py-2">
          <span class="text-muted" style="font-size:11px">${fmtDateTime(s.created_at)}</span>
        </div>
      </div>
    `).join('');

    // Copy
    listEl.querySelectorAll('[data-vault-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = snippets.find(x => x.id === btn.dataset.vaultCopy);
        if (s) copyToClipboard(s.body);
      });
    });

    // Pin toggle
    listEl.querySelectorAll('[data-vault-pin]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const s = snippets.find(x => x.id === btn.dataset.vaultPin);
        if (!s) return;
        s.is_pinned = !s.is_pinned;
        await DB.put('snippets', s);
        renderList();
      });
    });

    // Edit
    listEl.querySelectorAll('[data-vault-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = snippets.find(x => x.id === btn.dataset.vaultEdit);
        if (!s) return;
        el('vault-form')?.classList.remove('d-none');
        if (el('vault-form-title')) el('vault-form-title').textContent = 'Sửa snippet';
        if (el('vault-edit-id')) el('vault-edit-id').value = s.id;
        if (el('vault-title')) el('vault-title').value = s.title;
        if (el('vault-lang')) el('vault-lang').value = s.language;
        if (el('vault-body')) el('vault-body').value = s.body;
        if (el('vault-desc')) el('vault-desc').value = s.description || '';
        if (el('vault-tags')) el('vault-tags').value = (s.tags||[]).join(', ');
        el('vault-title')?.focus();
        el('vault-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Delete
    listEl.querySelectorAll('[data-del-vault]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xóa snippet này?')) return;
        await DB.del('snippets', btn.dataset.delVault);
        snippets = snippets.filter(s => s.id !== btn.dataset.delVault);
        renderList();
      });
    });
  }

  renderList();

  // ── Search / filter ───────────────────
  el('vault-search')?.addEventListener('input', debounce(e => { searchQ = e.target.value; renderList(); }));
  el('vault-lang-filter')?.addEventListener('change', e => { filterLang = e.target.value; renderList(); });

  // ── Add / Edit form ───────────────────
  el('vault-add-btn')?.addEventListener('click', () => {
    el('vault-form')?.classList.toggle('d-none');
    if (el('vault-form-title')) el('vault-form-title').textContent = 'Thêm snippet mới';
    if (el('vault-edit-id')) el('vault-edit-id').value = '';
    ['vault-title','vault-body','vault-desc','vault-tags'].forEach(id => { if(el(id)) el(id).value=''; });
    el('vault-title')?.focus();
  });
  el('vault-cancel-btn')?.addEventListener('click', () => el('vault-form')?.classList.add('d-none'));

  el('vault-save-btn')?.addEventListener('click', async () => {
    const title = el('vault-title')?.value.trim();
    const body  = el('vault-body')?.value.trim();
    if (!title || !body) { toast('Tiêu đề và nội dung bắt buộc!', 'error'); return; }

    const editId = el('vault-edit-id')?.value;
    const tagsRaw = el('vault-tags')?.value.trim();
    const existing = editId ? snippets.find(s => s.id === editId) : null;

    const snippet = {
      id: editId || genId(),
      title,
      body,
      language: el('vault-lang')?.value || 'text',
      description: el('vault-desc')?.value.trim() || '',
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
      is_pinned: existing?.is_pinned || false,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await DB.put('snippets', snippet);
    if (existing) {
      snippets = snippets.map(s => s.id === editId ? snippet : s);
    } else {
      snippets.unshift(snippet);
    }

    el('vault-form')?.classList.add('d-none');
    toast(`Đã ${editId ? 'cập nhật' : 'lưu'} snippet!`, 'success');
    renderList();
  });
}
