export const categories = { food: 'Ăn uống', fitness: 'Vận động', study: 'Học & làm', rest: 'Nghỉ ngơi / đi chơi', sleep: 'Giấc ngủ', water: 'Uống nước' };
export type Category = keyof typeof categories;
export interface Activity {
  id: string; user_id: string; date: string; time: string; category: Category;
  title: string; detail: string; quantity: number; unit: string; minutes: number;
  sleep_start: string | null; sleep_end: string | null;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function sleepMinutes(start: string, end: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) throw new Error('Giờ ngủ không hợp lệ.');
  const value = (s: string) => Number(s.slice(0,2))*60+Number(s.slice(3));
  return (value(end)-value(start)+1440)%1440;
}
export function summary(rows: Activity[]) {
  return {
    sleep: rows.filter(r=>r.category==='sleep').reduce((n,r)=>n+r.minutes,0),
    fitness: rows.filter(r=>r.category==='fitness').reduce((n,r)=>n+r.minutes,0),
    meals: rows.filter(r=>r.category==='food').length,
    water: rows.filter(r=>r.category==='water').reduce((n,r)=>n+r.quantity,0),
  };
}
