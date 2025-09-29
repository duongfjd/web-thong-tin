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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let currentUser = null;
let allPosts = [];
let filteredPosts = [];
let currentView = 'grid';
let currentPage = 1;
let postsPerPage = 6;
let editingPostId = null;

// DOM Elements
const elements = {
    // Navigation
    hamburger: document.getElementById('hamburger'),
    navMenu: document.getElementById('nav-menu'),
    
    // Auth
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    userMenu: document.getElementById('userMenu'),
    userName: document.getElementById('userName'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Modals
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    postModal: document.getElementById('postModal'),
    postDetailModal: document.getElementById('postDetailModal'),
    confirmDeleteModal: document.getElementById('confirmDeleteModal'),
    
    // Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    postForm: document.getElementById('postForm'),
    
    // Blog controls
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    categoryFilter: document.getElementById('categoryFilter'),
    newPostBtn: document.getElementById('newPostBtn'),
    toggleViewBtn: document.getElementById('toggleViewBtn'),
    
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    myPostsLink: document.getElementById('myPostsLink'),
    myPostsTab: document.getElementById('myPostsTab'),
    
    // Post containers
    allPostsGrid: document.getElementById('allPostsGrid'),
    myPostsGrid: document.getElementById('myPostsGrid'),
    postsLoading: document.getElementById('postsLoading'),
    noPostsMessage: document.getElementById('noPostsMessage'),
    noMyPostsMessage: document.getElementById('noMyPostsMessage'),
    pagination: document.getElementById('pagination')
};

// Initialize AOS
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 1000,
        easing: 'ease-in-out',
        once: true,
        offset: 100
    });
});

// =====================================
// AUTHENTICATION
// =====================================

// Auth state observer
auth.onAuthStateChanged(function(user) {
    if (user) {
        currentUser = user;
        updateUIForLoggedInUser();
        loadPosts();
    } else {
        currentUser = null;
        updateUIForLoggedOutUser();
        loadPosts();
    }
});

// Update UI for logged in user
function updateUIForLoggedInUser() {
    elements.loginBtn.style.display = 'none';
    elements.registerBtn.style.display = 'none';
    elements.userMenu.style.display = 'flex';
    elements.userName.textContent = currentUser.displayName || currentUser.email;
    elements.newPostBtn.style.display = 'inline-flex';
    elements.myPostsLink.style.display = 'block';
    elements.myPostsTab.style.display = 'block';
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    elements.loginBtn.style.display = 'inline-block';
    elements.registerBtn.style.display = 'inline-block';
    elements.userMenu.style.display = 'none';
    elements.newPostBtn.style.display = 'none';
    elements.myPostsLink.style.display = 'none';
    elements.myPostsTab.style.display = 'none';
    
    // Switch to all posts tab
    switchTab('all-posts');
}

// Register user
elements.registerForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
        return;
    }
    
    try {
        showLoading(e.target);
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: name });
        
        await database.ref('users/' + user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showMessage('Đăng ký thành công!', 'success');
        closeModal(elements.registerModal);
        this.reset();
        
    } catch (error) {
        showMessage(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading(e.target);
    }
});

// Login user
elements.loginForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading(e.target);
        
        await auth.signInWithEmailAndPassword(email, password);
        showMessage('Đăng nhập thành công!', 'success');
        closeModal(elements.loginModal);
        this.reset();
        
    } catch (error) {
        showMessage(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading(e.target);
    }
});

// Logout user
elements.logoutBtn?.addEventListener('click', async function(e) {
    e.preventDefault();
    
    try {
        await auth.signOut();
        showMessage('Đăng xuất thành công!', 'success');
    } catch (error) {
        showMessage('Có lỗi khi đăng xuất!', 'error');
    }
});

// =====================================
// MODAL FUNCTIONALITY
// =====================================

function openModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Modal event listeners
elements.loginBtn?.addEventListener('click', () => openModal(elements.loginModal));
elements.registerBtn?.addEventListener('click', () => openModal(elements.registerModal));

// Close modal events
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        closeModal(modal);
    });
});

// Modal switches
document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(elements.loginModal);
    openModal(elements.registerModal);
});

document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(elements.registerModal);
    openModal(elements.loginModal);
});

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

// =====================================
// POST MANAGEMENT
// =====================================

// Open new post modal
elements.newPostBtn?.addEventListener('click', function() {
    if (!currentUser) {
        showMessage('Vui lòng đăng nhập để viết bài!', 'error');
        return;
    }
    openPostModal();
});

function openPostModal(post = null) {
    const modal = elements.postModal;
    const modalTitle = document.getElementById('postModalTitle');
    const form = elements.postForm;
    
    if (post) {
        // Edit mode
        editingPostId = post.id;
        modalTitle.textContent = 'Chỉnh sửa bài viết';
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postCategory').value = post.category;
        document.getElementById('postContent').value = post.content;
        document.getElementById('postTags').value = post.tags ? post.tags.join(', ') : '';
    } else {
        // New post mode
        editingPostId = null;
        modalTitle.textContent = 'Viết bài mới';
        form.reset();
    }
    
    openModal(modal);
}

// Submit post form
elements.postForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showMessage('Vui lòng đăng nhập để đăng bài!', 'error');
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value.trim();
    const tagsInput = document.getElementById('postTags').value.trim();
    
    if (!title || !category || !content) {
        showMessage('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
        return;
    }
    
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const postData = {
        title,
        category,
        content,
        tags,
        author: currentUser.displayName || currentUser.email,
        authorId: currentUser.uid,
        createdAt: editingPostId ? undefined : firebase.database.ServerValue.TIMESTAMP,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : '')
    };
    
    try {
        showLoading(e.target);
        
        if (editingPostId) {
            // Update existing post
            await database.ref('posts/' + editingPostId).update(postData);
            showMessage('Cập nhật bài viết thành công!', 'success');
        } else {
            // Create new post
            await database.ref('posts').push(postData);
            showMessage('Đăng bài thành công!', 'success');
        }
        
        closeModal(elements.postModal);
        loadPosts();
        
    } catch (error) {
        console.error('Error saving post:', error);
        showMessage('Có lỗi khi lưu bài viết!', 'error');
    } finally {
        hideLoading(e.target);
    }
});

// Cancel post
document.getElementById('cancelPost')?.addEventListener('click', function() {
    closeModal(elements.postModal);
});

// Load posts from database
async function loadPosts() {
    try {
        showLoading(elements.postsLoading);
        elements.postsLoading.style.display = 'flex';
        
        const snapshot = await database.ref('posts').orderByChild('createdAt').once('value');
        const postsData = snapshot.val();
        
        allPosts = [];
        if (postsData) {
            Object.keys(postsData).forEach(key => {
                allPosts.push({
                    id: key,
                    ...postsData[key]
                });
            });
        }
        
        // Sort by newest first
        allPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        filteredPosts = [...allPosts];
        displayPosts();
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showMessage('Có lỗi khi tải bài viết!', 'error');
    } finally {
        elements.postsLoading.style.display = 'none';
    }
}

// Display posts
function displayPosts() {
    const activeTab = document.querySelector('.tab-content.active').id;
    const container = activeTab === 'all-posts' ? elements.allPostsGrid : elements.myPostsGrid;
    const noPostsMessage = activeTab === 'all-posts' ? elements.noPostsMessage : elements.noMyPostsMessage;
    
    let postsToShow = [];
    
    if (activeTab === 'all-posts') {
        postsToShow = filteredPosts;
    } else {
        postsToShow = currentUser ? filteredPosts.filter(post => post.authorId === currentUser.uid) : [];
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = postsToShow.slice(startIndex, endIndex);
    
    if (paginatedPosts.length === 0) {
        container.innerHTML = '';
        noPostsMessage.style.display = 'flex';
    } else {
        noPostsMessage.style.display = 'none';
        container.innerHTML = paginatedPosts.map(post => createPostCard(post)).join('');
        container.className = `posts-grid ${currentView === 'list' ? 'list-view' : ''}`;
    }
    
    // Update pagination
    updatePagination(postsToShow.length);
}

// Create post card HTML
function createPostCard(post) {
    const isOwner = currentUser && post.authorId === currentUser.uid;
    const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong';
    const authorInitial = post.author ? post.author.charAt(0).toUpperCase() : 'U';
    
    return `
        <article class="post-card fade-in" onclick="viewPost('${post.id}')">
            <div class="post-image">
                <div class="post-category">${getCategoryName(post.category)}</div>
            </div>
            <div class="post-content">
                <div class="post-meta">
                    <div class="post-author">
                        <div class="author-avatar">${authorInitial}</div>
                        <span>${post.author}</span>
                    </div>
                    <span class="post-date">${createdDate}</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-excerpt">${post.excerpt}</p>
                ${post.tags && post.tags.length > 0 ? `
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="post-footer">
                    <div class="post-stats">
                        <span><i class="fas fa-eye"></i> 0</span>
                        <span><i class="fas fa-comment"></i> 0</span>
                    </div>
                    ${isOwner ? `
                        <div class="post-actions">
                            <button class="btn-edit" onclick="editPost(event, '${post.id}')" title="Chỉnh sửa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="deletePost(event, '${post.id}')" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </article>
    `;
}

// Get category name in Vietnamese
function getCategoryName(category) {
    const categories = {
        'technology': 'Công nghệ',
        'lifestyle': 'Lối sống',
        'travel': 'Du lịch',
        'food': 'Ẩm thực',
        'education': 'Giáo dục',
        'entertainment': 'Giải trí'
    };
    return categories[category] || category;
}

// View post detail
function viewPost(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    const modal = elements.postDetailModal;
    const content = document.getElementById('postDetailContent');
    const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong';
    
    content.innerHTML = `
        <div class="detail-header">
            <h1>${post.title}</h1>
            <div class="detail-meta">
                <span><i class="fas fa-user"></i> ${post.author}</span>
                <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                <span><i class="fas fa-folder"></i> ${getCategoryName(post.category)}</span>
            </div>
        </div>
        <div class="detail-body">
            <div class="detail-content">
                ${post.content.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
            </div>
        </div>
        ${post.tags && post.tags.length > 0 ? `
            <div class="detail-tags">
                <h4>Tags:</h4>
                <div class="post-tags">
                    ${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    openModal(modal);
}

// Edit post
function editPost(event, postId) {
    event.stopPropagation();
    
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    if (post.authorId !== currentUser.uid) {
        showMessage('Bạn không có quyền chỉnh sửa bài viết này!', 'error');
        return;
    }
    
    openPostModal(post);
}

// Delete post
function deletePost(event, postId) {
    event.stopPropagation();
    
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    if (post.authorId !== currentUser.uid) {
        showMessage('Bạn không có quyền xóa bài viết này!', 'error');
        return;
    }
    
    // Show confirmation modal
    const confirmModal = elements.confirmDeleteModal;
    
    document.getElementById('confirmDelete').onclick = async function() {
        try {
            await database.ref('posts/' + postId).remove();
            showMessage('Xóa bài viết thành công!', 'success');
            closeModal(confirmModal);
            loadPosts();
        } catch (error) {
            console.error('Error deleting post:', error);
            showMessage('Có lỗi khi xóa bài viết!', 'error');
        }
    };
    
    document.getElementById('cancelDelete').onclick = function() {
        closeModal(confirmModal);
    };
    
    openModal(confirmModal);
}

// Make functions global
window.viewPost = viewPost;
window.editPost = editPost;
window.deletePost = deletePost;
window.openPostModal = openPostModal;

// =====================================
// SEARCH AND FILTER
// =====================================

// Search posts
elements.searchInput?.addEventListener('input', debounce(filterPosts, 300));
elements.searchBtn?.addEventListener('click', filterPosts);
elements.categoryFilter?.addEventListener('change', filterPosts);

function filterPosts() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    const selectedCategory = elements.categoryFilter.value;
    
    filteredPosts = allPosts.filter(post => {
        const matchesSearch = !searchTerm || 
            post.title.toLowerCase().includes(searchTerm) ||
            post.content.toLowerCase().includes(searchTerm) ||
            post.author.toLowerCase().includes(searchTerm) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
        const matchesCategory = !selectedCategory || post.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    currentPage = 1;
    displayPosts();
}

// Toggle view
elements.toggleViewBtn?.addEventListener('click', function() {
    currentView = currentView === 'grid' ? 'list' : 'grid';
    const icon = this.querySelector('i');
    
    if (currentView === 'list') {
        icon.className = 'fas fa-th';
        this.innerHTML = '<i class="fas fa-th"></i> Dạng lưới';
    } else {
        icon.className = 'fas fa-th-large';
        this.innerHTML = '<i class="fas fa-th-large"></i> Dạng lưới';
    }
    
    displayPosts();
});

// =====================================
// TAB FUNCTIONALITY
// =====================================

elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Update tab buttons
    elements.tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update tab contents
    elements.tabContents.forEach(content => {
        if (content.id === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    currentPage = 1;
    displayPosts();
}

// =====================================
// PAGINATION
// =====================================

function updatePagination(totalPosts) {
    const totalPages = Math.ceil(totalPosts / postsPerPage);
    const pagination = elements.pagination;
    
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
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button ${i === currentPage ? 'class="active"' : ''} onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `<span>...</span>`;
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
    displayPosts();
    
    // Scroll to top of posts
    document.querySelector('.blog-tabs').scrollIntoView({ behavior: 'smooth' });
}

window.changePage = changePage;

// =====================================
// UTILITY FUNCTIONS
// =====================================

function showLoading(target) {
    if (target.classList && target.classList.contains('posts-loading')) {
        target.innerHTML = '<div class="loading"></div><p>Đang tải bài viết...</p>';
        return;
    }
    
    const submitBtn = target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Đang xử lý...';
    }
}

function hideLoading(target) {
    const submitBtn = target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        if (target.id === 'loginForm') {
            submitBtn.textContent = 'Đăng nhập';
        } else if (target.id === 'registerForm') {
            submitBtn.textContent = 'Đăng ký';
        } else if (target.id === 'postForm') {
            submitBtn.textContent = editingPostId ? 'Cập nhật' : 'Đăng bài';
        }
    }
}

function showMessage(message, type) {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const activeModal = document.querySelector('.modal[style*="block"]');
    if (activeModal) {
        const modalContent = activeModal.querySelector('.modal-content');
        const form = modalContent.querySelector('form');
        if (form) {
            form.insertBefore(messageDiv, form.firstChild);
        }
    } else {
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '100px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.minWidth = '300px';
        messageDiv.style.textAlign = 'center';
        document.body.appendChild(messageDiv);
    }
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Email này đã được sử dụng!';
        case 'auth/invalid-email':
            return 'Email không hợp lệ!';
        case 'auth/weak-password':
            return 'Mật khẩu quá yếu!';
        case 'auth/user-not-found':
            return 'Tài khoản không tồn tại!';
        case 'auth/wrong-password':
            return 'Mật khẩu không đúng!';
        case 'auth/too-many-requests':
            return 'Quá nhiều lần thử. Vui lòng thử lại sau!';
        default:
            return 'Có lỗi xảy ra. Vui lòng thử lại!';
    }
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

// =====================================
// MOBILE NAVIGATION
// =====================================

elements.hamburger?.addEventListener('click', function() {
    this.classList.toggle('active');
    elements.navMenu.classList.toggle('active');
});

// =====================================
// INITIALIZATION
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadPosts();
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.searchInput.focus();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal[style*="block"]').forEach(modal => {
                closeModal(modal);
            });
        }
    });
});