import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/http.js';

// Configuração sintética; nenhum token/chave do .env real é usado nos testes.
process.env.APP_MODE = 'supabase';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
const { app } = await import('../server/index.js');

test('API autentica usuários, usa seu token no banco e mantém preferências individuais', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const users = { 'token-a': '11111111-1111-4111-8111-111111111111', 'token-b': '22222222-2222-4222-8222-222222222222' };
  const goals = new Map(); let databaseCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const headers = new Headers(init?.headers);
    const token = headers.get('authorization')?.replace('Bearer ', '');
    const uid = users[token];
    if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify(uid ? { id: uid, aud: 'authenticated', role: 'authenticated', email: token + '@example.test' } : token === 'anonymous' ? { id: 'guest', is_anonymous: true } : { message: 'Invalid token' }), { status: uid || token === 'anonymous' ? 200 : 401, headers: { 'Content-Type': 'application/json' } });
    assert.ok(uid, 'nenhuma consulta de banco deve usar token sem usuário validado'); databaseCalls++;
    let result;
    if (url.pathname === '/rest/v1/student_settings') {
      if (init?.method === 'POST') {
        const payload = JSON.parse(init.body);
        assert.equal(payload.user_id, uid);
        goals.set(uid, payload.daily_goal);
        result = { daily_goal: payload.daily_goal };
      } else {
        assert.equal(url.searchParams.get('user_id'), `eq.${uid}`);
        result = goals.has(uid) ? [{ daily_goal: goals.get(uid) }] : [];
      }
    } else if (url.pathname === '/rest/v1/attempts') {
      assert.equal(url.searchParams.get('user_id'), `eq.${uid}`);
      result = [{ id: `attempt-${token}`, user_id: uid }];
    } else assert.fail('Consulta não esperada no teste');
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const asUser = token => ({ headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await request(app, '/api/preferences')).status, 401);
  assert.equal((await request(app, '/api/preferences', asUser('invalid'))).status, 401);
  for (const path of ['/catalog', '/inventory', '/questions', '/questions/test', '/answers', '/attempts', '/preferences']) {
    const method = path === '/answers' ? 'POST' : 'GET';
    for (const token of ['', 'invalid', 'anonymous']) assert.equal((await request(app, `/api${path}`, { method, ...asUser(token) })).status, 401, path);
  }
  assert.equal(databaseCalls, 0);
  const saved = await request(app, '/api/preferences', { method: 'PUT', headers: { ...asUser('token-a').headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ dailyGoal: 35 }) });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).dailyGoal, 35);
  assert.equal((await (await request(app, '/api/preferences', asUser('token-b'))).json()).dailyGoal, 20);
  assert.equal((await (await request(app, '/api/preferences', asUser('token-a'))).json()).dailyGoal, 35);
  const a = await (await request(app, '/api/attempts', asUser('token-a'))).json();
  const b = await (await request(app, '/api/attempts', asUser('token-b'))).json();
  assert.notEqual(a.attempts[0].user_id, b.attempts[0].user_id);
  const impersonation = await request(app, '/api/preferences', { method: 'PUT', headers: { ...asUser('token-a').headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ dailyGoal: 50, user_id: users['token-b'] }) });
  assert.equal(impersonation.status, 400);
});
