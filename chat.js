// Firebase Configuration (Authentication)
const firebaseConfig = {
    apiKey: "AIzaSyAmNTV2Gn_1ja4XyYeUOTjukktzjKcbRAI",
    authDomain: "apptruyen-670b1.firebaseapp.com",
    databaseURL: "https://apptruyen-670b1-default-rtdb.firebaseio.com",
    projectId: "apptruyen-670b1",
    storageBucket: "apptruyen-670b1.firebasestorage.app",
    messagingSenderId: "786140899201",
    appId: "1:786140899201:web:ddb0a74ba0e8b000caaa80",
    measurementId: "G-GKRH6H98MR"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

// Supabase Configuration (Data & Storage)
import { supabase } from './supabase.js';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const userMenu = document.getElementById('userMenu');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const closeLogin = document.getElementById('closeLogin');
const closeRegister = document.getElementById('closeRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const roomsList = document.getElementById('roomsList');
const onlineUsers = document.getElementById('onlineUsers');
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImageBtn = document.getElementById('removeImageBtn');
const replyingBar = document.getElementById('replyingBar');
const replyingToName = document.getElementById('replyingToName');
const replyingToText = document.getElementById('replyingToText');
const cancelReplyBtn = document.getElementById('cancelReplyBtn');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const adminBtn = document.getElementById('adminBtn');
const pinnedMessages = document.getElementById('pinnedMessages');
const pinnedList = document.getElementById('pinnedList');
const closePinned = document.getElementById('closePinned');

// State
let currentUser = null;
let currentRoom = null;
let currentRoomId = null;
let replyingTo = null;
let selectedImage = null;
let messagesSubscription = null;
let isSearching = false;
let searchResults = [];
let lastMessageTime = 0;
let lastMessageText = '';

const EMOJIS = ['😀', '😂', '😍', '😘', '😎', '🔥', '👍', '🎉', '🚀', '💯', '✨', '🌟', '⭐', '💬', '👏', '🎊'];

const DEFAULT_ROOMS = [
  { name: 'general', description: 'Phòng thảo luận chung cho cộng đồng', icon: '💬', order: 1 },
  { name: 'tech-news', description: 'Chia sẻ tin tức công nghệ', icon: '📰', order: 2 },
  { name: 'off-topic', description: 'Chuyện trò tự do', icon: '🎉', order: 3 }
];

// ==================== Auth Handlers ====================
function showLoginModal() {
  loginModal.style.display = 'flex';
  registerModal.style.display = 'none';
}

function showRegisterModal() {
  registerModal.style.display = 'flex';
  loginModal.style.display = 'none';
}

function closeModals() {
  loginModal.style.display = 'none';
  registerModal.style.display = 'none';
}

function getDisplayName(user) {
  return user?.displayName || user?.email?.split('@')?.[0] || 'Người dùng';
}

function updateAuthUI(user) {
  if (user) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    userName.textContent = getDisplayName(user);
    messageForm.style.display = 'flex';
    checkIfAdmin(user.uid);
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    userMenu.style.display = 'none';
    messageForm.style.display = 'none';
    adminBtn.style.display = 'none';
  }
}

async function checkIfAdmin(userId) {
  try {
    const { data } = await supabase
      .from('chat_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (data?.role === 'admin') {
      adminBtn.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Admin check error:', err);
  }
}

// ==================== Room Management ====================
async function loadRooms() {
  try {
    console.log('Loading rooms from Supabase...');
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Load rooms error details:', error);
      throw error;
    }

    console.log('Rooms loaded:', rooms);

    if (!rooms || rooms.length === 0) {
      console.log('No rooms found, creating default rooms...');
      for (const room of DEFAULT_ROOMS) {
        const { error: insertError } = await supabase.from('chat_rooms').insert(room);
        if (insertError) console.error('Insert room error:', insertError);
      }
      loadRooms();
      return;
    }

    renderRooms(rooms);
    
    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      switchRoom(firstRoom.id, firstRoom.description, firstRoom.name);
    }
  } catch (err) {
    console.error('Load rooms error:', err);
    alert('Lỗi tải phòng chat. Vui lòng xem console (F12) để chi tiết.');
  }
}

function renderRooms(rooms) {
  roomsList.innerHTML = '';
  rooms.forEach(room => {
    const roomEl = document.createElement('div');
    roomEl.className = `room-item ${room.id === currentRoomId ? 'active' : ''}`;
    roomEl.innerHTML = `<span class="room-icon">${room.icon || '💬'}</span> #${room.name}`;
    roomEl.addEventListener('click', () => switchRoom(room.id, room.description, room.name));
    roomsList.appendChild(roomEl);
  });
}

async function switchRoom(roomId, description, name) {
  currentRoomId = roomId;
  currentRoom = name;
  document.getElementById('roomTitle').textContent = `#${name}`;
  document.getElementById('roomDescription').textContent = description;

  loadPinnedMessages();
  loadMessages();
}

// ==================== Message Loading & Rendering ====================
async function loadMessages() {
  try {
    console.log('Loading messages for room_id:', currentRoomId, 'type:', typeof currentRoomId);
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', currentRoomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Load messages error details:', error);
      throw error;
    }

    console.log('Messages loaded:', messages?.length || 0);

    messagesContainer.innerHTML = '';
    messages?.forEach(msg => renderMessage(msg));
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Subscribe to new messages
    if (messagesSubscription) await messagesSubscription.unsubscribe();
    
    messagesSubscription = supabase
      .channel(`room-${currentRoomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            renderMessage(payload.new);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          } else if (payload.eventType === 'UPDATE') {
            updateMessage(payload.new);
          } else if (payload.eventType === 'DELETE') {
            removeMessage(payload.old.id);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.error('Load messages error:', err);
  }
}

function renderMessage(msg) {
  if (document.getElementById(`msg-${msg.id}`)) return;

  const msgEl = document.createElement('div');
  msgEl.id = `msg-${msg.id}`;
  msgEl.className = 'message-row';
  
  const isOwn = currentUser?.uid === msg.sender_id;
  msgEl.classList.add(isOwn ? 'own' : 'other');

  let replyPreview = '';
  if (msg.reply_to) {
    replyPreview = '<div class="reply-preview">Trả lời tin nhắn</div>';
  }

  const createdAt = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  
  let contentHtml = '';
  if (msg.image_url) {
    contentHtml = `<img src="${msg.image_url}" class="message-image" alt="image">`;
  }
  if (msg.text) {
    contentHtml += `<p class="message-text">${highlightMentions(escapeHtml(msg.text))}</p>`;
  }

  const pinClass = msg.pinned_at ? 'pinned' : '';
  const actions = isOwn ? `
    <button class="btn-icon-small reply-action" data-msg-id="${msg.id}" data-sender="${msg.sender_name}" data-text="${msg.text || '(ảnh)'}">
      <i class="fas fa-reply"></i>
    </button>
    <button class="btn-icon-small pin-action" data-msg-id="${msg.id}" data-pinned="${!!msg.pinned_at}">
      <i class="fas fa-${msg.pinned_at ? 'thumbtack' : 'thumbtack'}"></i>
    </button>
    <button class="btn-icon-small delete-action" data-msg-id="${msg.id}">
      <i class="fas fa-trash"></i>
    </button>
  ` : `
    <button class="btn-icon-small reply-action" data-msg-id="${msg.id}" data-sender="${msg.sender_name}" data-text="${msg.text || '(ảnh)'}">
      <i class="fas fa-reply"></i>
    </button>
    <button class="btn-icon-small report-action" data-msg-id="${msg.id}">
      <i class="fas fa-flag"></i>
    </button>
  `;

  msgEl.innerHTML = `
    <div class="message-content ${pinClass}">
      <div class="message-header">
        <span class="message-sender">${msg.sender_name}</span>
        <span class="message-time">${createdAt}</span>
      </div>
      ${replyPreview}
      ${contentHtml}
      <div class="message-actions">${actions}</div>
    </div>
  `;

  const replyBtn = msgEl.querySelector('.reply-action');
  const pinBtn = msgEl.querySelector('.pin-action');
  const deleteBtn = msgEl.querySelector('.delete-action');
  const reportBtn = msgEl.querySelector('.report-action');

  if (replyBtn) {
    replyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = replyBtn.dataset.msgId;
      const sender = replyBtn.dataset.sender;
      const text = replyBtn.dataset.text;
      setReplyMessage(msgId, sender, text);
    });
  }

  if (pinBtn) {
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = pinBtn.dataset.msgId;
      const isPinned = pinBtn.dataset.pinned === 'true';
      togglePinMessage(msgId, !isPinned);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = deleteBtn.dataset.msgId;
      if (confirm('Xóa tin nhắn này?')) {
        deleteMessage(msgId);
      }
    });
  }

  if (reportBtn) {
    reportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = reportBtn.dataset.msgId;
      reportMessage(msgId);
    });
  }

  messagesContainer.appendChild(msgEl);
}

function updateMessage(msg) {
  const msgEl = document.getElementById(`msg-${msg.id}`);
  if (msgEl) {
    msgEl.remove();
    renderMessage(msg);
  }
}

function removeMessage(msgId) {
  const msgEl = document.getElementById(`msg-${msgId}`);
  if (msgEl) msgEl.remove();
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function truncateText(text, limit) {
  return text.length > limit ? text.substring(0, limit) + '...' : text;
}

function highlightMentions(text) {
  return text.replace(/(\s|^)@([\w\u0100-\u1EFF]{2,30})/g, '$1<span class="mention">@$2</span>');
}

function getMentionedUsers(text) {
  const matches = text.match(/@([\w\u0100-\u1EFF]{2,30})/g);
  return matches ? matches.map(m => m.substring(1)) : [];
}

// ==================== Pinned Messages ====================
async function loadPinnedMessages() {
  try {
    console.log('Loading pinned messages for room_id:', currentRoomId);
    const { data: pinned, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', currentRoomId)
      .not('pinned_at', 'is', null)
      .order('pinned_at', { ascending: false });

    if (error) {
      console.error('Load pinned error details:', error);
      throw error;
    }

    if (pinned && pinned.length > 0) {
      pinnedMessages.style.display = 'block';
      pinnedList.innerHTML = '';
      pinned.slice(0, 5).forEach(msg => {
        const el = document.createElement('div');
        el.className = 'pinned-item';
        el.innerHTML = `
          <div class="pinned-sender">${msg.sender_name}</div>
          <div class="pinned-text">${truncateText(msg.text || '(ảnh)', 100)}</div>
          <button class="btn-icon-small unpin-btn" data-msg-id="${msg.id}">
            <i class="fas fa-times"></i>
          </button>
        `;
        el.querySelector('.unpin-btn')?.addEventListener('click', () => {
          togglePinMessage(msg.id, false);
        });
        pinnedList.appendChild(el);
      });
    } else {
      pinnedMessages.style.display = 'none';
    }
  } catch (err) {
    console.error('Load pinned error:', err);
  }
}

async function togglePinMessage(msgId, pin) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ pinned_at: pin ? new Date().toISOString() : null })
      .eq('id', msgId);

    if (error) throw error;
    loadPinnedMessages();
  } catch (err) {
    console.error('Toggle pin error:', err);
  }
}

// ==================== Send Message ====================
async function sendMessage() {
  if (!currentUser || !currentRoomId) return;

  try {
    const text = messageInput.value.trim();
    if (!text && !selectedImage) return;

    const now = Date.now();
    if (now - lastMessageTime < 1000 && text === lastMessageText) {
      alert('Chờ một chút trước khi gửi lại');
      return;
    }

    let imageUrl = '';
    if (selectedImage) {
      const filename = `${currentUser.uid}-${now}-${selectedImage.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filename, selectedImage);
      
      if (uploadError) throw uploadError;
      imageUrl = supabase.storage.from('chat-images').getPublicUrl(filename).data.publicUrl;
    }

    console.log('Sending message:', {
      room_id: currentRoomId,
      sender_id: currentUser.uid,
      sender_name: getDisplayName(currentUser),
      text: text.substring(0, 50),
      type_room_id: typeof currentRoomId
    });

    const { error } = await supabase.from('chat_messages').insert({
      room_id: currentRoomId,
      sender_id: currentUser.uid,
      sender_name: getDisplayName(currentUser),
      text: text,
      image_url: imageUrl,
      reply_to: replyingTo?.id || null,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Send message error - code:', error.code);
      console.error('Send message error - message:', error.message);
      console.error('Send message error - details:', error.details);
      console.error('Send message error - hint:', error.hint);
      throw error;
    }

    messageInput.value = '';
    selectedImage = null;
    imagePreview.style.display = 'none';
    replyingTo = null;
    replyingBar.style.display = 'none';
    lastMessageTime = now;
    lastMessageText = text;
  } catch (err) {
    console.error('Send message error catch:', err?.message || err);
    alert('Lỗi gửi tin nhắn: ' + (err?.message || err));
  }
}

async function deleteMessage(msgId) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', msgId);

    if (error) throw error;
  } catch (err) {
    console.error('Delete message error:', err);
  }
}

async function reportMessage(msgId) {
  try {
    const reason = prompt('Lý do báo cáo:');
    if (!reason) return;

    const { error } = await supabase.from('chat_reports').insert({
      message_id: msgId,
      reporter_id: currentUser.uid,
      reason: reason,
      created_at: new Date().toISOString()
    });

    if (error) throw error;
    alert('Đã báo cáo tin nhắn');
  } catch (err) {
    console.error('Report message error:', err);
  }
}

// ==================== Online Users ====================
async function loadOnlineUsers() {
  try {
    const { data: users, error } = await supabase
      .from('chat_users')
      .select('display_name, is_online')
      .eq('is_online', true);

    if (error) throw error;

    onlineUsers.innerHTML = '';
    users?.forEach(user => {
      const userEl = document.createElement('div');
      userEl.className = 'online-user';
      userEl.innerHTML = `<i class="fas fa-circle online-indicator"></i> ${user.display_name}`;
      onlineUsers.appendChild(userEl);
    });

    supabase
      .channel('online-users')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_users', filter: 'is_online=eq.true' },
        () => loadOnlineUsers()
      )
      .subscribe();
  } catch (err) {
    console.error('Load online users error:', err);
  }
}

// ==================== Search ====================
function setupSearch() {
  searchBtn.addEventListener('click', () => {
    searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'none';
    searchInput.focus();
  });

  searchInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    
    try {
      const query = searchInput.value.trim();
      if (!query) return;

      const { data: results, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', currentRoomId)
        .ilike('text', `%${query}%`);

      if (error) throw error;

      searchResults = results || [];
      messagesContainer.innerHTML = '';
      searchResults.forEach(msg => renderMessage(msg));
      
      if (searchResults.length === 0) {
        messagesContainer.innerHTML = '<p class="search-empty">Không tìm thấy kết quả</p>';
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  });
}

// ==================== Reply & Emoji ====================
function setReplyMessage(msgId, senderName, text) {
  replyingTo = { id: msgId, sender_name: senderName, text: text };
  replyingToName.textContent = senderName;
  replyingToText.textContent = truncateText(text, 80);
  replyingBar.style.display = 'flex';
}

function setupEmojiPicker() {
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'grid' : 'none';
  });

  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      messageInput.value += emoji;
      messageInput.focus();
    });
    emojiPicker.appendChild(btn);
  });
}

// ==================== Image Upload ====================
imageBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn (max 5MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Chỉ chấp nhận file ảnh');
      return;
    }
    selectedImage = file;
    previewImg.src = URL.createObjectURL(file);
    imagePreview.style.display = 'flex';
  }
});

removeImageBtn.addEventListener('click', () => {
  selectedImage = null;
  imagePreview.style.display = 'none';
});

// ==================== Event Listeners ====================
cancelReplyBtn.addEventListener('click', () => {
  replyingTo = null;
  replyingBar.style.display = 'none';
});

loginBtn.addEventListener('click', showLoginModal);
registerBtn.addEventListener('click', showRegisterModal);
closeLogin.addEventListener('click', closeModals);
closeRegister.addEventListener('click', closeModals);
closePinned.addEventListener('click', () => pinnedMessages.style.display = 'none');

switchToRegister.addEventListener('click', showRegisterModal);
switchToLogin.addEventListener('click', showLoginModal);

logoutBtn.addEventListener('click', async () => {
  try {
    const { error } = await supabase.from('chat_users').update({ is_online: false }).eq('id', currentUser.uid);
    if (error) console.error('Offline error:', error);
    await auth.signOut();
    currentUser = null;
    updateAuthUI(null);
    messagesContainer.innerHTML = '';
    roomsList.innerHTML = '';
  } catch (err) {
    console.error('Logout error:', err);
  }
});

adminBtn.addEventListener('click', () => {
  window.location.href = 'admin.html';
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ==================== Auth State ====================
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateAuthUI(user);
  
  if (user) {
    const { error: syncError } = await supabase.from('chat_users').upsert({
      id: user.uid,
      display_name: getDisplayName(user),
      is_online: true,
      last_seen: new Date().toISOString()
    });
    if (syncError) console.error('Sync error:', syncError);

    loadRooms();
    loadOnlineUsers();
    setupSearch();
    setupEmojiPicker();

    window.addEventListener('beforeunload', async () => {
      const { error } = await supabase.from('chat_users').update({ is_online: false }).eq('id', user.uid);
      if (error) console.error('Offline error:', error);
    });
  }
});

// ==================== Login/Register Handlers ====================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const { error } = await auth.signInWithEmailAndPassword(email, password);
    if (error) throw error;
    closeModals();
  } catch (err) {
    alert('Lỗi đăng nhập: ' + err.message);
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const displayName = document.getElementById('registerName').value;

  try {
    const { user, error } = await auth.createUserWithEmailAndPassword(email, password);
    if (error) throw error;

    await user.updateProfile({ displayName });
    await supabase.from('chat_users').insert({
      id: user.uid,
      display_name: displayName,
      role: 'user',
      is_online: true
    });

    closeModals();
  } catch (err) {
    alert('Lỗi đăng ký: ' + err.message);
  }
});
