import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../shared/progress.js';
const attempt = (id, correct, kind = 'basic', date = '2026-11-14T15:00:00Z') => ({ question_id: id, topic_id: 'regencia', subject_id: 'portugues', kind, correct, created_at: date, elapsed_seconds: 30 });
test('dashboard começa zerado e separa acertos/erros básicos dos oficiais', () => {
  assert.equal(summarize([]).total, 0);
  const result = summarize([attempt('a', true), attempt('b', false), attempt('c', true, 'official')]);
  assert.deepEqual(result.basic, { total: 2, correct: 1, wrong: 1, rate: 50 });
  assert.deepEqual(result.official, { total: 1, correct: 1, wrong: 0, rate: 100 });
});
test('repetir a mesma questão não libera etapa oficial', () => {
  const result = summarize(Array.from({ length: 10 }, () => attempt('same', true)));
  assert.equal(result.topicProgress.regencia.answered, 1);
  assert.equal(result.topicProgress.regencia.unlocked, false);
});
test('cinco questões distintas e 70% liberam a etapa; usa última tentativa por questão', () => {
  const rows = ['a','b','c','d','e'].map((id, i) => attempt(id, i < 4));
  assert.equal(summarize(rows).topicProgress.regencia.unlocked, true);
  rows.push(attempt('a', false, 'basic', '2026-11-14T16:00:00Z'));
  assert.equal(summarize(rows).topicProgress.regencia.unlocked, false);
  assert.equal(summarize(rows).topicProgress.regencia.rate, 60);
});
test('meta e gráfico respeitam a virada do dia no horário de Brasília', () => {
  const result = summarize([attempt('a', true, 'basic', '2026-11-14T01:30:00Z'), attempt('b', false, 'basic', '2026-11-14T04:00:00Z')], new Date('2026-11-14T15:00:00Z'));
  assert.equal(result.today, 1);
  assert.equal(result.days.at(-1).wrong, 1);
  assert.equal(result.days.at(-2).correct, 1);
  assert.equal(result.minutes, 1);
});
