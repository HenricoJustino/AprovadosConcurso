export function summarize(attempts, now = new Date()) {
  const byKind = kind => {
    const rows = attempts.filter(a => a.kind === kind);
    const correct = rows.filter(a => a.correct).length;
    return { total: rows.length, correct, wrong: rows.length - correct, rate: rows.length ? Math.round(correct / rows.length * 100) : 0 };
  };
  const topicIds = [...new Set(attempts.map(a => a.topic_id))];
  const topicProgress = Object.fromEntries(topicIds.map(id => {
    const rows = attempts.filter(a => a.topic_id === id && a.kind === 'basic');
    const latest = new Map();
    for (const a of [...rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) latest.set(a.question_id, a);
    const distinct = [...latest.values()];
    const correct = distinct.filter(a => a.correct).length;
    const rate = distinct.length ? Math.round(correct / distinct.length * 100) : 0;
    return [id, { answered: distinct.length, correct, rate, unlocked: distinct.length >= 5 && correct / distinct.length >= 0.7 }];
  }));
  const dayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateKey = date => dayFormatter.format(date);
  const dailyCounts = new Map();
  for (const a of attempts) {
    const key = dateKey(new Date(a.created_at));
    const day = dailyCounts.get(key) || { correct: 0, wrong: 0 };
    day[a.correct ? 'correct' : 'wrong']++;
    dailyCounts.set(key, day);
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now); date.setUTCDate(date.getUTCDate() - 6 + i);
    const key = dateKey(date), day = dailyCounts.get(key) || { correct: 0, wrong: 0 };
    return { date: key, label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(date).replace('.', ''), ...day };
  });
  const todayCounts = dailyCounts.get(dateKey(now));
  const today = todayCounts ? todayCounts.correct + todayCounts.wrong : 0;
  return { basic: byKind('basic'), official: byKind('official'), topicProgress, days, today,
    total: attempts.length, minutes: Math.round(attempts.reduce((n, a) => n + (a.elapsed_seconds || 0), 0) / 60) };
}
