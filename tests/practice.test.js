import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, publicQuestion } from '../server/content.js';
import { request } from './helpers/http.js';

process.env.APP_MODE = 'supabase';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
const { app } = await import('../server/index.js');

test('a jornada intercala modelos e pula o histórico entre lotes e sessões', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const userId = '11111111-1111-4111-8111-111111111111';
  const asStudent = { headers: { Authorization: 'Bearer student-token' } };
  const asJson = value => Response.json(value);
  const history = [];
  const seenTopics = new Set();
  globalThis.fetch = async (input, init) => {
    const { pathname, searchParams: params } = new URL(input);
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer student-token');
    if (pathname === '/auth/v1/user') return asJson({ id: userId, role: 'authenticated' });
    const topic = params.get('topic_id').slice(3);
    if (pathname === '/rest/v1/attempts') {
      assert.equal(params.get('user_id'), 'eq.' + userId);
      return asJson(history.filter(a => a.topic_id === topic));
    }
    assert.equal(pathname, '/rest/v1/questions');
    assert.equal(params.get('status'), 'eq.published');
    assert.equal(params.get('kind'), 'eq.basic');
    const pool = questions.filter(q => q.topic_id === topic);
    if (params.get('select') === '*') {
      const ids = params.get('id').slice(4, -1).split(',');
      return asJson(pool.filter(q => ids.includes(q.id)).map(publicQuestion));
    }
    assert.equal(params.get('select'), 'id,prompt,generator_version');
    assert.equal(params.get('order'), 'id.asc');
    const idCursor = params.get('id')?.slice(3);
    if (idCursor) seenTopics.add(topic);
    return asJson(pool.sort((a,b) => a.id.localeCompare(b.id))
      .filter(q => !idCursor || q.id > idCursor)
      .slice(0, Number(params.get('limit'))).map(({ id, prompt, generator_version }) => ({ id, prompt, generator_version })));
  };

  const rawPrompts = new Map(questions.map(q => [q.id, q.prompt]));
  const family = q => rawPrompts.get(q.id).match(/\(Situação (\d+)\.\)$/u)?.[1] ?? q.id;
  for (const topic of ['regencia', 'crase']) {
    const endpoint = '/api/questions?order=mixed&topic=' + topic;
    const response = await request(app, endpoint, asStudent);
    assert.equal(response.status, 200);
    const first = await response.json();
    assert.equal(first.questions.length, 20);
    assert.ok(first.questions.every(q => !/\(Situação \d+\.\)/u.test(q.prompt)));
    assert.equal(first.total, questions.filter(q => q.topic_id === topic).length);
    assert.ok(seenTopics.has(topic), 'inclui questões além do limite inicial do banco');
    const firstFive = first.questions.slice(0, 5).map(family);
    assert.equal(new Set(firstFive).size, 5);
    first.questions.forEach((q, i) => history.push({
      id: String(history.length), question_id: q.id, topic_id: topic,
      created_at: new Date(i * 1000).toISOString()
    }));
    const second = await (await request(app, endpoint, asStudent)).json();
    assert.equal(second.offset, 20);
    assert.equal(second.total, first.total);
    const ids = [...first.questions, ...second.questions].map(q => q.id);
    assert.equal(new Set(ids).size, 40);
    const models = [first.questions.at(-1), ...second.questions].map(family);
    assert.ok(models.every((model, i) => i === 0 || models[i - 1] !== model));
    const resumed = await (await request(app, endpoint, asStudent)).json();
    assert.deepEqual(resumed, second);
  }
});
