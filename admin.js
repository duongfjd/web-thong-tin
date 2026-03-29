import { supabase } from './supabase.js';

// Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAmNTV2Gn_1ja4XyYeUOTjukktzjKcbRAI",
    authDomain: "apptruyen-670b1.firebaseapp.com",
    databaseURL: "https://apptruyen-670b1-default-rtdb.firebaseio.com",
    projectId: "apptruyen-670b1",
    storageBucket: "apptruyen-670b1.firebasestorage.app",
    messagingSenderId: "786140899201",
    appId: "1:786140899201:web:ddb0a74ba0e8b000caaa80"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

// DOM Elements
const userMenu = document.getElementById('userMenu');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const notAdmin = document.getElementById('notAdmin');
const totalReports = document.getElementById('totalReports');
const resolvedCount = document.getElementById('resolvedCount');
const deletedCount = document.getElementById('deletedCount');
const bannedCount = document.getElementById('bannedCount');
const reportsList = document.getElementById('reportsList');
const filterStatus = document.getElementById('filterStatus');
const filterReason = document.getElementById('filterReason');
const refreshBtn = document.getElementById('refreshBtn');
const banModal = document.getElementById('banModal');
const closeBanModal = document.getElementById('closeBanModal');
const banForm = document.getElementById('banForm');
const banUserName = document.getElementById('banUserName');
const banReason = document.getElementById('banReason');
const banDuration = document.getElementById('banDuration');

// State
let currentUser = null;
let allReports = [];
let stats = { resolved: 0, deleted: 0, banned: 0 };
let selectedReportForBan = null;

// ==================== Auth ====================
async function checkAdminAccess() {
  try {
    const user = auth.currentUser;
    if (!user) {
      redirectToChat();
      return;
    }

    currentUser = user;
    const { data: userData } = await supabase
      .from('chat_users')
      .select('role')
      .eq('id', user.uid)
      .maybeSingle();

    if (userData?.role !== 'admin') {
      notAdmin.style.display = 'inline-block';
      userMenu.style.display = 'none';
      document.querySelector('.admin-content').innerHTML = 
        '<p style="text-align: center; padding: 3rem; color: #dc2626; font-size: 1.1rem;">Bạn không có quyền truy cập Admin.</p>';
      return;
    }

    notAdmin.style.display = 'none';
    userMenu.style.display = 'flex';
    userName.textContent = user.displayName || user.email || 'Admin';
    loadReports();
  } catch (err) {
    console.error('Admin check error:', err);
    redirectToChat();
  }
}

function redirectToChat() {
  window.location.href = './chat.html';
}

// ==================== Load & Render Reports ====================
async function loadReports() {
  try {
    const { data: reports, error } = await supabase
      .from('chat_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allReports = reports || [];
    renderReports(allReports);
    updateStats();
  } catch (err) {
    console.error('Load reports error:', err);
  }
}

function renderReports(reports) {
  reportsList.innerHTML = '';

  if (!reports.length) {
    reportsList.innerHTML = `
      <div class="reports-empty">
        <i class="fas fa-inbox"></i>
        <p>Không có báo cáo nào</p>
      </div>
    `;
    return;
  }

  reports.forEach(report => {
    const cardEl = document.createElement('div');
    cardEl.className = `report-card ${report.resolved ? 'resolved' : ''}`;

    const createdTime = new Date(report.created_at).toLocaleString('vi-VN');
    const messageText = report.message_text || '(tin nhắn không có sẵn)';

    let actionButtons = '';
    if (!report.resolved) {
      actionButtons = `
        <button class="btn-action delete" data-report-id="${report.id}">
          <i class="fas fa-trash"></i> Xóa tin nhắn
        </button>
        <button class="btn-action ban" data-report-id="${report.id}" data-user-name="${report.reported_user_name}">
          <i class="fas fa-ban"></i> Cấm user
        </button>
      `;
    }

    cardEl.innerHTML = `
      <div class="report-header">
        <div>
          <div class="report-title">Báo cáo từ <strong>${escapeHTML(report.reported_by_name)}</strong></div>
        </div>
        <span class="report-status ${report.resolved ? 'status-resolved' : 'status-pending'}">
          ${report.resolved ? 'Đã xử lý' : 'Chưa xử lý'}
        </span>
      </div>

      <div class="report-meta">
        <div class="meta-item">
          <span class="meta-label">Người báo cáo:</span>
          <span class="meta-value">${escapeHTML(report.reported_by_name)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Người vi phạm:</span>
          <span class="meta-value">${escapeHTML(report.reported_user_name)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Phòng:</span>
          <span class="meta-value">#${report.room_id}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Lý do:</span>
          <span class="meta-value">${escapeHTML(report.reason)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Thời gian:</span>
          <span class="meta-value">${createdTime}</span>
        </div>
      </div>

      <div class="report-message">
        <div class="message-sender">${escapeHTML(report.reported_user_name)}</div>
        <div class="message-text">${escapeHTML(messageText)}</div>
      </div>

      <div class="report-actions">
        ${actionButtons}
        <button class="btn-action resolve" data-report-id="${report.id}">
          <i class="fas fa-check"></i> ${report.resolved ? 'Hủy xử lý' : 'Đánh dấu xử lý'}
        </button>
      </div>
    `;

    reportsList.appendChild(cardEl);

    // Attach action handlers
    const deleteBtn = cardEl.querySelector('.delete');
    const banBtn = cardEl.querySelector('.ban');
    const resolveBtn = cardEl.querySelector('.resolve');

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteMessage(report));
    }

    if (banBtn) {
      banBtn.addEventListener('click', () => openBanModal(report));
    }

    if (resolveBtn) {
      resolveBtn.addEventListener('click', () => toggleResolve(report));
    }
  });
}

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== Actions ====================
async function deleteMessage(report) {
  if (!confirm(`Delete message from ${report.reported_user_name}?`)) return;

  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', report.message_id);

    if (error) throw error;

    // Mark report as resolved
    await supabase
      .from('chat_reports')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', report.id);

    stats.deleted++;
    loadReports();
    alert('Message deleted and report marked as resolved');
  } catch (err) {
    console.error('Delete error:', err);
    alert('Error deleting message');
  }
}

function openBanModal(report) {
  selectedReportForBan = report;
  banUserName.textContent = report.reported_user_name;
  banModal.style.display = 'flex';
}

closeBanModal.addEventListener('click', () => {
  banModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === banModal) {
    banModal.style.display = 'none';
  }
});

banForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedReportForBan) return;

  try {
    const reason = banReason.value;
    const duration = parseInt(banDuration.value);
    const bannedUntil = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

    // Create ban record
    const { error } = await supabase
      .from('chat_bans')
      .insert({
        user_name: selectedReportForBan.reported_user_name,
        reason: reason,
        banned_until: bannedUntil,
        created_by: currentUser.id,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    // Mark report as resolved
    await supabase
      .from('chat_reports')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', selectedReportForBan.id);

    stats.banned++;
    banModal.style.display = 'none';
    banForm.reset();
    selectedReportForBan = null;
    loadReports();
    alert(`User ${selectedReportForBan?.reported_user_name} banned for ${duration} hours`);
  } catch (err) {
    console.error('Ban error:', err);
    alert('Error banning user');
  }
});

async function toggleResolve(report) {
  try {
    const { error } = await supabase
      .from('chat_reports')
      .update({
        resolved: !report.resolved,
        resolved_at: !report.resolved ? new Date().toISOString() : null
      })
      .eq('id', report.id);

    if (error) throw error;
    loadReports();
  } catch (err) {
    console.error('Resolve toggle error:', err);
  }
}

// ==================== Filters ====================
filterStatus.addEventListener('change', applyFilters);
filterReason.addEventListener('change', applyFilters);
refreshBtn.addEventListener('click', loadReports);

function applyFilters() {
  let filtered = allReports;

  if (filterStatus.value) {
    const isResolved = filterStatus.value === 'resolved';
    filtered = filtered.filter(r => r.resolved === isResolved);
  }

  if (filterReason.value) {
    filtered = filtered.filter(r =>
      r.reason?.toLowerCase().includes(filterReason.value.toLowerCase())
    );
  }

  renderReports(filtered);
}

// ==================== Stats ====================
function updateStats() {
  const pending = allReports.filter(r => !r.resolved).length;
  const resolved = allReports.filter(r => r.resolved).length;

  totalReports.textContent = pending;
  resolvedCount.textContent = resolved;
  deletedCount.textContent = stats.deleted;
  bannedCount.textContent = stats.banned;
}

// ==================== Auth Listeners ====================
logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    redirectToChat();
  } catch (err) {
    console.error('Logout error:', err);
  }
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    redirectToChat();
  }
});

// ==================== Initialize ====================
checkAdminAccess();
