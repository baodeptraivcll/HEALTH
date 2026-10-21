import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { enrichWordData } from '../src/lib/word-examples.mjs';
const sourceWords = JSON.parse(await readFile(new URL('../data/words.json', import.meta.url), 'utf8'));
const examples = JSON.parse(await readFile(new URL('../data/examples.json', import.meta.url), 'utf8'));
const corrections = JSON.parse(await readFile(new URL('../data/word-corrections.json', import.meta.url), 'utf8'));
const words = enrichWordData(sourceWords,examples,corrections);
if (words.length !== 596 || new Set(words.map(w => w.word)).size !== 596) throw new Error('Expected 596 unique extracted words');
for (const w of words) {
 if (typeof w.word !== 'string' || !w.word.trim() || !Number.isInteger(w.order_index)) throw new Error('Invalid source entry');
 for (const k of ['ipa', 'pos', 'meaning_vi', 'example', 'topic']) if (w[k] !== null && typeof w[k] !== 'string') throw new Error(`Invalid ${k}`);
}
const sqlIndex = process.argv.indexOf('--sql');
if (sqlIndex >= 0) {
 const quote = v => v === null ? 'null' : typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
 const keys = ['word','ipa','pos','meaning_vi','example','topic','order_index','study_term','example_vi','example_answer','example_source','source_note','dictionary_url'];
 const sql = `-- 596 source identities with original bilingual examples; see data/EXAMPLES.md.\nbegin;\ninsert into public.words (${keys.join(', ')}) values\n${words.map(w => '(' + keys.map(k => quote(w[k])).join(', ') + ')').join(',\n')}\non conflict (word) do update set ${keys.slice(1).map(k => `${k} = excluded.${k}`).join(', ')};\ncommit;\n`;
 await writeFile(process.argv[sqlIndex + 1] || new URL('../supabase/seed.sql', import.meta.url), sql);
 console.log('Generated SQL for 596 words.');
} else {
 const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --sql [path]. Never expose the service key to the browser.');
 const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
 const { error } = await client.from('words').upsert(words, { onConflict: 'word' });
 if (error) throw new Error(error.message);
 console.log('Seeded 596 source words.');
}
