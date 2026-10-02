/* ================================================================
   utils.js — Shared helpers: time, money, dom, id, string
   ================================================================ */

// ── ID ────────────────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Time helpers ──────────────────────────────────────────────────
const TZ = 'Asia/Ho_Chi_Minh';

function nowISO() { return new Date().toISOString(); }

function toVNDate(iso) {
  // Returns "YYYY-MM-DD" in VN timezone
  const d = new Date(iso);
  const opts = { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(d);
  const p = {};
  parts.forEach(x => { p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day}`;
}

function todayVN() {
  return toVNDate(new Date().toISOString());
}

function fmtDate(iso, style = 'medium') {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: style, timeZone: TZ }).format(new Date(iso));
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', timeZone: TZ
  }).format(new Date(iso));
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: TZ
  }).format(new Date(iso));
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return fmtDate(iso, 'short') + ' ' + fmtTime(iso);
}

/** Duration in ms → "HH:MM:SS" */
function fmtDuration(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

/** Duration in ms → human "X giờ Y phút" */
function fmtDurationHuman(ms) {
  if (!ms || ms < 0) return '0 phút';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

/** Parse ms from two ISO strings */
function msDiff(start, end) {
  return new Date(end).getTime() - new Date(start).getTime();
}

/** Current week range (Mon–Sun) as ISO strings */
function thisWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diff = (day === 0) ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0,0,0,0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23,59,59,999);
  return { start: mon.toISOString(), end: sun.toISOString() };
}

/** Current month range */
function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
  return { start, end };
}

/** "YYYY-MM" of current month */
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "YYYY-MM" → { start, end } ISO */
function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const start = new Date(y, m - 1, 1).toISOString();
  const end   = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
  return { start, end };
}

/** Relative time "3 phút trước" */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h   = Math.floor(min / 60);
  const d   = Math.floor(h / 24);
  if (d > 0)  return `${d} ngày trước`;
  if (h > 0)  return `${h} giờ trước`;
  if (min > 0) return `${min} phút trước`;
  return 'vừa xong';
}

// ── Money helpers ─────────────────────────────────────────────────
/** Format VND integer → "35.000 ₫" */
function fmtVND(amount) {
  if (amount == null || amount === '') return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Parse quick expense string.
 * "cafe 35k" → {amount: 35000, note: "cafe"}
 * "xăng 80000" → {amount: 80000, note: "xăng"}
 * "80k" → {amount: 80000, note: ""}
 * "80.5k" → {amount: 80500, note: ""}
 * "1tr2" → {amount: 1200000, note: ""}
 */
function parseQuickExpense(raw) {
  const str = raw.trim();
  // Try "text number-unit" or "number-unit text"
  const pattern = /(\d[\d.,]*)([kKtTtTrR]*)/;
  const parts = str.split(/\s+/);

  let amount = 0;
  let noteParts = [];

  for (const part of parts) {
    const m = part.match(/^(\d[\d.,]*)([kKtTrR]*)$/);
    if (m) {
      let n = parseFloat(m[1].replace(',', '.'));
      const unit = m[2].toLowerCase();
      if (unit.startsWith('tr')) n *= 1_000_000;
      else if (unit === 'k') n *= 1_000;
      amount = Math.round(n);
    } else {
      noteParts.push(part);
    }
  }

  return { amount, note: noteParts.join(' ') };
}

// ── DOM helpers ───────────────────────────────────────────────────
function el(id)       { return document.getElementById(id); }
function qs(sel)      { return document.querySelector(sel); }
function qsa(sel)     { return document.querySelectorAll(sel); }
function ce(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

function setHTML(id, html) {
  const e = el(id);
  if (e) e.innerHTML = html;
}

function setText(id, text) {
  const e = el(id);
  if (e) e.textContent = text;
}

function show(id) { const e = el(id); if (e) e.classList.remove('d-none'); }
function hide(id) { const e = el(id); if (e) e.classList.add('d-none'); }
function toggle(id) { const e = el(id); if (e) e.classList.toggle('d-none'); }

/** Sanitize HTML (prevent XSS) */
function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3000) {
  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
  const container = el('toast-container');
  if (!container) return;

  const div = ce('div', `toast-custom toast-${type}`);
  div.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${sanitize(msg)}</span>`;
  container.appendChild(div);

  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transition = 'opacity .3s';
    setTimeout(() => div.remove(), 300);
  }, duration);
}

// ── URL validation (basic SSRF guard for bookmarks) ───────────────
function isSafeUrl(urlStr) {
  let url;
  try { url = new URL(urlStr); } catch { return false; }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  const host = url.hostname;
  // Block localhost and common private ranges
  if (/^(localhost|127\.|0\.0\.0\.0|::1)/.test(host)) return false;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
  if (/^169\.254\./.test(host)) return false; // link-local
  if (/^(fd|fc)[0-9a-f]{2}:/i.test(host)) return false; // IPv6 private
  return true;
}

// ── Copy to clipboard ─────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Đã sao chép!', 'success');
  } catch {
    // Fallback
    const ta = ce('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('Đã sao chép!', 'success');
  }
}

// ── Simple markdown → HTML (no library) ──────────────────────────
function mdToHtml(md) {
  if (!md) return '';
  let html = sanitize(md);
  // Bold, italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code inline
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^## (.+)$/gm,  '<h4>$1</h4>');
  html = html.replace(/^# (.+)$/gm,   '<h3>$1</h3>');
  // Lists
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

// ── Debounce ──────────────────────────────────────────────────────
function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ── Confirmation dialog ───────────────────────────────────────────
function confirm(msg) {
  return window.confirm(msg);
}

// ── Export helpers ────────────────────────────────────────────────
function downloadCSV(rows, filename = 'export.csv') {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = ce('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data, filename = 'backup.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = ce('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
