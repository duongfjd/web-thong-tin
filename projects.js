// Firebase Configuration
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();

// Global Variables
let currentUser = null;
let linksData = [];
let filteredLinks = [];
let currentPage = 1;
const itemsPerPage = 10;
let editingLinkId = null;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const userMenu = document.getElementById('userMenu');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const addLinkBtn = document.getElementById('addLinkBtn');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const projectsTableBody = document.getElementById('projectsTableBody');
const noDataMessage = document.getElementById('noDataMessage');
const pagination = document.getElementById('pagination');

// Modal Elements
const linkModal = document.getElementById('linkModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const deleteModal = document.getElementById('deleteModal');

// Form Elements
const linkForm = document.getElementById('linkForm');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    auth.onAuthStateChanged(handleAuthStateChange);
});

function setupEventListeners() {
    // Authentication buttons
    loginBtn.addEventListener('click', () => openModal(loginModal));
    registerBtn.addEventListener('click', () => openModal(registerModal));
    logoutBtn.addEventListener('click', handleLogout);

    // Modal controls
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    linkForm.addEventListener('submit', handleLinkSubmit);

    // Modal switches
    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(registerModal);
    });

    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(registerModal);
        openModal(loginModal);
    });

    // Link management
    addLinkBtn.addEventListener('click', () => openLinkModal());
    document.getElementById('cancelBtn').addEventListener('click', () => closeModal(linkModal));

    // Delete modal
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => closeModal(deleteModal));
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('closeDeleteModal').addEventListener('click', () => closeModal(deleteModal));

    // Search and filter
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    categoryFilter.addEventListener('change', handleFilter);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// Authentication Functions
function handleAuthStateChange(user) {
    console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
    currentUser = user;
    updateAuthUI();
    
    // Load public links regardless of login status
    console.log('Loading public links...');
    loadLinks();
}

function updateAuthUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        userName.textContent = currentUser.displayName || currentUser.email;
        addLinkBtn.style.display = 'inline-flex';
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        userMenu.style.display = 'none';
        addLinkBtn.style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeModal(loginModal);
        showNotification('Đăng nhập thành công!', 'success');
        loginForm.reset();
    } catch (error) {
        showNotification('Lỗi đăng nhập: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: name });
        closeModal(registerModal);
        showNotification('Đăng ký thành công!', 'success');
        registerForm.reset();
    } catch (error) {
        showNotification('Lỗi đăng ký: ' + error.message, 'error');
    }
}

function handleLogout() {
    auth.signOut();
    showNotification('Đã đăng xuất!', 'info');
}

// Links Management Functions
async function loadLinks() {
    try {
        // Load all public links from all users
        const snapshot = await database.ref('publicLinks').once('value');
        const data = snapshot.val();
        linksData = data ? Object.entries(data).map(([id, link]) => ({ id, ...link })) : [];
        
        // Sort by creation date (newest first)
        linksData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        applyFilters();
    } catch (error) {
        showNotification('Lỗi tải dữ liệu: ' + error.message, 'error');
    }
}

function applyFilters() {
    let filtered = [...linksData];

    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(link => 
            link.name.toLowerCase().includes(searchTerm) ||
            link.url.toLowerCase().includes(searchTerm) ||
            link.description.toLowerCase().includes(searchTerm)
        );
    }

    // Apply category filter
    const categoryTerm = categoryFilter.value;
    if (categoryTerm) {
        filtered = filtered.filter(link => link.category === categoryTerm);
    }

    filteredLinks = filtered;
    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLinks = filteredLinks.slice(startIndex, endIndex);

    if (paginatedLinks.length === 0) {
        projectsTableBody.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }

    noDataMessage.style.display = 'none';
    
    projectsTableBody.innerHTML = paginatedLinks.map((link, index) => {
        const isOwner = currentUser && link.createdBy && link.createdBy.uid === currentUser.uid;
        const creatorName = link.createdBy ? link.createdBy.name : 'Ẩn danh';
        
        return `
        <tr class="fade-in">
            <td>${startIndex + index + 1}</td>
            <td>
                <div class="link-name" title="${link.name}">${link.name}</div>
            </td>
            <td>
                <a href="${link.url}" class="link-url" target="_blank" rel="noopener noreferrer" title="${link.url}">
                    ${link.url}
                </a>
            </td>
            <td>
                <span class="category-tag category-${link.category}">
                    ${getCategoryName(link.category)}
                </span>
            </td>
            <td>
                <div class="link-description" title="${link.description || 'Không có mô tả'}">
                    ${link.description || 'Không có mô tả'}
                </div>
            </td>
            <td class="creator-cell">
                <div class="creator-info" title="${creatorName}">
                    <i class="fas fa-user"></i>
                    ${creatorName}
                    ${isOwner ? '<span class="owner-badge">(Bạn)</span>' : ''}
                </div>
            </td>
            <td class="date-cell">
                ${formatDate(link.createdAt)}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-visit" onclick="visitLink('${link.url}')" title="Truy cập">
                        <i class="fas fa-external-link-alt"></i>
                        Truy cập
                    </button>
                    ${isOwner ? `
                        <button class="action-btn btn-edit" onclick="editLink('${link.id}')" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                            Sửa
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteLink('${link.id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                            Xóa
                        </button>
                    ` : `
                        <button class="action-btn btn-disabled" disabled title="Chỉ chủ sở hữu mới có thể sửa">
                            <i class="fas fa-lock"></i>
                            Khóa
                        </button>
                    `}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination() {
    const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Trước
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span>...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span>...</span>`;
        }
        paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Sau <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    // Info
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredLinks.length);
    paginationHTML += `
        <div class="pagination-info">
            Hiển thị ${startIndex}-${endIndex} / ${filteredLinks.length} links
        </div>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        renderPagination();
    }
}

// Modal Functions
function openModal(modal) {
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

function openLinkModal(linkId = null) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thêm link!', 'info');
        openModal(loginModal);
        return;
    }

    editingLinkId = linkId;
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtn');

    if (linkId) {
        const link = linksData.find(l => l.id === linkId);
        if (link) {
            modalTitle.textContent = 'Chỉnh sửa Link';
            submitBtn.textContent = 'Cập nhật Link';
            
            document.getElementById('linkName').value = link.name;
            document.getElementById('linkUrl').value = link.url;
            document.getElementById('linkCategory').value = link.category;
            document.getElementById('linkDescription').value = link.description || '';
        }
    } else {
        modalTitle.textContent = 'Thêm Link Mới';
        submitBtn.textContent = 'Lưu Link';
        linkForm.reset();
        // Set default category if needed
        document.getElementById('linkCategory').value = '';
    }

    openModal(linkModal);
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('linkName').focus();
    }, 100);
}

async function handleLinkSubmit(e) {
    e.preventDefault();
    
    // Check if user is logged in
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thêm link!', 'error');
        openModal(loginModal);
        return;
    }
    
    const linkData = {
        name: document.getElementById('linkName').value.trim(),
        url: document.getElementById('linkUrl').value.trim(),
        category: document.getElementById('linkCategory').value,
        description: document.getElementById('linkDescription').value.trim(),
        updatedAt: new Date().toISOString()
    };

    // Validation
    if (!linkData.name || !linkData.url || !linkData.category) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
        return;
    }

    // Validate URL format
    try {
        new URL(linkData.url);
    } catch (error) {
        showNotification('URL không hợp lệ!', 'error');
        return;
    }

    console.log('Saving link data:', linkData);

    // Add user info for public links
    linkData.createdBy = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        email: currentUser.email
    };

    try {
        if (editingLinkId) {
            // Update existing link (only if user owns it)
            console.log('Updating link:', editingLinkId);
            const linkRef = database.ref(`publicLinks/${editingLinkId}`);
            const linkSnapshot = await linkRef.once('value');
            const existingLink = linkSnapshot.val();
            
            if (existingLink && existingLink.createdBy.uid === currentUser.uid) {
                await linkRef.update(linkData);
                showNotification('Link đã được cập nhật!', 'success');
            } else {
                showNotification('Bạn chỉ có thể sửa links của riêng mình!', 'error');
                return;
            }
        } else {
            // Add new public link
            console.log('Adding new public link for user:', currentUser.uid);
            linkData.createdAt = new Date().toISOString();
            await database.ref('publicLinks').push(linkData);
            showNotification('Link đã được thêm và chia sẻ công khai!', 'success');
        }

        closeModal(linkModal);
        linkForm.reset();
        editingLinkId = null;
        await loadLinks();
    } catch (error) {
        console.error('Error saving link:', error);
        showNotification('Lỗi lưu link: ' + error.message, 'error');
    }
}

function editLink(linkId) {
    openLinkModal(linkId);
}

function deleteLink(linkId) {
    if (!currentUser) return;
    
    editingLinkId = linkId;
    openModal(deleteModal);
}

async function confirmDelete() {
    if (!editingLinkId || !currentUser) return;

    try {
        // Check if user owns the link before deleting
        const linkRef = database.ref(`publicLinks/${editingLinkId}`);
        const linkSnapshot = await linkRef.once('value');
        const existingLink = linkSnapshot.val();
        
        if (existingLink && existingLink.createdBy.uid === currentUser.uid) {
            await linkRef.remove();
            showNotification('Link đã được xóa!', 'success');
        } else {
            showNotification('Bạn chỉ có thể xóa links của riêng mình!', 'error');
        }
        
        closeModal(deleteModal);
        editingLinkId = null;
        await loadLinks();
    } catch (error) {
        showNotification('Lỗi xóa link: ' + error.message, 'error');
    }
}

function visitLink(url) {
    if (url) {
        // Try to open in new tab
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        
        // Check if popup was blocked
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Fallback: copy to clipboard
            copyToClipboard(url);
            showNotification('Popup bị chặn! URL đã được sao chép vào clipboard. Hãy dán vào thanh địa chỉ để truy cập.', 'info');
        } else {
            showNotification('Đang mở link trong tab mới...', 'success');
        }
    }
}

// Search and Filter Functions
function handleSearch() {
    applyFilters();
}

function handleFilter() {
    applyFilters();
}

// Utility Functions
function getCategoryName(category) {
    const categoryNames = {
        'work': 'Công việc',
        'study': 'Học tập',
        'tools': 'Công cụ',
        'entertainment': 'Giải trí',
        'social': 'Mạng xã hội',
        'other': 'Khác'
    };
    return categoryNames[category] || category;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Hôm nay';
    } else if (diffDays === 1) {
        return 'Hôm qua';
    } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
    } else {
        return date.toLocaleDateString('vi-VN');
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('URL copied to clipboard');
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback: Could not copy text', err);
    }
    
    document.body.removeChild(textArea);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    const closeBtn = notification.querySelector('.notification-close');
    
    notification.className = `notification ${type}`;
    messageElement.textContent = message;
    
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
    
    // Close button
    closeBtn.onclick = () => {
        notification.classList.remove('show');
    };
}