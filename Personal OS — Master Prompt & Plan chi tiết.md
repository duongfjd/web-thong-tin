# Personal OS — Master Prompt & Plan chi tiết

Tài liệu gồm 2 phần:

- **Phần A:** Master Prompt, dán nguyên khối vào AI coding agent (Claude Code, Cursor...) để khởi tạo dự án.
- **Phần B:** Plan chi tiết để bạn tự theo dõi, review và dẫn dắt agent từng phase.

> Cách dùng: dán Phần A làm tin nhắn đầu tiên (hoặc lưu thành `CLAUDE.md` / `AGENTS.md` ở gốc repo). Sau đó ra lệnh từng phase: *"Thực hiện Phase 0"*, review xong mới sang *"Phase 1"*. Không bảo agent làm hết trong một lần.

---

# PHẦN A — MASTER PROMPT

```text
# VAI TRÒ
Bạn là Senior Full-stack Engineer kiêm Solution Architect. Hãy xây dựng cho tôi
"Personal OS": một web app cá nhân (single-user, dùng hằng ngày trên cả máy tính
và điện thoại) đóng vai trò trợ lý tự động hóa công việc và đời sống, không chỉ là
nơi lưu trữ thụ động.

# NGUYÊN TẮC LÀM VIỆC (BẮT BUỘC)
1. Làm theo từng Phase. Cuối mỗi Phase: tóm tắt đã làm gì, cách chạy/test, việc
   còn lại. DỪNG và chờ tôi xác nhận trước khi sang Phase kế.
2. Trước khi code một module, nêu ngắn gọn thiết kế (bảng DB, route, component)
   rồi mới viết code.
3. Không đoán API của thư viện. Kiểm tra docs/phiên bản đang cài trong
   package.json (Next.js, Supabase, shadcn/ui thay đổi thường xuyên).
4. Ưu tiên đơn giản, dễ bảo trì sau nhiều tháng không đụng vào. Không thêm thư
   viện nếu không thực sự cần; mỗi thư viện mới phải nêu lý do.
5. Không bao giờ hard-code secret. Mọi biến môi trường được khai báo trong
   `.env.example` và validate bằng Zod lúc khởi động.
6. Mọi thay đổi schema đi qua file migration trong `supabase/migrations/`.
   Không sửa DB bằng tay trên dashboard.
7. Sau mỗi thay đổi schema phải chạy `supabase gen types typescript` và commit
   file types.
8. Code TypeScript strict, không dùng `any`. Có xử lý lỗi, loading state và
   empty state cho mọi màn hình.

# TECH STACK (CỐ ĐỊNH)
- Next.js (App Router) + TypeScript strict. Server Actions cho mutation,
  Route Handlers cho webhook/cron/export.
- Tailwind CSS + shadcn/ui (component nằm trong repo). Biểu đồ: shadcn charts
  (Recharts). Icon: lucide-react.
- Supabase: Postgres, Auth, Storage, Realtime. Dùng `@supabase/ssr` cho
  auth qua cookie. Types sinh bằng `supabase gen types typescript`.
- Validation: Zod. Form: react-hook-form + @hookform/resolvers/zod.
- Ngày giờ: date-fns + date-fns-tz. Múi giờ mặc định `Asia/Ho_Chi_Minh`.
  DB lưu `timestamptz` (UTC), hiển thị theo múi giờ người dùng.
- Xuất file: exceljs (Excel), @react-pdf/renderer hoặc pdf-lib (PDF).
- Markdown: react-markdown + remark-gfm, highlight code bằng shiki.
- Test: Vitest (logic thuần như tính OT, chi tiêu), Playwright (smoke test luồng
  chính).
- Triển khai: Vercel (app + cron) + Supabase Cloud. Cấu hình PWA để cài lên
  điện thoại.

# BỐI CẢNH & RÀNG BUỘC
- Single-user: chỉ một tài khoản chủ. Tắt đăng ký công khai (disable signups).
  Đăng nhập bằng email + magic link hoặc password, tùy chọn TOTP 2FA.
- Mọi bảng có `user_id uuid references auth.users` và RLS bật, policy chỉ cho
  `auth.uid() = user_id`. Không có bảng nào ở public schema thiếu RLS.
- Service role key chỉ dùng ở server (webhook, cron), tuyệt đối không lộ ra
  client.
- Giao diện tiếng Việt, mobile-first, có dark mode, thao tác nhanh bằng bàn
  phím (Cmd/Ctrl+K command palette).
- Tiền tệ VND lưu dạng số nguyên (bigint), không dùng float.

# CÁC MODULE CẦN XÂY DỰNG

## 1. Timesheet & Worklog
- Nút Check-in / Check-out lớn, ghi thời gian thực phía server (không tin giờ
  client). Lưu IP (từ header) và vị trí. Vị trí chỉ lấy qua Geolocation API
  của trình duyệt khi tôi cho phép, kèm độ chính xác; nếu từ chối thì chỉ lưu IP.
- Mỗi ngày có thể có nhiều phiên làm việc (sáng/chiều). Chặn check-in
  trùng khi phiên trước chưa check-out; cho phép sửa tay có ghi lý do.
- Worklog theo ngày: ghi đầu việc hoàn thành bằng Markdown (editor + preview),
  gắn tag/dự án.
- Tự tính: tổng giờ làm theo ngày/tuần/tháng, giờ OT. Quy tắc OT cấu hình được
  trong bảng settings (giờ chuẩn/ngày, giờ bắt đầu OT, hệ số cuối tuần/lễ).
  Viết hàm thuần `calculateWorkSummary()` kèm unit test cho các trường hợp biên
  (qua đêm, thiếu check-out, nhiều phiên/ngày).
- Báo cáo tháng: bảng + xuất Excel và PDF để đối soát lương.

## 2. Developer Vault (Snippets)
- Lưu script bash, SQL, regex, cấu hình Docker/Nginx...: title, nội dung,
  ngôn ngữ, tag, mô tả, ghim yêu thích.
- Tìm kiếm nhanh: full-text (tsvector) + pg_trgm cho gõ sai/một phần; lọc theo
  tag và ngôn ngữ. Highlight cú pháp, nút copy 1-click (có toast).
- Lịch sử phiên bản đơn giản (lưu bản cũ khi sửa).

## 3. Asset & Warranty Management
- Thiết bị: tên, hãng, model, serial, ngày mua, nơi mua, giá, thời hạn bảo
  hành, ghi chú, trạng thái (đang dùng/đã bán/hỏng).
- Upload ảnh hóa đơn/ảnh thiết bị vào Storage (bucket private).
- Nhắc trước khi hết bảo hành (30/7/1 ngày, cấu hình được) qua Telegram và
  badge trên dashboard. Chạy bằng cron hằng ngày.

## 4. Universal Clipboard
- Dán text/link ở một thiết bị, thiết bị khác thấy ngay bằng Supabase Realtime.
- Danh sách item (text, link, ảnh nhỏ), nút copy, ghim, xóa. Tự động xóa
  item cũ sau N ngày (cấu hình được, job dọn dẹp).
- Trên điện thoại hỗ trợ Web Share Target (chia sẻ từ app khác vào Personal OS).

## 5. Smart Bookmark / Read-it-later
- Dán URL, server tự lấy metadata: OpenGraph title, description, ảnh
  thumbnail, favicon. Thực hiện trong Route Handler/Server Action.
- BẮT BUỘC chống SSRF: chỉ cho http/https, chặn IP nội bộ/loopback/link-local/
  metadata cloud, giới hạn redirect, timeout, giới hạn kích thước response.
- Phân loại theo chủ đề (Kỹ thuật, Bài viết hay, Tài liệu nghiên cứu...), tag,
  trạng thái chưa đọc/đã đọc/lưu trữ, tìm kiếm full-text.
- Tùy chọn: lưu bản đọc sạch (readability) của bài viết.

## 6. Document Vault
- Lưu tài liệu scan (CCCD, bằng cấp, hợp đồng, bảo hiểm) theo thư mục.
- Storage bucket private; chỉ truy cập qua signed URL ngắn hạn tạo ở server.
- Xem PDF/ảnh trực tiếp trên web (không bắt tải về).
- Mức bảo mật: tài liệu nhạy cảm yêu cầu xác thực lại (re-auth) hoặc nhập mã
  PIN riêng trước khi xem. Đề xuất phương án mã hóa phía client (WebCrypto,
  AES-GCM, khóa dẫn xuất từ passphrase) cho thư mục "Nhạy cảm" và nêu rõ
  đánh đổi (mất passphrase = mất dữ liệu, không tìm kiếm nội dung được).

## 7. Micro Expense Tracker
- Nhập nhanh trong 3 giây: số tiền, danh mục, ghi chú, ngày (mặc định hôm nay).
  Hỗ trợ nhập kiểu "cafe 35k", "xăng 80000".
- Danh mục tùy chỉnh, ngân sách theo tháng cho từng danh mục.
- Dashboard: biểu đồ theo danh mục, theo ngày, so với tháng trước; cảnh báo khi
  chi tiêu đạt 80% và 100% ngân sách.
- Xuất CSV/Excel.

## 8. Telegram Bot (kênh nhập liệu nhanh)
- Webhook tại `/api/telegram/webhook`. Xác thực bằng `secret_token` header của
  Telegram VÀ chỉ chấp nhận `chat_id` nằm trong whitelist (của tôi). Mọi
  request khác trả 200 và bỏ qua, không lộ thông tin.
- Lệnh/ngữ nghĩa:
  - Gửi link → lưu Bookmark.
  - `/chi 35k cafe` → ghi khoản chi.
  - `/note ...` hoặc `/log ...` → thêm vào Worklog hôm nay.
  - `/in`, `/out` → check-in/check-out.
  - `/clip ...` → đẩy vào Universal Clipboard.
  - Gửi ảnh/file → lưu vào Document Vault (hỏi thư mục) hoặc đính kèm vào
    Asset.
  - `/today` → tóm tắt hôm nay (giờ làm, chi tiêu, việc cần nhắc).
- Idempotent: lưu `update_id` đã xử lý để tránh xử lý lặp khi Telegram retry.
- Bot cũng là kênh gửi thông báo (hết bảo hành, vượt ngân sách, quên check-out).

## 9. Dashboard & Công cụ chung
- Trang chủ: trạng thái check-in, giờ làm tuần này, chi tiêu tháng, bảo hành
  sắp hết, bookmark chưa đọc, clipboard gần nhất.
- Command palette (Ctrl/Cmd+K) và tìm kiếm toàn cục xuyên module.
- Trang Settings: múi giờ, quy tắc OT, ngưỡng nhắc, Telegram chat_id, export/
  backup toàn bộ dữ liệu (JSON + file).


# kết nối supabase
1. Install packages
Run this command to install the required dependencies.
Code:
File: Code
```
npm install @supabase/supabase-js @supabase/ssr
```

2. Add Supabase Library blocks
Install Supabase Library blocks via the shadcn registry.
Details:
Add UI components for auth, realtime, storage, and more at supabase.com/library.
Code:
File: Code
```
npx shadcn@latest add @supabase/supabase-client-nextjs
```

3. Set env variables
Add the following values to your env file.
Code:
File: .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://shzxqulhxwmjdipjkwqe.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_l5VdADKMm4fwADcrpZn-VQ_xATGQb7w
```

4. Install Agent Skills (optional)
Agent Skills give AI coding tools ready-made instructions, scripts, and resources for working with Supabase more accurately and efficiently.
Code:
File: Code
```
npx skills add supabase/agent-skills
``` 
# KIẾN TRÚC & CẤU TRÚC THƯ MỤC
Tổ chức theo feature (mỗi module tự chứa component, actions, schema, queries):

  src/
    app/                      # routes (App Router)
      (auth)/login
      (app)/                  # layout có sidebar, yêu cầu đăng nhập
        dashboard, timesheet, vault, assets, clipboard,
        bookmarks, documents, expenses, settings
      api/
        telegram/webhook, cron/[job], export/[type], og
    features/<module>/        # components, actions.ts, queries.ts, schema.ts
    lib/supabase/             # client.ts, server.ts, admin.ts, middleware.ts
    lib/                      # env.ts, utils, time.ts, money.ts
    components/ui/            # shadcn
    types/database.types.ts   # sinh tự động
  supabase/
    migrations/  seed.sql  config.toml
  tests/  e2e/

Quy ước: Server Components lấy dữ liệu; Server Actions cho mutation, luôn
kiểm tra session + validate Zod ở server; chỉ dùng admin client trong
`/api/*` khi thật sự cần, và phải tự kiểm tra quyền.

# BẢO MẬT (CHECKLIST CUỐI MỖI PHASE)
- RLS bật + policy cho mọi bảng và cho storage.objects (theo prefix user_id).
- Bucket private, signed URL ngắn hạn.
- Security headers (CSP, X-Frame-Options, Referrer-Policy) trong next.config.
- Rate limit cho endpoint công khai (webhook, og fetch).
- Cron endpoint yêu cầu header `Authorization: Bearer CRON_SECRET`.
- Không log dữ liệu nhạy cảm. Không đưa secret vào client bundle (kiểm tra
  biến `NEXT_PUBLIC_*`).

# ĐỊNH NGHĨA HOÀN THÀNH (cho mỗi module)
- Migration + RLS + types đã sinh.
- UI đủ trạng thái loading/empty/error, dùng tốt trên mobile.
- Có validate server-side và unit test cho logic nghiệp vụ.
- Có hướng dẫn chạy thử trong README.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` đều pass.

# BẮT ĐẦU
Hãy bắt đầu bằng Phase 0 (khởi tạo & nền tảng) theo plan bên dưới. Trước khi
code, hãy hỏi tôi tối đa 5 câu làm rõ nếu có điểm mơ hồ quan trọng, nếu không
thì nêu giả định của bạn trong 1 đoạn ngắn rồi bắt tay làm.
```

---

# PHẦN B — PLAN CHI TIẾT

## B1. Lộ trình theo Phase

Ước lượng cho 1 người làm cùng AI agent, khoảng 1–2 giờ/ngày. Đây là ước lượng thô để bạn lập kế hoạch.

| Phase | Nội dung | Kết quả kiểm chứng được | Ước lượng |
| --- | --- | --- | --- |
| **0. Nền tảng** | Repo, Next.js, Tailwind, shadcn, Supabase local (CLI), env + Zod, auth (login, middleware, tắt signup), layout sidebar, dark mode, CI lint/typecheck | Đăng nhập được, route được bảo vệ, `gen types` chạy | 2–3 ngày |
| **1. Timesheet & Worklog** | Bảng, check-in/out, worklog Markdown, hàm tính giờ/OT + test, báo cáo tháng, export Excel/PDF | Check-in/out đúng, báo cáo khớp tính tay | 4–6 ngày |
| **2. Expense Tracker** | Danh mục, ngân sách, nhập nhanh, dashboard biểu đồ, cảnh báo | Nhập 3 giây, biểu đồ đúng | 3–4 ngày |
| **3. Telegram Bot v1** | Webhook an toàn, `/in /out /chi /log`, idempotency, thông báo | Gửi tin Telegram là có dữ liệu trong DB | 2–3 ngày |
| **4. Bookmarks** | Crawl OG an toàn (SSRF), phân loại, tìm kiếm, nhận link từ Telegram | Dán link ra card đẹp, link nội bộ bị chặn | 3–4 ngày |
| **5. Universal Clipboard** | Realtime, ghim, dọn dẹp, Share Target, PWA | Dán ở máy tính, điện thoại thấy ngay | 2 ngày |
| **6. Developer Vault** | Snippets, full-text + trgm, highlight, copy, version | Tìm ra snippet trong \<200ms | 3 ngày |
| **7. Assets & Warranty** | Thiết bị, upload hóa đơn, cron nhắc bảo hành | Nhận Telegram trước hạn bảo hành | 3–4 ngày |
| **8. Document Vault** | Thư mục, signed URL, viewer PDF/ảnh, re-auth/PIN, (tùy chọn) mã hóa client | Xem file không cần tải, URL hết hạn | 4–5 ngày |
| **9. Hoàn thiện** | Dashboard tổng, command palette, tìm kiếm toàn cục, settings, backup/export, e2e test, hardening | Checklist bảo mật xanh toàn bộ | 4–5 ngày |

Thứ tự gợi ý ưu tiên giá trị dùng hằng ngày trước (Timesheet, Expense, Telegram), phần bảo mật nặng (Document Vault) làm sau khi nền tảng đã vững.

## B2. Schema dữ liệu cốt lõi (khởi điểm)

Đây là bản phác để agent mở rộng, mọi bảng đều có `id`, `user_id`, `created_at`, `updated_at` và RLS.

```sql
-- Mẫu chuẩn cho mọi bảng
create table public.timesheet_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  check_in_at  timestamptz not null,
  check_out_at timestamptz,
  check_in_ip  inet, check_out_ip inet,
  check_in_geo jsonb,  -- {lat,lng,accuracy}, null nếu không cấp quyền
  check_out_geo jsonb,
  source text not null default 'web' check (source in ('web','telegram','manual')),
  edit_reason text,
  created_at timestamptz not null default now(),
  constraint chk_out_after_in check (check_out_at is null or check_out_at > check_in_at)
);
-- Chỉ cho 1 phiên đang mở tại một thời điểm
create unique index one_open_session_per_user
  on public.timesheet_sessions(user_id) where check_out_at is null;

alter table public.timesheet_sessions enable row level security;
create policy "owner_all" on public.timesheet_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Danh sách bảng dự kiến:

| Module | Bảng chính |
| --- | --- |
| Chung | `settings` (1 dòng/user: timezone, ot_rules jsonb, thresholds, telegram_chat_id), `tags`, `telegram_updates` (update_id đã xử lý) |
| Timesheet | `timesheet_sessions`, `worklogs` (date, content_md, tags) |
| Vault | `snippets` (title, body, language, tags\[\], is_pinned, search tsvector), `snippet_versions` |
| Assets | `assets`, `asset_files` (đường dẫn Storage), `reminders_sent` |
| Clipboard | `clipboard_items` (kind, content, pinned, expires_at) |
| Bookmarks | `bookmarks` (url, title, description, image_url, favicon_url, category, tags\[\], status, search tsvector) |
| Documents | `doc_folders`, `documents` (storage_path, mime, size, is_sensitive, encrypted bool) |
| Expenses | `expense_categories`, `expenses` (amount_vnd bigint, category_id, note, spent_on date), `budgets` (category_id, month, limit_vnd) |

Lưu ý thiết kế:

- Tiền: `bigint` VND. Ngày chi tiêu: kiểu `date` (theo múi giờ VN). Mốc thời gian: `timestamptz`.
- Tìm kiếm: cột `tsvector` sinh tự động (generated column) + GIN index; `pg_trgm` cho title/tag.
- Realtime: chỉ bật publication cho `clipboard_items` (và bảng nào thực sự cần), tránh bật tràn lan.
- Storage: đường dẫn `{user_id}/{module}/{uuid}.{ext}`; policy trên `storage.objects` kiểm tra `(storage.foldername(name))[1] = auth.uid()::text`.

## B3. Chi tiết từng Phase (việc cần làm + tiêu chí nghiệm thu)

### Phase 0 — Nền tảng

- `pnpm create next-app` (TypeScript, Tailwind, App Router, ESLint, src dir), cài shadcn/ui.
- `supabase init`, `supabase start` (local), cấu hình `config.toml`: tắt signup, đặt site_url.
- Tạo `lib/supabase/{client,server,admin}.ts` và middleware refresh session theo tài liệu `@supabase/ssr` hiện hành.
- `lib/env.ts`: validate biến môi trường bằng Zod. Tạo `.env.example`.
- Layout `(app)` có sidebar, bottom-nav trên mobile, theme toggle.
- GitHub Actions: lint + typecheck + test.
- **Nghiệm thu:** đăng nhập/đăng xuất, truy cập route khi chưa đăng nhập bị chuyển hướng, không thể tự đăng ký tài khoản mới.

### Phase 1 — Timesheet & Worklog

- Server Action `checkIn()`/`checkOut()`: lấy IP từ `x-forwarded-for`, thời gian từ server (`now()` ở DB).
- Hàm thuần `calculateWorkSummary(sessions, rules)` + test: ca qua đêm, quên check-out (cảnh báo/đóng tự động theo rule), nhiều phiên, cuối tuần/lễ.
- Bảng ngày/tháng, chỉnh sửa có lý do, editor Markdown.
- Export: Route Handler `/api/export/timesheet?month=YYYY-MM&format=xlsx|pdf`.
- **Nghiệm thu:** một tháng dữ liệu mẫu cho kết quả giờ làm/OT khớp bảng tính tay.

### Phase 2 — Expense Tracker

- Parser nhập nhanh `parseQuickExpense("cafe 35k")` → `{amount: 35000, note: "cafe"}` + test (k, tr, dấu chấm phân cách).
- Truy vấn tổng hợp dùng SQL (view hoặc RPC), không tổng hợp ở client.
- Cảnh báo ngân sách tại 80%/100% (hiển thị trong app, Telegram ở Phase 3).
- **Nghiệm thu:** thêm 1 khoản chi trong ≤3 thao tác trên điện thoại.

### Phase 3 — Telegram Bot

- Tạo bot qua @BotFather, `setWebhook` kèm `secret_token`.
- Route `/api/telegram/webhook`: kiểm tra header secret, kiểm tra `chat_id`, ghi `update_id` (unique) để idempotent, điều hướng lệnh tới các service dùng chung với web (không viết logic nghiệp vụ lần hai).
- Lớp `notify()` dùng chung để gửi tin về Telegram.
- **Nghiệm thu:** request giả mạo không có secret bị bỏ qua; gửi `/chi 35k cafe` xuất hiện trong web.

### Phase 4 — Bookmarks

- `fetchMetadata(url)`: validate scheme, phân giải DNS rồi chặn dải IP riêng, `redirect` giới hạn, timeout 5s, giới hạn 1–2MB, parse OG/Twitter/`<title>`/favicon.
- Chuẩn hóa URL (bỏ tracking params `utm_*`), chống trùng lặp.
- **Nghiệm thu:** `http://localhost`, `http://169.254.169.254`, `file://` đều bị từ chối; link bài báo thật ra đủ card.

### Phase 5 — Universal Clipboard

- Subscribe Realtime theo `user_id` (RLS vẫn áp dụng cho Realtime).
- PWA manifest + service worker tối thiểu, `share_target` trong manifest.
- Job dọn dẹp item quá hạn.
- **Nghiệm thu:** độ trễ giữa 2 thiết bị dưới \~2 giây.

### Phase 6 — Developer Vault

- Cột `search` generated, GIN index, trang tìm kiếm có debounce.
- Shiki highlight ở server, nút copy dùng `navigator.clipboard` (có fallback).
- **Nghiệm thu:** gõ một phần tên/tag vẫn ra kết quả.

### Phase 7 — Assets & Warranty

- Tính `warranty_expires_at` từ ngày mua + số tháng, hiển thị trạng thái (còn hạn / sắp hết / hết hạn).
- Cron Vercel gọi `/api/cron/warranty` mỗi ngày, ghi `reminders_sent` để không nhắc lặp.
- **Nghiệm thu:** tạo thiết bị hết hạn sau 7 ngày thì nhận đúng một thông báo.

### Phase 8 — Document Vault

- Upload trực tiếp lên Storage bằng signed upload URL; giới hạn loại file và dung lượng.
- Viewer: ảnh dùng `<img>` với signed URL; PDF dùng `pdfjs` hoặc `<iframe>`/`<object>` (cân nhắc CSP).
- Re-auth: yêu cầu xác thực lại trong vòng N phút trước khi tạo signed URL cho thư mục nhạy cảm.
- **Nghiệm thu:** URL hết hạn sau vài phút; user khác (tạo test) không đọc được file.

### Phase 9 — Hoàn thiện

- Tìm kiếm toàn cục (RPC union nhiều bảng hoặc tìm theo module song song).
- Backup: xuất toàn bộ dữ liệu JSON + file zip.
- E2E Playwright cho 3 luồng: đăng nhập, check-in/out, thêm chi tiêu.
- Rà soát lại checklist bảo mật; thử nghiệm khôi phục từ backup.

## B4. Quyết định kiến trúc quan trọng

| Vấn đề | Quyết định | Lý do |
| --- | --- | --- |
| Logic dùng chung web & Telegram | Tách thành service/hàm thuần trong `features/*`, cả Server Action và webhook cùng gọi | Tránh lặp logic, dễ test |
| Webhook dùng quyền gì | Admin client (service role) + ép `user_id` cố định từ settings | Webhook không có session; phải tự kiểm soát chặt |
| Tìm kiếm | Postgres FTS + pg_trgm, chưa cần Algolia/Meilisearch | Dữ liệu cá nhân nhỏ, ít phụ thuộc |
| Job định kỳ | Vercel Cron gọi route có `CRON_SECRET` (hoặc `pg_cron` nếu muốn thuần Supabase) | Đơn giản, dễ debug |
| Mã hóa tài liệu | RLS + private bucket là mặc định; mã hóa client chỉ cho thư mục "Nhạy cảm" | Cân bằng tiện dụng và an toàn |
| State client | Ưu tiên Server Components + Server Actions, chỉ thêm TanStack Query khi cần cache/optimistic phức tạp | Giảm độ phức tạp |

## B5. Rủi ro & cách giảm

1. **Rò rỉ dữ liệu do thiếu RLS:** thêm một test SQL liệt kê bảng public chưa bật RLS và chạy trong CI; dùng Supabase Security Advisor định kỳ.
2. **Lộ service role key:** chỉ đặt ở biến môi trường server, kiểm tra bundle không chứa; xoay key nếu nghi ngờ.
3. **SSRF qua trình crawl link:** theo Phase 4, thêm test cho dải IP riêng và redirect tới IP nội bộ.
4. **Webhook bị giả mạo/lặp:** secret token + whitelist `chat_id` + idempotency.
5. **Mất dữ liệu:** bật backup Supabase (lưu ý gói free có giới hạn), cộng thêm export định kỳ tự động ra nơi khác.
6. **Giới hạn gói free:** Supabase free có thể tạm dừng project khi không hoạt động và có hạn mức Storage/băng thông; kiểm tra điều khoản hiện hành trước khi đưa tài liệu quan trọng lên.
7. **Phình scope:** mỗi Phase chỉ làm đúng danh sách; ý tưởng mới ghi vào `BACKLOG.md`.
8. **Vị trí/IP là dữ liệu cá nhân nhạy cảm:** chỉ lấy khi cần, hiển thị rõ cho bạn thấy, có tùy chọn tắt.

## B6. Câu hỏi nên quyết định trước khi bắt đầu

- Bạn muốn đăng nhập bằng magic link hay mật khẩu (+TOTP)?
- Quy tắc OT của bạn: giờ chuẩn/ngày, mốc bắt đầu OT, hệ số cuối tuần/lễ?
- Tài liệu "Nhạy cảm" có cần mã hóa phía client ngay từ đầu, hay RLS + re-auth là đủ?
- Hosting: Vercel hay tự host (VPS + Docker)? Nếu tự host, cron và PWA cần cấu hình lại.
- Muốn dùng domain riêng không (ảnh hưởng cookie, webhook Telegram yêu cầu HTTPS)?

## B7. Mẹo dùng prompt hiệu quả

- Mỗi Phase mở một phiên chat/agent mới, dán lại Phần A (hoặc để trong `CLAUDE.md`) cộng thêm: *"Phase hiện tại: X. Các Phase trước đã xong."*
- Yêu cầu agent **viết test trước** cho logic nghiệp vụ (OT, parser chi tiêu, SSRF guard).
- Cuối mỗi Phase dùng câu: *"Review lại code vừa viết theo checklist bảo mật và Định nghĩa Hoàn thành, liệt kê điểm chưa đạt."*
- Giữ `BACKLOG.md` và `DECISIONS.md` (ghi lại vì sao chọn gì) để sau vài tháng quay lại vẫn hiểu hệ thống.