import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImport } from '../scripts/validate-import.js';
// Fixture sintética SOMENTE para validação. Não é prova real e não é semeada/importada.
const fixture = () => ({ topic_id: 'regencia', prompt: 'Enunciado sintético usado exclusivamente em teste.', options: ['Alternativa A', 'Alternativa B'], correct_index: 0, explanation: 'Explicação sintética usada apenas na validação de testes.', source: { exam: 'FIXTURE', organization: 'TESTE', year: 2024, role: 'Teste', booklet: '1', number: 1, exam_url: 'https://www.vunesp.com.br/FIXTURE', answer_key_url: 'https://documento.vunesp.com.br/FIXTURE', reviewer: 'Teste automatizado', reviewed_at: '2026-11-14T15:00:00Z', rights_basis: 'Fixture interna sem uso editorial.', application_date: '2024-01-01', answer_key_status: 'definitive' } });
test('importação exige origem, gabarito definitivo e revisão', () => {
  const row = fixture(); assert.equal(validateImport([row])[0].kind, 'official');
  delete row.source.reviewer; assert.throws(() => validateImport([row]));
});
test('importação rejeita URL externa, gabarito inválido e duplicação de prova', () => {
  const row = fixture(); row.source.exam_url = 'https://vunesp.com.br.evil.example/file'; assert.throws(() => validateImport([row]));
  const invalid = fixture(); invalid.correct_index = 4; assert.throws(() => validateImport([invalid]));
  assert.throws(() => validateImport([fixture(), fixture()]));
});
test('aplicações distintas têm identificadores distintos', () => {
  const a = fixture(), b = fixture(); b.source.application_date = '2024-02-01';
  const result = validateImport([a,b]); assert.notEqual(result[0].id, result[1].id);
});
