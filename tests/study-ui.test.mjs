import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as study from '../src/lib/study.ts';
import { createPreviewRepository } from '../src/lib/study-repository.ts';

const require=createRequire(import.meta.url);
const compiled=ts.transpileModule(fs.readFileSync('src/app/StudyApp.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
const exampleExports={};
const exampleCompiled=ts.transpileModule(fs.readFileSync('src/app/WordExample.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','exports',exampleCompiled)(require,exampleExports);
new Function('require','exports',compiled)(id=>id.endsWith('.css')?{}:id==='../lib/study'?study:id==='./WordExample'?exampleExports:require(id),exports);
const words=Array.from({length:4},(_,i)=>({id:i+1,word:`word${i+1}`,ipa:null,pos:'n',meaning_vi:`nghĩa ${i+1}`,example:null,topic:'Chủ đề',order_index:i+1}));
function repository(size=4,studyWords=words) {const values=new Map();return createPreviewRepository(studyWords.slice(0,size),{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)});}
const button=text=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().includes(text));
async function click(element) {assert.ok(element,'Expected UI element');await act(async()=>element.click());}
async function mount(repo) {
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost:3000/preview'});
  const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'];
  const old=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
  keys.forEach(k=>Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:k==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[k]}));
  const root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(exports.default,{repository:repo,userName:'Bạn',preview:true})));
  return {dom,async close(){await act(async()=>root.unmount());dom.window.close();keys.forEach((k,i)=>old[i]?Object.defineProperty(globalThis,k,old[i]):delete globalThis[k]);}};
}

test('stored last flashcard cannot be answered twice when completion fails; retry preserves counts',async()=>{
  const repo=repository(1),finish=repo.finishSession;let attempts=0;
  repo.finishSession=async(...args)=>{if(++attempts===1)throw new Error('Mạng gián đoạn');return finish(...args);};
  const view=await mount(repo);
  try {
    await click(button('Bắt đầu học'));await click(document.querySelector('.flashcard'));await click(document.querySelector('.rating-0'));
    assert.match(document.body.textContent,/Mạng gián đoạn/);
    assert.equal(document.querySelector('.rating-0'),null);
    assert.equal((await repo.load()).progress[0].wrong_count,1);
    await click(button('Thử kết thúc phiên lại'));
    assert.ok(document.querySelector('.summary-view'));
    assert.equal((await repo.load()).sessions[0].wrong,1);
    assert.equal(document.querySelector('.summary-counts strong').textContent,'1');
    await click(button('Luyện lại từ sai'));assert.ok(document.querySelector('.flashcard'));
  } finally {await view.close();}
});
test('fill mode explains absent source examples and does not start a fake exercise',async()=>{
  const repo=repository(),view=await mount(repo);
  try {
    await click(button('Điền từ'));
    assert.match(document.body.textContent,/tài liệu PDF gốc không có câu ví dụ/);
    assert.equal(button('Bắt đầu học').disabled,true);
    assert.equal((await repo.load()).sessions.length,0);
  } finally {await view.close();}
});
test('meaning quiz saves chosen meaning and shows immediate correct answer',async()=>{
  const repo=repository(),view=await mount(repo);
  try {
    await click(button('Chọn nghĩa'));await click(button('Bắt đầu học'));
    const wrong=Array.from(document.querySelectorAll('.quiz-options button')).find(b=>!b.textContent.includes('nghĩa 1'));
    await click(wrong);
    assert.match(document.querySelector('.answer-feedback').textContent,/word1.*nghĩa 1/);
    const data=await repo.load();assert.equal(data.mistakes.length,1);assert.match(data.mistakes[0].user_answer,/^nghĩa [234]$/);
    await click(button('Kết thúc'));assert.ok(document.querySelector('.summary-view'));
  } finally {await view.close();}
});
test('manual word marking opens mistakes controls; settings persist dark mode',async()=>{
  const repo=repository(),view=await mount(repo);
  try {
    await click(button('Danh sách'));
    await click(document.querySelector('[aria-label="Thêm vào sổ từ sai: word1"]'));
    await click(Array.from(document.querySelectorAll('.bottom-nav button')).find(b=>b.textContent==='Từ sai'));
    assert.ok(document.querySelector('[aria-label="Chế độ ôn từ sai"]'));
    assert.ok(document.querySelector('[aria-label="Số từ ôn từ sai"]'));
    assert.equal(document.querySelectorAll('.word-row').length,1);
    await click(document.querySelector('[aria-label="Cài đặt"]'));await click(button('Tối'));
    assert.equal((await repo.load()).settings.theme,'dark');assert.ok(document.querySelector('.study-dark'));
  } finally {await view.close();}
});

test('bilingual examples show on flashcards and fill mode uses a grammatical surface target',async()=>{
  const bilingual={...words[0],word:'lock someone into',example:'The agreement will lock us into a two-year lease.',example_vi:'Thỏa thuận sẽ ràng buộc chúng tôi vào hợp đồng thuê hai năm.',example_answer:'lock us into',example_source:'original'};
  const view=await mount(repository(1,[bilingual]));
  try {
    await click(button('Điền từ'));assert.equal(button('Bắt đầu học').disabled,false);await click(button('Bắt đầu học'));
    assert.match(document.querySelector('.quiz-question').textContent,/The agreement will _____ a two-year lease/);
    assert.match(document.querySelector('[lang=vi]').textContent,/Thỏa thuận/);
    await click(button('Kết thúc'));await click(button('Thẻ ghi nhớ'));await click(button('Bắt đầu học'));await click(document.querySelector('.flashcard'));
    assert.equal(document.querySelector('.example-en').textContent,bilingual.example);
    assert.equal(document.querySelector('.example-vi').textContent,bilingual.example_vi);
    assert.match(document.querySelector('.example-credit').textContent,/tự biên soạn/);
  } finally {await view.close();}
});
