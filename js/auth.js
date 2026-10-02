/* ================================================================
   auth.js — Two-layer auth:
   Layer 1: Supabase Auth (email + password) — controls data access
   Layer 2: PIN screen lock (local, just hides UI on inactivity)
   ================================================================ */

const Auth = (() => {
  let _unlocked = false;
  let _user     = null;
  let _lockTimer = null;
  const LOCK_AFTER_MS = 15 * 60 * 1000; // 15 min inactivity

  // ── PIN helpers ───────────────────────
  function hashPin(pin) {
    let h = 0;
    for (let i = 0; i < pin.length; i++) h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
    return String(h);
  }

  async function getStoredHash() {
    // Stored in localStorage (device-local, not synced)
    return localStorage.getItem('pos_pin_hash') || hashPin('1234');
  }

  async function verifyPin(pin) {
    const stored = await getStoredHash();
    return hashPin(pin) === stored;
  }

  async function setPin(newPin) {
    localStorage.setItem('pos_pin_hash', hashPin(newPin));
  }

  // ── Screen lock / unlock ──────────────
  function showPinScreen() {
    hide('login-screen');
    show('pin-screen');
    hide('app-shell');
    requestAnimationFrame(() => el('pin0')?.focus());
  }

  function showLoginScreen() {
    show('login-screen');
    hide('pin-screen');
    hide('app-shell');
  }

  function unlockApp() {
    _unlocked = true;
    hide('auth-gate');
    show('app-shell');
    resetLockTimer();
  }

  function lock() {
    _unlocked = false;
    clearTimeout(_lockTimer);
    show('auth-gate');
    showPinScreen();
    hide('app-shell');
  }

  function resetLockTimer() {
    clearTimeout(_lockTimer);
    _lockTimer = setTimeout(lock, LOCK_AFTER_MS);
  }

  function isUnlocked() { return _unlocked; }
  function getUser()    { return _user; }

  // ── Supabase login form ───────────────
  function setupLoginForm() {
    const form     = el('login-form');
    const emailEl  = el('login-email');
    const passEl   = el('login-password');
    const errorEl  = el('login-error');
    const loadEl   = el('login-loading');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailEl?.value.trim();
      const pass  = passEl?.value;

      if (!email || !pass) return;

      if (errorEl) errorEl.classList.add('d-none');
      if (loadEl)  loadEl.classList.remove('d-none');
      form.querySelector('button[type=submit]').disabled = true;

      const { data, error } = await SB.auth.signInWithPassword({ email, password: pass });

      if (loadEl)  loadEl.classList.add('d-none');
      form.querySelector('button[type=submit]').disabled = false;

      if (error) {
        if (errorEl) {
          errorEl.textContent = 'Sai email hoặc mật khẩu.';
          errorEl.classList.remove('d-none');
        }
        return;
      }

      _user = data.user;
      showPinScreen();
    });
  }

  // ── PIN form ──────────────────────────
  function setupPinForm() {
    const form   = el('pin-form');
    const errorEl = el('pin-error');
    const digits  = [el('pin0'), el('pin1'), el('pin2'), el('pin3')];

    digits.forEach((d, i) => {
      if (!d) return;
      d.addEventListener('input', () => {
        d.value = d.value.replace(/\D/, '');
        if (d.value && i < 3) digits[i + 1]?.focus();
        if (d.value && i === 3) form?.dispatchEvent(new Event('submit'));
      });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !d.value && i > 0) {
          digits[i - 1].focus();
          digits[i - 1].value = '';
        }
      });
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = digits.map(d => d?.value || '').join('');
      if (pin.length < 4) return;

      const ok = await verifyPin(pin);
      if (ok) {
        errorEl?.classList.add('d-none');
        digits.forEach(d => { if (d) d.value = ''; });
        hide('auth-gate');
        unlockApp();
        App.init();
      } else {
        errorEl?.classList.remove('d-none');
        digits.forEach(d => { if (d) d.value = ''; });
        digits[0]?.focus();
        const card = qs('.auth-card');
        if (card) { card.style.animation = 'none'; setTimeout(() => { card.style.animation = 'shake .3s ease'; }, 10); }
      }
    });

    // Logout from Supabase
    el('logout-btn')?.addEventListener('click', async () => {
      await SB.auth.signOut();
      _user = null;
      _unlocked = false;
      digits.forEach(d => { if (d) d.value = ''; });
      showLoginScreen();
    });
  }

  function setupInactivityTracking() {
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, () => { if (_unlocked) resetLockTimer(); }, { passive: true });
    });
  }

  // ── Main init ─────────────────────────
  async function init() {
    await DB.open();

    // Check for existing Supabase session
    const { data: { session } } = await SB.auth.getSession();

    show('auth-gate');
    hide('app-shell');

    if (session) {
      _user = session.user;
      showPinScreen();
    } else {
      showLoginScreen();
    }

    setupLoginForm();
    setupPinForm();
    setupInactivityTracking();

    // Listen for auth state changes
    SB.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT') {
        _user = null;
        _unlocked = false;
        show('auth-gate');
        showLoginScreen();
        hide('app-shell');
      }
    });
  }

  return { init, lock, unlock: unlockApp, setPin, isUnlocked, getUser, resetLockTimer };
})();

// Shake animation
const _shakeStyle = document.createElement('style');
_shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 60%{transform:translateX(8px)} 80%{transform:translateX(-4px)}
  }
`;
document.head.appendChild(_shakeStyle);
