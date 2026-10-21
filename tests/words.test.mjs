import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const words = read('words.json');
const source = read('words-source.json');
const report = read('words-report.json');
const fields = ['word', 'ipa', 'pos', 'meaning_vi', 'example', 'topic'];

test('all 600 source rows and 50 topics are accounted for; numbering typo is preserved', () => {
  assert.equal(source.length, 600);
  assert.equal(new Set(source.map(row => row.topic_index)).size, 50);
  source.forEach((row, i) => {
    assert.equal(row.order_index, i + 1);
    assert.equal(row.source_cells.length, 4);
    assert.ok(row.page >= 1 && row.page <= 31);
  });
  assert.equal(source[247].word, 'restricted');
  assert.equal(source[247].source_number, 28);
});

test('unique dataset contains every source word, with contiguous order and explicit nullable fields', () => {
  const keys = new Set(words.map(row => row.word.toLowerCase()));
  assert.equal(words.length, 596);
  assert.equal(keys.size, words.length);
  assert.deepEqual(keys, new Set(source.map(row => row.word.toLowerCase())));
  words.forEach((row, i) => {
    assert.equal(row.order_index, i + 1);
    for (const field of fields) {
      assert.ok(Object.hasOwn(row, field), `${row.word}: missing ${field}`);
      assert.ok(row[field] === null || (typeof row[field] === 'string' && row[field].trim().length > 0));
    }
  });
});

test('merged values come exclusively from source rows, retaining all senses and topics', () => {
  for (const word of words) {
    const rows = source.filter(row => row.word.toLowerCase() === word.word.toLowerCase());
    for (const field of fields) {
      const values = [...new Set(rows.map(row => row[field]).filter(value => value !== null))];
      const expected = field === 'pos'
        ? [...new Set(values.flatMap(value => value.split(', ')))].join(', ')
        : values.join(' | ');
      assert.equal(word[field], expected || null, `${word.word}.${field}`);
    }
  }
});

test('source limitations are reported honestly; no examples or missing fields are invented', () => {
  assert.equal(report.ready_for_seed, false);
  assert.equal(report.shortfall, 4);
  assert.deepEqual(report.duplicates.map(row => row.word), ['productive', 'express', 'constantly', 'procedure']);
  assert.equal(source.filter(row => row.example === null).length, 600);
  assert.equal(words.find(row => row.word === 'carrier').pos, null);
  assert.equal(words.find(row => row.word === 'invest').pos, null);
  assert.equal(words.find(row => row.word === 'get in touch + with somebody').ipa, null);
  for (const field of fields) {
    assert.equal(report.missing_counts_source[field], source.filter(row => row[field] === null).length);
    assert.equal(report.missing_counts_unique[field], words.filter(row => row[field] === null).length);
  }
});

test('report fingerprint matches the actual source PDF', () => {
  const pdf = fs.readFileSync(new URL('../data/toeic600.pdf', import.meta.url));
  assert.equal(report.source_sha256, createHash('sha256').update(pdf).digest('hex'));
});
