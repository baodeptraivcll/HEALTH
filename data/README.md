# Kiểm tra dữ liệu TOEIC

## Kết quả Bước 1

PDF có 31 trang, 50 chủ đề, 600 dòng từ vựng và **596 mục từ khác nhau**. Chưa đạt yêu cầu 600 từ không trùng. Không tự thêm từ, nghĩa, IPA, loại từ hoặc câu ví dụ để bù thiếu.

- `toeic600.pdf`: bản sao nguyên vẹn PDF người dùng cung cấp.
- `words.json`: 596 mục không trùng, đủ khóa `word`, `ipa`, `pos`, `meaning_vi`, `example`, `topic`, `order_index`.
- `words-source.json`: giữ cả 600 dòng nguồn, vị trí, số thứ tự in, trang, chủ đề và nguyên văn các ô trong PDF.
- `words-report.json`: báo cáo kiểm tra đầy đủ, danh sách mọi mục thiếu trường, trùng lặp, lỗi định dạng, SHA-256 nguồn. `ready_for_seed` hiện là `false`.

## Mục từ lặp

| Từ | Vị trí nguồn | Trang PDF |
|---|---|---|
| productive | 21, 176 | 2, 10 |
| express | 112, 522 | 7, 27 |
| constantly | 137, 531 | 8, 28 |
| procedure | 405, 586 | 22, 30 |

`express` có hai loại từ/nghĩa khác nhau. Khi gộp, giữ tất cả nghĩa, IPA và chủ đề khác nhau, phân cách bằng ` | `; loại từ phân cách bằng dấu phẩy. Bản nguồn giữ liên kết từng nghĩa với loại từ/chủ đề gốc. Không bỏ nghĩa khi loại trùng. Các màn hình lọc sau này cần xử lý chủ đề đa giá trị này khi chuẩn bị seed.

## Thiếu thông tin

| Trường | Số dòng nguồn thiếu | Chi tiết |
|---|---:|---|
| example | 600 | PDF chỉ có cột từ, phiên âm, nghĩa; không có câu ví dụ |
| ipa | 1 | get in touch + with somebody — vị trí 51, trang 3 |
| pos | 2 | carrier — vị trí 204, trang 12; invest — vị trí 269, trang 15 |
| word, meaning_vi, topic | 0 | Có dữ liệu cho mọi dòng nguồn |

Thông tin thiếu dùng `null`, không phải chuỗi rỗng. Chữ viết tắt loại từ `a` ở hesitant, on track, valid được chuẩn hoá thành `adj`; không suy luận loại từ cho carrier hoặc invest.

Bộ đọc bảng pdfplumber đặt lệch dấu phụ ở 11 IPA. Script lấy thứ tự ký tự IPA từ luồng văn bản bằng pypdf và kiểm tra hai bộ đọc có cùng tập ký tự, không tự thêm âm. `extraction_adjustments` ghi từng trường hợp; `source_cells` giữ nguyên ô do bộ đọc bảng trích ra. Đây là xử lý lỗi trích xuất, không phải bổ sung từ nguồn ngoài.

## Lỗi nguồn cần xem lại

Phiên âm của 9 mục có dấu `/` thiếu, thừa hoặc nằm giữa cụm. Giữ nguyên văn, chỉ báo lỗi định dạng; không tự sửa hay xác nhận độ chính xác ngữ âm của nội dung PDF.

| Từ | Trang PDF |
|---|---:|
| duplicate | 4 |
| commensurate with | 8 |
| expand | 11 |
| crucial | 13 |
| familiar with | 20 |
| suggestion | 20 |
| patron | 20 |
| prospective | 23 |
| encouragement | 29 |

`restricted` ở vị trí 248, trang 14 bị in STT **28**. `order_index` lấy theo vị trí dòng, giữ STT in nguyên gốc trong `source_number` để đối chiếu; không làm mất dòng này vì trùng số.

## Tái tạo và kiểm tra

Cần Python, `pdfplumber` và `pypdf` (bản đang dùng được ghi trong `requirements-pdf.txt` ở thư mục gốc):

```sh
python -m pip install -r requirements-pdf.txt
python scripts/test_extract_words.py
python scripts/extract_words.py
npm test
npm run typecheck
npm run build
```

Script trích xuất không kết nối Supabase, không seed và không sửa PDF. Kiểm thử dữ liệu xác nhận trích đúng nguồn và không bịa nội dung; test đạt không có nghĩa nguồn đã đủ 600 từ duy nhất.

Theo yêu cầu tiếp tục hoàn thiện toàn bộ ứng dụng, seed sử dụng 596 mục từ thực tế, hiển thị rõ số lượng và giữ trường thiếu null. `ready_for_seed: false` phản ánh chưa đạt bộ nguồn đủ 600 từ/trường như yêu cầu ban đầu; không có dữ liệu bên ngoài được bổ sung. Ứng dụng đã bổ sung ví dụ song ngữ theo yêu cầu riêng trong `examples.json`; các ví dụ này không phải nội dung trích PDF. Xem `EXAMPLES.md`. Chế độ điền từ sử dụng lớp dữ liệu bổ sung này.
