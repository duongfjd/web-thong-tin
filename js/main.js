/* ================================================================
   main.js — App bootstrap, routing, command palette, theme
   ================================================================ */

const App = (() => {

  // ── Register all routes ───────────────
  function registerRoutes() {
    Router.register('/dashboard', renderDashboard);
    Router.register('/timesheet', Timesheet.render);
    Router.register('/expenses',  renderExpenses);
    Router.register('/bookmarks', renderBookmarks);
    Router.register('/vault',     renderVault);
    Router.register('/clipboard', renderClipboard);
    Router.register('/settings',  renderSettings);
    Router.register('/scrapbook', Scrapbook.render);
    Router.register('/webopener', WebOpener.render);
    Router.register('/tools',     Tools.render);
  }

  // ── Theme ─────────────────────────────
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { DB.setSetting('theme', theme); } catch {}
    const icon = el('theme-toggle')?.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
  }

  async function loadTheme() {
    try {
      const saved = await DB.getSetting('theme', 'dark');
      setTheme(saved || 'dark');
    } catch {
      setTheme('dark');
    }
  }

  // ── User info ─────────────────────────
  async function loadUserInfo() {
    const user = Auth.getUser();
    const emailEl = el('sidebar-email');
    if (emailEl && user) emailEl.textContent = user.email || '—';
  }

  // ── Sidebar ────────────────────────────
  function initSidebar() {
    const sidebar     = el('sidebar');
    const overlay     = el('sidebar-overlay');

    function openSidebar()  { sidebar?.classList.add('open'); overlay?.classList.add('show'); }
    function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); }

    el('sidebar-toggle')?.addEventListener('click', openSidebar);
    el('sidebar-close')?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Auto-close sidebar on nav click (mobile)
    sidebar?.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) closeSidebar();
      });
    });

    el('theme-toggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });

    el('signout-btn')?.addEventListener('click', async () => {
      if (!confirm('Đăng xuất khỏi Personal OS?')) return;
      await Auth.signOut();
    });
  }

  // ── Active nav highlight ──────────────
  function highlightNav(path) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const routeName = path.replace('/', '');
    const link = el(`nav-${routeName}`);
    if (link) link.classList.add('active');

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === '#' + path) item.classList.add('active');
    });

    // Page title map
    const titles = {
      '/dashboard': 'Dashboard',
      '/timesheet': 'Timesheet',
      '/expenses':  'Chi tiêu',
      '/bookmarks': 'Bookmarks',
      '/vault':     'Dev Vault',
      '/clipboard': 'Clipboard',
      '/settings':  'Cài đặt',
      '/scrapbook': 'Second Brain',
      '/webopener': 'Web Opener',
      '/tools':     'Tiện ích Tools',
    };
    const titleEl = el('page-title');
    if (titleEl) titleEl.textContent = titles[path] || 'Personal OS';
  }

  // ── Command Palette ───────────────────
  const cmdItems = [
    { label: 'Dashboard',      sub: 'Trang chủ',           icon: 'bi-grid-1x2',         action: () => Router.navigate('/dashboard') },
    { label: 'Timesheet',      sub: 'Bảng giờ làm',        icon: 'bi-table',             action: () => Router.navigate('/timesheet') },
    { label: 'Chi tiêu',       sub: 'Expense tracker',     icon: 'bi-wallet2',           action: () => Router.navigate('/expenses') },
    { label: 'Bookmarks',      sub: 'Danh sách link',       icon: 'bi-bookmark-star',     action: () => Router.navigate('/bookmarks') },
    { label: 'Dev Vault',      sub: 'Snippets & scripts',  icon: 'bi-code-square',       action: () => Router.navigate('/vault') },
    { label: 'Clipboard',      sub: 'Universal clipboard', icon: 'bi-clipboard2-pulse',  action: () => Router.navigate('/clipboard') },
    { label: 'Second Brain',   sub: 'Scrapbook & notes',   icon: 'bi-journal-bookmark',  action: () => Router.navigate('/scrapbook') },
    { label: 'Web Opener',     sub: 'Mở web trong cửa sổ', icon: 'bi-window',            action: () => Router.navigate('/webopener') },
    { label: 'Tiện ích Tools', sub: 'Kích âm, OCR, PiP, PDF, QR', icon: 'bi-tools',     action: () => Router.navigate('/tools') },
    { label: 'Cài đặt',        sub: 'Settings',            icon: 'bi-gear',              action: () => Router.navigate('/settings') },
    { label: 'Dark Mode',      sub: 'Chuyển sang tối',     icon: 'bi-moon-stars-fill',   action: () => setTheme('dark') },
    { label: 'Light Mode',     sub: 'Chuyển sang sáng',    icon: 'bi-sun-fill',          action: () => setTheme('light') },
    { label: 'Đăng xuất',      sub: 'Sign out',            icon: 'bi-box-arrow-right',   action: () => el('signout-btn')?.click() },
  ];

  let cmdActive = false, cmdSelected = 0;

  function openCmd() {
    el('cmd-palette')?.classList.remove('d-none');
    el('cmd-input')?.focus();
    cmdActive = true;
    renderCmdItems('');
  }

  function closeCmd() {
    el('cmd-palette')?.classList.add('d-none');
    cmdActive = false;
    if (el('cmd-input')) el('cmd-input').value = '';
  }

  function renderCmdItems(q) {
    const results = el('cmd-results');
    if (!results) return;
    const filtered = q
      ? cmdItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || (i.sub||'').toLowerCase().includes(q.toLowerCase()))
      : cmdItems;
    cmdSelected = 0;
    results.innerHTML = filtered.map((item, idx) => `
      <li class="cmd-item${idx===0?' selected':''}" data-idx="${idx}">
        <i class="bi ${item.icon}"></i>
        <span class="cmd-item-label">${sanitize(item.label)}</span>
        <span class="cmd-item-sub">${sanitize(item.sub||'')}</span>
      </li>
    `).join('');

    results.querySelectorAll('.cmd-item').forEach((li, i) => {
      li.addEventListener('click', () => { filtered[i]?.action(); closeCmd(); });
    });
  }

  function initCmd() {
    [el('cmd-btn'), el('cmd-btn-mobile')].forEach(btn => btn?.addEventListener('click', openCmd));
    el('cmd-palette')?.querySelector('.cmd-backdrop')?.addEventListener('click', closeCmd);

    el('cmd-input')?.addEventListener('input', e => {
      renderCmdItems(e.target.value);
      cmdSelected = 0;
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        cmdActive ? closeCmd() : openCmd();
      }
      if (e.key === 'Escape' && cmdActive) closeCmd();

      if (cmdActive) {
        const items = el('cmd-results')?.querySelectorAll('.cmd-item') || [];
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[cmdSelected]?.classList.remove('selected');
          cmdSelected = (cmdSelected + 1) % items.length;
          items[cmdSelected]?.classList.add('selected');
          items[cmdSelected]?.scrollIntoView({ block: 'nearest' });
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[cmdSelected]?.classList.remove('selected');
          cmdSelected = (cmdSelected - 1 + items.length) % items.length;
          items[cmdSelected]?.classList.add('selected');
          items[cmdSelected]?.scrollIntoView({ block: 'nearest' });
        }
        if (e.key === 'Enter') items[cmdSelected]?.click();
      }
    });
  }

  // ── Main init ─────────────────────────
  async function init() {
    await loadTheme();
    await loadUserInfo();
    registerRoutes();
    initSidebar();
    initCmd();

    // Hook router's path change to update nav highlight
    const origNav = Router.navigate.bind(Router);
    Router.navigate = (path) => {
      origNav(path);
      highlightNav(path);
    };

    Router.init();
    // Highlight initial route
    const initPath = location.hash.slice(1) || '/dashboard';
    highlightNav(initPath);
  }

  return { init, setTheme };
})();

// ── Entry point ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
