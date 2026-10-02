/* ================================================================
   router.js — Hash-based SPA router
   ================================================================ */

const Router = (() => {
  const routes = {};
  let _current = null;

  const pageTitles = {
    '/dashboard': 'Dashboard',
    '/timesheet': 'Timesheet',
    '/expenses':  'Chi tiêu',
    '/bookmarks': 'Bookmarks',
    '/vault':     'Developer Vault',
    '/clipboard': 'Clipboard',
    '/settings':  'Cài đặt',
  };

  function register(path, renderFn) {
    routes[path] = renderFn;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function currentPath() {
    const hash = window.location.hash;
    return hash ? hash.slice(1) : '/dashboard';
  }

  async function render() {
    const path = currentPath();
    _current = path;

    // Update sidebar active link
    qsa('.sidebar-link').forEach(a => {
      const href = a.getAttribute('href');
      const isActive = href && href === `#${path}`;
      a.classList.toggle('active', isActive);
    });

    // Update page title
    const title = pageTitles[path] || 'Personal OS';
    const titleEl = el('page-title');
    if (titleEl) titleEl.textContent = title;
    document.title = `${title} — Personal OS`;

    // Render page
    const content = el('page-content');
    if (!content) return;

    const renderFn = routes[path];
    if (renderFn) {
      content.innerHTML = '<div class="loading-screen"><div class="spinner-border text-primary" role="status"></div></div>';
      try {
        await renderFn(content);
        content.classList.add('fade-in');
        setTimeout(() => content.classList.remove('fade-in'), 300);
      } catch (err) {
        content.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-exclamation-triangle text-danger"></i>
            <p class="text-danger">Loi tai trang: ${sanitize(err.message)}</p>
          </div>`;
        console.error(err);
      }
    } else {
      content.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-question-circle"></i>
          <p>Khong tim thay trang <strong>${sanitize(path)}</strong></p>
        </div>`;
    }

    // Close mobile sidebar on navigate
    qs('#sidebar')?.classList.remove('open');
    qs('#sidebar-overlay')?.classList.remove('show');
  }

  function init() {
    window.addEventListener('hashchange', render);
    if (!window.location.hash) window.location.hash = '/dashboard';
    render();
  }

  return { register, navigate, init, currentPath };
})();
