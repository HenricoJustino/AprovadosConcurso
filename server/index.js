import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { boards, subjects, topics, officialSources } from '../shared/catalog.js';
import { questions, questionMap, publicQuestion } from './content.js';

export const app = express();
export const mode = process.env.APP_MODE || 'demo';
if (!['demo', 'supabase'].includes(mode)) throw new Error('APP_MODE deve ser demo ou supabase.');
if (mode === 'supabase' && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY.');
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], connectSrc: ["'self'", 'https://*.supabase.co'], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"] } } }));
app.use(express.json({ limit: '5mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas requisições. Aguarde um minuto.' } }));
app.get('/api/health', (req, res) => res.json({ ok: true, mode }));
app.get('/api/config', (req, res) => res.json({ mode, supabaseUrl: mode === 'supabase' ? process.env.SUPABASE_URL : null, supabaseAnonKey: mode === 'supabase' ? process.env.SUPABASE_ANON_KEY : null }));
app.get('/api/catalog', (req, res) => res.json({ boards, subjects, topics, officialSources }));
app.use('/api', async (req, res, next) => {
  if (mode === 'demo') return next();
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'Entre na sua conta para estudar.' });
  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    req.db = db; req.user = data.user;
    next();
  } catch (error) { next(error); }
});
app.get('/api/inventory', async (req, res, next) => {
  try {
    if (mode === 'demo') return res.json({ total: questions.length, basic: questions.length, official: 0, generated: 10000, curated: questions.length - 10000 });
    const { data, error } = await req.db.rpc('question_inventory');
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});
const filterSchema = z.object({ topic: z.string().optional(), subject: z.string().optional(), kind: z.enum(['basic', 'official']).default('basic'), offset: z.coerce.number().int().min(0).max(1000000).default(0) });
app.get('/api/questions', async (req, res, next) => {
  try {
    const filter = filterSchema.parse(req.query);
    if (mode === 'demo') {
      const result = questions.filter(q => q.kind === filter.kind && (!filter.topic || q.topic_id === filter.topic) && (!filter.subject || q.subject_id === filter.subject));
      return res.json({ questions: result.slice(filter.offset, filter.offset + 20).map(publicQuestion), total: result.length });
    }
    let query = req.db.from('questions').select('*', { count: 'exact' }).eq('board_id', 'vunesp').eq('kind', filter.kind).eq('status', 'published').order('id').range(filter.offset, filter.offset + 19);
    if (filter.topic) query = query.eq('topic_id', filter.topic);
    if (filter.subject) query = query.eq('subject_id', filter.subject);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ questions: data, total: count });
  } catch (error) { next(error); }
});
app.get('/api/questions/:id', async (req, res, next) => {
  try {
    if (mode === 'demo') {
      const q = questionMap.get(req.params.id);
      return q ? res.json(publicQuestion(q)) : res.status(404).json({ error: 'Questão não encontrada.' });
    }
    const { data, error } = await req.db.from('questions').select('*').eq('id', req.params.id).eq('status', 'published').single();
    if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Questão não disponível para revisão.' });
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});
const answerSchema = z.object({ questionId: z.string().min(1).max(100), selectedIndex: z.number().int().min(0).max(4), elapsedSeconds: z.number().int().min(0).max(3600), requestId: z.uuid() });
app.post('/api/answers', async (req, res, next) => {
  try {
    const input = answerSchema.parse(req.body);
    if (mode === 'demo') {
      const q = questionMap.get(input.questionId);
      if (!q) return res.status(404).json({ error: 'Questão não encontrada.' });
      if (input.selectedIndex >= q.options.length) return res.status(400).json({ error: 'Alternativa inválida.' });
      // No modo local o navegador persiste o histórico. O servidor calcula o resultado.
      return res.json({ id: randomUUID(), request_id: input.requestId, question_id: q.id, selected_index: input.selectedIndex,
        kind: q.kind, topic_id: q.topic_id, subject_id: q.subject_id, correct: input.selectedIndex === q.correct_index,
        correct_index: q.correct_index, explanation: q.explanation, elapsed_seconds: input.elapsedSeconds, created_at: new Date().toISOString() });
    }
    const { data, error } = await req.db.rpc('submit_answer', { p_question_id: input.questionId, p_selected_index: input.selectedIndex, p_elapsed_seconds: input.elapsedSeconds, p_request_id: input.requestId });
    if (error) { const e = new Error(error.message); e.status = ['42501','22023','P0002'].includes(error.code) ? 400 : 500; throw e; }
    res.json(data);
  } catch (error) { next(error); }
});
app.get('/api/attempts', async (req, res, next) => {
  try {
    if (mode === 'demo') return res.json({ attempts: [], message: 'O histórico da demonstração fica neste navegador.' });
    // Paginação explícita evita o limite padrão de 1.000 linhas do PostgREST.
    const page = z.coerce.number().int().min(0).max(100000).parse(req.query.page || 0);
    const { data, error } = await req.db.from('attempts').select('*').order('created_at').order('id').range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    res.json({ attempts: data, hasMore: data.length === 1000 });
  } catch (error) { next(error); }
});
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'Rota não encontrada.' }) : res.sendFile(`${dist}/index.html`));
}
app.use((error, req, res, next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos.', details: error.issues.map(i => i.message) });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Arquivo muito grande.' });
  console.error(error.message);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível concluir. Verifique a conexão e tente novamente.' });
});
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`Aprovados API: http://127.0.0.1:${process.env.PORT || 3001} (${mode})`));
}
