import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TOEIC 600 — Học và ghi nhớ', description: 'Học và ghi nhớ 600 từ vựng TOEIC mỗi ngày, bằng tiếng Việt.' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
