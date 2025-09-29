// Entertainment Page JavaScript
// Firebase Configuration (same as main app)
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
let auth, database;

try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    showNotification('Lỗi kết nối Firebase. Vui lòng thử lại sau!', 'error');
}

// Global Variables
let currentUser = null;
let entertainmentItems = [];
let filteredItems = [];
let currentCategory = 'all';
let currentPage = 1;
const itemsPerPage = 6;
let editingItemId = null;

// Category Icons
const categoryIcons = {
    animation: 'fas fa-cube',
    reading: 'fas fa-book',
    movies: 'fas fa-film',
    links: 'fas fa-link'
};

// Category Names
const categoryNames = {
    animation: 'Hoạt hình 3D',
    reading: 'Đọc truyện', 
    movies: 'Xem phim',
    links: 'Link tinh'
};

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const userMenu = document.getElementById('userMenu');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const addEntertainmentBtn = document.getElementById('addEntertainmentBtn');
const entertainmentGrid = document.getElementById('entertainmentGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const pagination = document.getElementById('pagination');

// Modal Elements
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const entertainmentModal = document.getElementById('entertainmentModal');
const iframeModal = document.getElementById('iframeModal');

// Form Elements
const entertainmentForm = document.getElementById('entertainmentForm');
const modalTitle = document.getElementById('modalTitle');
const entertainmentTitle = document.getElementById('entertainmentTitle');
const entertainmentCategory = document.getElementById('entertainmentCategory');
const entertainmentUrl = document.getElementById('entertainmentUrl');
const entertainmentDescription = document.getElementById('entertainmentDescription');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize Application
function initializeApp() {
    // Check if Firebase is properly initialized
    if (!auth || !database) {
        console.error('Firebase not initialized properly');
        showNotification('Lỗi kết nối hệ thống. Vui lòng tải lại trang!', 'error');
        return;
    }

    // Check authentication state
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            showUserInterface();
            loadEntertainmentItems();
        } else {
            currentUser = null;
            showGuestInterface();
            loadPublicEntertainmentItems();
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Authentication
    loginBtn.addEventListener('click', () => showModal('loginModal'));
    registerBtn.addEventListener('click', () => showModal('registerModal'));
    logoutBtn.addEventListener('click', logout);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal.id);
        });
    });

    // Entertainment management
    addEntertainmentBtn.addEventListener('click', () => openEntertainmentModal());
    entertainmentForm.addEventListener('submit', handleEntertainmentSubmit);
    document.getElementById('cancelEntertainment').addEventListener('click', () => hideModal('entertainmentModal'));

    // Search and filters
    searchInput.addEventListener('input', handleSearch);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilter(btn.dataset.category));
    });

    // Authentication forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Modal switches
    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('loginModal');
        showModal('registerModal');
    });
    
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('registerModal');
        showModal('loginModal');
    });

    // Iframe controls
    document.getElementById('closeIframe').addEventListener('click', closeIframeViewer);
    document.getElementById('refreshIframe').addEventListener('click', refreshIframe);
    document.getElementById('fullscreenIframe').addEventListener('click', toggleFullscreen);

    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

// Authentication Functions
function showUserInterface() {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    addEntertainmentBtn.style.display = 'inline-flex';
    
    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    userName.textContent = displayName;
    
    // Show welcome message
    showNotification(`Chào mừng ${displayName}!`, 'success');
    
    // Update empty state message for logged in user
    const emptyStateContent = document.querySelector('.empty-state');
    if (emptyStateContent && entertainmentItems.length === 0) {
        emptyStateContent.innerHTML = `
            <i class="fas fa-plus-circle"></i>
            <h3>Bắt đầu thêm nội dung giải trí</h3>
            <p>Nhấn nút "Thêm mới" để tạo thẻ giải trí đầu tiên của bạn!</p>
            <button class="btn btn-primary" onclick="openEntertainmentModal()">
                <i class="fas fa-plus"></i> Thêm ngay
            </button>
        `;
    }
}

function showGuestInterface() {
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'inline-flex';
    userMenu.style.display = 'none';
    addEntertainmentBtn.style.display = 'none';
    
    // Update empty state message for guests
    const emptyStateContent = document.querySelector('.empty-state');
    if (emptyStateContent && entertainmentItems.length === 0) {
        emptyStateContent.innerHTML = `
            <i class="fas fa-play-circle"></i>
            <h3>Chưa có nội dung giải trí</h3>
            <p>Hãy đăng nhập để thêm nội dung giải trí mới hoặc xem nội dung có sẵn!</p>
            <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-primary" onclick="showModal('loginModal')">
                    <i class="fas fa-sign-in-alt"></i> Đăng nhập
                </button>
                <button class="btn btn-secondary" onclick="showModal('registerModal')">
                    <i class="fas fa-user-plus"></i> Đăng ký
                </button>
            </div>
        `;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    if (!auth) {
        showNotification('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang!', 'error');
        return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validation
    if (!email || !password) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }

    // Disable button during processing
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
    submitBtn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        hideModal('loginModal');
        showNotification('Đăng nhập thành công! Chào mừng bạn trở lại 🎉', 'success');
        
        // Reset form
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Lỗi đăng nhập: ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'Tài khoản không tồn tại!';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Mật khẩu không chính xác!';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Email không hợp lệ!';
                break;
            case 'auth/too-many-requests':
                errorMessage += 'Quá nhiều lần thử. Vui lòng thử lại sau!';
                break;
            case 'auth/network-request-failed':
                errorMessage += 'Lỗi mạng. Vui lòng kiểm tra kết nối!';
                break;
            default:
                errorMessage += 'Có lỗi xảy ra. Vui lòng thử lại!';
        }
        showNotification(errorMessage, 'error');
    } finally {
        // Re-enable button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    if (!auth || !database) {
        showNotification('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang!', 'error');
        return;
    }

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }

    if (name.length < 2) {
        showNotification('Tên phải có ít nhất 2 ký tự!', 'warning');
        return;
    }

    if (password.length < 6) {
        showNotification('Mật khẩu phải có ít nhất 6 ký tự!', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }

    // Disable button during processing
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
    submitBtn.disabled = true;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Save user info to database
        try {
            await database.ref(`users/${userCredential.user.uid}`).set({
                displayName: name,
                email: email,
                createdAt: Date.now(),
                lastLogin: Date.now()
            });
        } catch (dbError) {
            console.warn('Failed to save user info to database:', dbError);
            // Don't show error to user as account creation was successful
        }
        
        hideModal('registerModal');
        showNotification(`Chào mừng ${name}! Tài khoản đã được tạo thành công 🎊`, 'success');
        
        // Reset form
        document.getElementById('registerForm').reset();
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Lỗi đăng ký: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email này đã được sử dụng!';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Email không hợp lệ!';
                break;
            case 'auth/weak-password':
                errorMessage += 'Mật khẩu quá yếu!';
                break;
            case 'auth/network-request-failed':
                errorMessage += 'Lỗi mạng. Vui lòng kiểm tra kết nối!';
                break;
            default:
                errorMessage += 'Có lỗi xảy ra. Vui lòng thử lại!';
        }
        showNotification(errorMessage, 'error');
    } finally {
        // Re-enable button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function logout() {
    try {
        await auth.signOut();
        showNotification('Đăng xuất thành công!', 'success');
    } catch (error) {
        showNotification('Lỗi đăng xuất: ' + error.message, 'error');
    }
}

// Entertainment Management Functions
function loadEntertainmentItems() {
    const entertainmentRef = database.ref('entertainment');
    entertainmentRef.on('value', (snapshot) => {
        entertainmentItems = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                entertainmentItems.push({
                    id: child.key,
                    ...child.val()
                });
            });
        }
        applyFiltersAndRender();
    });
}

function loadPublicEntertainmentItems() {
    // Load only public entertainment items for guests
    const entertainmentRef = database.ref('entertainment');
    entertainmentRef.once('value', (snapshot) => {
        entertainmentItems = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const item = child.val();
                // Show all items for guests (or you can add a 'public' flag)
                entertainmentItems.push({
                    id: child.key,
                    ...item
                });
            });
        }
        applyFiltersAndRender();
    });
}

function openEntertainmentModal(itemId = null) {
    editingItemId = itemId;
    
    if (itemId) {
        // Edit mode
        const item = entertainmentItems.find(item => item.id === itemId);
        modalTitle.textContent = 'Chỉnh sửa nội dung';
        entertainmentTitle.value = item.title;
        entertainmentCategory.value = item.category;
        entertainmentUrl.value = item.url;
        entertainmentDescription.value = item.description || '';
    } else {
        // Add mode
        modalTitle.textContent = 'Thêm nội dung giải trí';
        entertainmentForm.reset();
    }
    
    showModal('entertainmentModal');
}

async function handleEntertainmentSubmit(e) {
    e.preventDefault();
    
    const itemData = {
        title: entertainmentTitle.value.trim(),
        category: entertainmentCategory.value,
        url: entertainmentUrl.value.trim(),
        description: entertainmentDescription.value.trim(),
        createdAt: editingItemId ? undefined : Date.now(),
        updatedAt: Date.now(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email
    };

    // Validate URL
    try {
        new URL(itemData.url);
    } catch (error) {
        showNotification('URL không hợp lệ!', 'error');
        return;
    }

    try {
        if (editingItemId) {
            // Update existing item
            await database.ref(`entertainment/${editingItemId}`).update(itemData);
            showNotification('Cập nhật thành công!', 'success');
        } else {
            // Create new item
            itemData.createdAt = Date.now();
            await database.ref('entertainment').push(itemData);
            showNotification('Thêm mới thành công!', 'success');
        }
        
        hideModal('entertainmentModal');
        editingItemId = null;
    } catch (error) {
        showNotification('Lỗi khi lưu: ' + error.message, 'error');
    }
}

async function deleteEntertainmentItem(itemId) {
    if (!confirm('Bạn có chắc chắn muốn xóa nội dung này?')) {
        return;
    }

    try {
        await database.ref(`entertainment/${itemId}`).remove();
        showNotification('Xóa thành công!', 'success');
    } catch (error) {
        showNotification('Lỗi khi xóa: ' + error.message, 'error');
    }
}

// Rendering Functions
function applyFiltersAndRender() {
    // Apply category filter
    if (currentCategory === 'all') {
        filteredItems = [...entertainmentItems];
    } else {
        filteredItems = entertainmentItems.filter(item => item.category === currentCategory);
    }

    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.title.toLowerCase().includes(searchTerm) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }

    // Sort by creation date (newest first)
    filteredItems.sort((a, b) => b.createdAt - a.createdAt);

    renderEntertainmentItems();
    renderPagination();
}

function renderEntertainmentItems() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredItems.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        entertainmentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    entertainmentGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    entertainmentGrid.innerHTML = pageItems.map(item => createEntertainmentCard(item)).join('');

    // Add event listeners to cards
    pageItems.forEach(item => {
        const card = entertainmentGrid.querySelector(`[data-id="${item.id}"]`);
        
        // View button
        const viewBtn = card.querySelector('.card-view-btn');
        viewBtn.addEventListener('click', () => openIframeViewer(item.url, item.title));
        
        // Edit and delete buttons (only for item owner)
        if (currentUser && currentUser.uid === item.authorId) {
            const editBtn = card.querySelector('.btn-edit');
            const deleteBtn = card.querySelector('.btn-delete');
            const actions = card.querySelector('.card-actions');
            
            actions.style.display = 'flex';
            editBtn.addEventListener('click', () => openEntertainmentModal(item.id));
            deleteBtn.addEventListener('click', () => deleteEntertainmentItem(item.id));
        }
    });
}

function createEntertainmentCard(item) {
    const template = document.getElementById('entertainmentCardTemplate');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.entertainment-card');
    
    card.setAttribute('data-id', item.id);
    
    // Category badge
    const categoryBadge = clone.querySelector('.category-badge');
    const categoryIcon = clone.querySelector('.category-icon');
    const categoryText = clone.querySelector('.category-text');
    
    categoryBadge.classList.add(item.category);
    categoryIcon.className = categoryIcons[item.category];
    categoryText.textContent = categoryNames[item.category];
    
    // Card content
    clone.querySelector('.card-title').textContent = item.title;
    clone.querySelector('.card-description').textContent = item.description || 'Không có mô tả';
    clone.querySelector('.author-name').textContent = item.authorName;
    clone.querySelector('.date-text').textContent = formatDate(item.createdAt);
    
    return card.outerHTML;
}

// Filter and Search Functions
function handleCategoryFilter(category) {
    currentCategory = category;
    currentPage = 1;
    
    // Update active filter button
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    applyFiltersAndRender();
}

function handleSearch() {
    currentPage = 1;
    applyFiltersAndRender();
}

// Pagination Functions
function renderPagination() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    // Next button
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    renderEntertainmentItems();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Iframe Viewer Functions
function openIframeViewer(url, title) {
    const iframe = document.getElementById('contentIframe');
    const iframeTitle = document.getElementById('iframeTitle');
    const loading = document.getElementById('iframeLoading');
    
    // Reset iframe
    iframe.src = '';
    loading.classList.remove('hidden');
    iframeTitle.textContent = title || 'Entertainment Viewer';
    
    // Show modal
    iframeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Load content
    setTimeout(() => {
        iframe.src = url;
        
        iframe.onload = () => {
            loading.classList.add('hidden');
        };
        
        iframe.onerror = () => {
            loading.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #dc3545;"></i>
                <p>Không thể tải nội dung này</p>
                <button class="btn btn-primary" onclick="closeIframeViewer()">Đóng</button>
            `;
        };
    }, 500);
}

function closeIframeViewer() {
    const iframe = document.getElementById('contentIframe');
    iframe.src = '';
    iframeModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function refreshIframe() {
    const iframe = document.getElementById('contentIframe');
    const loading = document.getElementById('iframeLoading');
    
    loading.classList.remove('hidden');
    iframe.src = iframe.src;
    
    iframe.onload = () => {
        loading.classList.add('hidden');
    };
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        iframeModal.requestFullscreen().catch(err => {
            console.log('Không thể vào chế độ toàn màn hình:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Utility Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset forms
    if (modalId === 'entertainmentModal') {
        entertainmentForm.reset();
        editingItemId = null;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Style notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: getNotificationColor(type),
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: '9999',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#28a745';
        case 'error': return '#dc3545';
        case 'warning': return '#ffc107';
        default: return '#17a2b8';
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            hideModal(activeModal.id);
        } else if (iframeModal.classList.contains('active')) {
            closeIframeViewer();
        }
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        hideModal(e.target.id);
    }
});