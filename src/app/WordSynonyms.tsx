import type { Word } from '../lib/study-types';
import { formatPartOfSpeech } from '../lib/study';

export default function WordSynonyms({word}:{word:Word}) {
 return <span className="word-synonyms"><span className="example-label">TỪ ĐỒNG NGHĨA THEO NGỮ CẢNH</span>
  {word.synonyms?.length ? word.synonyms.map(s=><span className="synonym-item" key={s.term}>
   <span><strong lang="en">{s.term}</strong> <span className="synonym-pos">({formatPartOfSpeech(s.pos)})</span> — {s.meaning_vi}</span>
   {s.relation==='near'&&<span className="synonym-note">Gần nghĩa: {s.note_vi}</span>}
  </span>) : <span className="synonym-note">Chưa có từ đồng nghĩa phù hợp với nghĩa đang học.</span>}
 </span>;
}
