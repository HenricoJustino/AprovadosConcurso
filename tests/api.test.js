import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import { questions } from '../server/content.js';
process.env.APP_MODE = 'demo';
const { app } = await import('../server/index.js');
// Requisições HTTP em memória: exercita middleware/rotas reais, sem abrir portas.
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const output = [];
    const socket = new Duplex({ read() {}, write(chunk, encoding, callback) { output.push(Buffer.from(chunk)); callback(); } });
    socket.remoteAddress = '127.0.0.1';
    const req = new IncomingMessage(socket);
    req.method = options.method || 'GET'; req.url = url; req.httpVersionMajor = 1; req.httpVersionMinor = 1; req.complete = true;
    req.headers = { host: 'localhost', ...Object.fromEntries(Object.entries(options.headers || {}).map(([k,v]) => [k.toLowerCase(),v])) };
    if (options.body) req.headers['content-length'] = String(Buffer.byteLength(options.body));
    const res = new ServerResponse(req); res.assignSocket(socket);
    const timeout = setTimeout(() => reject(new Error(`Tempo excedido: ${url}`)), 3000);
    res.on('finish', () => {
      clearTimeout(timeout);
      const raw = Buffer.concat(output).toString('utf8');
      const body = raw.slice(raw.indexOf('\r\n\r\n') + 4);
      resolve({ status: res.statusCode, json: async () => JSON.parse(body) });
      socket.destroy();
    });
    res.on('error', reject);
    if (options.body) req.push(options.body);
    req.push(null);
    app.handle(req, res);
  });
}
test('API: busca, correção, origem, paginação e validação', async () => {
  const base = '/api';
  const response = await request(`${base}/questions?topic=regencia`);
  const data = await response.json();
  assert.equal(data.total, 8);
  assert.ok(data.questions.every(q => !('correct_index' in q) && !('explanation' in q)));
  const q = questions.find(q => q.id === data.questions[0].id);
  const correct = await request(`${base}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: q.id, selectedIndex: q.correct_index, elapsedSeconds: 30, requestId: randomUUID() }) });
  assert.equal(correct.status, 200);
  assert.equal((await correct.json()).correct, true);
  const wrong = await request(`${base}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: q.id, selectedIndex: (q.correct_index + 1) % 4, elapsedSeconds: 30, requestId: randomUUID() }) });
  assert.equal((await wrong.json()).correct, false);
  assert.equal((await request(`${base}/questions/${q.id}`)).status, 200);
  assert.equal((await request(`${base}/questions/no-such-id`)).status, 404);
  const official = await (await request(`${base}/questions?kind=official`)).json();
  assert.equal(official.total, 0);
  assert.equal((await request(`${base}/questions?offset=-1`)).status, 400);
  const page1 = await (await request(`${base}/questions?topic=operacoes`)).json();
  const page2 = await (await request(`${base}/questions?topic=operacoes&offset=20`)).json();
  assert.equal(page1.questions.length, 20);
  assert.ok(page2.questions.every(q => !page1.questions.some(p => p.id === q.id)));
  const invalid = await request(`${base}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: q.id, selectedIndex: 4, elapsedSeconds: 1, requestId: randomUUID() }) });
  assert.equal(invalid.status, 400);
});
