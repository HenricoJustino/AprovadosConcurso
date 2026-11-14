import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
export function adminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env. Não coloque a chave service_role no frontend.');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function check(result) { if (result.error) throw new Error(result.error.message); return result.data; }
export async function uploadQuestions(db, questions) {
  for (let i = 0; i < questions.length; i += 200) check(await db.rpc('admin_import_questions', { p_questions: questions.slice(i, i + 200) }));
}
