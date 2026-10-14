import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, sleepMinutes, itemTotal, defaultItems, validateItem, searchText } from '../src/lib/model.ts';
test('sleep duration crosses midnight and validates time',()=>{
  assert.equal(sleepMinutes('23:00','06:30'),450);
  assert.equal(sleepMinutes('13:00','13:30'),30);
  assert.throws(()=>sleepMinutes('25:00','06:00'));
});
test('custom metrics do not depend on built-in category names',()=>{
  const item={...defaultItems[0],id:'pushups',metric:'quantity'};
  const rows=[{category:'pushups',quantity:30,minutes:15},{category:'pushups',quantity:20,minutes:10},{category:'water',quantity:200,minutes:0}];
  assert.equal(itemTotal(item,rows),50);
  assert.equal(itemTotal({...item,metric:'minutes'},rows),25);
  assert.equal(itemTotal({...item,metric:'count'},rows),2);
  assert.equal(itemTotal(item,[]),0);
});
test('calendar dates use local day',()=>assert.equal(localDate(new Date(2026,9,14,0,5)),'2026-10-14'));
test('item validation bounds user names, icons and numeric targets',()=>{
  defaultItems.forEach(validateItem);
  assert.equal(new Set(defaultItems.map(item=>item.id)).size,defaultItems.length);
  for(const change of [{name:'   '},{icon:'x'.repeat(33)},{target:NaN},{target:-1},{quick_amount:Infinity},{metric:'invalid'}])assert.throws(()=>validateItem({...defaultItems[0],...change}));
  assert.doesNotThrow(()=>validateItem({...defaultItems[0],icon:'🏸',name:'Cầu lông'}));
});
test('Vietnamese icon search ignores accents',()=>assert.equal(searchText('Đi bộ · Trứng gà'),'di bo · trung ga'));
