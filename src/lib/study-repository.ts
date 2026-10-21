import type { SupabaseClient } from '@supabase/supabase-js';
import type { Answer, MistakeLog, Progress, Settings, Snapshot, StudyRepository, StudySession, Word } from './study-types.ts';
import { defaultProgress, localDate, scheduleReview } from './study.ts';
import { normalizeStudyWord } from './word-examples.mjs';

export const defaultSettings = (userId: string): Settings => ({user_id:userId,new_words_per_day:15,tts_enabled:true,theme:'light'});

function failure(error: {message:string;code?:string} | null) {
  if (!error) return;
  if (['42P01','PGRST202','PGRST205'].includes(error.code || '')) throw new Error('Database học từ vựng chưa được khởi tạo. Hãy chạy migration và seed theo README, hoặc mở bản xem thử.');
  throw new Error(error.message);
}

export function createStudyRepository(db: SupabaseClient, userId: string): StudyRepository {
  async function rows<T>(table: string, owner = true): Promise<T[]> {
    const result: T[] = [];
    for (let from = 0; ; from += 1000) {
      let query = db.from(table).select('*');
      if (owner) query = query.eq('user_id', userId);
      const {data,error} = await query.order(table === 'user_word_progress' ? 'word_id' : table === 'user_settings' ? 'user_id' : 'id').range(from,from+999);
      failure(error);
      result.push(...(data || []) as T[]);
      if (!data || data.length < 1000) return result;
    }
  }
  async function rpc(name: string, args?: Record<string,unknown>) {
    const {data,error} = await db.rpc(name,args); failure(error); return data;
  }
  return {
    async load() {
      const [words,progress,sessions,settings,mistakes] = await Promise.all([
        rows<Word>('words',false),rows<Progress>('user_word_progress'),rows<StudySession>('study_sessions'),rows<Settings>('user_settings'),rows<MistakeLog>('mistake_log'),
      ]);
      return {words:words.map(normalizeStudyWord).sort((a,b)=>a.order_index-b.order_index),progress,sessions,settings:settings[0] || defaultSettings(userId),mistakes};
    },
    async startSession() { const data = await rpc('start_study_session'); return (Array.isArray(data)?data[0]:data) as StudySession; },
    async answer(a) { await rpc('record_study_answer',{p_session_id:a.session_id,p_word_id:a.word_id,p_mode:a.mode,p_rating:a.rating,p_user_answer:a.user_answer,p_event_id:a.event_id}); },
    async finishSession(id,duration) { await rpc('finish_study_session',{p_session_id:id,p_duration_sec:duration}); },
    async markMistake(id,marked) { await rpc('set_word_mistake',{p_word_id:id,p_marked:marked}); },
    async saveSettings(settings) {
      if (settings.user_id !== userId) throw new Error('Cài đặt không thuộc tài khoản hiện tại.');
      const {error} = await db.from('user_settings').upsert(settings,{onConflict:'user_id'}); failure(error);
    },
  };
}

type PreviewEvent = Answer & {created_at:string};
type PreviewState = {version:1;progress:Progress[];sessions:StudySession[];settings:Settings;mistakes:MistakeLog[];events:PreviewEvent[]};
type StorageLike = Pick<Storage,'getItem'|'setItem'>;
export const PREVIEW_STORAGE_KEY = 'toeic600.preview.v1';

export function createPreviewRepository(words: Word[], storage?: StorageLike): StudyRepository {
  const userId = 'preview';
  function getStorage() { return storage || window.localStorage; }
  function read(): PreviewState {
    const raw = getStorage().getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return {version:1,progress:[],sessions:[],settings:defaultSettings(userId),mistakes:[],events:[]};
    const state = JSON.parse(raw) as PreviewState;
    if (state.version !== 1 || !Array.isArray(state.progress) || !Array.isArray(state.sessions) || !Array.isArray(state.events) || !Array.isArray(state.mistakes) || !state.settings) throw new Error('Dữ liệu xem thử không hợp lệ. Hãy xoá dữ liệu trang xem thử trong trình duyệt để bắt đầu lại.');
    return state;
  }
  function write(state: PreviewState) { getStorage().setItem(PREVIEW_STORAGE_KEY,JSON.stringify(state)); }
  function session(state: PreviewState,id:string) {
    const s = state.sessions.find(row=>row.id===id);
    if (!s) throw new Error('Không tìm thấy buổi học.'); return s;
  }
  function progress(state: PreviewState,wordId:number) {
    if (!words.some(w=>w.id===wordId)) throw new Error('Không tìm thấy từ vựng.');
    let p = state.progress.find(row=>row.word_id===wordId);
    if (!p) {p=defaultProgress(wordId,userId);state.progress.push(p);} return p;
  }
  return {
    async load(): Promise<Snapshot> { const state=read(); return {words,...state}; },
    async startSession() {
      const state=read(),now=new Date();
      const s:StudySession={id:crypto.randomUUID(),user_id:userId,date:localDate(now),words_studied:0,correct:0,wrong:0,duration_sec:0,completed_at:null,created_at:now.toISOString()};
      state.sessions.push(s);write(state);return s;
    },
    async answer(a) {
      if (![0,3,4,5].includes(a.rating) || !['flashcard','quiz_meaning','quiz_fill','quiz_listen'].includes(a.mode) || (a.user_answer?.length || 0)>1000) throw new Error('Câu trả lời không hợp lệ.');
      const state=read(),s=session(state,a.session_id);
      const duplicate=state.events.find(e=>e.event_id===a.event_id);
      if (duplicate) {
        if (['session_id','word_id','mode','rating','user_answer'].every(key=>duplicate[key as keyof Answer]===a[key as keyof Answer])) return;
        throw new Error('Mã câu trả lời đã được sử dụng.');
      }
      if (s.completed_at) throw new Error('Buổi học đã kết thúc.');
      const p=progress(state,a.word_id),now=new Date();
      if (!state.events.some(e=>e.session_id===s.id && e.word_id===a.word_id)) s.words_studied++;
      state.progress[state.progress.indexOf(p)]=scheduleReview(p,a.rating,now);
      state.events.push({...a,created_at:now.toISOString()});
      if (a.rating===0) {
        s.wrong++;
        state.mistakes.push({id:crypto.randomUUID(),user_id:userId,word_id:a.word_id,mode:a.mode,user_answer:a.user_answer,created_at:now.toISOString()});
      } else s.correct++;
      write(state);
    },
    async finishSession(id,duration) {
      if (!Number.isInteger(duration) || duration<0 || duration>86400) throw new Error('Thời lượng không hợp lệ.');
      const state=read(),s=session(state,id);
      if (s.completed_at) return;
      if (!s.words_studied) throw new Error('Buổi học chưa có câu trả lời.');
      const events=state.events.filter(e=>e.session_id===id);
      for (const wordId of new Set(events.map(e=>e.word_id))) {
        const answers=events.filter(e=>e.word_id===wordId),p=progress(state,wordId);
        if (answers.every(e=>e.rating>=3) && answers.every(e=>!p.last_wrong_at || new Date(e.created_at).getTime()>new Date(p.last_wrong_at).getTime())) {
          p.correct_streak++;p.last_correct_session_id=id;
          if (p.correct_streak>=3) p.in_mistakes=false;
        }
      }
      s.completed_at=new Date().toISOString();s.duration_sec=duration;write(state);
    },
    async markMistake(id,marked) { const state=read(),p=progress(state,id);p.in_mistakes=marked;p.correct_streak=0;write(state); },
    async saveSettings(settings) {
      if (settings.user_id!==userId || !Number.isInteger(settings.new_words_per_day) || settings.new_words_per_day<1 || settings.new_words_per_day>100 || !['light','dark'].includes(settings.theme) || typeof settings.tts_enabled!=='boolean') throw new Error('Cài đặt không hợp lệ.');
      const state=read();state.settings=settings;write(state);
    },
  };
}
