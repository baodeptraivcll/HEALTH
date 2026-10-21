import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichWordData,normalizeStudyWord} from '../src/lib/word-examples.mjs';
import {eligibleFillWords,blankExample} from '../src/lib/study.ts';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/${name}`,import.meta.url),'utf8'));
const source=read('words.json'),examples=read('examples.json'),corrections=read('word-corrections.json');
const words=enrichWordData(source,examples,corrections).map((w,i)=>normalizeStudyWord({...w,id:i+1}));

test('all 596 words have unique original English examples, Vietnamese translations and valid fill targets',()=>{
 assert.equal(examples.length,596);assert.equal(new Set(examples.map(e=>e.word)).size,596);
 assert.equal(new Set(examples.map(e=>e.example_en)).size,596);
 assert.equal(eligibleFillWords(words).length,596);
 for(const w of words){
  assert.ok(w.example.length>=25,w.word);assert.match(w.example_vi,/[À-ỹ]/u,w.word);
  assert.equal(w.example_source,'original');
  assert.ok(blankExample(w).includes('_____'),w.word);
  const escaped=w.example_answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.doesNotMatch(blankExample(w),new RegExp(`(^|[^a-zA-Z])${escaped}(?=$|[^a-zA-Z])`,'i'),w.word);
 }
});
test('source extraction is unchanged and enriched seed keeps all original identity keys',()=>{
 source.forEach((w,i)=>{assert.equal(w.example,null);assert.equal(words[i].source_word,w.word);assert.equal(words[i].id,i+1);});
 assert.equal(words.find(w=>w.source_word==='adhear to').word,'adhere to');
 assert.equal(words.find(w=>w.source_word==='conductive').word,'conducive');
 assert.equal(words.find(w=>w.word==='assurance').pos,'n');
 assert.equal(words.find(w=>w.word==='decade').pos,'n');
 for(const fix of corrections)assert.ok(fix.dictionary_url.startsWith('https://dictionary.cambridge.org/'));
});
test('generated seed includes English/Vietnamese/provenance and preserves stable word conflict keys',()=>{
 const sql=fs.readFileSync(new URL('../supabase/seed.sql',import.meta.url),'utf8');
 assert.match(sql,/study_term, example_vi, example_answer, example_source/);
 for(const w of words){assert.ok(sql.includes(w.example.replaceAll("'","''")));assert.ok(sql.includes(w.example_vi.replaceAll("'","''")));}
 assert.match(sql,/on conflict \(word\) do update/);
 assert.doesNotMatch(sql,/delete from|truncate|drop table/i);
});
