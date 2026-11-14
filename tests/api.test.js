import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/http.js';
// Uma configuração antiga de demonstração precisa falhar de forma fechada.
process.env.APP_MODE = 'demo';
const { app } = await import('../server/index.js');
test('sem autenticação não há catálogo, questões, correção, histórico ou metas, inclusive no antigo modo demo', async () => {
  for (const [path, method] of [['/catalog','GET'],['/inventory','GET'],['/questions','GET'],['/questions/intro-regencia-1','GET'],['/answers','POST'],['/attempts','GET'],['/preferences','GET'],['/preferences','PUT']]) {
    for (const token of ['', 'Bearer invented-token']) {
      const response = await request(app, `/api${path}`, { method, headers: { Authorization: token, 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: '{}' } : {}) });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.match((await response.json()).error, /login/);
    }
  }
  const config = await (await request(app, '/api/config')).json();
  assert.equal(config.mode, 'locked');
  assert.equal(config.supabaseAnonKey, null);
});
