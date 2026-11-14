import { z } from 'zod';
import { createHash } from 'node:crypto';
import { topics } from '../shared/catalog.js';
const officialUrl = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && (url.hostname === 'vunesp.com.br' || url.hostname.endsWith('.vunesp.com.br'));
}, 'Use um endereço HTTPS da Vunesp como fonte.');
const sourceSchema = z.object({
  exam: z.string().min(2), organization: z.string().min(2), year: z.number().int().min(1980).max(new Date().getFullYear()),
  role: z.string().min(2), booklet: z.string().min(1), number: z.number().int().positive(),
  exam_url: officialUrl, answer_key_url: officialUrl,
  reviewer: z.string().min(2), reviewed_at: z.iso.datetime(), rights_basis: z.string().min(10),
  application_date: z.iso.date(), answer_key_status: z.literal('definitive')
});
const schema = z.array(z.object({
  topic_id: z.enum(topics.map(t => t.id)), prompt: z.string().min(10), options: z.array(z.string().min(1)).min(2).max(5),
  correct_index: z.number().int().min(0).max(4), explanation: z.string().min(15), source: sourceSchema,
  status: z.enum(['published', 'annulled']).default('published')
}).superRefine((q, ctx) => {
  if (q.correct_index >= q.options.length) ctx.addIssue({ code: 'custom', message: 'Gabarito fora das alternativas.' });
  if (new Set(q.options.map(s => s.trim().toLowerCase())).size !== q.options.length) ctx.addIssue({ code: 'custom', message: 'Alternativas duplicadas.' });
})).min(1).max(10000);
export function validateImport(input) {
  const rows = schema.parse(input).map(q => ({ ...q,
    id: createHash('sha256').update(`vunesp:${q.source.exam}:${q.source.application_date}:${q.source.role}:${q.source.booklet}:${q.source.number}`).digest('hex').slice(0,32),
    board_id: 'vunesp', subject_id: topics.find(t => t.id === q.topic_id).subject_id,
    kind: 'official', difficulty: 'concurso', origin: `Vunesp · ${q.source.organization} · ${q.source.year}`, editorial_status: 'reviewed'
  }));
  if (new Set(rows.map(q => q.id)).size !== rows.length) throw new Error('Há questões repetidas para a mesma prova, aplicação, cargo, caderno e número.');
  return rows;
}
