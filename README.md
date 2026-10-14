# HEALTH · Nếp

Ứng dụng theo dõi cuộc sống hằng ngày, giao diện đen trắng và tiếng Việt.

Next.js App Router, React, TypeScript và Supabase Auth/Postgres. Nhật ký, uống nước và thói quen được lưu theo tài khoản, có Row Level Security. Giao diện đen trắng đã được duyệt.

## Xem giao diện

```sh
npm ci
# Tạo .env.local theo .env.example
npm run dev
```

Mở http://localhost:3000, đăng ký và xác nhận email rồi đăng nhập. Có ghi bữa ăn/số lượng, bài tập/số lần/thời lượng, học/làm, nghỉ ngơi/đi chơi, giờ ngủ/thức, nước uống. Chọn ngày, lọc nhật ký, theo dõi thói quen và tổng quan tuần từ dữ liệu thật.

## Cơ sở dữ liệu và triển khai

Migration: `supabase/migrations/20261014_health.sql` (đã áp dụng vào project HEALTH). Chỉ cần URL và publishable key trong môi trường; không dùng service-role key ở trình duyệt. Vercel được cấu hình qua `vercel.json`; hai biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` phải được cấu hình cho môi trường triển khai. Site URL Supabase phải trỏ tới domain production để xác nhận email.

Kiểm tra: `npm test`, `npm run typecheck`, `npm run build`. `tests/rls.sql` kiểm tra đọc/ghi theo người dùng, chặn người dùng khác và anonymous bằng transaction rollback.

Bản mẫu gốc giữ trong `preview/`. `scripts/prepare-layout.cjs` trích bố cục đã duyệt thành `src/lib/template.ts` và CSS; chạy lại script nếu chỉnh bố cục nguồn. Chuỗi markup chỉ chứa nội dung tĩnh, dữ liệu người dùng được gán bằng `textContent`.

Mục tiêu hiển thị hiện cố định: 8 giờ ngủ, 45 phút vận động, 3 bữa và 2 lít nước. Các giá trị này phục vụ theo dõi, không phải chỉ định sức khỏe cá nhân.

Live: https://health-beta-sage.vercel.app

Repository: https://github.com/baodeptraivcll/HEALTH
