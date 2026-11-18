import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { boards, subjects, topics, officialSources } from '../shared/catalog.js';
import { getDatabaseConfig, validateDatabaseConfig } from './config.js';
import { loadMixedPractice } from './practice.js';

export const app = express();
const databaseConfig = getDatabaseConfig();
// Falta de configuração nunca libera um modo público de estudos.
export const mode = (process.env.VERCEL || process.env.APP_MODE !== 'demo') && databaseConfig.url && databaseConfig.publicKey ? 'supabase' : 'locked';
if (mode === 'supabase') validateDatabaseConfig(databaseConfig);
if (process.env.VERCEL) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], connectSrc: ["'self'", 'https://*.supabase.co'], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"] } } }));
app.use(express.json({ limit: '5mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas requisições. Aguarde um minuto.' } }));
app.get('/api/health', (req, res) => res.json({ ok: true, mode }));
app.get('/api/config', (req, res) => res.json({ mode, supabaseUrl: mode === 'supabase' ? databaseConfig.url : null, supabaseAnonKey: mode === 'supabase' ? databaseConfig.publicKey : null }));
app.use('/api', async (req, res, next) => {
  if (mode !== 'supabase') return res.status(401).json({ error: 'O acesso exige login. A autenticação está aguardando configuração.' });
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'Entre na sua conta para estudar.' });
  try {
    const db = createClient(databaseConfig.url, databaseConfig.publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    req.db = db; req.user = data.user;
    next();
  } catch (error) { next(error); }
});
app.get('/api/catalog', (req, res) => res.json({ boards, subjects, topics, officialSources }));
app.get('/api/inventory', async (req, res, next) => {
  try {
    const { data, error } = await req.db.rpc('question_inventory');
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});
// Applied exams are a separate collection from the basic learning path.
app.get('/api/exams', async (req, res, next) => {
  try {
    const { data, error } = await req.db.from('official_exams').select('*').eq('status','published').order('application_date',{ascending:false}).order('id');
    if (error?.code === 'PGRST205' || error?.code === '42P01') return res.json({exams:[]});
    if (error) throw error;
    res.json({exams:data});
  } catch(error) { next(error); }
});
const examId = z.string().regex(/^[A-Za-z0-9-]{1,150}$/);
app.get('/api/exams/:exam/questions', async (req,res,next) => {
  try {
    const id = examId.parse(req.params.exam);
    const {data:exam,error:examError} = await req.db.from('official_exams').select('id,total_questions').eq('id',id).eq('status','published').maybeSingle();
    if (examError) throw examError;
    if (!exam) return res.status(404).json({error:'Prova não disponível.'});
    const rows=[];
    for (let offset=0;offset<exam.total_questions;offset+=500) {
      const {data,error} = await req.db.from('questions').select('*').eq('exam_id',id).eq('kind','official').eq('status','published').order('question_number').range(offset,offset+499);
      if(error) throw error;
      rows.push(...data);
      if(data.length<500) break;
    }
    const names={portugues:'Língua Portuguesa',matematica:'Matemática',gerais:'Conhecimentos Gerais',informatica:'Informática',administracao:'Administração Pública'};
    res.json({questions:rows.map(q=>({...q,subject_name:names[q.subject_id] || q.subject_id}))});
  } catch(error) { next(error); }
});
app.get('/api/exams/:exam/pages/:page', async(req,res,next)=>{
  try {
    const id=examId.parse(req.params.exam), page=z.coerce.number().int().min(1).max(1000).parse(req.params.page);
    const {data,error}=await req.db.from('exam_pages').select('page_number,image_data,alt').eq('exam_id',id).eq('page_number',page).maybeSingle();
    if(error) throw error;
    if(!data) return res.status(404).json({error:'Página original não disponível.'});
    res.set('Cache-Control','private, max-age=3600').json(data);
  } catch(error) { next(error); }
});
app.get('/api/question-counts', async (req, res, next) => {
  try {
    // Counts use the authenticated student's RLS context and reflect only published questions.
    const counts = {};
    for (const topic of topics) {
      const { count, error } = await req.db.from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', 'vunesp').eq('kind', 'basic')
        .eq('status', 'published').eq('topic_id', topic.id);
      if (error) throw error;
      counts[topic.id] = count || 0;
    }
    res.json({ topics: counts });
  } catch (error) { next(error); }
});
app.get('/api/preferences', async (req, res, next) => {
  try {
    const { data, error } = await req.db.from('student_settings').select('daily_goal').eq('user_id', req.user.id).maybeSingle();
    if (error) throw error;
    res.json({ dailyGoal: data?.daily_goal ?? 20 });
  } catch (error) { next(error); }
});
app.put('/api/preferences', async (req, res, next) => {
  try {
    const { dailyGoal } = z.object({ dailyGoal: z.number().int().min(5).max(200) }).strict().parse(req.body);
    // A identidade sempre vem do JWT validado; nunca do corpo enviado pelo aluno.
    const { data, error } = await req.db.from('student_settings').upsert({ user_id: req.user.id, daily_goal: dailyGoal }).select('daily_goal').single();
    if (error) throw error;
    res.json({ dailyGoal: data.daily_goal });
  } catch (error) { next(error); }
});
const filterSchema = z.object({ topic: z.string().optional(), subject: z.string().optional(), kind: z.enum(['basic', 'official']).default('basic'), order: z.enum(['id', 'mixed']).default('id'), offset: z.coerce.number().int().min(0).max(1000000).default(0) });
app.get('/api/questions', async (req, res, next) => {
  try {
    const filter = filterSchema.parse(req.query);
    if (filter.order === 'mixed') {
      if (filter.kind !== 'basic' || !filter.topic) return res.status(400).json({ error: 'Escolha um assunto para praticar.' });
      return res.json(await loadMixedPractice(req.db, req.user.id, filter));
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
    const { data, error } = await req.db.rpc('submit_answer', { p_question_id: input.questionId, p_selected_index: input.selectedIndex, p_elapsed_seconds: input.elapsedSeconds, p_request_id: input.requestId });
    if (error) { const e = new Error(error.message); e.status = ['42501','22023','P0002'].includes(error.code) ? 400 : 500; throw e; }
    res.json(data);
  } catch (error) { next(error); }
});
app.get('/api/attempts', async (req, res, next) => {
  try {
    // Paginação explícita evita o limite padrão de 1.000 linhas do PostgREST.
    const page = z.coerce.number().int().min(0).max(100000).parse(req.query.page || 0);
    const { data, error } = await req.db.from('attempts').select('*').eq('user_id', req.user.id).order('created_at').order('id').range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    res.json({ attempts: data, hasMore: data.length === 1000 });
  } catch (error) { next(error); }
});
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
if (!process.env.VERCEL && existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'Rota não encontrada.' }) : res.sendFile(`${dist}/index.html`));
}
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
app.use((error, req, res, next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos.', details: error.issues.map(i => i.message) });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Arquivo muito grande.' });
  console.error(error.message);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível concluir. Verifique a conexão e tente novamente.' });
});
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`Aprovados API: http://127.0.0.1:${process.env.PORT || 3001} (${mode})`));
}
