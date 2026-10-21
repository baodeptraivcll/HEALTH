import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('SQL seed preserves every source field and upserts by word without replacing ids', async () => {
 const out = join(await mkdtemp(join(tmpdir(), 'toeic-seed-')), 'seed.sql');
 const result = spawnSync(process.execPath, ['scripts/seed-words.mjs', '--sql', out], { encoding: 'utf8' });
 assert.equal(result.status, 0, result.stderr);
 const sql = await readFile(out, 'utf8');
 const words = JSON.parse(await readFile('data/words.json', 'utf8'));
 assert.equal(words.length, 596);
 for (const w of words) assert.ok(sql.includes("'" + w.word.replaceAll("'", "''") + "'"));
 assert.match(sql, /on conflict \(word\) do update/i);
 assert.doesNotMatch(sql, /id\s*=/i);
 assert.match(sql, /begin;/i); assert.match(sql, /commit;/i);
});
