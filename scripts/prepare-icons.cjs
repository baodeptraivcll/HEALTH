const fs = require('node:fs');
const {createElement} = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const lucide = require('lucide-react');
const groups = [
 ['Ăn uống', [ ['Utensils','Ăn uống'],['Egg','Trứng'],['Apple','Trái cây'],['Carrot','Rau củ'],['Beef','Thịt'],['Fish','Cá'],['Milk','Sữa'],['Coffee','Cà phê'],['CupSoda','Đồ uống'],['CookingPot','Nấu ăn'] ]],
 ['Sức khỏe', [ ['HeartPulse','Nhịp tim'],['Stethoscope','Khám bệnh'],['Pill','Thuốc'],['Bandage','Sơ cứu'],['Thermometer','Nhiệt độ'],['Hospital','Bệnh viện'],['Droplet','Uống nước'],['Scale','Cân nặng'] ]],
 ['Thể thao', [ ['Dumbbell','Tập gym hít đất'],['Footprints','Đi bộ chạy bộ'],['Bike','Đạp xe'],['Waves','Bơi lội'],['Medal','Thành tích'],['Trophy','Thi đấu'],['Timer','Bấm giờ'],['StretchHorizontal','Giãn cơ'] ]],
 ['Ngủ & tinh thần', [ ['Moon','Giấc ngủ'],['BedDouble','Nghỉ ngơi'],['Sun','Buổi sáng'],['Brain','Tinh thần'],['Smile','Vui vẻ'],['Frown','Buồn'],['Wind','Hít thở'],['Sparkles','Chăm sóc bản thân'] ]],
 ['Học & làm', [ ['BookOpen','Học đọc sách'],['GraduationCap','Trường học'],['NotebookPen','Nhật ký ghi chép'],['Pencil','Viết'],['BriefcaseBusiness','Công việc'],['Laptop','Máy tính'],['Presentation','Thuyết trình'],['Languages','Ngoại ngữ'] ]],
 ['Gia đình', [ ['House','Nhà cửa'],['Baby','Chăm con'],['Dog','Thú cưng'],['Cat','Mèo'],['ShoppingBasket','Đi chợ'],['Shirt','Giặt đồ'],['Paintbrush','Trang trí'],['Wrench','Sửa chữa'] ]],
 ['Đi lại', [ ['Car','Ô tô'],['Bus','Xe buýt'],['TrainFront','Tàu'],['Plane','Du lịch'],['MapPin','Địa điểm'],['Compass','Khám phá'],['Mountain','Leo núi'],['Tent','Cắm trại'] ]],
 ['Giải trí', [ ['Music','Âm nhạc'],['Headphones','Nghe nhạc'],['Film','Xem phim'],['Gamepad2','Chơi game'],['Camera','Chụp ảnh'],['Palette','Vẽ'],['Ticket','Sự kiện'],['PartyPopper','Đi chơi tiệc'] ]],
 ['Tài chính', [ ['Wallet','Ví tiền'],['Coins','Tiết kiệm'],['CreditCard','Chi tiêu'],['Receipt','Hóa đơn'],['ShoppingBag','Mua sắm'],['Landmark','Ngân hàng'] ]],
 ['Quan hệ', [ ['Users','Bạn bè'],['Heart','Tình yêu'],['MessageCircle','Trò chuyện'],['Phone','Gọi điện'],['Gift','Quà tặng'],['Handshake','Gặp gỡ'] ]],
 ['Thiên nhiên', [ ['TreePine','Cây xanh'],['Flower2','Hoa'],['Leaf','Môi trường'],['Sprout','Trồng cây'],['CloudSun','Thời tiết'],['Sunrise','Bình minh'] ]],
 ['Tổ chức', [ ['LayoutDashboard','Tổng quan'],['ListChecks','Thói quen'],['ChartColumn','Thống kê'],['CalendarDays','Lịch'],['Check','Hoàn thành'],['Target','Mục tiêu'],['Flag','Kế hoạch'],['Star','Ưu tiên'],['Lightbulb','Ý tưởng'],['CirclePlus','Mục khác'] ]],
];
const catalog = groups.flatMap(([group,icons])=>icons.map(([component,name])=>{
 if (!lucide[component]) throw new Error('Missing icon '+component);
 const id=component.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();
 return {id,name,group,svg:renderToStaticMarkup(createElement(lucide[component],{'aria-hidden':true,width:20,height:20,strokeWidth:1.6}))};
}));
fs.writeFileSync('src/lib/icon-catalog.ts','// Icons: Lucide, ISC license; see ICONS-LICENSE.txt.\nexport const iconCatalog = '+JSON.stringify(catalog)+';\n');
fs.copyFileSync('node_modules/lucide-react/LICENSE','ICONS-LICENSE.txt');
console.log('Generated '+catalog.length+' icons in '+groups.length+' groups.');
