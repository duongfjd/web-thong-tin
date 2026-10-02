# Personal OS — HTML/CSS/JS (no build step)

## Chạy local
Chỉ cần mở file `index.html` trên trình duyệt.

**Cách tốt nhất** — dùng extension "Live Server" trong VS Code (click chuột phải → Open with Live Server).

> **Lưu ý:** Service Worker (PWA offline) chỉ hoạt động khi chạy qua HTTP server, không hoạt động khi mở file `file://` trực tiếp.

## Cấu trúc file
```
index.html              ← Shell SPA duy nhất
manifest.webmanifest    ← PWA config
sw.js                   ← Service Worker (offline)
css/
  tokens.css            ← Design tokens (màu sắc, spacing, radius)
  layout.css            ← Sidebar, topbar, auth gate
  components.css        ← Cards, buttons, tables, forms...
js/
  db.js                 ← IndexedDB wrapper (tất cả stores)
  utils.js              ← Time, money, DOM, toast, CSV/JSON export
  auth.js               ← PIN lock screen (mặc định: 1234)
  router.js             ← Hash-based SPA router (#/dashboard)
  main.js               ← App bootstrap, command palette (Ctrl+K)
  modules/
    dashboard.js        ← Trang chủ, check-in live timer, thống kê
    timesheet.js        ← Check-in/out, worklog, OT calc, export CSV
    expenses.js         ← Nhập nhanh "cafe 35k", ngân sách, alert
    bookmarks.js        ← OG fetch, SSRF guard, search, status
    vault.js            ← Snippets, pin, search, copy 1-click
    clipboard.js        ← Auto-detect link/text, pin, auto-expire
    settings.js         ← PIN, OT rules, backup JSON, theme
```

## Tính năng
| Module | Tính năng chính |
|--------|----------------|
| Dashboard | Check-in/out, live timer, stats, recent activity |
| Timesheet | Phiên làm việc, worklog Markdown, OT tính tự động, export CSV |
| Chi tiêu | Nhập "cafe 35k", danh mục, ngân sách 80%/100% alert, export CSV |
| Bookmarks | Tự lấy OG title, SSRF guard, filter status/category, full search |
| Dev Vault | Snippets, pin, language filter, copy 1-click, inline edit |
| Clipboard | Text/link auto-detect, pin, Ctrl+Enter, auto-expire |
| Settings | Đổi PIN, OT rules, backup/restore JSON, xóa toàn bộ |

## Shortcuts
- `Ctrl+K` — Mở Command Palette
- `Ctrl+Enter` — Thêm nhanh (trong Clipboard)
- PIN mặc định: **1234** (đổi trong Settings)
