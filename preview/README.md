# Nếp — bản xem trước

Bản mẫu đen trắng, tiếng Việt cho ứng dụng theo dõi sinh hoạt. Chạy `node server.cjs` trong thư mục này, mở http://127.0.0.1:4173.

Có tương tác minh họa: ghi hoạt động, lọc nhật ký, ghi nước, đánh dấu thói quen, xem tuần. Dữ liệu chỉ tồn tại trong bộ nhớ trình duyệt, được đặt lại khi tải trang. Các số tổng quan và biểu đồ là dữ liệu minh họa, không tự tính từ nhật ký.

## Cấu trúc dự kiến sau khi duyệt giao diện

Giữ cách tổ chức của project tham chiếu `D:\VIP\love-diary`: Next.js App Router, React, TypeScript, `src/app`, `src/lib/supabaseClient.ts`, đăng nhập Supabase, triển khai Vercel và quản lý mã nguồn GitHub. Chưa tạo tài khoản, repository, database hay deployment cho bản mẫu này.

Màn hình chính: Hôm nay, Nhật ký, Thói quen, Tổng quan tuần. Theo dõi học/làm, đi chơi, bữa ăn và số lượng món, bài tập và số lần/hiệp, giờ ngủ/thức, uống nước. Có thể thêm cảm nhận trong ngày và mục tiêu cá nhân khi triển khai.

Không sao chép token hoặc khóa từ project tham chiếu. Tách dữ liệu app mới khỏi nhật ký cũ; bảng dữ liệu cá nhân cần RLS theo người dùng khi kết nối Supabase.
