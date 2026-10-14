import type { User } from '@supabase/supabase-js';
import { createSupabaseClient } from './supabaseClient.ts';
import { iconCatalog } from './icon-catalog.ts';
import { localDate, sleepMinutes, itemTotal, metricUnit, validateItem, searchText, type Activity, type TrackingItem, type ItemKind, type Metric, type Route } from './model.ts';

export function initialize(root: HTMLElement, db = createSupabaseClient()) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>('#'+id)!;
  const input = (id: string) => $<HTMLInputElement>(id);
  const select = (id: string) => $<HTMLSelectElement>(id);
  const all = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const text = (id: string, value: string) => { $(id).textContent = value; };
  const hide = (id: string, hidden: boolean) => $(id).classList.toggle('hidden',hidden);
  const activityDialog = $<HTMLDialogElement>('activityDialog');
  const itemDialog = $<HTMLDialogElement>('itemDialog');
  const iconDialog = $<HTMLDialogElement>('iconDialog');
  let user: User | null = null, entries: Activity[] = [], items: TrackingItem[] = [], habits = new Set<string>();
  let selected=localDate(), filter='all', view: Route|'settings'='today', navId='nav-today', settingKind: ItemKind='category';
  let signUp=false, alive=true, busy=false, ready=false, loadVersion=0;
  let editingActivity: string|null=null, activityIcon='', editingItem: TrackingItem|null=null, itemIcon='circle-plus', returnToActivity=false;
  let onPick: ((icon: string)=>void)|null=null, toastTimer: ReturnType<typeof setTimeout>;
  function notify(message: string) {
    if(!alive)return;
    text('toast',message);hide('toast',false);clearTimeout(toastTimer);toastTimer=setTimeout(()=>hide('toast',true),4500);
  }
  function errorText(error: unknown) { return error instanceof Error?error.message:typeof error==='object'&&error&&'message' in error?String(error.message):'Không thể lưu dữ liệu. Hãy thử lại.'; }
  function failure(error: unknown) { notify(errorText(error)); }
  function active(kind: ItemKind) { return items.filter(item=>item.kind===kind&&!item.archived).sort((a,b)=>a.position-b.position||a.name.localeCompare(b.name,'vi')); }
  function category(id: string) { return items.find(item=>item.kind==='category'&&item.id===id); }
  function icon(value: string, className='chosen-icon') {
    const el=document.createElement('span');el.className=className;
    const known=iconCatalog.find(entry=>entry.id===value);
    if(known)el.innerHTML=known.svg;else el.textContent=value||'○';
    return el;
  }
  function button(label: string, action: ()=>void, className='text-button') {
    const el=document.createElement('button');el.type='button';el.className=className;el.textContent=label;el.onclick=action;return el;
  }
  function editButton(name: string, action: ()=>void) {
    const el=button('',action,'mini-action');el.setAttribute('aria-label','Sửa '+name);el.title='Sửa '+name;el.append(icon('pencil',''));return el;
  }
  function empty(parent: HTMLElement, message: string) { const el=document.createElement('p');el.className='empty';el.textContent=message;parent.append(el); }
  function weekDates() {
    const d=new Date(selected+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));
    return Array.from({length:7},(_,i)=>{const day=new Date(d);day.setDate(day.getDate()+i);return localDate(day)});
  }
  function renderNavigation() {
    const nav=$('navigation');nav.replaceChildren();
    for(const item of active('navigation')) {
      const el=button('',()=>setView(item.route,item.id),'');el.dataset.nav=item.id;el.classList.toggle('active',view===item.route&&navId===item.id);
      const label=document.createElement('span');label.textContent=item.name;el.setAttribute('aria-label',item.name);el.title=item.name;el.append(icon(item.icon,''),label);nav.append(el);
    }
  }
  function renderOverview(rows: Activity[]) {
    const parent=$('overview');parent.replaceChildren();
    for(const item of active('category').filter(item=>item.overview)) {
      const card=document.createElement('article');card.className='stat';card.dataset.itemId=item.id;
      const top=document.createElement('div');top.className='stat-top';const label=document.createElement('span');const name=document.createElement('span');name.className='stat-name';name.textContent=item.name;
      label.append(icon(item.icon,''),name);top.append(label,editButton(item.name,()=>openItem(item.kind,item)));
      const total=itemTotal(item,rows), value=document.createElement('div');value.className='stat-value';
      value.textContent=item.metric==='sleep'?`${Math.floor(total/60)}h ${total%60}m`:String(Math.round(total*10)/10);
      if(item.metric!=='sleep'){const unit=document.createElement('small');unit.textContent=metricUnit(item);value.append(unit)}
      const track=document.createElement('div');track.className='track';const progress=document.createElement('i');progress.style.width=(item.target>0?Math.min(total/item.target*100,100):0)+'%';track.append(progress);
      const foot=document.createElement('div');foot.className='stat-foot';const goal=document.createElement('span');goal.textContent=item.target>0?`Mục tiêu ${item.target} ${metricUnit(item)}`:'Chưa đặt mục tiêu';
      const shortcut=button(item.metric==='quantity'&&item.quick_amount>0?`+ ${item.quick_amount} ${item.unit}`:'+ Ghi',()=>void quickRecord(item),'stat-footer-button');foot.append(goal,shortcut);
      card.append(top,value,track,foot);parent.append(card);
    }
    if(!parent.children.length)empty(parent,'Chưa có mục tổng quan. Vào Tùy chỉnh để chọn những mục bạn muốn thấy.');
  }
  function renderFilters(rows: Activity[]) {
    const tabs=$('categoryTabs');tabs.replaceChildren();
    const options=[{id:'all',name:'Tất cả'},...items.filter(item=>item.kind==='category'&&(!item.archived||rows.some(row=>row.category===item.id))).sort((a,b)=>a.position-b.position)];
    if(!options.some(item=>item.id===filter))filter='all';
    for(const item of options){const el=button(item.name,()=>{filter=item.id;render()},elClass(item.id===filter));el.dataset.filter=item.id;tabs.append(el)}
  }
  function elClass(selected: boolean) { return selected?'selected':''; }
  function renderTimeline(rows: Activity[]) {
    const parent=$('timeline');parent.replaceChildren();
    const visible=rows.filter(row=>filter==='all'||row.category===filter).sort((a,b)=>a.time.localeCompare(b.time));
    for(const entry of visible) {
      const row=document.createElement('article');row.className='entry';row.dataset.activityId=entry.id;
      const time=document.createElement('span');time.className='time';time.textContent=entry.time.slice(0,5);
      const info=document.createElement('div'), title=document.createElement('h3'), detail=document.createElement('p');title.textContent=entry.title;
      detail.textContent=[entry.detail,entry.quantity?`${entry.quantity} ${entry.unit}`:'',entry.minutes?`${entry.minutes} phút`:'',category(entry.category)?.archived?'Mục đã xóa':''].filter(Boolean).join(' · ');
      info.append(title,detail);const actions=document.createElement('div');actions.className='entry-actions';
      const remove=button('×',()=>void deleteActivity(entry),'delete-entry');remove.setAttribute('aria-label','Xóa '+entry.title);
      actions.append(editButton(entry.title,()=>openForm(entry.category,entry)),remove);
      row.append(time,icon(entry.icon||category(entry.category)?.icon||'circle-plus','entry-icon'),info,actions);parent.append(row);
    }
    if(!visible.length)empty(parent,'Chưa có hoạt động. Ghi một điều nhỏ để bắt đầu nhé.');text('activityCount',rows.length+' hoạt động đã ghi');
  }
  function renderQuick() {
    const parent=$('quickItems');parent.replaceChildren();
    for(const item of active('category').filter(item=>item.quick)) {
      const el=button('',()=>void quickRecord(item),'');el.dataset.quick=item.id;const label=document.createElement('span');label.textContent=item.name;el.append(icon(item.icon,''),label);parent.append(el);
    }
    if(!parent.children.length)empty(parent,'Bạn có thể thêm mục vào Ghi nhanh trong Tùy chỉnh.');
  }
  function renderHabits() {
    const parent=$('habitList'), list=active('habit');parent.replaceChildren();
    for(const item of list) {
      const row=document.createElement('div');row.className='habit-row';row.dataset.itemId=item.id;
      const label=document.createElement('label'), checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=habits.has(item.id);checkbox.onchange=()=>void toggleHabit(item,checkbox);
      const name=document.createElement('span');name.className='habit-name';name.textContent=item.name;label.append(checkbox,icon(item.icon,''),name);
      const remove=button('×',()=>void archiveItem(item,true),'mini-action');remove.setAttribute('aria-label','Xóa thói quen '+item.name);
      row.append(label,editButton(item.name,()=>openItem('habit',item)),remove);parent.append(row);
    }
    if(!list.length)empty(parent,'Tạo một thói quen nhỏ cho ngày của bạn.');
    text('habitCount',list.filter(item=>habits.has(item.id)).length+' / '+list.length);
  }
  function renderWeek() {
    const days=weekDates(), counts=days.map(day=>entries.filter(entry=>entry.date===day).length), peak=Math.max(1,...counts);
    all('.week-bars').forEach(chart=>{chart.replaceChildren();const maxHeight=chart.closest('#weekView')?140:64;days.forEach((day,i)=>{const el=document.createElement('div');el.className='day'+(day===selected?' current':'');const bar=document.createElement('div');bar.className='bar';bar.style.height=Math.max(4,counts[i]/peak*maxHeight)+'px';el.append(bar,document.createTextNode((i===6?'CN':'T'+(i+2))+' · '+counts[i]));el.title=day+': '+counts[i]+' hoạt động';chart.append(el)})});
    text('weekDescription',`Tuần này bạn đã ghi ${entries.length} hoạt động trong ${new Set(entries.map(entry=>entry.date)).size} ngày.`);all('.week-head small').forEach(el=>el.textContent=days[0]+' → '+days[6]);$('weekView').querySelector('h2')!.textContent='Tuần của bạn';
  }
  const metricNames={count:'Đếm hoạt động',quantity:'Cộng số lượng',minutes:'Cộng số phút',sleep:'Giờ ngủ / thức'};
  const routeNames={today:'Hôm nay',journal:'Nhật ký',habits:'Thói quen',week:'Tổng quan tuần'};
  function renderSettings() {
    const parent=$('settingsList');parent.replaceChildren();all('[data-kind]').forEach(el=>el.classList.toggle('selected',el.dataset.kind===settingKind));
    const list=items.filter(item=>item.kind===settingKind&&(input('showArchived').checked||!item.archived)).sort((a,b)=>a.position-b.position);
    for(const item of list) {
      const row=document.createElement('article');row.className='setting-row'+(item.archived?' archived':'');row.dataset.itemId=item.id;
      const info=document.createElement('div');info.className='setting-copy';const name=document.createElement('h3');name.textContent=item.name;const detail=document.createElement('p');
      detail.textContent=item.archived?'Đã xóa khỏi danh sách · Lịch sử vẫn được giữ':item.kind==='category'?[metricNames[item.metric],item.target>0?`Mục tiêu ${item.target} ${metricUnit(item)}`:'',item.overview?'Tổng quan':'',item.quick?'Ghi nhanh':''].filter(Boolean).join(' · '):item.kind==='navigation'?'Liên kết: '+routeNames[item.route]:'Đánh dấu hoàn thành mỗi ngày';info.append(name,detail);
      const actions=document.createElement('div');actions.className='setting-actions';actions.append(button('Sửa',()=>openItem(item.kind,item),'secondary compact'),button(item.archived?'Khôi phục':'Xóa',()=>void archiveItem(item,!item.archived)));
      row.append(icon(item.icon,'setting-icon'),info,actions);parent.append(row);
    }
    if(!list.length)empty(parent,'Chưa có mục nào. Chọn “Thêm mục” để bắt đầu.');
  }
  function render() {
    const rows=entries.filter(entry=>entry.date===selected);
    renderNavigation();renderOverview(rows);renderFilters(rows);renderTimeline(rows);renderQuick();renderHabits();renderWeek();renderSettings();
    text('dateLabel',new Date(selected+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase());
    $('add').toggleAttribute('disabled',!ready);$('addItem').toggleAttribute('disabled',!ready);$('addHabit').toggleAttribute('disabled',!ready);
    if(ready)text('syncStatus','Đã đồng bộ · Dữ liệu riêng tư');
  }
  async function load() {
    if(!db||!user)return;const version=++loadVersion,userId=user.id,days=weekDates();text('syncStatus','Đang tải dữ liệu…');
    const [activities,checks,config]=await Promise.all([
      db.from('health_activities').select('*').eq('user_id',userId).gte('date',days[0]).lte('date',days[6]),
      db.from('health_habit_checks').select('habit').eq('user_id',userId).eq('date',selected),
      db.from('health_items').select('*').eq('user_id',userId),
    ]);
    if(!alive||version!==loadVersion||user?.id!==userId)return;
    if(activities.error||checks.error||config.error){text('syncStatus','Chưa tải được dữ liệu · Thử lại bằng cách chọn ngày');throw activities.error||checks.error||config.error}
    entries=activities.data as Activity[];items=config.data as TrackingItem[];habits=new Set(checks.data.map(row=>row.habit as string));ready=true;render();
  }
  function setView(next: Route|'settings', id=navId) {
    view=next;navId=id;hide('overview',next==='settings');hide('todayView',next==='week'||next==='settings');hide('weekView',next!=='week');hide('settingsView',next!=='settings');
    const copy={today:['Một ngày của bạn.','Ăn đủ, vận động một chút, và dành thời gian cho mình.'],journal:['Những điều đã trải qua.','Chọn ngày để xem lại hoạt động của bạn.'],habits:['Hẹn với bản thân.','Những việc nhỏ bạn muốn làm đều đặn mỗi ngày.'],week:['Nhìn lại một tuần.','Tìm nhịp sống phù hợp với bạn, từng ngày một.'],settings:['Tự tạo nhịp sống.','Mọi mục đều có thể đổi tên, đổi icon và tùy chỉnh.']}[next];
    text('pageTitle',copy[0]);text('pageDescription',copy[1]);text('crumb',next==='settings'?'Tùy chỉnh':items.find(item=>item.id===id)?.name||routeNames[next]);renderNavigation();if(next==='habits')$('habitsPanel').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function openSettings(kind: ItemKind='category') { settingKind=kind;setView('settings');renderSettings(); }
  function showUser(next: User|null) {
    user=next;ready=false;entries=[];items=[];habits.clear();hide('dashboardShell',!user);hide('authScreen',!!user);
    if(!user){all<HTMLDialogElement>('dialog').forEach(dialog=>dialog.close());return}
    text('displayName',String(user.user_metadata.full_name||user.email?.split('@')[0]||'Không gian của bạn'));render();
    const userId=user.id;
    void (async()=>{const {error}=await db!.rpc('health_seed_items');if(error)throw error;if(alive&&user?.id===userId)await load()})().catch(failure);
  }
  function categoryOptions(chosen?: string) {
    const options=active('category'), current=chosen?category(chosen):undefined;if(current?.archived)options.push(current);
    select('category').replaceChildren();for(const item of options){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+(item.archived?' (đã xóa)':'');select('category').append(option)}
    if(chosen&&options.some(item=>item.id===chosen))select('category').value=chosen;
  }
  function categoryFields() {
    const item=category(select('category').value), sleep=item?.metric==='sleep';hide('sleepFields',sleep!==true);hide('quantityFields',sleep===true);hide('minutesField',sleep===true);input('sleepStart').required=sleep===true;input('sleepEnd').required=sleep===true;
    $('activityIconPreview').replaceChildren(icon(activityIcon||item?.icon||'circle-plus'));
  }
  function openForm(categoryId?: string, entry?: Activity) {
    if(!user||!ready)return;
    if(!active('category').length&&!entry){openSettings();openItem('category');return}
    editingActivity=entry?.id||null;activityIcon=entry?.icon||'';$<HTMLFormElement>('activityForm').reset();categoryOptions(entry?.category||categoryId);
    input('activityDate').value=entry?.date||selected;input('activityTime').value=entry?.time.slice(0,5)||new Date().toTimeString().slice(0,5);
    input('activityTitle').value=entry?.title||'';input('activityTitle').placeholder=category(select('category').value)?.name||'Tên hoạt động';input('activityDetails').value=entry?.detail||'';
    input('quantity').value=String(entry?.quantity||0);input('unit').value=entry?.unit??category(select('category').value)?.unit??'';input('minutes').value=String(entry?.minutes||0);
    input('sleepStart').value=entry?.sleep_start?.slice(0,5)||'23:00';input('sleepEnd').value=entry?.sleep_end?.slice(0,5)||'06:30';text('activityHeading',entry?'Sửa hoạt động.':'Ghi một điều nhỏ.');categoryFields();activityDialog.showModal();
  }
  async function saveActivity(values: Omit<Activity,'id'|'user_id'>, id?: string|null) {
    if(!db||!user)throw new Error('Bạn cần đăng nhập.');
    const query=id?db.from('health_activities').update(values).eq('id',id).eq('user_id',user.id):db.from('health_activities').insert({...values,user_id:user.id});
    const {error}=await query;if(error)throw error;
  }
  async function quickRecord(item: TrackingItem) {
    if(!ready||busy)return;
    if(item.metric!=='quantity'||item.quick_amount<=0){openForm(item.id);return}
    busy=true;try{await saveActivity({date:selected,time:new Date().toTimeString().slice(0,5),category:item.id,title:item.name,detail:'',quantity:item.quick_amount,unit:item.unit,minutes:0,sleep_start:null,sleep_end:null,icon:''});await load();notify(`Đã ghi ${item.quick_amount} ${item.unit} vào ${item.name}.`)}catch(error){failure(error)}finally{busy=false}
  }
  async function deleteActivity(entry: Activity) {
    if(!db||!user||busy||!confirm('Xóa hoạt động này khỏi nhật ký?'))return;
    busy=true;try{const {error}=await db.from('health_activities').delete().eq('id',entry.id).eq('user_id',user.id);if(error)throw error;await load();notify('Đã xóa hoạt động.')}catch(error){failure(error)}finally{busy=false}
  }
  async function toggleHabit(item: TrackingItem, checkbox: HTMLInputElement) {
    if(!db||!user)return;const checked=checkbox.checked,date=selected,userId=user.id;checkbox.disabled=true;
    try{const query=checked?db.from('health_habit_checks').upsert({user_id:userId,date,habit:item.id}):db.from('health_habit_checks').delete().eq('user_id',userId).eq('date',date).eq('habit',item.id);const {error}=await query;if(error)throw error;if(date===selected&&userId===user?.id){if(checked)habits.add(item.id);else habits.delete(item.id);text('habitCount',active('habit').filter(item=>habits.has(item.id)).length+' / '+active('habit').length)}}catch(error){if(date===selected&&userId===user?.id)checkbox.checked=!checked;failure(error)}finally{checkbox.disabled=false}
  }
  function itemFields() { const kind=select('itemKind').value;hide('itemCategoryFields',kind!=='category');hide('itemRouteField',kind!=='navigation'); }
  function openItem(kind: ItemKind, existing?: TrackingItem, fromActivity=false) {
    if(!user||!ready)return;editingItem=existing||null;returnToActivity=fromActivity;$<HTMLFormElement>('itemForm').reset();select('itemKind').value=existing?.kind||kind;select('itemKind').disabled=!!existing;
    input('itemName').value=existing?.name||'';itemIcon=existing?.icon||'circle-plus';$('itemIconPreview').replaceChildren(icon(itemIcon));select('itemMetric').value=existing?.metric||'count';input('itemUnit').value=existing?.unit||'lần';input('itemTarget').value=String(existing?.target||0);input('itemOverview').checked=existing?.overview??true;input('itemQuick').checked=existing?.quick??true;input('itemQuickAmount').value=String(existing?.quick_amount||0);select('itemRoute').value=existing?.route||'today';input('itemPosition').value=String(existing?.position??Math.min(100000,Math.max(-1,...items.filter(item=>item.kind===kind).map(item=>item.position))+1));text('itemHeading',existing?'Sửa mục của bạn.':'Thêm mục của bạn.');itemFields();itemDialog.showModal();
  }
  async function archiveItem(item: TrackingItem, archived: boolean) {
    if(!db||!user||busy)return;if(archived&&!confirm(`Xóa “${item.name}” khỏi danh sách? Nhật ký và lịch sử vẫn được giữ; bạn có thể khôi phục trong Tùy chỉnh.`))return;
    busy=true;try{const {error}=await db.from('health_items').update({archived}).eq('user_id',user.id).eq('id',item.id);if(error)throw error;await load();notify(archived?'Đã xóa mục khỏi danh sách.':'Đã khôi phục mục.')}catch(error){failure(error)}finally{busy=false}
  }
  function renderIconGrid() {
    const parent=$('iconGrid'), query=searchText(input('iconSearch').value), group=select('iconGroup').value;parent.replaceChildren();
    for(const entry of iconCatalog.filter(entry=>(group==='all'||entry.group===group)&&searchText(entry.name+' '+entry.group+' '+entry.id).includes(query))) {
      const el=button('',()=>chooseIcon(entry.id),'icon-option');el.setAttribute('aria-label','Chọn icon '+entry.name);const label=document.createElement('span');label.textContent=entry.name;el.append(icon(entry.id,''),label);parent.append(el);
    }
    hide('iconEmpty',parent.children.length>0);
  }
  function openIconPicker(current: string, callback: (icon: string)=>void) { onPick=callback;input('iconSearch').value='';select('iconGroup').value='all';input('customIcon').value=iconCatalog.some(entry=>entry.id===current)?'':current;renderIconGrid();iconDialog.showModal(); }
  function chooseIcon(value: string) { const chosen=value.trim();if(!chosen||chosen.length>32){notify('Hãy chọn icon hoặc nhập ký hiệu từ 1 đến 32 ký tự.');return}onPick?.(chosen);onPick=null;iconDialog.close(); }
  select('iconGroup').replaceChildren();const everyGroup=document.createElement('option');everyGroup.value='all';everyGroup.textContent='Tất cả lĩnh vực';select('iconGroup').append(everyGroup);
  for(const group of [...new Set(iconCatalog.map(entry=>entry.group))]){const option=document.createElement('option');option.value=group;option.textContent=group;select('iconGroup').append(option)}
  $('iconClose').onclick=()=>{onPick=null;iconDialog.close()};$('iconSearch').oninput=renderIconGrid;$('iconGroup').onchange=renderIconGrid;$('useCustomIcon').onclick=()=>chooseIcon(input('customIcon').value);
  $('itemIconButton').onclick=()=>openIconPicker(itemIcon,value=>{itemIcon=value;$('itemIconPreview').replaceChildren(icon(value))});
  $('activityIconButton').onclick=()=>openIconPicker(activityIcon||category(select('category').value)?.icon||'circle-plus',value=>{activityIcon=value;categoryFields()});
  $('customize').onclick=()=>openSettings();$('manageCategories').onclick=()=>openSettings();$('addItem').onclick=()=>openItem(settingKind);$('addHabit').onclick=()=>openItem('habit');
  all('[data-kind]').forEach(el=>el.onclick=()=>{settingKind=el.dataset.kind as ItemKind;renderSettings()});input('showArchived').onchange=renderSettings;$('itemKind').onchange=itemFields;$('itemCancel').onclick=()=>itemDialog.close();
  $<HTMLFormElement>('itemForm').onsubmit=async event=>{
    event.preventDefault();if(!db||!user||busy)return;
    const kind=select('itemKind').value as ItemKind;
    const value: TrackingItem={id:editingItem?.id||crypto.randomUUID(),user_id:user.id,kind,name:input('itemName').value.trim(),icon:itemIcon,metric:select('itemMetric').value as Metric,unit:input('itemUnit').value.trim(),target:Number(input('itemTarget').value),overview:kind==='category'&&input('itemOverview').checked,quick:kind==='category'&&input('itemQuick').checked,quick_amount:Number(input('itemQuickAmount').value),position:Number(input('itemPosition').value),archived:editingItem?.archived||false,route:select('itemRoute').value as Route};
    const submit=$<HTMLButtonElement>('itemSave');busy=true;submit.disabled=true;
    try{validateItem(value);const query=editingItem?db.from('health_items').update(value).eq('id',value.id).eq('user_id',user.id):db.from('health_items').insert(value);const {error}=await query;if(error)throw error;await load();itemDialog.close();if(returnToActivity){categoryOptions(value.id);input('unit').value=value.unit;categoryFields()}else{settingKind=kind;renderSettings()}notify('Đã lưu mục và icon của bạn.')}catch(error){failure(error)}finally{busy=false;submit.disabled=false}
  };
  $('add').onclick=()=>openForm();$('more').onclick=()=>openForm();$('cancel').onclick=()=>activityDialog.close();$('addCategoryFromActivity').onclick=()=>openItem('category',undefined,true);
  $('category').onchange=()=>{input('unit').value=category(select('category').value)?.unit||'';categoryFields()};
  $<HTMLFormElement>('activityForm').onsubmit=async event=>{
    event.preventDefault();if(busy)return;const title=input('activityTitle').value.trim(), item=category(select('category').value);if(!title||!item){notify('Hãy nhập tên và chọn mục theo dõi.');return}
    busy=true;const submit=$('activityForm').querySelector<HTMLButtonElement>('[type="submit"]')!;submit.disabled=true;
    try{const sleep=item.metric==='sleep';await saveActivity({date:input('activityDate').value,time:input('activityTime').value,category:item.id,title,detail:input('activityDetails').value.trim(),quantity:sleep?0:Number(input('quantity').value),unit:sleep?'':input('unit').value.trim(),minutes:sleep?sleepMinutes(input('sleepStart').value,input('sleepEnd').value):Number(input('minutes').value),sleep_start:sleep?input('sleepStart').value:null,sleep_end:sleep?input('sleepEnd').value:null,icon:activityIcon},editingActivity);activityDialog.close();selected=input('activityDate').value;input('selectedDate').value=selected;await load();notify(editingActivity?'Đã cập nhật hoạt động.':'Đã lưu hoạt động.')}catch(error){failure(error)}finally{busy=false;submit.disabled=false}
  };
  input('selectedDate').value=selected;input('selectedDate').onchange=()=>{if(!input('selectedDate').value)return;selected=input('selectedDate').value;void load().catch(failure)};
  $('reminder').onclick=()=>notify('Hẹn với bản thân: '+active('habit').filter(item=>!habits.has(item.id)).length+' thói quen chưa hoàn thành trong ngày đang xem.');
  $('authToggle').onclick=()=>{signUp=!signUp;hide('nameField',!signUp);input('authName').required=signUp;text('authSubmit',signUp?'Tạo tài khoản':'Đăng nhập');text('authToggle',signUp?'Đã có tài khoản? Đăng nhập':'Chưa có tài khoản? Đăng ký');text('authMessage','');input('authPassword').autocomplete=signUp?'new-password':'current-password'};
  $<HTMLFormElement>('authForm').onsubmit=async event=>{
    event.preventDefault();if(!db){text('authMessage','Chưa cấu hình kết nối Supabase.');return}const submit=$<HTMLButtonElement>('authSubmit');submit.disabled=true;text('authMessage','Đang kết nối…');
    try{const email=input('authEmail').value.trim(),password=input('authPassword').value;const result=signUp?await db.auth.signUp({email,password,options:{data:{full_name:input('authName').value.trim()},emailRedirectTo:window.location.origin}}):await db.auth.signInWithPassword({email,password});if(result.error)throw result.error;input('authPassword').value='';if(result.data.session)showUser(result.data.session.user);else text('authMessage','Kiểm tra email để xác nhận tài khoản, rồi đăng nhập.')}catch(error){text('authMessage',errorText(error))}finally{submit.disabled=false}
  };
  $('logout').onclick=async()=>{if(!db)return;const {error}=await db.auth.signOut();if(error)failure(error);else showUser(null)};
  if(!db){text('authMessage','Chưa cấu hình kết nối Supabase.');return ()=>{alive=false;clearTimeout(toastTimer)}}
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>{if(alive&&session?.user.id!==user?.id)showUser(session?.user||null)},0)});
  void db.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)failure(error);showUser(data.session?.user||null)});
  return ()=>{alive=false;loadVersion++;clearTimeout(toastTimer);subscription.unsubscribe()};
}
