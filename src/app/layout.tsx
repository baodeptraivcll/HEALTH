import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Nếp — Một ngày có nhịp', description: 'Nhật ký sinh hoạt, dinh dưỡng, vận động và giấc ngủ của bạn.' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
