import publicProject from '../shared/public-project.json' with { type: 'json' };

export function getDatabaseConfig(env = process.env) {
  const config = {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    publicKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''
  };
  const supplied = ['SUPABASE_URL','VITE_SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY'].some(key => Object.hasOwn(env, key));
  // Configuração pública do projeto publicado; variáveis explícitas têm prioridade.
  return env.VERCEL && !supplied ? { ...publicProject } : config;
}
export function validateDatabaseConfig(config) {
  if (!config.url || !config.publicKey) throw new Error('Configure a URL e a chave pública do Supabase no .env.');
  let url;
  try { url = new URL(config.url); } catch { throw new Error('A URL do Supabase é inválida.'); }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use a URL HTTPS do seu projeto *.supabase.co, sem caminho adicional.');
  }
  if (config.publicKey.startsWith('sb_secret_')) throw new Error('Use a chave publishable/anon. Uma chave secreta não pode ser enviada ao navegador.');
  if (config.publicKey.startsWith('eyJ')) {
    let payload;
    try { payload = JSON.parse(Buffer.from(config.publicKey.split('.')[1], 'base64url')); } catch { throw new Error('Formato de chave anon inválido.'); }
    if (payload.role !== 'anon') throw new Error('A chave pública deve ter papel anon; não use service_role.');
    if (payload.ref && payload.ref !== url.hostname.split('.')[0]) throw new Error('A URL e a chave anon pertencem a projetos diferentes.');
  } else if (!config.publicKey.startsWith('sb_publishable_')) throw new Error('Formato de chave pública não reconhecido.');
  return config;
}
