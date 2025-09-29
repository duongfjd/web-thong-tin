# 📋 CHECKLIST ĐỂ DEPLOY WEBSITE

## ✅ Các file BẮT BUỘC phải upload:

### 🏠 **Trang chính:**
- [x] `index.html` - Trang chủ portfolio
- [x] `style.css` - CSS chính cho toàn bộ website

### 📝 **Trang blog:**
- [x] `blog.html` - Trang blog cộng đồng  
- [x] `blog.css` - CSS riêng cho blog
- [x] `blog.js` - JavaScript cho blog

### 🎮 **Trang giải trí:**
- [x] `entertainment.html` - Trang giải trí
- [x] `entertainment.css` - CSS cho trang giải trí
- [x] `entertainment.js` - JavaScript cho trang giải trí

### ⚙️ **JavaScript & Config:**
- [x] `app.js` - JavaScript chính
- [x] `.htaccess` - Cấu hình server (tùy chọn)

## 🔗 **Kiểm tra đường dẫn:**

### ✅ **Các đường dẫn đã được sửa thành relative:**
- CSS: `href="./style.css"`
- JS: `src="./app.js"`
- HTML: `href="./blog.html"`

## 🚀 **Các bước deploy:**

1. **Upload tất cả file** vào thư mục root của hosting
2. **Kiểm tra cấu trúc file:**
   ```
   /
   ├── index.html
   ├── blog.html  
   ├── entertainment.html
   ├── style.css
   ├── blog.css
   ├── entertainment.css
   ├── app.js
   ├── blog.js
   ├── entertainment.js
   └── .htaccess
   ```
3. **Thử truy cập website** từ domain
4. **Kiểm tra Console** (F12) xem có lỗi không

## ⚠️ **Các lỗi thường gặp và cách sửa:**

### **CSS không load:**
- ✅ Đảm bảo file `style.css` có trong thư mục root
- ✅ Kiểm tra đường dẫn: `href="./style.css"`
- ✅ Kiểm tra tên file (phân biệt hoa thường)

### **JavaScript không hoạt động:**
- ✅ Kiểm tra file `app.js` đã upload chưa
- ✅ Mở Console (F12) xem có lỗi gì không
- ✅ Firebase config có đúng không

### **Navigation không hoạt động:**
- ✅ Kiểm tra các file HTML đã upload đủ chưa
- ✅ Đường dẫn `href="./blog.html"` có đúng không

## 📱 **Hosting platforms khuyến nghị:**
- **Netlify** (miễn phí, tự động deploy)
- **Vercel** (miễn phí, support tốt)
- **GitHub Pages** (miễn phí với GitHub repo)
- **000webhost** (miễn phí, có ads)
- **Heroku** (miễn phí tier bị ngừng)

## 🔥 **Firebase Setup:**
Nếu sử dụng authentication/database, cần:
1. Tạo project trên Firebase Console
2. Thêm domain hosting vào Authorized domains
3. Cập nhật Firebase config trong JavaScript

---
⚡ **Lưu ý:** Sau khi upload, có thể mất 5-15 phút để website hiển thị đúng do cache của browser và CDN.