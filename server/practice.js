import { directPracticeIdentity } from './portuguese-prompts.js';

const SCAN_SIZE = 1000;
const PRACTICE_SIZE = 20;
export const groupedPracticeTopics = new Set(['regencia', 'crase']);

function questionPattern(question) {
  if (question.generator_version === 'pt-1') {
    const situation = question.prompt.match(/\(Situação (\d+)\.\)$/u);
    if (situation) return `portuguese:${situation[1]}`;
  }
  if (question.generator_version === '1') {
    return question.prompt.replace(/\d+(?:[.,]\d+)*/g, '#');
  }
  return question.id;
}

async function readRows(makeQuery) {
  const rows = [];
  let after;
  while (true) {
    let query = makeQuery().order('id').limit(SCAN_SIZE);
    if (after !== undefined) query = query.gt('id', after);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < SCAN_SIZE) return rows;
    after = data.at(-1).id;
  }
}

export function mixPracticeQuestions(questions, attempts, limit = PRACTICE_SIZE) {
  const answered = new Set(attempts.map(attempt => attempt.question_id));
  const latest = attempts.reduce((last, attempt) => !last || attempt.created_at >= last.created_at ? attempt : last, null);
  const lastQuestion = latest && questions.find(question => question.id === latest.question_id);
  let previousPattern = lastQuestion ? questionPattern(lastQuestion) : null;
  let remaining = 0;
  const byPattern = new Map();

  for (const question of questions) {
    if (answered.has(question.id)) continue;
    const pattern = questionPattern(question);
    if (!byPattern.has(pattern)) byPattern.set(pattern, []);
    byPattern.get(pattern).push(question.id);
    remaining++;
  }

  const groups = [...byPattern];
  const ids = [];
  while (groups.length && ids.length < limit) {
    if (groups.length > 1 && groups[0][0] === previousPattern) groups.push(groups.shift());
    const group = groups.shift();
    const [pattern, queue] = group;
    ids.push(queue.shift());
    previousPattern = pattern;
    if (queue.length) groups.push(group);
  }

  return { ids, remaining };
}

function practiceQuestions(db, topic, subject) {
  return columns => {
    const query = db.from('questions').select(columns)
      .eq('board_id', 'vunesp').eq('kind', 'basic').eq('status', 'published').eq('topic_id', topic);
    return subject ? query.eq('subject_id', subject) : query;
  };
}

const practiceFields = 'id,prompt,generator_version';

function groupEquivalentQuestions(candidates) {
  const representatives = new Map();
  const aliases = new Map();
  for (const question of candidates) {
    const key = directPracticeIdentity(question);
    if (!representatives.has(key)) representatives.set(key, question);
    if (key !== question.id) aliases.set(question.id, representatives.get(key).id);
  }
  return { candidates: [...representatives.values()], aliases };
}

export async function groupedPracticeInventory(db, topic) {
  const query = practiceQuestions(db, topic);
  const groups = groupEquivalentQuestions(await readRows(() => query(practiceFields)));
  return { total: groups.candidates.length, aliases: Object.fromEntries(groups.aliases) };
}

export async function loadMixedPractice(db, userId, { topic, subject }) {
  const topicQuestions = practiceQuestions(db, topic, subject);
  const [candidates, attempts] = await Promise.all([
    readRows(() => topicQuestions(practiceFields)),
    readRows(() => db.from('attempts').select('id,question_id,created_at')
      .eq('user_id', userId).eq('topic_id', topic).eq('kind', 'basic'))
  ]);
  const groups = groupedPracticeTopics.has(topic) ? groupEquivalentQuestions(candidates) : null;
  const pool = groups?.candidates ?? candidates;
  const history = groups ? attempts.map(attempt => ({
    ...attempt, question_id: groups.aliases.get(attempt.question_id) ?? attempt.question_id
  })) : attempts;
  const { ids, remaining } = mixPracticeQuestions(pool, history);
  const total = pool.length;
  const offset = total - remaining;
  if (!ids.length) return { questions: [], total, offset };

  const { data, error } = await topicQuestions('*').in('id', ids);
  if (error) throw error;
  const byId = new Map(data.map(question => [question.id, question]));
  return { questions: ids.map(id => byId.get(id)).filter(Boolean), total, offset };
}

