# TOEIC 600 · word.

Ứng dụng học từ vựng TOEIC bằng tiếng Việt, tối ưu điện thoại. Next.js 16.4, React 19, TypeScript và Supabase Auth/Postgres; triển khai bằng Vercel.

[Mở ứng dụng](https://health-beta-sage.vercel.app) · [Xem và học thử không cần đăng nhập](https://health-beta-sage.vercel.app/preview)

## Dữ liệu nguồn và giới hạn

PDF cung cấp có 600 dòng, 50 chủ đề nhưng chỉ **596 mục từ duy nhất**. Từ lặp đã gộp mà giữ mọi nghĩa/chủ đề. Không tự tạo thêm từ, nghĩa, IPA hoặc ví dụ.

- `data/toeic600.pdf`: PDF gốc đã chuẩn hoá đường dẫn.
- `data/words.json`: 596 mục không trùng để seed.
- `data/words-source.json`: đủ 600 dòng, ô nguồn, trang và số thứ tự để đối chiếu.
- `data/words-report.json` và `data/README.md`: chi tiết trùng, thiếu và lỗi nguồn.

Mọi `example` hiện là `null`; một mục thiếu IPA, hai mục thiếu loại từ. Chế độ điền từ đã có bộ xử lý nhưng chưa có bài hợp lệ, nên giao diện thông báo thiếu ví dụ và không tạo câu giả. Thêm ví dụ có nguồn và seed lại sẽ mở bài điền từ nếu ví dụ chứa đúng mục từ. Chỉ số /600 giữ tên bộ học, kèm số lượng thực tế 596.

## Tính năng

- Flashcard lật thẻ, phát âm en-US, Quên/Khó/Nhớ/Dễ; vuốt trái/phải sau khi lật thẻ.
- SM-2: 15 từ mới/ngày mặc định, chỉnh 1–100; ưu tiên từ trong sổ sai, từ đến hạn rồi đến từ mới. Quota từ mới tính theo lần học đầu tiên trong ngày.
- Quiz chọn nghĩa, nghe rồi chọn từ, bộ xử lý điền từ; phản hồi sai ngay, ghi nguyên câu trả lời đã chọn.
- Sổ từ sai: lọc từ loại/chủ đề/hôm nay/7 ngày/tất cả; sắp theo số lần sai, thêm/bỏ thủ công, ôn riêng 10/20/tất cả bằng chế độ đã chọn.
- Chỉ ra khỏi sổ sau 3 **buổi đã kết thúc** liên tiếp đúng; nhiều lần đúng trong cùng buổi chỉ tăng một streak. Bất kỳ lần sai nào reset ngay; buổi chứa câu sai không tăng streak.
- Tổng kết đúng/sai và luyện ngay từ vừa sai; thống kê 7 ngày, chuỗi ngày học, tỷ lệ đúng, top 10 từ hay sai.
- Cài đặt số từ mới, phát âm, sáng/tối. Không phụ thuộc dịch vụ TTS trả phí; giọng phụ thuộc trình duyệt/thiết bị.
- Giữ luồng đăng ký email/mật khẩu, xác nhận email, khôi phục phiên, đăng nhập/đăng xuất Supabase hiện có.

## Chạy local và xem giao diện bên trong

```sh
npm ci
# Sao chép .env.example thành .env.local và điền URL + publishable key
npm run dev
```

- http://localhost:3000: đăng nhập để lưu tiến độ theo tài khoản.
- http://localhost:3000/preview: trải nghiệm toàn bộ giao diện và chế độ học không cần đăng nhập; tiến độ lưu riêng trong localStorage, không gọi Supabase và không chuyển vào tài khoản khi đăng nhập.

Chỉ hai biến public cần cho web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Client còn hỗ trợ `NEXT_PUBLIC_SUPABASE_ANON_KEY` cho cấu hình legacy. Không commit `.env.local` hoặc đưa service-role key vào biến `NEXT_PUBLIC_*`.

## Database

Project đang sử dụng: `glfvowtqrzwmizwocqel`. Đã xoá ba bảng/function/policy sức khoẻ sau khi người dùng xác nhận; giữ schema auth và ba tài khoản hiện có. Schema TOEIC và seed đã được áp dụng bằng SQL Editor. Không chạy lại reset trên database TOEIC đang hoạt động.

Với project mới, chạy trong Supabase SQL Editor bằng tài khoản quản trị:

1. `supabase/migrations/20261021_toeic.sql` (một lần).
2. `supabase/seed.sql` (có thể chạy lại, upsert theo word và giữ id/tiến độ).
3. `tests/rls.sql` để kiểm tra; dữ liệu test được rollback, kết quả cuối phải PASS.

Schema gồm `words`, `user_word_progress`, `mistake_log`, `study_sessions`, `user_settings` và `review_events` chống ghi trùng. Tất cả bảng bật RLS. User đã đăng nhập được đọc words; các bảng cá nhân chỉ đọc của mình. Cài đặt ghi theo owner; tiến độ/log/buổi học được ghi qua RPC có kiểm tra auth.uid, lock theo user và transaction. Không cho client ghi trực tiếp counter để tránh sai quy tắc.

RPC: `start_study_session`, `record_study_answer`, `finish_study_session`, `set_word_mistake`. event_id UUID dùng lại khi retry cùng câu trả lời để không tăng counter lần hai. Ngày học dùng Asia/Ho_Chi_Minh. Buổi rỗng/đang học không tính vào streak ngày học.

`supabase/inspect-public.sql` chỉ kiểm kê. `supabase/reset-legacy.sql` chỉ dành cho schema sức khoẻ cũ đã được xác nhận, có gate từ chối đối tượng ngoài danh sách; không dùng DROP SCHEMA CASCADE hoặc supabase db reset trên production. Không xoá lịch sử migration trong schema hệ thống; nếu dùng Supabase CLI với project đã có migration cũ, cần đối chiếu/repair lịch sử riêng trước khi db push. Luồng SQL Editor nêu trên không đụng lịch sử này.

## Seed lại dữ liệu

Tạo file SQL từ JSON:

```sh
npm run seed:sql
```

Hoặc seed qua API từ terminal tin cậy, đặt `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong môi trường local rồi chạy:

```sh
npm run seed
```

Service-role chỉ dùng cho script quản trị, không cần cấu hình trên Vercel. Script upsert theo word nên chạy lại không tạo bản sao; không tự xoá từ đã có hoặc thay id. Bản preview đọc JSON đóng gói; bản đăng nhập đọc bảng words thật.

## Trích PDF lại

```sh
python -m pip install -r requirements-pdf.txt
python scripts/test_extract_words.py
python scripts/extract_words.py
```

Script đối chiếu thứ tự ký tự IPA giữa pdfplumber và pypdf; giữ ô nguồn và báo mọi điều chỉnh. Không tra từ điển hoặc tự sửa nghĩa nguồn. Sau khi cập nhật JSON, tạo lại seed SQL và seed vào Supabase.

## Kiểm tra

```sh
npm test
npm run typecheck
npm run build
```

Kiểm thử bao gồm Auth, SM-2, ưu tiên hàng đợi/quota ngày, dữ liệu nguồn, seed, idempotence, 3 buổi đúng, UI quiz/sổ sai/cài đặt và retry khi kết thúc phiên lỗi. SQL tests chạy riêng trên Supabase để kiểm tra RLS/anonymous/cross-owner/RPC và rollback. Browser QA kiểm tra giao diện 390×844 và luồng flashcard → Quên → tổng kết → sổ từ sai.

## Deploy Vercel

Repository hiện tại: https://github.com/baodeptraivcll/HEALTH. Dự án Vercel hiện có tiếp tục dùng để giữ domain/redirect Auth ổn định. App và metadata đã đổi sang TOEIC 600.

Cấu hình Vercel: framework Next.js, build `npm run build`, output `.next`; thêm hai biến public Supabase cho Production/Preview cần sử dụng. Supabase Auth Site URL và Redirect URLs phải khớp domain triển khai để xác nhận email. Push vào nhánh production đã kết nối sẽ kích hoạt deployment. Kiểm tra trạng thái Ready và thử `/preview` cùng màn hình đăng nhập sau deploy.

Giới hạn hiện tại: cần nguồn bổ sung để đủ 600 mục từ duy nhất và mở bài điền từ; âm thanh thực tế phụ thuộc giọng tiếng Anh được cài trên thiết bị. Không có dữ liệu học sức khoẻ cũ trong schema public mới.
