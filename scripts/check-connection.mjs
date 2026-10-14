import fs from 'node:fs';
import assert from 'node:assert/strict';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
const url=env.NEXT_PUBLIC_SUPABASE_URL;
const headers={apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY};
const settings=await fetch(url+'/auth/v1/settings',{headers});
assert.equal(settings.status,200,'Supabase Auth endpoint must be available');
const auth=await settings.json();
assert.equal(auth.external.email,true,'Email sign-in must be enabled');
assert.notEqual(auth.disable_signup,true,'Sign-up must be enabled');
for(const table of ['health_activities','health_habit_checks']) {
 const response=await fetch(url+'/rest/v1/'+table+'?select=*&limit=1',{headers});
 assert.ok([401,403].includes(response.status),`Anonymous access to ${table} must be denied`);
}
console.log('PASS: Supabase Auth available, email enabled, signup enabled, both tables deny anonymous access.');
