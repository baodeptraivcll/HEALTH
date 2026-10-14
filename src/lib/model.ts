export type Metric = 'count' | 'quantity' | 'minutes' | 'sleep';
export type ItemKind = 'category' | 'habit' | 'navigation';
export type Route = 'today' | 'journal' | 'habits' | 'week';
export interface TrackingItem {
  id: string; user_id: string; kind: ItemKind; name: string; icon: string;
  metric: Metric; unit: string; target: number; overview: boolean; quick: boolean;
  quick_amount: number; position: number; archived: boolean; route: Route;
}
export interface Activity {
  id: string; user_id: string; date: string; time: string; category: string;
  title: string; detail: string; quantity: number; unit: string; minutes: number;
  sleep_start: string | null; sleep_end: string | null; icon: string;
}
const item = (id: string, kind: ItemKind, name: string, icon: string, extra: Partial<TrackingItem> = {}): TrackingItem => ({
  id, user_id: '', kind, name, icon, metric: 'count', unit: 'lần', target: 0,
  overview: false, quick: false, quick_amount: 0, position: 0, archived: false, route: 'today', ...extra,
});
export const defaultItems: TrackingItem[] = [
  item('sleep','category','Giấc ngủ','moon',{metric:'sleep',unit:'phút',target:480,overview:true,quick:true}),
  item('fitness','category','Vận động','dumbbell',{metric:'minutes',unit:'cái',target:45,overview:true,quick:true,position:1}),
  item('food','category','Ăn uống','utensils',{unit:'bữa',target:3,overview:true,quick:true,position:2}),
  item('water','category','Uống nước','droplet',{metric:'quantity',unit:'ml',target:2000,overview:true,quick:true,quick_amount:200,position:3}),
  item('study','category','Học & làm','book-open',{metric:'minutes',unit:'phút',quick:true,position:4}),
  item('rest','category','Nghỉ ngơi / đi chơi','coffee',{position:5}),
  item('move','habit','Vận động ít nhất 30 phút','dumbbell'),
  item('breakfast','habit','Ăn sáng trước 8 giờ','utensils',{position:1}),
  item('read','habit','Đọc sách 15 phút','book-open',{position:2}),
  item('sleep-habit','habit','Đi ngủ trước 23 giờ','moon',{position:3}),
  item('nav-today','navigation','Hôm nay','layout-dashboard',{route:'today'}),
  item('nav-journal','navigation','Nhật ký','notebook-pen',{route:'journal',position:1}),
  item('nav-habits','navigation','Thói quen','list-checks',{route:'habits',position:2}),
  item('nav-week','navigation','Tổng quan tuần','chart-column',{route:'week',position:3}),
];
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function sleepMinutes(start: string, end: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) throw new Error('Giờ ngủ không hợp lệ.');
  const value = (s: string) => Number(s.slice(0,2))*60+Number(s.slice(3));
  return (value(end)-value(start)+1440)%1440;
}
export function itemTotal(item: TrackingItem, rows: Activity[]) {
  const own = rows.filter(row=>row.category===item.id);
  if (item.metric==='count') return own.length;
  return own.reduce((total,row)=>total+Number(item.metric==='quantity'?row.quantity:row.minutes),0);
}
export function metricUnit(item: TrackingItem) { return ['minutes','sleep'].includes(item.metric)?'phút':item.unit; }
export function validateItem(item: TrackingItem) {
  if (!item.name.trim() || item.name.trim().length>100) throw new Error('Tên mục cần từ 1 đến 100 ký tự.');
  if (!item.icon.trim() || item.icon.length>32) throw new Error('Icon cần từ 1 đến 32 ký tự.');
  if (!['category','habit','navigation'].includes(item.kind) || !['count','quantity','minutes','sleep'].includes(item.metric)) throw new Error('Loại mục không hợp lệ.');
  if (!['today','journal','habits','week'].includes(item.route)) throw new Error('Trang liên kết không hợp lệ.');
  if (!Number.isFinite(item.target) || item.target<0 || item.target>1000000 || !Number.isFinite(item.quick_amount) || item.quick_amount<0 || item.quick_amount>100000) throw new Error('Mục tiêu hoặc số lượng không hợp lệ.');
  if (item.unit.length>20) throw new Error('Đơn vị tối đa 20 ký tự.');
  if (!Number.isInteger(item.position) || item.position<0 || item.position>100000) throw new Error('Thứ tự hiển thị không hợp lệ.');
}
export function searchText(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'); }
