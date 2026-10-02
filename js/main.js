/* ================================================================
   main.js — App bootstrap, command palette, theme, global events
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
  }

  // ── Theme ─────────────────────────────
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    DB.setSetting('theme', theme);
    const icon = el('theme-toggle')?.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
  }

  async function loadTheme() {
    const saved = await DB.getSetting('theme', 'dark');
    setTheme(saved);
  }

  // ── User info in sidebar ──────────────
  async function loadUserInfo() {
    const user = Auth.getUser();
    const emailEl = el('sidebar-email');
    if (emailEl && user) emailEl.textContent = user.email || '—';
  }

  // ── Sidebar toggle (mobile) ───────────
  function initSidebar() {
    el('sidebar-toggle')?.addEventListener('click', () => {
      el('sidebar')?.classList.toggle('open');
      el('sidebar-overlay')?.classList.toggle('show');
    });
    el('sidebar-close')?.addEventListener('click', () => {
      el('sidebar')?.classList.remove('open');
      el('sidebar-overlay')?.classList.remove('show');
    });
    el('sidebar-overlay')?.addEventListener('click', () => {
      el('sidebar')?.classList.remove('open');
      el('sidebar-overlay')?.classList.remove('show');
    });
    el('theme-toggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
    el('lock-btn')?.addEventListener('click', () => Auth.lock());
    el('signout-btn')?.addEventListener('click', async () => {
      if (!confirm('Đăng xuất khỏi Personal OS?')) return;
      await SB.auth.signOut();
    });
  }

  // ── Command Palette ───────────────────
  const cmdItems = [
    { label: 'Dashboard', sub: 'Trang chủ', icon: 'bi-grid-1x2', action: () => Router.navigate('/dashboard') },
    { label: 'Timesheet', sub: 'Quản lý giờ làm', icon: 'bi-clock-history', action: () => Router.navigate('/timesheet') },
    { label: 'Check-in', sub: 'Bắt đầu ca làm', icon: 'bi-play-circle', action: () => { Router.navigate('/timesheet'); } },
    { label: 'Chi tiêu', sub: 'Expense tracker', icon: 'bi-wallet2', action: () => Router.navigate('/expenses') },
    { label: 'Bookmarks', sub: 'Danh sách link', icon: 'bi-bookmark-star', action: () => Router.navigate('/bookmarks') },
    { label: 'Developer Vault', sub: 'Snippets & scripts', icon: 'bi-code-square', action: () => Router.navigate('/vault') },
    { label: 'Clipboard', sub: 'Universal clipboard', icon: 'bi-clipboard2-pulse', action: () => Router.navigate('/clipboard') },
    { label: 'Cài đặt', sub: 'Settings & backup', icon: 'bi-gear', action: () => Router.navigate('/settings') },
    { label: 'Đổi theme Dark', sub: 'Chuyển sang Dark mode', icon: 'bi-moon-stars-fill', action: () => setTheme('dark') },
    { label: 'Đổi theme Light', sub: 'Chuyển sang Light mode', icon: 'bi-sun-fill', action: () => setTheme('light') },
    { label: 'Xuất backup', sub: 'Export JSON', icon: 'bi-download', action: () => { Router.navigate('/settings'); } },
    { label: 'Khoá màn hình', sub: 'Lock screen', icon: 'bi-lock', action: () => Auth.lock() },
  ];

  let cmdActive = false;
  let cmdSelected = 0;

  function openCmd() {
    if (!Auth.isUnlocked()) return;
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
      li.addEventListener('click', () => {
        filtered[i]?.action();
        closeCmd();
      });
    });
  }

  function initCmd() {
    const openBtns = [el('cmd-btn'), el('cmd-btn-mobile')];
    openBtns.forEach(btn => btn?.addEventListener('click', openCmd));
    el('cmd-palette')?.querySelector('.cmd-backdrop')?.addEventListener('click', closeCmd);

    el('cmd-input')?.addEventListener('input', e => {
      renderCmdItems(e.target.value);
      cmdSelected = 0;
    });

    // Keyboard shortcut Ctrl+K
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
        if (e.key === 'Enter') {
          items[cmdSelected]?.click();
        }
      }
    });
  }

  // ── Main init (called after PIN unlock) ──
  async function init() {
    await loadTheme();
    await loadUserInfo();
    registerRoutes();
    initSidebar();
    initCmd();
    Router.init();
  }

  return { init, setTheme };
})();

// ── Entry point ────────────────────────
// DB.open() is called by Auth.init(), then Auth calls App.init() on success
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
