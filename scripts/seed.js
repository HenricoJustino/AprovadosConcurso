import { boards, subjects, topics } from '../shared/catalog.js';
import { questions } from '../server/content.js';
import { adminClient, check, uploadQuestions } from './admin.js';
try {
  const db = adminClient();
  check(await db.from('boards').upsert(boards.map(({ id, name, active }) => ({ id, name, active }))));
  check(await db.from('subjects').upsert(subjects.map(({ id, name }) => ({ id, name }))));
  check(await db.from('topics').upsert(topics));
  await uploadQuestions(db, questions);
  console.log(`Concluído: ${questions.length} questões básicas. 10.000 são variações parametrizadas; ${questions.length - 10000} são de curadoria inicial. Nenhuma questão oficial foi inventada.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
