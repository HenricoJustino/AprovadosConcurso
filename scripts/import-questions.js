import { readFile } from 'node:fs/promises';
import { validateImport } from './validate-import.js';
import { adminClient, uploadQuestions } from './admin.js';
try {
  const file = process.argv[2];
  if (!file) throw new Error('Uso: npm run import:questions -- caminho/prova-revisada.json [--dry-run]');
  const questions = validateImport(JSON.parse(await readFile(file, 'utf8')));
  if (process.argv.includes('--dry-run')) console.log(`Validação aprovada: ${questions.length} questões. Nada enviado ao banco.`);
  else { await uploadQuestions(adminClient(), questions); console.log(`${questions.length} questões oficiais importadas.`); }
} catch (error) { console.error(error.message); process.exitCode = 1; }
