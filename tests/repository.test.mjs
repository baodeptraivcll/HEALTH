import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewRepository } from '../src/lib/study-repository.ts';

const words=[{id:1,word:'agreement',ipa:null,pos:'n',meaning_vi:'sự thỏa thuận',example:null,topic:'CONTRACTS',order_index:1}];
function setup() {
  const memory=new Map();
  const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  return createPreviewRepository(words,storage);
}
const answer=(s,rating=4,event=crypto.randomUUID())=>({session_id:s.id,word_id:1,mode:'flashcard',rating,user_answer:null,event_id:event});

test('replaying a successful event does not increment persisted counts; conflicting payload rejects', async () => {
  const repo=setup(),s=await repo.startSession(),a=answer(s,0);
  await repo.answer(a);await repo.answer(a);
  const data=await repo.load();
  assert.equal(data.progress[0].wrong_count,1);
  assert.equal(data.mistakes.length,1);
  assert.equal(data.sessions[0].words_studied,1);
  await assert.rejects(repo.answer({...a,rating:5}),/đã được sử dụng/);
});
test('mistake graduates only after three completed all-correct sessions, not repeated answers', async t => {
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-21T05:00:00Z')});
  const repo=setup();
  let s=await repo.startSession();await repo.answer(answer(s,0));await repo.finishSession(s.id,1);
  for(let i=1;i<=3;i++) {
    t.mock.timers.tick(1000);
    s=await repo.startSession();
    await repo.answer(answer(s));await repo.answer(answer(s));await repo.answer(answer(s));
    assert.equal((await repo.load()).progress[0].correct_streak,i-1);
    await repo.finishSession(s.id,1);await repo.finishSession(s.id,1);
    const p=(await repo.load()).progress[0];
    assert.equal(p.correct_streak,i);assert.equal(p.in_mistakes,i<3);
  }
  t.mock.timers.tick(1000);
  s=await repo.startSession();await repo.answer(answer(s,0));
  assert.equal((await repo.load()).progress[0].correct_streak,0);
  assert.equal((await repo.load()).progress[0].in_mistakes,true);
});
test('one wrong answer blocks graduation for that session and empty sessions cannot finish', async () => {
  const repo=setup(),s=await repo.startSession();
  await assert.rejects(repo.finishSession(s.id,1),/chưa có/);
  await repo.answer(answer(s,0));await repo.answer(answer(s,4));await repo.finishSession(s.id,1);
  const data=await repo.load();assert.equal(data.progress[0].correct_streak,0);assert.equal(data.progress[0].in_mistakes,true);
  await assert.rejects(repo.answer(answer(s)),/đã kết thúc/);
});
test('manual mistakes and valid settings persist without server access', async () => {
  const repo=setup();await repo.markMistake(1,true);
  let data=await repo.load();assert.equal(data.progress[0].in_mistakes,true);
  await repo.saveSettings({...data.settings,theme:'dark',new_words_per_day:10,tts_enabled:false});
  data=await repo.load();assert.equal(data.settings.theme,'dark');assert.equal(data.settings.new_words_per_day,10);
  await repo.markMistake(1,false);assert.equal((await repo.load()).progress[0].in_mistakes,false);
  await assert.rejects(repo.saveSettings({...data.settings,new_words_per_day:0}),/không hợp lệ/);
});
