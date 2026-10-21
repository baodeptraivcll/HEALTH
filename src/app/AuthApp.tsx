'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '../lib/supabaseClient';
import { createStudyRepository } from '../lib/study-repository';
import StudyApp from './StudyApp';

export default function AuthApp() {
  const [db] = useState(createSupabaseClient);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const repository = useMemo(() => db && user ? createStudyRepository(db,user.id) : null,[db,user]);

  useEffect(() => {
    if (!db) {
      setMessage('Chưa cấu hình kết nối Supabase.');
      setLoading(false);
      return;
    }
    let alive = true;
    let authChanged = false;
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (alive) { setUser(session?.user ?? null); setLoading(false); }
    });
    void db.auth.getSession().then(({ data, error }) => {
      if (!alive || authChanged) return;
      if (error) setMessage(error.message);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch((error: unknown) => {
      if (alive && !authChanged) { setMessage(error instanceof Error ? error.message : 'Không thể tải phiên đăng nhập.'); setLoading(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [db]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    setBusy(true);
    setMessage('Đang kết nối…');
    try {
      const result = signUp
        ? await db.auth.signUp({ email, password, options: { data: { full_name: String(fields.get('name') ?? '').trim() }, emailRedirectTo: window.location.origin } })
        : await db.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      (form.elements.namedItem('password') as HTMLInputElement).value = '';
      setUser(result.data.session?.user ?? null);
      setMessage(result.data.session ? '' : 'Kiểm tra email để xác nhận tài khoản, rồi đăng nhập.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đăng nhập. Hãy thử lại.');
    } finally { setBusy(false); }
  }

  async function logout() {
    if (!db || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đăng xuất. Hãy thử lại.');
    } finally { setBusy(false); }
  }

  if (loading) return <main className="auth-screen"><p role="status">Đang tải phiên đăng nhập…</p></main>;
  if (user && repository) return <><StudyApp key={user.id} repository={repository} userName={user.user_metadata.full_name || user.email || 'Bạn'} onLogout={() => void logout()} logoutBusy={busy} />{message && <p className="auth-notice" role="alert">{message}</p>}</>;
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand">TOEIC 600.</div>
        <p className="eyebrow">TỪNG TỪ MỘT, MỖI NGÀY.</p>
        <h1>{signUp ? 'Tạo tài khoản.' : 'Chào bạn trở lại.'}</h1>
        <p>Không gian học và ghi nhớ từ vựng TOEIC của bạn.</p>
        <form onSubmit={submit}>
          {signUp && <label>Tên của bạn<input name="name" maxLength={60} autoComplete="name" required disabled={busy} /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" disabled={busy} /></label>
          <label>Mật khẩu<input name="password" type="password" minLength={8} required autoComplete={signUp ? 'new-password' : 'current-password'} disabled={busy} /></label>
          <p role="status" aria-live="polite">{message}</p>
          <button className="primary" type="submit" disabled={busy || !db}>{busy ? 'Đang xử lý…' : signUp ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
        </form>
        <button className="text-button" disabled={busy} onClick={() => { setSignUp(!signUp); setMessage(db ? '' : 'Chưa cấu hình kết nối Supabase.'); }}>{signUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button>
        <a className="preview-link" href="/preview">Xem thử giao diện và học ngay →</a>
      </section>
    </main>
  );
}
