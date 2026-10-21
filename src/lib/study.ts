import type { Progress, Rating, StudySession, Word } from './study-types.ts';

export function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function defaultProgress(wordId: number, userId = ''): Progress {
  return { user_id: userId, word_id: wordId, status: 'new', ease_factor: 2.5, interval_days: 0, repetitions: 0,
    next_review_at: null, correct_count: 0, wrong_count: 0, correct_streak: 0, in_mistakes: false,
    last_wrong_at: null, last_reviewed_at: null, last_correct_session_id: null, first_reviewed_at: null };
}

export function scheduleReview(progress: Progress, rating: Rating, now = new Date()): Progress {
  if (![0,3,4,5].includes(rating)) throw new Error('Đánh giá không hợp lệ.');
  const correct = rating >= 3;
  const repetitions = correct ? progress.repetitions + 1 : 0;
  const interval = !correct || repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(progress.interval_days * progress.ease_factor));
  const ease = Math.max(1.3, progress.ease_factor + .1 - (5 - rating) * (.08 + (5 - rating) * .02));
  return { ...progress, repetitions, interval_days: interval, ease_factor: Math.round(ease * 100) / 100,
    status: repetitions >= 3 ? 'mastered' : 'learning', next_review_at: new Date(now.getTime() + interval * 86400000).toISOString(),
    correct_count: progress.correct_count + Number(correct), wrong_count: progress.wrong_count + Number(!correct),
    correct_streak: correct ? progress.correct_streak : 0, in_mistakes: progress.in_mistakes || !correct,
    last_wrong_at: correct ? progress.last_wrong_at : now.toISOString(), last_reviewed_at: now.toISOString(),
    first_reviewed_at: progress.first_reviewed_at || now.toISOString() };
}

export function dailyQueue(words: Word[], progress: Progress[], newLimit: number, now = new Date()): Word[] {
  const byId = new Map(progress.map(p => [p.word_id, p]));
  const startedToday = progress.filter(p => p.first_reviewed_at && localDate(new Date(p.first_reviewed_at)) === localDate(now)).length;
  let remaining = Math.max(0, newLimit - startedToday);
  const ordered = [...words].sort((a,b) => a.order_index - b.order_index);
  const mistakes = ordered.filter(w => byId.get(w.id)?.in_mistakes).sort((a,b) => (byId.get(b.id)?.wrong_count || 0) - (byId.get(a.id)?.wrong_count || 0));
  const used = new Set(mistakes.map(w => w.id));
  const due = ordered.filter(w => {
    const p = byId.get(w.id);
    return !used.has(w.id) && p && p.status !== 'new' && p.next_review_at && new Date(p.next_review_at).getTime() <= now.getTime();
  }).sort((a,b) => (byId.get(a.id)?.next_review_at || '').localeCompare(byId.get(b.id)?.next_review_at || ''));
  due.forEach(w => used.add(w.id));
  const fresh = ordered.filter(w => {
    if (used.has(w.id) || (byId.has(w.id) && byId.get(w.id)?.status !== 'new') || remaining <= 0) return false;
    remaining--; return true;
  });
  return [...mistakes, ...due, ...fresh];
}

export function normalizeAnswer(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g,' ').trim();
}
export function topicValues(topic: string | null): string[] { return topic?.split(' | ').map(t => t.trim()).filter(Boolean) || []; }
export function quizOptions(word: Word, words: Word[]): Word[] {
  const options = [word];
  const meanings = new Set([word.meaning_vi]);
  const candidates = words.filter(w => w.id !== word.id && w.meaning_vi);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const w of candidates) {
    if (meanings.has(w.meaning_vi)) continue;
    options.push(w); meanings.add(w.meaning_vi);
    if (options.length === 4) break;
  }
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1)); [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
export function blankExample(word: Word): string | null {
  if (!word.example) return null;
  const escaped = (word.example_answer || word.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-zA-Z])(${escaped})(?=$|[^a-zA-Z])`, 'gi');
  let found = false;
  const result = word.example.replace(pattern, (_match, prefix: string) => { found = true; return prefix + '_____'; });
  return found ? result : null;
}
export function eligibleFillWords(words: Word[]): Word[] { return words.filter(w => blankExample(w) !== null); }

export function dashboardStats(words: Word[], progress: Progress[], sessions: StudySession[], now = new Date()) {
  const completed = sessions.filter(s => s.completed_at && s.words_studied > 0);
  const days = new Set(completed.map(s => s.date));
  const today = localDate(now);
  let cursor = new Date(today + 'T12:00:00+07:00');
  if (!days.has(today)) cursor = new Date(cursor.getTime() - 86400000);
  let streak = 0;
  while (days.has(localDate(cursor))) { streak++; cursor = new Date(cursor.getTime()-86400000); }
  const correct = completed.reduce((n,s) => n+s.correct,0);
  const wrong = completed.reduce((n,s) => n+s.wrong,0);
  const chart = Array.from({length:7},(_,i) => {
    const date = localDate(new Date(new Date(today+'T12:00:00+07:00').getTime()-(6-i)*86400000));
    return {date,count:completed.filter(s=>s.date===date).reduce((n,s)=>n+s.words_studied,0)};
  });
  const byId = new Map(words.map(w=>[w.id,w]));
  const topMistakes = [...progress].filter(p => p.wrong_count>0 && byId.has(p.word_id)).sort((a,b)=>b.wrong_count-a.wrong_count).slice(0,10).map(p=>({word:byId.get(p.word_id)!,progress:p}));
  return { mastered:progress.filter(p=>p.status==='mastered').length, learning:progress.filter(p=>p.status==='learning').length,
    mistakes:progress.filter(p=>p.in_mistakes).length,accuracy:correct+wrong?Math.round(correct/(correct+wrong)*100):0,
    streak,totalStudied:completed.reduce((n,s)=>n+s.words_studied,0),chart,topMistakes };
}

export function formatPartOfSpeech(pos: string | null | undefined): string {
 const names: Record<string,string> = {n:'Noun — Danh từ',v:'Verb — Động từ',adj:'Adjective — Tính từ',a:'Adjective — Tính từ',adv:'Adverb — Trạng từ',prep:'Preposition — Giới từ',conj:'Conjunction — Liên từ',pron:'Pronoun — Đại từ'};
 return pos ? [...new Set(pos.split(/[,/]/).map(p=>p.trim()).filter(Boolean))].map(p=>names[p]||p).join(' · ') : 'Chưa rõ loại từ';
}
