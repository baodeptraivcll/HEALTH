/**
 * @typedef {{word:string,study_term:string,example_en:string,example_vi:string,example_answer:string,source:string}} Example
 * @typedef {{word:string,pos?:string,meaning_vi?:string,ipa?:string,source_note:string,dictionary_url:string}} Correction
 */

/** @template {{word:string}} T @param {T[]} words @param {Example[]} examples @param {Correction[]} [corrections] */
export function enrichWordData(words,examples,corrections=[]) {
  const sourceKeys=new Set(words.map(w=>w.word));
  const byWord=new Map();
  for(const e of examples) {
    if(byWord.has(e.word))throw new Error(`Trùng ví dụ: ${e.word}`);
    if(!sourceKeys.has(e.word))throw new Error(`Mục từ không có trong nguồn: ${e.word}`);
    for(const key of ['study_term','example_en','example_vi','example_answer','source']) {
      if(typeof e[key]!=='string'||!e[key].trim())throw new Error(`Thiếu ${key}: ${e.word}`);
    }
    if(e.source!=='original')throw new Error(`Nguồn ví dụ không hợp lệ: ${e.word}`);
    if(!e.example_en.toLowerCase().includes(e.example_answer.toLowerCase()))throw new Error(`Đáp án không nằm trong câu ví dụ: ${e.word}`);
    byWord.set(e.word,e);
  }
  const fixes=new Map(corrections.map(c=>[c.word,c]));
  return words.map(w=>{
    const e=byWord.get(w.word);
    if(!e)throw new Error(`Thiếu ví dụ: ${w.word}`);
    const fix=fixes.get(w.word);
    return {...w,...fix,word:w.word,study_term:e.study_term,example:e.example_en,example_vi:e.example_vi,
      example_answer:e.example_answer,example_source:e.source,source_note:fix?.source_note||null,dictionary_url:fix?.dictionary_url||null};
  });
}

/** @template {{word:string,study_term?:string|null,source_word?:string|null}} T @param {T} word */
export function normalizeStudyWord(word) {
  return {...word,source_word:word.source_word||word.word,word:word.study_term||word.word};
}
