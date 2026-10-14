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

Migration theo thứ tự: `supabase/migrations/20261014_health.sql`, rồi `supabase/migrations/20261014_customization.sql` (đã áp dụng vào project HEALTH). Chỉ cần URL và publishable key trong môi trường; không dùng service-role key ở trình duyệt. Vercel được cấu hình qua `vercel.json`; hai biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` phải được cấu hình cho môi trường triển khai. Site URL Supabase phải trỏ tới domain production để xác nhận email.

Kiểm tra: `npm test`, `npm run typecheck`, `npm run build`. Kiểm tra giao diện chạy với client giả trong `tests/mock-client.mjs`. `tests/rls.sql` kiểm tra đọc/ghi theo người dùng, chặn người dùng khác và anonymous, giữ lịch sử khi xóa mục và không ghi đè tùy chỉnh khi khởi tạo lại; toàn bộ dữ liệu thử được rollback.

Bản mẫu gốc giữ trong `preview/`. `scripts/prepare-layout.cjs` trích bố cục đã duyệt thành `src/lib/template.ts` và CSS; chạy lại script nếu chỉnh bố cục nguồn. Chuỗi markup chỉ chứa nội dung tĩnh, dữ liệu người dùng được gán bằng `textContent`.

## Tùy chỉnh

Nút **Tùy chỉnh** quản lý mục theo dõi, thói quen và thanh điều hướng: thêm, sửa tên/icon/thứ tự, xóa khỏi danh sách và khôi phục. Mục theo dõi có cách tính tổng (đếm hoạt động, cộng số lượng, cộng số phút, giờ ngủ/thức), đơn vị, mục tiêu mỗi ngày, lựa chọn hiện ở tổng quan/Ghi nhanh và số lượng ghi nhanh. Hoạt động đã ghi có thể sửa tên, icon, ngày giờ, số lượng và chi tiết.

Xóa mục là lưu trạng thái `archived`, không xóa nhật ký hoặc lịch sử thói quen. Mục mặc định chỉ được tạo nếu chưa tồn tại, nên tên/icon/mục tiêu đã sửa không bị đặt lại. Dữ liệu tùy chỉnh cũng có RLS theo người dùng.

Thư viện có 94 icon nét Lucide trong 12 lĩnh vực, tìm kiếm tiếng Việt không phân biệt dấu, lọc lĩnh vực và ký hiệu/emoji tự nhập. `scripts/prepare-icons.cjs` sinh catalog tĩnh để không tải toàn bộ thư viện ở trình duyệt; giấy phép nằm trong `ICONS-LICENSE.txt`. `scripts/prepare-customization-migration.mjs` sinh migration từ các mục mặc định trong model; không chạy lại migration đã áp dụng.

Live: https://health-beta-sage.vercel.app

Repository: https://github.com/baodeptraivcll/HEALTH
