import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../src/app/AuthApp.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
const user = { id: 'test-user', email: 'test@example.com', user_metadata: { full_name: 'Người học' } };

async function mount(db) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:3000' });
  const keys = ['window', 'document', 'FormData', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] });
  const exports = {};
  new Function('require', 'exports', compiled)(id => {
    if (id === '../lib/supabaseClient') return {createSupabaseClient:()=>db};
    if (id === '../lib/study-repository') return {createStudyRepository:()=>({})};
    if (id === './StudyApp') return {__esModule:true,default:({userName,onLogout})=>React.createElement('section',null,userName,React.createElement('button',{onClick:onLogout},'Đăng xuất'))};
    return require(id);
  }, exports);
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(exports.default)));
  return {
    dom,
    async close() {
      await act(async () => root.unmount());
      dom.window.close();
      keys.forEach((key, i) => previous[i] ? Object.defineProperty(globalThis, key, previous[i]) : delete globalThis[key]);
    },
  };
}

function fakeAuth(session = null) {
  const calls = [];
  let unsubscribed = false;
  return {
    calls,
    get unsubscribed() { return unsubscribed; },
    auth: {
      onAuthStateChange() { return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
      async getSession() { return { data: { session }, error: null }; },
      async signInWithPassword(value) { calls.push(['signin', value]); return { data: { session: { user } }, error: null }; },
      async signUp(value) { calls.push(['signup', value]); return { data: { session: null }, error: null }; },
      async signOut() { calls.push(['signout']); return { error: null }; },
    },
  };
}

async function submit(dom) {
  document.querySelector('[name=email]').value = 'test@example.com';
  document.querySelector('[name=password]').value = 'password123';
  await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
}

test('sign in with password, sign out, unsubscribe on unmount', async () => {
  const db = fakeAuth();
  const view = await mount(db);
  try {
    await submit(view.dom);
    assert.deepEqual(db.calls[0], ['signin', { email: user.email, password: 'password123' }]);
    assert.match(document.body.textContent, /Người học/);
    await act(async () => document.querySelector('button').click());
    assert.equal(db.calls[1][0], 'signout');
    assert.ok(document.querySelector('form'));
  } finally { await view.close(); }
  assert.equal(db.unsubscribed, true);
});

test('registration preserves full name, confirmation redirect and confirmation message', async () => {
  const db = fakeAuth();
  const view = await mount(db);
  try {
    await act(async () => document.querySelector('.text-button').click());
    document.querySelector('[name=name]').value = 'Người học';
    await submit(view.dom);
    assert.deepEqual(db.calls[0], ['signup', { email: user.email, password: 'password123', options: { data: { full_name: 'Người học' }, emailRedirectTo: 'http://localhost:3000' } }]);
    assert.match(document.body.textContent, /Kiểm tra email để xác nhận/);
    assert.equal(document.querySelector('[name=password]').value, '');
  } finally { await view.close(); }
});

test('existing session opens workspace without reading app tables', async () => {
  const view = await mount(fakeAuth({ user }));
  try { assert.match(document.body.textContent, /Người học/); assert.equal(document.querySelector('form'), null); }
  finally { await view.close(); }
});

test('missing configuration gives an actionable message and disables submit', async () => {
  const view = await mount(null);
  try { assert.match(document.body.textContent, /Chưa cấu hình kết nối Supabase/); assert.equal(document.querySelector('[type=submit]').disabled, true); }
  finally { await view.close(); }
});

test('authentication failure keeps the form available and displays error', async () => {
  const db = fakeAuth();
  db.auth.signInWithPassword = async () => ({ error: new Error('Thông tin đăng nhập không hợp lệ.') });
  const view = await mount(db);
  try {
    await submit(view.dom);
    assert.match(document.body.textContent, /Thông tin đăng nhập không hợp lệ/);
    assert.equal(document.querySelector('[type=submit]').disabled, false);
  } finally { await view.close(); }
});
