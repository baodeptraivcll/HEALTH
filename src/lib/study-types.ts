export type Synonym = {term:string;pos:string;meaning_vi:string;relation:'synonym'|'near';note_vi:string|null};
export type Status = 'new' | 'learning' | 'mastered';
export type Mode = 'flashcard' | 'quiz_meaning' | 'quiz_fill' | 'quiz_listen';
export type Rating = 0 | 3 | 4 | 5;
export type Word = { synonyms?: Synonym[]; id: number; word: string; ipa: string | null; pos: string | null; meaning_vi: string | null; example: string | null; topic: string | null; order_index: number; study_term?: string | null; source_word?: string | null; example_vi?: string | null; example_answer?: string | null; example_source?: string | null; source_note?: string | null; dictionary_url?: string | null };
export type Progress = { user_id: string; word_id: number; status: Status; ease_factor: number; interval_days: number; repetitions: number; next_review_at: string | null; correct_count: number; wrong_count: number; correct_streak: number; in_mistakes: boolean; last_wrong_at: string | null; last_reviewed_at: string | null; last_correct_session_id: string | null; first_reviewed_at?: string | null };
export type StudySession = { id: string; user_id: string; date: string; words_studied: number; correct: number; wrong: number; duration_sec: number; completed_at: string | null; created_at: string };
export type Settings = { user_id: string; new_words_per_day: number; tts_enabled: boolean; theme: 'light' | 'dark' };
export type MistakeLog = { id: string; user_id: string; word_id: number; mode: Mode; user_answer: string | null; created_at: string };
export type Snapshot = { words: Word[]; progress: Progress[]; sessions: StudySession[]; settings: Settings; mistakes: MistakeLog[] };
export type Answer = { session_id: string; word_id: number; mode: Mode; rating: Rating; user_answer: string | null; event_id: string };
export interface StudyRepository {
  load(): Promise<Snapshot>;
  startSession(): Promise<StudySession>;
  answer(answer: Answer): Promise<void>;
  finishSession(sessionId: string, durationSec: number): Promise<void>;
  markMistake(wordId: number, marked: boolean): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
}
