/* ================================================================
   auth.js — Supabase Auth (Sign In / Sign Up) + Offline/Guest Mode
   ================================================================ */

const Auth = (() => {
  let _user = null;
  let _mode = 'login'; // 'login' | 'signup'

  function getUser() { return _user; }

  function showLoginScreen() {
    const gate = el('auth-gate');
    if (gate) gate.classList.remove('d-none');
    hide('app-shell');
  }

  function enterApp() {
    hide('auth-gate');
    show('app-shell');
    App.init();
  }

  function setupTabs() {
    const tabLogin  = el('auth-tab-login');
    const tabSignup = el('auth-tab-signup');
    const submitTxt = el('auth-submit-text');
    const errEl     = el('login-error');
    const succEl    = el('login-success');

    tabLogin?.addEventListener('click', () => {
      _mode = 'login';
      tabLogin.classList.remove('text-muted');
      tabLogin.classList.add('fw-semibold');
      tabLogin.style.background = 'var(--clr-surface-3)';
      tabLogin.style.color = 'var(--clr-text)';

      tabSignup.classList.add('text-muted');
      tabSignup.classList.remove('fw-semibold');
      tabSignup.style.background = 'transparent';
      tabSignup.style.color = '';

      if (submitTxt) submitTxt.textContent = 'Đăng nhập';
      if (errEl) errEl.classList.add('d-none');
      if (succEl) succEl.classList.add('d-none');
    });

    tabSignup?.addEventListener('click', () => {
      _mode = 'signup';
      tabSignup.classList.remove('text-muted');
      tabSignup.classList.add('fw-semibold');
      tabSignup.style.background = 'var(--clr-surface-3)';
      tabSignup.style.color = 'var(--clr-text)';

      tabLogin.classList.add('text-muted');
      tabLogin.classList.remove('fw-semibold');
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = '';

      if (submitTxt) submitTxt.textContent = 'Tạo tài khoản mới';
      if (errEl) errEl.classList.add('d-none');
      if (succEl) succEl.classList.add('d-none');
    });

    // Guest / Offline mode
    el('guest-btn')?.addEventListener('click', () => {
      _user = { email: 'Khách (Lưu trên máy)', id: 'local_user' };
      localStorage.setItem('pos_guest_mode', 'true');
      enterApp();
    });
  }

  // ── Form submit ─────────────────────────────────────────────────
  function setupLoginForm() {
    const form      = el('login-form');
    const emailEl   = el('login-email');
    const passEl    = el('login-password');
    const errorEl   = el('login-error');
    const successEl = el('login-success');
    const loadEl    = el('login-loading');
    const submitBtn = el('auth-submit-btn');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailEl?.value.trim();
      const pass  = passEl?.value;
      if (!email || !pass) return;

      if (errorEl)   errorEl.classList.add('d-none');
      if (successEl) successEl.classList.add('d-none');
      if (loadEl)    loadEl.classList.remove('d-none');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (_mode === 'login') {
          const { data, error } = await SB.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
          localStorage.removeItem('pos_guest_mode');
          _user = data.user;
          enterApp();
        } else {
          // Sign Up
          const { data, error } = await SB.auth.signUp({ email, password: pass });
          if (error) throw error;

          if (data.session) {
            localStorage.removeItem('pos_guest_mode');
            _user = data.user;
            enterApp();
          } else {
            if (successEl) {
              successEl.textContent = 'Đăng ký thành công! Hãy kiểm tra email để xác nhận (hoặc đăng nhập nếu email auto-confirm).';
              successEl.classList.remove('d-none');
            }
          }
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
          errorEl.classList.remove('d-none');
        }
      } finally {
        if (loadEl)  loadEl.classList.add('d-none');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  async function init() {
    setupTabs();
    setupLoginForm();

    try {
      await DB.open();
    } catch (e) {
      console.warn('DB.open error, continuing in local mode', e);
    }

    // Check if guest mode was active
    if (localStorage.getItem('pos_guest_mode') === 'true') {
      _user = { email: 'Khách (Lưu trên máy)', id: 'local_user' };
      enterApp();
      return;
    }

    try {
      const { data: { session } } = await SB.auth.getSession();
      if (session) {
        _user = session.user;
        enterApp();
      } else {
        showLoginScreen();
      }
    } catch {
      showLoginScreen();
    }

    SB.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT') {
        _user = null;
        localStorage.removeItem('pos_guest_mode');
        showLoginScreen();
      }
      if (event === 'SIGNED_IN' && sess) {
        _user = sess.user;
        localStorage.removeItem('pos_guest_mode');
      }
    });
  }

  async function signOut() {
    try {
      await SB.auth.signOut();
    } catch {}
    localStorage.removeItem('pos_guest_mode');
    _user = null;
    showLoginScreen();
  }

  return { init, signOut, getUser };
})();
