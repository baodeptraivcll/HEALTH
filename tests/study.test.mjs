import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProgress, scheduleReview, dailyQueue, dashboardStats, blankExample, eligibleFillWords, normalizeAnswer, quizOptions, localDate } from '../src/lib/study.ts';

const now = new Date('2026-10-21T05:00:00Z');
const word = id => ({ id, word: `word${id}`, ipa: null, pos: 'n', meaning_vi: `nghĩa ${id}`, example: null, topic: 'Chủ đề', order_index: id });
test('SM-2 learns at 1, 6 and 15 days; forgetting resets repetitions and mistakes immediately', () => {
  let p = defaultProgress(1);
  p = scheduleReview(p, 4, now);
  assert.equal(p.interval_days, 1);
  p = scheduleReview(p, 4, now);
  assert.equal(p.interval_days, 6);
  p = scheduleReview(p, 4, now);
  assert.equal(p.interval_days, 15);
  assert.equal(p.status, 'mastered');
  p = scheduleReview({ ...p, correct_streak: 2 }, 0, now);
  assert.equal(p.repetitions, 0);
  assert.equal(p.interval_days, 1);
  assert.equal(p.correct_streak, 0);
  assert.equal(p.in_mistakes, true);
  assert.equal(p.status, 'learning');
});
test('correct answers cannot advance cross-session mistake streak in scheduler', () => {
  const p = scheduleReview({ ...defaultProgress(1), in_mistakes: true, correct_streak: 2 }, 5, now);
  assert.equal(p.correct_streak, 2);
  assert.equal(p.in_mistakes, true);
  assert.throws(() => scheduleReview(p, 2, now));
});
test('daily queue prioritizes mistakes then due then new and respects first-review daily quota', () => {
  const words = [1,2,3,4,5].map(word);
  const p = [
    { ...defaultProgress(3), in_mistakes: true, wrong_count: 5, status: 'learning', next_review_at: '2099-01-01' },
    { ...defaultProgress(2), status: 'learning', next_review_at: '2026-10-20T00:00:00Z' },
    { ...defaultProgress(5), status: 'learning', first_reviewed_at: now.toISOString(), next_review_at: '2099-01-01' },
  ];
  assert.deepEqual(dailyQueue(words, p, 2, now).map(w => w.id), [3,2,1]);
});
test('quiz choices never repeat the answer or identical meanings, and do not invent examples', () => {
  const w = word(1);
  const options = quizOptions(w, [w, word(2), { ...word(3), meaning_vi: w.meaning_vi }, word(4), word(5)]);
  assert.equal(options.filter(o => o.id === 1).length, 1);
  assert.equal(new Set(options.map(o => o.meaning_vi)).size, options.length);
  assert.deepEqual(eligibleFillWords([w]), []);
  assert.equal(blankExample(w), null);
  assert.equal(blankExample({ ...w, word: 'report', example: 'The report is ready.' }), 'The _____ is ready.');
  assert.equal(normalizeAnswer('  THỎA thuận '), 'thoa thuan');
});
test('statistics use completed sessions, local dates, real accuracy and streak', () => {
  const sessions = [
    { date: '2026-10-21', correct: 3, wrong: 1, words_studied: 3, completed_at: now.toISOString() },
    { date: '2026-10-20', correct: 2, wrong: 0, words_studied: 2, completed_at: now.toISOString() },
    { date: '2026-10-19', correct: 100, wrong: 0, words_studied: 100, completed_at: null },
  ];
  const s = dashboardStats([word(1)], [{ ...defaultProgress(1), status: 'mastered', in_mistakes: true, wrong_count: 4 }], sessions, now);
  assert.equal(s.streak, 2);
  assert.equal(s.accuracy, 83);
  assert.equal(s.mastered, 1);
  assert.equal(s.mistakes, 1);
  assert.equal(s.chart.length, 7);
  assert.equal(s.topMistakes[0].word.id, 1);
  assert.equal(localDate(new Date('2026-10-20T18:00:00Z')), '2026-10-21');
});
