import { createClient } from '@supabase/supabase-js';
export let supabase = null;
export async function configure() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Não foi possível conectar à API. Inicie npm run dev.');
  const config = await response.json();
  if (config.mode === 'supabase') supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return config;
}
export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`/api${path}`, { ...options, headers });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Ocorreu um erro. Tente novamente.');
  return result;
}
