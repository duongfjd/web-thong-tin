/* ================================================================
   modules/webopener.js — Open any URL in modal iframe or popup
   Handles X-Frame-Options blocked sites via window.open fallback
   ================================================================ */

const WebOpener = (() => {

  const BLOCKED_DOMAINS = [
    'google.com','facebook.com','twitter.com','instagram.com',
    'youtube.com','tiktok.com','zalo.me','linkedin.com',
    'reddit.com','github.com','netflix.com','amazon.com',
  ];

  // Quick links for the launcher
  const QUICK_LINKS = [
    { name: 'Google',      url: 'https://www.google.com',        icon: '🔍' },
    { name: 'YouTube',     url: 'https://www.youtube.com',       icon: '▶️' },
    { name: 'Google Drive',url: 'https://drive.google.com',      icon: '📂' },
    { name: 'Gmail',       url: 'https://mail.google.com',       icon: '📧' },
    { name: 'ChatGPT',     url: 'https://chat.openai.com',       icon: '🤖' },
    { name: 'Notion',      url: 'https://notion.so',             icon: '📝' },
    { name: 'Figma',       url: 'https://figma.com',             icon: '🎨' },
    { name: 'GitHub',      url: 'https://github.com',            icon: '⌨️' },
    { name: 'Trello',      url: 'https://trello.com',            icon: '📋' },
    { name: 'StackOverflow',url: 'https://stackoverflow.com',    icon: '💡' },
  ];

  function isLikelyBlocked(url) {
    try {
      const host = new URL(url).hostname.replace('www.', '');
      return BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
    } catch { return false; }
  }

  function openInPopup(url) {
    const w = Math.min(1200, screen.width * 0.85);
    const h = Math.min(800, screen.height * 0.85);
    const left = (screen.width - w) / 2;
    const top  = (screen.height - h) / 2;
    window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=yes`);
  }

  function tryOpenInFrame(url, container) {
    container.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;position:relative;overflow:hidden">
        <iframe class="opener-frame" src="${sanitize(url)}" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads">
        </iframe>
      </div>
    `;
    const frame = container.querySelector('iframe');
    frame.addEventListener('error', () => showBlocked(url, container));
  }

  function showBlocked(url, container) {
    container.innerHTML = `
      <div class="opener-blocked">
        <i class="bi bi-shield-x"></i>
        <h5>Trang này không cho phép nhúng</h5>
        <p class="text-muted">Do cài đặt bảo mật X-Frame-Options của trang web, không thể hiển thị trực tiếp.</p>
        <div class="d-flex gap-2 justify-content-center flex-wrap">
          <button class="btn-primary" id="opener-popup-btn"><i class="bi bi-box-arrow-up-right"></i> Mở cửa sổ mới</button>
          <button class="btn-secondary" id="opener-new-tab-btn"><i class="bi bi-window-plus"></i> Mở tab mới</button>
        </div>
      </div>
    `;
    container.querySelector('#opener-popup-btn')?.addEventListener('click', () => openInPopup(url));
    container.querySelector('#opener-new-tab-btn')?.addEventListener('click', () => window.open(url, '_blank'));
  }

  function openModal(url) {
    // Remove existing modal
    document.querySelector('.web-opener-modal')?.remove();

    const validUrl = url.startsWith('http') ? url : 'https://' + url;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay web-opener-modal';
    modal.innerHTML = `
      <div class="modal-box modal-xl">
        <div class="modal-header">
          <span class="modal-title"><i class="bi bi-window me-2"></i>Web Opener</span>
          <div class="d-flex gap-1">
            <button class="btn-icon" id="wo-popup-btn" title="Mở popup"><i class="bi bi-box-arrow-up-right"></i></button>
            <button class="btn-icon" id="wo-newtab-btn" title="Mở tab mới"><i class="bi bi-window-plus"></i></button>
            <button class="btn-icon" id="wo-close-btn" title="Đóng"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>
        <div class="modal-body">
          <div class="web-opener-toolbar">
            <button class="btn-icon" id="wo-back-btn"><i class="bi bi-arrow-left"></i></button>
            <button class="btn-icon" id="wo-reload-btn"><i class="bi bi-arrow-clockwise"></i></button>
            <input class="opener-url-input" id="wo-url-input" type="url" value="${sanitize(validUrl)}" placeholder="Nhập URL..." />
            <button class="btn-primary btn-sm" id="wo-go-btn">Đi</button>
          </div>
          <div id="wo-frame-container" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const frameContainer = modal.querySelector('#wo-frame-container');

    function navigate(targetUrl) {
      const full = targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl;
      modal.querySelector('#wo-url-input').value = full;
      if (isLikelyBlocked(full)) {
        showBlocked(full, frameContainer);
      } else {
        tryOpenInFrame(full, frameContainer);
      }
    }

    navigate(validUrl);

    modal.querySelector('#wo-close-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#wo-popup-btn')?.addEventListener('click', () => openInPopup(modal.querySelector('#wo-url-input').value));
    modal.querySelector('#wo-newtab-btn')?.addEventListener('click', () => window.open(modal.querySelector('#wo-url-input').value, '_blank'));
    modal.querySelector('#wo-go-btn')?.addEventListener('click', () => navigate(modal.querySelector('#wo-url-input').value));
    modal.querySelector('#wo-url-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate(e.target.value);
    });
    modal.querySelector('#wo-reload-btn')?.addEventListener('click', () => {
      const frame = frameContainer.querySelector('iframe');
      if (frame) frame.src = frame.src;
    });
    modal.querySelector('#wo-back-btn')?.addEventListener('click', () => {
      try { frameContainer.querySelector('iframe')?.contentWindow.history.back(); } catch {}
    });

    // Backdrop close
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  async function render(container) {
    const history = JSON.parse(localStorage.getItem('pos_webopener_history') || '[]');

    container.innerHTML = `
      <div class="page-header">
        <h2><i class="bi bi-window me-2"></i>Web Opener</h2>
      </div>

      <!-- URL input -->
      <div class="panel mb-4">
        <div class="panel-body">
          <div class="d-flex gap-2 flex-wrap">
            <div class="search-wrap" style="flex:1;min-width:200px">
              <i class="bi bi-globe"></i>
              <input class="search-input" id="wo-main-input" type="url" 
                     placeholder="Nhập URL để mở (vd: https://notion.so)..." />
            </div>
            <button class="btn-primary" id="wo-main-open"><i class="bi bi-window"></i> Mở trong cửa sổ</button>
            <button class="btn-secondary" id="wo-main-popup"><i class="bi bi-box-arrow-up-right"></i> Popup</button>
            <button class="btn-secondary" id="wo-main-tab"><i class="bi bi-window-plus"></i> Tab mới</button>
          </div>
          <p class="text-muted mt-2" style="font-size:11.5px">
            <i class="bi bi-info-circle me-1"></i>
            Nếu trang bị chặn nhúng (X-Frame-Options), dùng <strong>Popup</strong> hoặc <strong>Tab mới</strong>.
          </p>
        </div>
      </div>

      <!-- Quick links -->
      <div class="panel mb-4">
        <div class="panel-header">
          <span class="panel-title">🚀 Truy cập nhanh</span>
          <button class="btn-ghost btn-sm" id="wo-add-quick"><i class="bi bi-plus"></i> Thêm</button>
        </div>
        <div class="panel-body">
          <div class="scrap-grid" id="wo-quick-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
            ${QUICK_LINKS.map(link => `
              <div class="scrap-card" 
                   onclick="WebOpener.openModal('${sanitize(link.url)}')"
                   style="cursor:pointer">
                <div class="scrap-card-thumb" style="aspect-ratio:auto;height:56px;font-size:28px">
                  ${link.icon}
                </div>
                <div class="scrap-card-body" style="padding:8px">
                  <div class="scrap-card-title" style="-webkit-line-clamp:1">${sanitize(link.name)}</div>
                  <div class="scrap-card-meta" style="font-size:10px">${new URL(link.url).hostname}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- History -->
      ${history.length ? `
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">🕐 Lịch sử</span>
            <button class="btn-ghost btn-sm" id="wo-clear-hist"><i class="bi bi-trash3"></i> Xóa</button>
          </div>
          <div class="panel-body">
            ${history.slice(-20).reverse().map(url => `
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-globe2 text-muted" style="font-size:13px"></i>
                <span class="truncate" style="flex:1;font-size:13px;cursor:pointer;color:var(--clr-primary)"
                      onclick="WebOpener.openModal('${sanitize(url)}')">${sanitize(url)}</span>
                <button class="btn-icon" onclick="window.open('${sanitize(url)}','_blank')" title="Tab mới">
                  <i class="bi bi-box-arrow-up-right" style="font-size:11px"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    function addToHistory(url) {
      const h = JSON.parse(localStorage.getItem('pos_webopener_history') || '[]');
      if (!h.includes(url)) { h.push(url); localStorage.setItem('pos_webopener_history', JSON.stringify(h.slice(-50))); }
    }

    el('wo-main-open')?.addEventListener('click', () => {
      const url = el('wo-main-input')?.value.trim();
      if (!url) return;
      addToHistory(url);
      openModal(url);
    });
    el('wo-main-popup')?.addEventListener('click', () => {
      const url = el('wo-main-input')?.value.trim();
      if (!url) return;
      addToHistory(url);
      openInPopup(url.startsWith('http') ? url : 'https://' + url);
    });
    el('wo-main-tab')?.addEventListener('click', () => {
      const url = el('wo-main-input')?.value.trim();
      if (!url) return;
      addToHistory(url);
      window.open(url.startsWith('http') ? url : 'https://' + url, '_blank');
    });
    el('wo-main-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') el('wo-main-open')?.click();
    });
    el('wo-clear-hist')?.addEventListener('click', () => {
      if (confirm('Xóa lịch sử Web Opener?')) {
        localStorage.removeItem('pos_webopener_history');
        render(container);
      }
    });
  }

  return { render, openModal };
})();
