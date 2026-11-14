import { createClient } from '@supabase/supabase-js';
import { browserAuthOptions } from '../shared/auth.js';
import { publicBuildConfig, resolveAppConfig } from '../shared/bootstrap.js';
export let supabase = null;
export async function configure() {
  const config = await resolveAppConfig(publicBuildConfig(import.meta.env), () => fetch('/api/config', { signal: AbortSignal.timeout(8000) }));
  if (config.mode === 'supabase') supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: browserAuthOptions });
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
