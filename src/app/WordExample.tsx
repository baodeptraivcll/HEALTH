import type { Word } from '../lib/study-types';

export default function WordExample({word}:{word:Word}) {
  if (!word.example) return <span className="example-pair">Chưa có câu ví dụ cho từ này.</span>;
  return <span className="example-pair">
    <span className="example-label">VÍ DỤ ANH – VIỆT</span>
    <span className="example-en" lang="en">{word.example}</span>
    {word.example_vi && <span className="example-vi" lang="vi">{word.example_vi}</span>}
    {word.example_source==='original' && <span className="example-credit">Ví dụ tự biên soạn · Bản dịch tiếng Việt</span>}
    {word.source_note && <span className="example-correction">{word.source_note}</span>}
  </span>;
}
