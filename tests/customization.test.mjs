import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initialize} from '../src/lib/application.ts';
import {markup} from '../src/lib/template.ts';
import {iconCatalog} from '../src/lib/icon-catalog.ts';
import {mockClient} from './mock-client.mjs';
const settle=()=>new Promise(resolve=>setTimeout(resolve,25));
test('customize categories, icons, habits, navigation and historical entries without losing history',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://health.example/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.confirm=()=>true;
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
  const root=document.getElementById('root');root.innerHTML=markup;
  const db=mockClient();db.addEntry();const dispose=initialize(root,db);
  const $=id=>document.getElementById(id),click=selector=>root.querySelector(selector).click();
  const submit=id=>$(id).dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  try{
    await settle();assert.equal($('dashboardShell').classList.contains('hidden'),false);
    $('customize').click();$('addItem').click();$('itemName').value='Hít đất';$('itemMetric').value='quantity';$('itemUnit').value='cái';$('itemTarget').value='50';
    $('itemIconButton').click();assert.equal($('iconGrid').children.length,94);
    $('iconSearch').value='trung';$('iconSearch').dispatchEvent(new dom.window.Event('input'));assert.equal($('iconGrid').children.length,1);assert.match($('iconGrid').textContent,/Trứng/);
    $('iconGrid').querySelector('button').click();submit('itemForm');await settle();
    const pushups=db.tables.health_items.find(item=>item.name==='Hít đất');assert.equal(pushups.icon,'egg');assert.equal(pushups.target,50);assert.ok(root.querySelector(`[data-quick="${pushups.id}"]`));
    click(`.setting-row[data-item-id="${pushups.id}"] .secondary`);$('itemName').value='Hít đất mỗi ngày';$('itemIconButton').click();$('customIcon').value='<img src=x>'; $('useCustomIcon').click();submit('itemForm');await settle();
    assert.equal(db.tables.health_items.find(item=>item.id===pushups.id).name,'Hít đất mỗi ngày');assert.equal(root.querySelector('.setting-row[data-item-id="'+pushups.id+'"] img'),null,'custom icons must remain text');
    $('addHabit').click();$('itemName').value='Thiền 10 phút';submit('itemForm');await settle();const habit=db.tables.health_items.find(item=>item.name==='Thiền 10 phút');
    const checkbox=root.querySelector(`.habit-row[data-item-id="${habit.id}"] input`);checkbox.checked=true;checkbox.dispatchEvent(new dom.window.Event('change'));await settle();assert.ok(db.tables.health_habit_checks.some(row=>row.habit===habit.id));
    const entry=db.tables.health_activities[0];click(`[data-activity-id="${entry.id}"] .mini-action`);$('activityTitle').value='Bữa sáng đã sửa';$('activityIconButton').click();$('customIcon').value='★';$('useCustomIcon').click();$('quantity').value='3';submit('activityForm');await settle();assert.equal(db.tables.health_activities.length,1);assert.equal(db.tables.health_activities[0].quantity,3);assert.equal(db.tables.health_activities[0].icon,'★');
    $('customize').click();click('[data-kind="category"]');click('.setting-row[data-item-id="food"] .text-button');await settle();assert.equal(db.tables.health_items.find(item=>item.id==='food').archived,true);assert.equal(db.tables.health_activities.length,1);assert.match($('timeline').textContent,/Bữa sáng đã sửa/);assert.equal(root.querySelector('[data-quick="food"]'),null);
    $('showArchived').checked=true;$('showArchived').dispatchEvent(new dom.window.Event('change'));click('.setting-row[data-item-id="food"] .text-button');await settle();assert.equal(db.tables.health_items.find(item=>item.id==='food').archived,false);
    click('[data-kind="navigation"]');click('.setting-row[data-item-id="nav-today"] .secondary');$('itemName').value='Ngày của tôi';submit('itemForm');await settle();assert.match($('navigation').textContent,/Ngày của tôi/);
    dispose();const second=initialize(root,db);await settle();assert.match($('navigation').textContent,/Ngày của tôi/);assert.match($('timeline').textContent,/Bữa sáng đã sửa/);assert.equal($('iconGroup').options.length,13);second();
    assert.ok(db.calls.some(call=>call.table==='health_items'&&call.action==='insert'));
    assert.equal(new Set(iconCatalog.map(icon=>icon.group)).size,12);
  }finally{dispose();dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.confirm}
});
