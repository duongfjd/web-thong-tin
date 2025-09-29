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

// DOM Elements
const elements = {
    // Navigation
    hamburger: document.getElementById('hamburger'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),
    header: document.getElementById('header'),
    
    // Auth buttons
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    userMenu: document.getElementById('userMenu'),
    userName: document.getElementById('userName'),
    adminPanel: document.getElementById('adminPanel'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Modals
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    adminModal: document.getElementById('adminModal'),
    closeLogin: document.getElementById('closeLogin'),
    closeRegister: document.getElementById('closeRegister'),
    closeAdmin: document.getElementById('closeAdmin'),
    
    // Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    contactForm: document.getElementById('contactForm'),
    adminPersonalForm: document.getElementById('adminPersonalForm'),
    
    // Modal switches
    switchToRegister: document.getElementById('switchToRegister'),
    switchToLogin: document.getElementById('switchToLogin'),
    
    // Admin tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    addProjectBtn: document.getElementById('addProjectBtn'),
    addBlogBtn: document.getElementById('addBlogBtn'),
    projectsList: document.getElementById('projectsList'),
    blogList: document.getElementById('blogList')
};

// Global variables
let currentUser = null;
let siteData = {
    personal: {
        name: "[Tên của bạn]",
        title: "Frontend Developer & UI/UX Designer",
        description: "Tôi tạo ra những trải nghiệm web tuyệt vời với sự sáng tạo và kỹ thuật",
        email: "contact@example.com",
        phone: "+84 123 456 789",
        address: "Hà Nội, Việt Nam"
    },
    projects: [],
    blog: []
};

// Initialize AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 1000,
        easing: 'ease-in-out',
        once: true,
        offset: 100
    });
});

// =====================================
// NAVIGATION FUNCTIONALITY
// =====================================

// Mobile menu toggle
elements.hamburger?.addEventListener('click', function() {
    this.classList.toggle('active');
    elements.navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on nav links
elements.navLinks.forEach(link => {
    link.addEventListener('click', () => {
        elements.hamburger.classList.remove('active');
        elements.navMenu.classList.remove('active');
        
        // For page navigation links, let the browser handle the navigation
        const href = link.getAttribute('href');
        if (href.includes('.html')) {
            // Let the browser navigate normally
            return;
        }
    });
});

// Header scroll effect
window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
        elements.header.classList.add('scrolled');
    } else {
        elements.header.classList.remove('scrolled');
    }
});

// Smooth scrolling for navigation links
elements.navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Skip preventDefault for external links or pages
        if (href.includes('.html') || href.startsWith('http')) {
            return; // Let the browser handle page navigation
        }
        
        e.preventDefault();
        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            const headerHeight = elements.header.offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Update active nav link based on scroll position
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('.section');
    const scrollPos = window.scrollY + elements.header.offsetHeight + 100;
    
    sections.forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${id}"]`);
        
        // Only update active state for internal section links, not page links
        if (navLink && !navLink.getAttribute('href').includes('.html')) {
            if (scrollPos >= top && scrollPos <= bottom) {
                elements.navLinks.forEach(link => {
                    if (!link.getAttribute('href').includes('.html')) {
                        link.classList.remove('active');
                    }
                });
                navLink.classList.add('active');
            }
        }
    });
});

// =====================================
// MODAL FUNCTIONALITY
// =====================================

// Modal open/close functions
function openModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Login modal
elements.loginBtn?.addEventListener('click', () => openModal(elements.loginModal));
elements.closeLogin?.addEventListener('click', () => closeModal(elements.loginModal));

// Register modal
elements.registerBtn?.addEventListener('click', () => openModal(elements.registerModal));
elements.closeRegister?.addEventListener('click', () => closeModal(elements.registerModal));

// Admin modal
elements.adminPanel?.addEventListener('click', () => openModal(elements.adminModal));
elements.closeAdmin?.addEventListener('click', () => closeModal(elements.adminModal));

// Modal switch functionality
elements.switchToRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(elements.loginModal);
    openModal(elements.registerModal);
});

elements.switchToLogin?.addEventListener('click', (e) => {
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
// AUTHENTICATION FUNCTIONALITY
// =====================================

// Register user
elements.registerForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validation
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
        
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({
            displayName: name
        });
        
        // Save user data to database
        await database.ref('users/' + user.uid).set({
            name: name,
            email: email,
            role: email === 'admin@admin.com' ? 'admin' : 'user',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showMessage('Đăng ký thành công!', 'success');
        closeModal(elements.registerModal);
        this.reset();
        
    } catch (error) {
        console.error('Registration error:', error);
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
        console.error('Login error:', error);
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
        console.error('Logout error:', error);
        showMessage('Có lỗi khi đăng xuất!', 'error');
    }
});

// Auth state observer
auth.onAuthStateChanged(async function(user) {
    if (user) {
        currentUser = user;
        await loadUserData();
        updateUIForLoggedInUser();
    } else {
        currentUser = null;
        updateUIForLoggedOutUser();
    }
});

// Load user data from database
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref('users/' + currentUser.uid).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            currentUser.role = userData.role;
            currentUser.displayName = userData.name;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    elements.loginBtn.style.display = 'none';
    elements.registerBtn.style.display = 'none';
    elements.userMenu.style.display = 'flex';
    elements.userName.textContent = currentUser.displayName || currentUser.email;
    
    // Show admin panel if user is admin
    if (currentUser.role === 'admin') {
        elements.adminPanel.style.display = 'block';
        loadSiteData();
    } else {
        elements.adminPanel.style.display = 'none';
    }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    elements.loginBtn.style.display = 'inline-block';
    elements.registerBtn.style.display = 'inline-block';
    elements.userMenu.style.display = 'none';
}

// =====================================
// ADMIN PANEL FUNCTIONALITY
// =====================================

// Admin tabs functionality
elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        
        // Update active tab button
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update active tab content
        elements.tabContents.forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        // Load tab-specific data
        if (tabName === 'projects') {
            displayProjects();
        } else if (tabName === 'blog') {
            displayBlogPosts();
        }
    });
});

// Load site data from database
async function loadSiteData() {
    try {
        const snapshot = await database.ref('siteData').once('value');
        const data = snapshot.val();
        
        if (data) {
            siteData = { ...siteData, ...data };
            updateSiteContent();
            populateAdminForms();
        }
    } catch (error) {
        console.error('Error loading site data:', error);
    }
}

// Update site content with loaded data
function updateSiteContent() {
    // Update personal info in the site
    const homeTitle = document.querySelector('.home-title .highlight');
    const homeDescription = document.querySelector('.home-description');
    const homeText = document.querySelector('.home-text');
    
    if (homeTitle) homeTitle.textContent = siteData.personal.name;
    if (homeDescription) homeDescription.textContent = siteData.personal.title;
    if (homeText) homeText.textContent = siteData.personal.description;
    
    // Update contact info
    const contactEmail = document.querySelector('.contact-item:nth-child(1) p');
    const contactPhone = document.querySelector('.contact-item:nth-child(2) p');
    const contactAddress = document.querySelector('.contact-item:nth-child(3) p');
    
    if (contactEmail) contactEmail.textContent = siteData.personal.email;
    if (contactPhone) contactPhone.textContent = siteData.personal.phone;
    if (contactAddress) contactAddress.textContent = siteData.personal.address;
}

// Populate admin forms with current data
function populateAdminForms() {
    const adminName = document.getElementById('adminName');
    const adminTitle = document.getElementById('adminTitle');
    const adminDescription = document.getElementById('adminDescription');
    const adminEmail = document.getElementById('adminEmail');
    const adminPhone = document.getElementById('adminPhone');
    
    if (adminName) adminName.value = siteData.personal.name;
    if (adminTitle) adminTitle.value = siteData.personal.title;
    if (adminDescription) adminDescription.value = siteData.personal.description;
    if (adminEmail) adminEmail.value = siteData.personal.email;
    if (adminPhone) adminPhone.value = siteData.personal.phone;
}

// Save personal information
elements.adminPersonalForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (currentUser?.role !== 'admin') {
        showMessage('Không có quyền truy cập!', 'error');
        return;
    }
    
    const formData = new FormData(this);
    const personalData = {
        name: document.getElementById('adminName').value,
        title: document.getElementById('adminTitle').value,
        description: document.getElementById('adminDescription').value,
        email: document.getElementById('adminEmail').value,
        phone: document.getElementById('adminPhone').value
    };
    
    try {
        showLoading(e.target);
        
        await database.ref('siteData/personal').set(personalData);
        siteData.personal = personalData;
        updateSiteContent();
        
        showMessage('Cập nhật thông tin thành công!', 'success');
        
    } catch (error) {
        console.error('Error updating personal info:', error);
        showMessage('Có lỗi khi cập nhật thông tin!', 'error');
    } finally {
        hideLoading(e.target);
    }
});

// Display projects in admin panel
function displayProjects() {
    if (!elements.projectsList) return;
    
    elements.projectsList.innerHTML = '';
    
    siteData.projects.forEach((project, index) => {
        const projectElement = createProjectAdminElement(project, index);
        elements.projectsList.appendChild(projectElement);
    });
}

// Display blog posts in admin panel
function displayBlogPosts() {
    if (!elements.blogList) return;
    
    elements.blogList.innerHTML = '';
    
    siteData.blog.forEach((post, index) => {
        const postElement = createBlogAdminElement(post, index);
        elements.blogList.appendChild(postElement);
    });
}

// Create project element for admin panel
function createProjectAdminElement(project, index) {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
        <div class="admin-item-content">
            <h4>${project.title}</h4>
            <p>${project.description}</p>
            <div class="admin-item-actions">
                <button class="btn-edit" onclick="editProject(${index})">Chỉnh sửa</button>
                <button class="btn-delete" onclick="deleteProject(${index})">Xóa</button>
            </div>
        </div>
    `;
    return div;
}

// Create blog element for admin panel
function createBlogAdminElement(post, index) {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
        <div class="admin-item-content">
            <h4>${post.title}</h4>
            <p>${post.excerpt}</p>
            <small>${post.date}</small>
            <div class="admin-item-actions">
                <button class="btn-edit" onclick="editBlogPost(${index})">Chỉnh sửa</button>
                <button class="btn-delete" onclick="deleteBlogPost(${index})">Xóa</button>
            </div>
        </div>
    `;
    return div;
}

// Project management functions
window.editProject = function(index) {
    // Implementation for editing project
    console.log('Edit project:', index);
};

window.deleteProject = async function(index) {
    if (!confirm('Bạn có chắc muốn xóa dự án này?')) return;
    
    try {
        siteData.projects.splice(index, 1);
        await database.ref('siteData/projects').set(siteData.projects);
        displayProjects();
        showMessage('Xóa dự án thành công!', 'success');
    } catch (error) {
        console.error('Error deleting project:', error);
        showMessage('Có lỗi khi xóa dự án!', 'error');
    }
};

// Blog management functions
window.editBlogPost = function(index) {
    // Implementation for editing blog post
    console.log('Edit blog post:', index);
};

window.deleteBlogPost = async function(index) {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    
    try {
        siteData.blog.splice(index, 1);
        await database.ref('siteData/blog').set(siteData.blog);
        displayBlogPosts();
        showMessage('Xóa bài viết thành công!', 'success');
    } catch (error) {
        console.error('Error deleting blog post:', error);
        showMessage('Có lỗi khi xóa bài viết!', 'error');
    }
};

// =====================================
// CONTACT FORM FUNCTIONALITY
// =====================================

elements.contactForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;
    
    try {
        showLoading(e.target);
        
        const contactData = {
            name: name,
            email: email,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'unread'
        };
        
        await database.ref('messages').push(contactData);
        
        showMessage('Tin nhắn đã được gửi thành công!', 'success');
        this.reset();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Có lỗi khi gửi tin nhắn!', 'error');
    } finally {
        hideLoading(e.target);
    }
});

// =====================================
// UTILITY FUNCTIONS
// =====================================

// Show loading state
function showLoading(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Đang xử lý...';
    }
}

// Hide loading state
function hideLoading(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        // Restore original text based on form
        if (form.id === 'loginForm') {
            submitBtn.textContent = 'Đăng nhập';
        } else if (form.id === 'registerForm') {
            submitBtn.textContent = 'Đăng ký';
        } else if (form.id === 'contactForm') {
            submitBtn.textContent = 'Gửi tin nhắn';
        } else if (form.id === 'adminPersonalForm') {
            submitBtn.textContent = 'Cập nhật';
        }
    }
}

// Show message to user
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Find the best place to insert the message
    const activeModal = document.querySelector('.modal[style*="block"]');
    if (activeModal) {
        const modalContent = activeModal.querySelector('.modal-content');
        const form = modalContent.querySelector('form');
        if (form) {
            form.insertBefore(messageDiv, form.firstChild);
        }
    } else {
        // Show message at top of page
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '100px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.minWidth = '300px';
        messageDiv.style.textAlign = 'center';
        document.body.appendChild(messageDiv);
    }
    
    // Auto remove message after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Get user-friendly error messages
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

// Initialize sample data (for demo purposes)
function initializeSampleData() {
    const sampleProjects = [
        {
            title: "E-commerce Website",
            description: "Website thương mại điện tử với giao diện responsive và thanh toán trực tuyến.",
            image: "https://via.placeholder.com/400x250/4A90E2/FFFFFF?text=Project+1",
            tech: ["React", "Node.js", "MongoDB"],
            demoUrl: "#",
            githubUrl: "#"
        },
        {
            title: "Portfolio Website",
            description: "Website portfolio cá nhân với thiết kế hiện đại và animation mượt mà.",
            image: "https://via.placeholder.com/400x250/4A90E2/FFFFFF?text=Project+2",
            tech: ["HTML", "CSS", "JavaScript"],
            demoUrl: "#",
            githubUrl: "#"
        }
    ];
    
    const sampleBlog = [
        {
            title: "10 Tips để viết CSS hiệu quả hơn",
            excerpt: "Khám phá những mẹo và thủ thuật hữu ích để viết CSS clean, maintainable và hiệu suất cao.",
            content: "Nội dung chi tiết của bài viết...",
            image: "https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Blog+1",
            date: "15 Tháng 1, 2024",
            category: "Frontend",
            author: "Admin"
        },
        {
            title: "ES6+ Features bạn cần biết",
            excerpt: "Tìm hiểu về các tính năng mới trong JavaScript ES6+ và cách sử dụng chúng trong dự án thực tế.",
            content: "Nội dung chi tiết của bài viết...",
            image: "https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Blog+2",
            date: "10 Tháng 1, 2024",
            category: "JavaScript",
            author: "Admin"
        }
    ];
    
    siteData.projects = sampleProjects;
    siteData.blog = sampleBlog;
}

// Initialize sample data on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeSampleData();
});

// =====================================
// ENTERTAINMENT SECTION FUNCTIONALITY
// =====================================

// Entertainment content data
const entertainmentData = {
    animation: {
        title: "Hoạt hình 3D",
        items: [
            {
                name: "Blender Animation Showcase",
                description: "Các tác phẩm animation 3D tuyệt đẹp được tạo bằng Blender",
                url: "https://www.youtube.com/embed/videoseries?list=PLjEaoINr3zgHJVJF3T3CFUAZ6z11jKg6a"
            },
            {
                name: "Pixar Animation Studios",
                description: "Kênh chính thức của Pixar với các short film hay nhất",
                url: "https://www.youtube.com/embed/videoseries?list=PLbnjAzMgFpKNjLQPEeGQ7qUf-lELLy6bL"
            },
            {
                name: "CGI Animation Collection",
                description: "Bộ sưu tập các animation CGI chất lượng cao",
                url: "https://www.youtube.com/embed/videoseries?list=PLjEaoINr3zgHJVJF3T3CFUAZ6z11jKg6a"
            }
        ]
    },
    reading: {
        title: "Đọc truyện",
        items: [
            {
                name: "Wattpad",
                description: "Nền tảng đọc và viết truyện trực tuyến lớn nhất thế giới",
                url: "https://www.wattpad.com"
            },
            {
                name: "Đọc Truyện Online",
                description: "Thư viện truyện online với hàng nghìn tác phẩm hay",
                url: "https://doctruyenonline.com"
            },
            {
                name: "Tiki Reading",
                description: "Đọc sách điện tử miễn phí từ Tiki",
                url: "https://tiki.vn/sach-tieng-viet/c316"
            }
        ]
    },
    movies: {
        title: "Xem phim",
        items: [
            {
                name: "YouTube Movies",
                description: "Xem phim miễn phí trên YouTube",
                url: "https://www.youtube.com/feed/storefront?bp=ogUCKAU%3D"
            },
            {
                name: "Netflix Trailers",
                description: "Trailer các bộ phim hay nhất từ Netflix",
                url: "https://www.youtube.com/embed/videoseries?list=PLvahqwMqN4M0GRkZY8WkLZMb6Z-W7qbLA"
            },
            {
                name: "IMDb TV",
                description: "Xem phim miễn phí từ IMDb",
                url: "https://www.imdb.com/tv/"
            }
        ]
    },
    links: {
        title: "Link tinh",
        items: [
            {
                name: "Awesome Websites",
                description: "Bộ sưu tập các trang web thú vị và hữu ích",
                url: "https://github.com/sindresorhus/awesome"
            },
            {
                name: "Cool Websites",
                description: "Khám phá những trang web sáng tạo và độc đáo",
                url: "https://www.awwwards.com/websites/"
            },
            {
                name: "Useful Tools",
                description: "Các công cụ trực tuyến hữu ích cho công việc và học tập",
                url: "https://smalldev.tools/"
            }
        ]
    }
};

// Initialize entertainment functionality
function initializeEntertainment() {
    const categoryCards = document.querySelectorAll('.category-card');
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerContent = document.getElementById('viewerContent');
    const closeViewer = document.getElementById('closeViewer');
    
    // Add click event to category cards
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            loadEntertainmentCategory(category);
            
            // Update active state
            categoryCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Close viewer functionality
    if (closeViewer) {
        closeViewer.addEventListener('click', function() {
            resetEntertainmentViewer();
            categoryCards.forEach(c => c.classList.remove('active'));
        });
    }
}

// Load entertainment category content
function loadEntertainmentCategory(category) {
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerContent = document.getElementById('viewerContent');
    const closeViewer = document.getElementById('closeViewer');
    
    if (!entertainmentData[category]) return;
    
    const data = entertainmentData[category];
    
    // Update title
    if (viewerTitle) {
        viewerTitle.textContent = data.title;
    }
    
    // Show close button
    if (closeViewer) {
        closeViewer.style.display = 'flex';
    }
    
    // Create content list
    const contentHTML = `
        <div class="content-list">
            ${data.items.map(item => `
                <div class="content-item" onclick="loadIframe('${item.url}', '${item.name}')">
                    <h4>${item.name}</h4>
                    <p>${item.description}</p>
                </div>
            `).join('')}
        </div>
    `;
    
    if (viewerContent) {
        viewerContent.innerHTML = contentHTML;
    }
}

// Load iframe content
function loadIframe(url, title) {
    const viewerContent = document.getElementById('viewerContent');
    const viewerTitle = document.getElementById('viewerTitle');
    
    if (!viewerContent) return;
    
    // Update title
    if (viewerTitle) {
        viewerTitle.textContent = title;
    }
    
    // Show loading state
    viewerContent.innerHTML = `
        <div class="loading-iframe">
            <div class="loading"></div>
        </div>
    `;
    
    // Create iframe after a short delay
    setTimeout(() => {
        const iframeHTML = `
            <div class="iframe-container">
                <iframe 
                    src="${url}" 
                    title="${title}"
                    allowfullscreen
                    loading="lazy">
                </iframe>
            </div>
            <div style="margin-top: 1rem; text-align: center;">
                <button class="btn btn-outline" onclick="goBackToCategory()" style="margin-right: 1rem;">
                    <i class="fas fa-arrow-left"></i> Quay lại
                </button>
                <button class="btn btn-primary" onclick="openInNewTab('${url}')">
                    <i class="fas fa-external-link-alt"></i> Mở tab mới
                </button>
            </div>
        `;
        
        viewerContent.innerHTML = iframeHTML;
    }, 500);
}

// Go back to category view
function goBackToCategory() {
    const activeCard = document.querySelector('.category-card.active');
    if (activeCard) {
        const category = activeCard.getAttribute('data-category');
        loadEntertainmentCategory(category);
    }
}

// Open URL in new tab
function openInNewTab(url) {
    window.open(url, '_blank');
}

// Reset entertainment viewer
function resetEntertainmentViewer() {
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerContent = document.getElementById('viewerContent');
    const closeViewer = document.getElementById('closeViewer');
    
    if (viewerTitle) {
        viewerTitle.textContent = 'Chọn một danh mục để bắt đầu';
    }
    
    if (closeViewer) {
        closeViewer.style.display = 'none';
    }
    
    if (viewerContent) {
        viewerContent.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-play-circle"></i>
                <p>Chọn một trong các danh mục bên trên để khám phá nội dung giải trí!</p>
            </div>
        `;
    }
}

// Make functions available globally
window.loadIframe = loadIframe;
window.goBackToCategory = goBackToCategory;
window.openInNewTab = openInNewTab;

// Initialize entertainment section when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEntertainment();
});

// =====================================
// SCROLL ANIMATIONS
// =====================================

// Add scroll animations to elements
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.project-card, .blog-card, .timeline-item, .skill-category');
    animateElements.forEach(el => observer.observe(el));
}

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', addScrollAnimations);

// =====================================
// PERFORMANCE OPTIMIZATIONS
// =====================================

// Debounce function for scroll events
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

// Apply debouncing to scroll events
const debouncedScrollHandler = debounce(() => {
    // Scroll-based logic here
}, 100);

window.addEventListener('scroll', debouncedScrollHandler);

// Lazy load images
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', lazyLoadImages);

// =====================================
// ERROR HANDLING AND LOGGING
// =====================================

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    // You can send errors to a logging service here
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Service Worker Registration (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// =====================================
// THEME TOGGLE (Optional)
// =====================================

function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
    }
    
    // Load saved theme or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-theme');
    }
}

// Initialize theme toggle
document.addEventListener('DOMContentLoaded', initializeThemeToggle);