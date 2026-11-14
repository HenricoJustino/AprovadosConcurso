import 'dotenv/config';
import { getDatabaseConfig, validateDatabaseConfig } from '../server/config.js';

async function main() {
  const config = validateDatabaseConfig(getDatabaseConfig());
  console.log('Formato local: URL e chave pública compatíveis. Valores não exibidos.');
  const request = path => fetch(new URL(path, config.url), {
    headers: { apikey: config.publicKey }, signal: AbortSignal.timeout(8000)
  });
  let response;
  try { response = await request('/auth/v1/settings'); }
  catch { throw new Error('Não foi possível acessar o Supabase pela rede desta sessão. A validade remota das chaves não foi confirmada.'); }
  if (!response.ok) throw new Error(`O Supabase rejeitou a consulta de autenticação (HTTP ${response.status}). Verifique a URL e a chave pública.`);
  const settings = await response.json();
  console.log('Conexão com Supabase Auth: confirmada com a chave pública configurada.');
  console.log(`Provedor Google: ${settings.external?.google ? 'habilitado' : 'ainda não habilitado no painel Supabase'}.`);
  let missing = false;
  for (const table of ['questions', 'attempts', 'student_settings']) {
    const result = await request(`/rest/v1/${table}?select=*&limit=0`);
    const body = await result.json();
    if (result.ok) {
      if (Array.isArray(body) && body.length === 0) console.log(`Tabela ${table}: endpoint acessível; isolamento exige teste autenticado com duas contas.`);
      else console.log(`Tabela ${table}: resposta recebida; conferir políticas no painel.`);
    } else if (body.code === '42501') console.log(`Tabela ${table}: reconhecida, acesso anônimo negado como esperado.`);
    else if (body.code === 'PGRST205') { missing = true; console.log(`Tabela ${table}: não encontrada. Execute as migrações pendentes.`); }
    else { missing = true; console.log(`Tabela ${table}: não confirmada (HTTP ${result.status}).`); }
  }
  if (missing) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
