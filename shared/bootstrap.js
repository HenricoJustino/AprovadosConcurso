export function publicBuildConfig(env = {}) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) throw new Error('A configuração pública do Supabase é inválida.');
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
      if (payload.role !== 'anon' || payload.ref && payload.ref !== parsed.hostname.split('.')[0]) throw new Error();
    } catch { throw new Error('Configure somente a chave pública do projeto para o login.'); }
  } else if (!key.startsWith('sb_publishable_')) throw new Error('Configure somente a chave pública do projeto para o login.');
  return { mode: 'supabase', supabaseUrl: url, supabaseAnonKey: key };
}

// O acesso à conta não depende de a API de estudos estar disponível.
export async function resolveAppConfig(buildConfig, fetchConfig) {
  try {
    const response = await fetchConfig();
    if (!response.ok) throw new Error();
    const config = await response.json();
    if (!['demo', 'supabase'].includes(config.mode)) throw new Error();
    if (config.mode === 'supabase' && (!config.supabaseUrl || !config.supabaseAnonKey)) throw new Error();
    return { ...config, apiAvailable: true };
  } catch {
    if (buildConfig) return { ...buildConfig, apiAvailable: false };
    throw new Error('Não foi possível iniciar o sistema. Tente recarregar a página.');
  }
}
