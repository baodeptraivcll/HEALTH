import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, sleepMinutes, summary } from '../src/lib/model.ts';
test('sleep duration crosses midnight and validates time',()=>{
  assert.equal(sleepMinutes('23:00','06:30'),450);
  assert.equal(sleepMinutes('13:00','13:30'),30);
  assert.throws(()=>sleepMinutes('25:00','06:00'));
});
test('summary uses real entries and water quantities',()=>{
  assert.deepEqual(summary([]),{sleep:0,fitness:0,meals:0,water:0});
  assert.deepEqual(summary([{category:'sleep',minutes:450},{category:'fitness',minutes:15},{category:'food'},{category:'water',quantity:200},{category:'water',quantity:300}]),{sleep:450,fitness:15,meals:1,water:500});
});
test('calendar dates use local day',()=>assert.equal(localDate(new Date(2026,9,14,0,5)),'2026-10-14'));
