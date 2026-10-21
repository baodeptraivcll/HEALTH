# Ví dụ song ngữ bổ sung

`examples.json` có 596 câu tiếng Anh **tự biên soạn** và bản dịch tiếng Việt tương ứng, một cặp cho mỗi mục từ duy nhất. Nội dung được bổ sung theo yêu cầu của người dùng, không phải câu trích nguyên văn từ PDF hay Cambridge.

Cambridge được tham khảo để kiểm tra một số cách dùng, cấu trúc và lỗi nguồn dưới đây; không khẳng định toàn bộ 596 câu đã được Cambridge biên tập hoặc xác nhận. Các câu ưu tiên bối cảnh công việc, thương mại, du lịch và sinh hoạt thường gặp trong TOEIC. Đã rà soát chéo bản tiếng Anh và độ sát nghĩa tiếng Việt.

## Cấu trúc và nguồn gốc

- `word`: khóa mục từ nguyên gốc, dùng nối dữ liệu và giữ id/tiến độ khi upsert.
- `study_term`: dạng học chuẩn; bỏ ký hiệu `+`, `somebody`, `V-ing` khi chúng là chú thích ngữ pháp, và ghi rõ các lỗi chính tả được sửa.
- `example_en`, `example_vi`: câu ví dụ và bản dịch được viết riêng.
- `example_answer`: cụm thực tế trong câu, dùng làm đáp án điền từ. Ví dụ đầu mục `accustom someone to` có thể có đáp án `accustom trainees to`.
- `source: original`: nhãn minh bạch rằng ví dụ tự biên soạn.

`word-corrections.json` lưu hiệu chỉnh nghĩa/loại từ/IPA có tham chiếu Cambridge. Không sửa `words.json`, `words-source.json` hoặc báo cáo trích PDF. Cả preview và seed dùng chung `enrichWordData`; database vẫn upsert bằng khóa gốc, không đổi id. Schema thêm cột bằng migration `20261022_bilingual_examples.sql`, không reset dữ liệu học.

## Đối chiếu Cambridge

- [adhere to](https://dictionary.cambridge.org/us/dictionary/english/adhere-to): nguồn in sai `adhear to`.
- [conducive](https://dictionary.cambridge.org/dictionary/english/conducive) và [conductive](https://dictionary.cambridge.org/dictionary/english/conductive): phân biệt tạo điều kiện thuận lợi với dẫn điện/nhiệt.
- [assurance](https://dictionary.cambridge.org/us/dictionary/english/assurance): danh từ.
- [tedious](https://dictionary.cambridge.org/dictionary/english/tedious): tính từ.
- [decade](https://dictionary.cambridge.org/dictionary/english/decade): danh từ.
- [occupy](https://dictionary.cambridge.org/dictionary/english/occupy): động từ.
- [action](https://dictionary.cambridge.org/dictionary/english/action): làm rõ khác với acting.
- [look forward to](https://dictionary.cambridge.org/grammar/british-grammar/look-forward-to): sau to dùng danh từ hoặc V-ing.
- [directory](https://dictionary.cambridge.org/dictionary/english/directory): danh bạ/danh mục.
- [profession](https://dictionary.cambridge.org/us/dictionary/english/profession): nghề nghiệp/giới chuyên môn.
- [spectrum](https://dictionary.cambridge.org/dictionary/english/spectrum): quang phổ/dải/phạm vi.

## Kiểm tra và cập nhật

```sh
npm run seed:sql
npm test
npm run typecheck
npm run build
```

Kiểm thử kiểm tra bao phủ đúng 596 khóa, không trùng câu, đủ bản dịch, mọi câu có đáp án tạo được chỗ trống, giữ nguyên dữ liệu nguồn và khóa seed. Kiểm thử UI kiểm tra hiển thị Anh–Việt và mở bài điền từ. Chỉnh câu trong `examples.json`, tạo lại seed rồi upsert; không chỉnh kết quả trích PDF để giả làm nội dung nguồn.
