import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enrichWordData, normalizeStudyWord } from '../src/lib/word-examples.mjs';
import { blankExample } from '../src/lib/study.ts';

const raw={id:12,word:'adhear to',ipa:null,pos:'v',meaning_vi:'tuân thủ',example:null,topic:'Meetings',order_index:12};
const entry={word:'adhear to',study_term:'adhere to',example_en:'Suppliers must adhere to our safety standards during every delivery.',example_vi:'Nhà cung cấp phải tuân thủ các tiêu chuẩn an toàn của chúng tôi trong mỗi lần giao hàng.',example_answer:'adhere to',source:'original'};
test('enrichment keeps database identity while presenting corrected headword and bilingual examples',()=>{
 const enriched=enrichWordData([raw],[entry]);
 assert.equal(enriched[0].word,'adhear to');
 assert.equal(enriched[0].study_term,'adhere to');
 const shown=normalizeStudyWord(enriched[0]);
 assert.equal(shown.id,12);assert.equal(shown.word,'adhere to');assert.equal(shown.source_word,'adhear to');
 assert.equal(shown.example_vi,entry.example_vi);assert.equal(shown.example_source,'original');
 assert.equal(blankExample(shown),'Suppliers must _____ our safety standards during every delivery.');
 assert.equal(raw.example,null);
});
test('reject missing, duplicate, unmatched or unusable examples instead of silently seeding partial coverage',()=>{
 assert.throws(()=>enrichWordData([raw],[]),/Thiếu/);
 assert.throws(()=>enrichWordData([raw],[entry,entry]),/Trùng/);
 assert.throws(()=>enrichWordData([raw],[{...entry,word:'unknown'}]),/không có/);
 assert.throws(()=>enrichWordData([raw],[{...entry,example_answer:'not present'}]),/câu ví dụ/);
 assert.throws(()=>enrichWordData([raw],[{...entry,example_vi:''}]),/Thiếu/);
});
test('fill blanks use the real surface form for phrases with an inserted object',()=>{
 const w={...raw,word:'accustom someone to',example:'The course will accustom trainees to the new workflow.',example_answer:'accustom trainees to'};
 assert.equal(blankExample(w),'The course will _____ the new workflow.');
});

import { formatPartOfSpeech } from '../src/lib/study.ts';
test('full part-of-speech names preserve multi-class words and missing information',()=>{
 assert.equal(formatPartOfSpeech('n, v'),'Noun — Danh từ · Verb — Động từ');
 assert.equal(formatPartOfSpeech('adj'),'Adjective — Tính từ');
 assert.equal(formatPartOfSpeech(null),'Chưa rõ loại từ');
});
test('synonyms preserve identity and reject incomplete contextual annotations',()=>{
 const synonym={term:'comply with',pos:'v',meaning_vi:'tuân thủ',relation:'near',note_vi:'Thường dùng với quy định.'};
 assert.deepEqual(enrichWordData([raw],[entry],[],[{word:raw.word,synonyms:[synonym]}])[0].synonyms,[synonym]);
 assert.throws(()=>enrichWordData([raw],[entry],[],[{word:raw.word,synonyms:[{...synonym,note_vi:null}]}]),/đồng nghĩa/);
});

test('synonym corpus covers exact source identities with honest near-meaning caveats',async()=>{
 const {readFile}=await import('node:fs/promises');
 const read=async p=>JSON.parse(await readFile(p,'utf8'));
 const source=await read('data/words.json'), examples=await read('data/examples.json'), synonyms=await read('data/synonyms.json');
 assert.deepEqual(synonyms.map(x=>x.word),source.map(x=>x.word));
 const result=enrichWordData(source,examples,await read('data/word-corrections.json'),synonyms);
 assert.equal(result.filter(x=>x.synonyms.length).length,585);
 assert.equal(result.find(x=>x.word==='carrier').pos,'n');assert.equal(result.find(x=>x.word==='invest').pos,'v');
 for(const w of result)for(const s of w.synonyms){assert.notEqual(s.term.toLowerCase(),w.study_term.toLowerCase());if(s.relation==='near')assert.ok(s.note_vi.trim());}
});
