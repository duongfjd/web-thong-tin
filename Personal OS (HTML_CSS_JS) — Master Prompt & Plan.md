# Personal OS (thuần HTML/CSS/JS) — Master Prompt & Plan

Phiên bản này **không dùng backend, không framework, không build step**. Dữ liệu lưu ngay trong trình duyệt (IndexedDB/localStorage), mở `index.html` là chạy, có thể host tĩnh (GitHub Pages, Netlify, hoặc chạy offline).

## Đọc trước: những giới hạn khi bỏ backend

| Tính năng ở bản cũ | Với thuần HTML/CSS/JS | Cách xử lý trong prompt |
| --- | --- | --- |
| Đồng bộ nhiều thiết bị (Universal Clipboard, Realtime) | Không làm được nếu không có server | Thay bằng **Export/Import JSON** và mã QR/văn bản để chuyển dữ liệu thủ công |
| Telegram Bot | Cần server để nhận webhook | **Bỏ khỏi bản này**, ghi vào backlog nếu sau này thêm backend |
| Crawl metadata link (OpenGraph) | Trình duyệt bị chặn bởi CORS | Bookmark nhập tay tiêu đề/mô tả; favicon lấy qua URL `origin/favicon.ico` hoặc bỏ |
| IP / vị trí khi chấm công | IP không lấy được nếu không gọi dịch vụ ngoài | Chỉ dùng Geolocation API của trình duyệt (tùy chọn, có xin phép) |
| Nhắc hạn bảo hành khi không mở web | Không có tiến trình nền đáng tin cậy | Hiện cảnh báo **khi mở app** + badge trên dashboard |
| Bảo mật tài liệu | Không có server, không có RLS | Mã hóa phía client bằng WebCrypto (AES-GCM) |
| Dung lượng, an toàn dữ liệu | Dữ liệu nằm trong trình duyệt, xóa cache/đổi máy là mất | Backup JSON định kỳ + nhắc backup, `navigator.storage.persist()` |

Hệ quả quan trọng: **backup là tính năng bắt buộc, không phải phụ kiện.** Prompt bên dưới đã đặt nó ở Phase 0.

---

# PHẦN A — MASTER PROMPT (dán nguyên khối cho AI agent)

```text
# VAI TRÒ
Bạn là Senior Front-end Engineer. Hãy xây dựng "Personal OS": một web app cá nhân
(single-user), CHỈ dùng HTML, CSS và JavaScript thuần (ES2022+, ES Modules).
Trọng tâm số 1 là module Chấm công & Năng suất (Task + Daily Logging + Thống kê).

# NGUYÊN TẮC LÀM VIỆC
1. Làm theo từng Phase. Cuối mỗi Phase: tóm tắt đã làm gì, cách mở/test, việc còn
   lại. DỪNG và chờ tôi xác nhận trước khi sang Phase kế.
2. Trước khi code một module, nêu ngắn gọn thiết kế (cấu trúc dữ liệu, các hàm,
   màn hình) rồi mới viết code.
3. Không đoán API trình duyệt. Chỉ dùng API có hỗ trợ rộng ở trình duyệt hiện đại;
   nếu dùng API kén trình duyệt, phải có phương án dự phòng.
4. Không dùng framework, thư viện, CDN, hay bước build/transpile (không React,
   Vue, jQuery, Tailwind, Chart.js, npm). Mọi thứ chạy được bằng cách mở file
   hoặc chạy một static server bất kỳ. Biểu đồ tự vẽ bằng SVG hoặc Canvas.
5. Code dễ đọc, dễ bảo trì sau nhiều tháng: tách module nhỏ, đặt tên rõ nghĩa,
   comment ngắn cho logic khó (tính giờ, tuần, qua đêm).
6. Logic nghiệp vụ (tính thời lượng, tổng hợp, định dạng) phải là HÀM THUẦN, tách
   khỏi DOM, và có test chạy bằng cách mở `tests/test.html`.
7. Không bao giờ chèn dữ liệu người dùng bằng innerHTML. Dùng textContent /
   createElement / template + gán thuộc tính an toàn.

# RÀNG BUỘC KỸ THUẬT
- Cấu trúc file:
    /index.html
    /manifest.webmanifest, /sw.js          (PWA, cache để chạy offline)
    /css/        tokens.css, base.css, layout.css, components.css, <module>.css
    /js/
      main.js            (khởi tạo, router)
      router.js          (hash router: #/dashboard, #/timesheet ...)
      store/db.js        (wrapper IndexedDB: open, get, put, delete, getAll, index query)
      store/migrations.js (đánh số version schema, nâng cấp dữ liệu cũ an toàn)
      store/backup.js    (export/import JSON, kiểm tra schema khi import)
      lib/time.js        (xử lý ngày giờ, tuần, múi giờ)
      lib/format.js      (định dạng số, giờ, VND)
      lib/dom.js         (helper tạo phần tử, event delegation, toast, modal)
      lib/charts.js      (biểu đồ tròn/cột bằng SVG)
      features/timesheet/ (xem module 1)
      features/<module khác>/
    /tests/test.html     (test hàm thuần, hiển thị pass/fail trên trang)
- Lưu trữ: IndexedDB cho dữ liệu chính (có version + migration). Cài đặt nhỏ
  (theme, tuần bắt đầu từ thứ mấy) dùng localStorage. Gọi navigator.storage.persist().
- Giao diện: tiếng Việt, mobile-first, dark/light theo prefers-color-scheme có nút
  chuyển, dùng CSS variables (design tokens), CSS Grid/Flexbox, hỗ trợ bàn phím và
  ARIA cơ bản (label cho input, focus rõ, modal có focus trap, nút có tên truy cập).
- Bảo mật: thêm <meta http-equiv="Content-Security-Policy"> chặt (default-src 'self';
  không inline script), escape mọi dữ liệu hiển thị. Không gọi dịch vụ bên ngoài.
- Múi giờ: mặc định theo trình duyệt (kỳ vọng Asia/Ho_Chi_Minh). Lưu ngày dạng chuỗi
  "YYYY-MM-DD" theo ngày địa phương và giờ dạng "HH:mm" theo địa phương; chỉ dùng
  timestamp (epoch ms) cho mốc thời gian thực như timer. Không dùng toISOString()
  để lấy "ngày hôm nay" (sai múi giờ).
- Tiền tệ VND lưu số nguyên.

# MODULE 1 — CHẤM CÔNG & NĂNG SUẤT (ƯU TIÊN CAO NHẤT)

## 1.1 Mô hình dữ liệu (IndexedDB)
- groups (nhóm công việc): { id, name, color, order, archivedAt|null }
  Ví dụ khởi tạo sẵn: Lập trình, Họp, Viết tài liệu, Việc cá nhân (cho phép sửa/xóa).
- tasks (danh mục công việc): { id, name, groupId, unit, note, archivedAt|null,
  createdAt, updatedAt }
  `unit` là đơn vị đo năng suất của task (ví dụ: "task", "dòng code", "trang",
  "cuộc họp", "sản phẩm") hoặc rỗng nếu task chỉ cần theo dõi thời gian.
- logs (bản ghi chấm công hằng ngày): {
    id, date "YYYY-MM-DD", taskId,
    // snapshot để báo cáo cũ không đổi khi sửa/xóa task sau này:
    taskNameSnapshot, groupIdSnapshot, groupNameSnapshot, unitSnapshot,
    mode: "range" | "duration" | "timer",
    startTime "HH:mm"|null, endTime "HH:mm"|null,
    durationMin (số nguyên phút, luôn được tính và lưu),
    quantity (số >= 0, có thể thập phân) | null,
    note, createdAt, updatedAt }
  Index: theo date, theo taskId, theo [date].
- timers (đồng hồ đang chạy): { id, taskId, startedAtEpoch, pausedMs, state }
  Tối đa 1 timer chạy cùng lúc.

## 1.2 Quản lý danh mục công việc (Task Management)
- Thêm công việc: form nhập tên (bắt buộc, 1–100 ký tự, trim, không trùng tên
  trong cùng nhóm, không phân biệt hoa thường), chọn nhóm (có nút "+ Nhóm mới" ngay
  trong form), chọn đơn vị đo (gợi ý các đơn vị đã dùng trước đó, cho gõ tự do).
- Sửa: đổi tên, đổi nhóm, đổi đơn vị. Đổi tên/nhóm/đơn vị KHÔNG làm thay đổi báo cáo
  quá khứ (nhờ snapshot); hỏi người dùng nếu họ muốn áp dụng cho cả log cũ
  (tùy chọn "Cập nhật cả các bản ghi cũ").
- Xóa: nếu task đã có log thì mặc định LƯU TRỮ (archive) thay vì xóa cứng, và hỏi
  xác nhận; có tùy chọn xóa hẳn kèm xóa log liên quan (cảnh báo rõ số bản ghi bị
  ảnh hưởng). Task đã archive ẩn khỏi danh sách chọn nhưng vẫn có trong báo cáo cũ
  và có thể khôi phục.
- Quản lý nhóm: thêm/sửa/xóa/đổi màu/sắp xếp nhóm. Xóa nhóm đang có task: bắt
  buộc chuyển task sang nhóm khác hoặc "Chưa phân nhóm".
- Danh sách task: tìm kiếm, lọc theo nhóm, hiển thị nhóm bằng chấm màu, đếm số
  lần dùng, sắp xếp theo "dùng gần đây/nhiều nhất" để chọn nhanh.

## 1.3 Chấm công & ghi nhận hằng ngày (Daily Logging)
Màn hình "Hôm nay" (mặc định), có bộ chọn ngày để xem/nhập bù ngày khác
(không cho nhập ngày tương lai trừ khi bật trong Cài đặt).

a) Chọn công việc trong ngày:
   - Hiển thị danh sách task (gom theo nhóm, có tìm kiếm nhanh) kèm checkbox. Tích
     chọn → task xuất hiện trong "Bảng ghi nhận hôm nay" bên dưới.
   - Có mục "Hay dùng" (5 task gần đây) và nút "Lặp lại hôm qua" để chọn nhanh các
     task của ngày trước.
   - Bỏ tích task đã có số liệu phải hỏi xác nhận trước khi xóa log.

b) Nhập số liệu năng suất cho từng task đã chọn:
   - Ô số lượng hoàn thành (inputmode="decimal", chấp nhận dấu , và .), nhãn hiển
     thị đơn vị của task (ví dụ "Số trang"). Giá trị >= 0, tối đa 2 chữ số thập phân.
   - Nếu task không có đơn vị: ẩn ô số lượng (chỉ theo dõi thời gian).
   - Cho phép một task có NHIỀU bản ghi trong cùng một ngày (ví dụ code sáng và
     code chiều) thông qua nút "+ Thêm lượt".

c) Ghi nhận thời gian, 3 cách (người dùng chọn tab cho từng bản ghi):
   1. Bắt đầu – Kết thúc: input time. Nếu kết thúc <= bắt đầu thì hiểu là qua nửa
      đêm (+24h) và hiện nhãn "qua đêm"; giới hạn một bản ghi tối đa 24h.
   2. Nhập số giờ/phút: chấp nhận "1.5", "1,5", "1h30", "90p", "1:30". Hàm
      `parseDuration()` trả về phút, từ chối giá trị âm/NaN/quá 24h.
   3. Bấm giờ (timer): nút Start/Pause/Stop gắn với task; khi Stop tự tạo bản ghi.
      Timer phải sống sót khi đóng/reload tab (lưu startedAtEpoch trong IndexedDB;
      thời gian tính theo Date.now() chứ không đếm bằng setInterval cộng dồn).
      Khi mở lại app mà timer còn chạy, hiện banner "Đang chạy: <task> – 02:13:05".
      Nếu timer chạy quá 12 giờ thì cảnh báo "Có thể quên dừng?".
   - Cảnh báo (không chặn cứng) khi hai bản ghi dạng Bắt đầu–Kết thúc trong cùng
     ngày bị CHỒNG GIỜ lên nhau, hoặc tổng thời gian ngày vượt 24h.
   - Cho phép sửa/xóa từng bản ghi, có Hoàn tác (undo toast 5 giây) khi xóa.
   - Ô ghi chú ngắn cho mỗi bản ghi.

d) Thanh tổng kết cố định cuối màn hình: tổng giờ hôm nay, tổng số bản ghi, tổng
   năng suất theo từng đơn vị, mục tiêu giờ/ngày (cấu hình, có thanh tiến độ).

e) Tự lưu: lưu ngay khi thay đổi (debounce ~300ms), hiển thị trạng thái "Đã lưu".
   Mọi thao tác ghi DB phải bắt lỗi và báo lỗi rõ ràng (ví dụ hết dung lượng).

## 1.4 Thống kê & Báo cáo (Analytics & Reporting)
Màn hình "Báo cáo" với 3 chế độ Ngày / Tuần / Tháng, có nút trước/sau và chọn kỳ
(tuần bắt đầu từ Thứ Hai, có thể đổi trong Cài đặt).

a) Tổng quan kỳ:
   - Tổng thời gian làm việc, số ngày có làm, trung bình giờ/ngày làm, ngày làm
     nhiều nhất.
   - Tổng năng suất: vì các đơn vị khác nhau KHÔNG được cộng chung (giờ code ≠ số
     cuộc họp), hiển thị theo từng đơn vị: "120 task · 35 trang · 4 cuộc họp".
   - Chỉ số hiệu suất theo task có đơn vị: quantity / giờ (ví dụ 3.5 trang/giờ).
   - So sánh với kỳ trước (±%) cho tổng giờ.

b) Phân loại theo nhóm công việc:
   - Bảng: Nhóm | Tổng giờ | % thời gian | Năng suất (theo đơn vị) | Số lượt.
   - Biểu đồ tròn (donut) tỷ lệ thời gian theo nhóm, dùng SVG tự vẽ, màu theo
     màu nhóm, có chú thích và tooltip khi hover/chạm.
   - Biểu đồ cột: giờ làm theo ngày trong tuần/tháng (cột xếp chồng theo nhóm
     là điểm cộng). Có nhãn trục, giá trị khi hover, và bảng dữ liệu thay thế
     cho trình đọc màn hình.
   - Chọn nhóm/task để xem chi tiết (drill-down): danh sách task trong nhóm với giờ
     và năng suất.

c) Bảng chi tiết các bản ghi trong kỳ: lọc theo nhóm/task, sắp xếp, sửa nhanh.

d) Xuất báo cáo: CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt, dấu phân cách
   đúng), JSON, và nút In (CSS @media print gọn gàng, có thể "Lưu PDF" bằng hộp thoại
   in của trình duyệt). Không dùng thư viện ngoài.

e) Hàm thuần bắt buộc, kèm test:
   - parseDuration(text) -> phút | lỗi
   - calcDurationMin(start, end) -> phút (xử lý qua đêm)
   - detectOverlaps(logsOfDay)
   - getWeekRange(date, weekStartsOn), getMonthRange(date)
   - aggregate(logs, { groupBy: 'day'|'group'|'task' }) -> tổng phút, tổng
     quantity theo từng unit, số lượt
   - formatMinutes(phút) -> "2h05" và dạng thập phân "2.08 giờ"
   - Các ca biên cần test: qua đêm, 00:00, tuần giao tháng, năm nhuận, đổi giờ,
     task bị đổi tên (dùng snapshot), quantity thập phân, đơn vị khác nhau.

## 1.5 Hiệu năng & độ bền
- Truy vấn log theo khoảng ngày bằng IndexedDB index/IDBKeyRange, không load toàn
  bộ rồi lọc. Render danh sách dài bằng phân trang hoặc "tải thêm".
- Dữ liệu mẫu: nút "Tạo dữ liệu mẫu 3 tháng" (trong Cài đặt) để thử báo cáo; có nút
  xóa dữ liệu mẫu.

# CÁC MODULE KHÁC (làm sau Module 1, thu gọn cho thuần client)

2. Sổ thu chi tối giản: nhập nhanh ("cafe 35k"), danh mục, ngân sách tháng, cảnh
   báo 80%/100%, biểu đồ SVG, xuất CSV.
3. Developer Vault (snippets): lưu script/SQL/regex/config, tag + ngôn ngữ, tìm
   kiếm nhanh (lọc client-side có chuẩn hóa tiếng Việt), copy 1-click bằng
   navigator.clipboard (fallback execCommand), highlight cú pháp viết tay đơn giản
   hoặc bỏ qua.
4. Quản lý thiết bị & bảo hành: ngày mua, nơi mua, thời hạn bảo hành, ảnh hóa đơn
   (lưu Blob trong IndexedDB, nén ảnh bằng Canvas trước khi lưu), cảnh báo hạn
   khi mở app.
5. Bookmark: nhập URL + tiêu đề/mô tả/tag thủ công, trạng thái đã đọc/chưa đọc, phân
   loại theo chủ đề. Không crawl (bị CORS).
6. Kho tài liệu: lưu file/ảnh dạng Blob trong IndexedDB theo thư mục, xem trực tiếp
   (ảnh bằng <img>, PDF bằng <iframe>/<object> với blob URL, nhớ revokeObjectURL),
   thư mục nhạy cảm mã hóa AES-GCM bằng WebCrypto với khóa dẫn xuất PBKDF2 từ
   passphrase. Nói rõ: mất passphrase = mất dữ liệu.
7. Dashboard: tổng hợp giờ làm tuần này, chi tiêu tháng, bảo hành sắp hết, timer đang
   chạy; thanh tìm kiếm toàn cục và phím tắt (Ctrl/Cmd+K).
8. Cài đặt: theme, tuần bắt đầu, mục tiêu giờ/ngày, backup/restore, dữ liệu mẫu,
   xóa toàn bộ dữ liệu (xác nhận 2 bước).

# BACKUP / RESTORE (BẮT BUỘC)
- Export toàn bộ dữ liệu ra 1 file JSON có `schemaVersion`, `exportedAt`; file/Blob
  của kho tài liệu đóng gói base64 (hoặc xuất riêng).
- Import: validate cấu trúc, hỏi "Ghi đè" hay "Gộp", có bước xem trước số lượng bản
  ghi, không bao giờ làm hỏng dữ liệu hiện có nếu file lỗi (dùng transaction).
- Nhắc backup khi đã quá 7 ngày kể từ lần export gần nhất.
- Tùy chọn: File System Access API (nếu trình duyệt hỗ trợ) để ghi backup tự động,
  có phương án dự phòng là tải file.

# PWA & OFFLINE
- manifest + service worker cache các file tĩnh (chiến lược cache-first có version),
  chạy được khi không có mạng, có cơ chế cập nhật phiên bản mới (hiện nút "Tải bản
  mới"). Không để service worker cache dữ liệu người dùng.

# ĐỊNH NGHĨA HOÀN THÀNH (mỗi Phase)
- Chạy được bằng cách mở index.html hoặc static server, không lỗi console.
- Có empty state, error state, xác nhận cho thao tác phá hủy, dùng tốt trên màn hình
  điện thoại 360px.
- Hàm thuần có test trong tests/test.html, tất cả pass.
- Dữ liệu còn nguyên sau khi reload và sau khi nâng version schema.
- Bàn phím dùng được, tương phản màu đạt mức đọc rõ, không dùng innerHTML với dữ
  liệu người dùng.

# BẮT ĐẦU
Hãy bắt đầu bằng Phase 0 theo plan. Trước khi code, hãy hỏi tôi tối đa 5 câu làm rõ
nếu có điểm mơ hồ quan trọng; nếu không thì nêu giả định trong 1 đoạn ngắn rồi
bắt tay làm.
```

---

# PHẦN B — PLAN CHI TIẾT

## B1. Lộ trình

| Phase | Nội dung | Nghiệm thu | Ước lượng |
| --- | --- | --- | --- |
| **0. Nền tảng** | Cấu trúc file, tokens CSS, layout (sidebar/bottom-nav), hash router, wrapper IndexedDB + migrations, `lib/time`, `lib/format`, `lib/dom`, Backup/Restore JSON, test.html khung | Điều hướng giữa các trang rỗng, export rồi import lại dữ liệu thử thành công | 2–3 ngày |
| **1. Task Management** | Nhóm + task: thêm/sửa/xóa/archive, validate, tìm kiếm, lọc, dữ liệu khởi tạo | Đổi tên task không làm sai log cũ (kiểm bằng test) | 2–3 ngày |
| **2. Daily Logging** | Màn "Hôm nay": tích chọn task, 3 cách nhập thời gian, số lượng/đơn vị, nhiều lượt/task, cảnh báo chồng giờ, thanh tổng kết, tự lưu | Nhập đủ một ngày làm việc trong \<2 phút, dữ liệu còn sau reload | 4–5 ngày |
| **3. Timer** | Start/Pause/Stop, sống sót khi reload, banner, cảnh báo quên dừng | Đóng tab 10 phút rồi mở lại, thời gian vẫn đúng | 1–2 ngày |
| **4. Báo cáo** | Aggregate ngày/tuần/tháng, theo nhóm, donut + cột SVG, so sánh kỳ trước, drill-down, CSV/JSON/In | Số liệu khớp tính tay trên dữ liệu mẫu | 4–5 ngày |
| **5. Hoàn thiện Chấm công** | Mục tiêu giờ/ngày, dữ liệu mẫu 3 tháng, tối ưu truy vấn, a11y, test ca biên | Mở báo cáo 3 tháng dữ liệu vẫn mượt | 2 ngày |
| **6. Sổ thu chi** | Parser nhập nhanh, ngân sách, biểu đồ | Nhập khoản chi trong ≤3 thao tác | 3 ngày |
| **7. Snippets + Bookmark** | CRUD, tìm kiếm, copy | Tìm ra snippet khi gõ không dấu | 3 ngày |
| **8. Thiết bị & bảo hành, Kho tài liệu** | Blob trong IndexedDB, nén ảnh, viewer, mã hóa AES-GCM | Mở được PDF/ảnh, thư mục mã hóa không đọc được nếu sai passphrase | 5 ngày |
| **9. PWA + Dashboard + Cài đặt** | Service worker, offline, dashboard, Ctrl+K, nhắc backup | Cài được lên điện thoại, chạy offline | 3 ngày |

Đây là ước lượng thô cho một người làm cùng AI agent. Nếu thời gian có hạn, chỉ cần Phase 0–5 là đã có công cụ chấm công hoàn chỉnh dùng được.

## B2. Thiết kế dữ liệu chấm công (tóm tắt)

```text
groups: id | name | color | order | archivedAt
tasks:  id | name | groupId | unit | note | archivedAt | createdAt | updatedAt
logs:   id | date | taskId | taskNameSnapshot | groupIdSnapshot | groupNameSnapshot
        | unitSnapshot | mode | startTime | endTime | durationMin | quantity
        | note | createdAt | updatedAt
timers: id | taskId | startedAtEpoch | pausedMs | state
meta:   key | value        (schemaVersion, lastBackupAt, ...)
```

Quy tắc dễ sai, nên đưa vào test:

- **Tổng năng suất không cộng chéo đơn vị.** Gộp theo `unitSnapshot`; log không có đơn vị thì chỉ góp phần vào thời gian.
- **Snapshot tên/nhóm/đơn vị** khi tạo log để báo cáo lịch sử ổn định, kể cả khi task bị đổi tên, chuyển nhóm hoặc archive.
- **Ngày dạng chuỗi địa phương**, tránh lỗi lệch ngày khi dùng `toISOString()`.
- **Log qua đêm** thuộc về ngày bắt đầu; cần quy ước rõ và nhất quán trong báo cáo.
- **Số thập phân VN:** chấp nhận `1,5` và `1.5`.

## B3. Luồng màn hình "Hôm nay"

1. Mở app → thấy banner timer (nếu đang chạy), thanh ngày, mục tiêu giờ.
2. Khối **Chọn việc**: danh sách theo nhóm có checkbox, ô tìm kiếm, "Hay dùng", "Lặp lại hôm qua".
3. Khối **Bảng ghi nhận**: mỗi task đã chọn là một thẻ gồm: tên + nhóm (chấm màu), tab thời gian (Bắt đầu–Kết thúc / Số giờ / Bấm giờ), ô số lượng + đơn vị, ghi chú, nút "+ Thêm lượt".
4. **Thanh tổng kết** cố định: tổng giờ, tiến độ so mục tiêu, tổng năng suất theo đơn vị.
5. Mọi thay đổi tự lưu, có trạng thái "Đã lưu" và toast Hoàn tác khi xóa.

## B4. Quyết định kiến trúc

| Vấn đề | Quyết định | Lý do |
| --- | --- | --- |
| Lưu trữ | IndexedDB (chính) + localStorage (cài đặt nhỏ) | localStorage giới hạn \~5MB và đồng bộ; IndexedDB phù hợp dữ liệu lớn và Blob |
| Không framework | Module hóa bằng ES Modules + helper DOM nhỏ | Không phụ thuộc, không build, bền theo thời gian |
| Render | Hàm `render()` theo từng màn hình + event delegation | Đơn giản, đủ cho app cá nhân |
| Biểu đồ | SVG tự vẽ | Không thư viện, sắc nét, dễ làm theme và truy cập |
| Tính toán | Hàm thuần + test.html | Logic giờ/tuần dễ sai, cần test |
| Xóa dữ liệu | Archive mặc định, xóa cứng có cảnh báo | Tránh mất lịch sử chấm công |
| Đồng bộ thiết bị | Không có; dùng Export/Import | Giới hạn của kiến trúc không backend |

## B5. Rủi ro & cách giảm

1. **Mất dữ liệu khi xóa cache/đổi máy** (rủi ro lớn nhất): backup JSON, nhắc sau 7 ngày, `storage.persist()`, thử restore định kỳ.
2. **Trình duyệt tự dọn dữ liệu** (đặc biệt Safari/iOS với dữ liệu lâu không dùng): cài app dạng PWA và backup đều đặn.
3. **Lỗi tính giờ qua đêm/múi giờ/đổi giờ:** hàm thuần và test ca biên.
4. **XSS từ dữ liệu nhập:** không dùng innerHTML với dữ liệu người dùng, CSP chặt.
5. **Nâng schema làm hỏng dữ liệu cũ:** migration đánh version, thử nghiệm với bản backup cũ.
6. **Phình scope:** mỗi Phase chỉ làm đúng danh sách; ý tưởng mới ghi vào `BACKLOG.md`.
7. **File tài liệu lớn làm đầy dung lượng:** nén ảnh trước khi lưu, hiển thị dung lượng đã dùng (`navigator.storage.estimate()`).

## B6. Câu hỏi nên quyết định trước khi bắt đầu

- Thời gian trong ngày bạn muốn nhập kiểu nào là chính: Bắt đầu–Kết thúc, số giờ, hay bấm giờ?
- Task có thể có nhiều đơn vị đo không, hay mỗi task chỉ một đơn vị? (Prompt đang giả định mỗi task một đơn vị.)
- Tuần bắt đầu từ Thứ Hai hay Chủ Nhật? Có cần tính OT và mục tiêu giờ/ngày không?
- Bạn dùng chủ yếu trên một thiết bị hay nhiều? Nếu nhiều, có thể cần thêm backend nhỏ sau này.
- Bản này có cần giữ lại các module phụ (thu chi, snippets, bảo hành, tài liệu) hay chỉ làm hoàn chỉnh phần Chấm công trước?

## B7. Mẹo dùng prompt hiệu quả

- Bắt đầu bằng Phase 0, rồi mỗi Phase mở phiên mới và dán lại Phần A kèm câu: *"Đang làm Phase X, các Phase trước đã xong."*
- Yêu cầu agent **viết test trước** cho `parseDuration`, `calcDurationMin`, `aggregate`.
- Cuối mỗi Phase hỏi: *"Review code vừa viết theo Định nghĩa Hoàn thành và liệt kê điểm chưa đạt."*
- Tự tay thử với dữ liệu thật trong 1 tuần trước khi làm tiếp phần báo cáo để phát hiện thiếu sót về trải nghiệm nhập liệu.