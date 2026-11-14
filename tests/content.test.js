import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions, questions, publicQuestion } from '../server/content.js';
import { topics } from '../shared/catalog.js';

test('acervo contém 10 mil variações e questões introdutórias, sem enunciados duplicados', () => {
  assert.equal(questions.length, 10053);
  assert.equal(questions.filter(q => q.editorial_status === 'generated').length, 10000);
  assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
  assert.equal(new Set(questions.map(q => q.prompt)).size, questions.length);
  assert.ok(questions.every(q => q.kind === 'basic'));
  assert.deepEqual(generateQuestions().map(q => q.id), questions.map(q => q.id));
});
test('todas as questões possuem alternativas válidas, explicação e vínculo com a matéria', () => {
  for (const q of questions) {
    assert.ok(q.correct_index >= 0 && q.correct_index < q.options.length, q.id);
    assert.equal(new Set(q.options).size, q.options.length, q.id);
    assert.ok(q.explanation.length > 15, q.id);
    assert.equal(topics.find(t => t.id === q.topic_id)?.subject_id, q.subject_id, q.id);
  }
  for (const t of topics) assert.ok(questions.filter(q => q.topic_id === t.id).length >= 5, `${t.id} precisa de 5 questões para liberar a trilha`);
});
test('recalcula independentemente a resposta de todos os 10 mil exercícios', () => {
  for (const q of questions.filter(q => q.editorial_status === 'generated')) {
    const numbers = q.prompt.match(/\d+/g).map(Number);
    let expected;
    if (q.prompt.startsWith('Uma biblioteca')) expected = numbers[0] + numbers[1];
    else if (q.prompt.startsWith('Um estoque')) expected = numbers[0] - numbers[1];
    else if (q.topic_id === 'porcentagem') expected = numbers[0] / 100 * numbers[1];
    else if (q.topic_id === 'equacoes') expected = (numbers[2] - numbers[1]) / numbers[0];
    else if (q.topic_id === 'medias') expected = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    else if (q.topic_id === 'proporcoes') expected = numbers[0] / 2 * numbers[1];
    else if (q.topic_id === 'sequencias') expected = numbers.at(-1) + numbers[1];
    else if (q.topic_id === 'contagem') expected = numbers[0] * numbers[1];
    else assert.fail(`Modelo sem verificação: ${q.topic_id}`);
    assert.ok(Math.abs(Number(q.options[q.correct_index].replace(',', '.')) - expected) < 0.0001, q.prompt);
  }
});
test('payload público não entrega gabarito nem explicação antes da resposta', () => {
  const visible = publicQuestion(questions[0]);
  assert.equal('correct_index' in visible, false);
  assert.equal('explanation' in visible, false);
  assert.ok(visible.options.length);
});
