import test from 'node:test';
import assert from 'node:assert/strict';
import project from '../shared/public-project.json' with { type: 'json' };
import { getDatabaseConfig, validateDatabaseConfig } from '../server/config.js';
import { publicBuildConfig } from '../shared/bootstrap.js';

test('publicação inicializa login Google com configuração pública validada sem variáveis da hospedagem', () => {
  assert.ok(project.publicKey.startsWith('sb_publishable_'));
  assert.deepEqual(Object.keys(project).sort(), ['publicKey','url']);
  const server = getDatabaseConfig({ VERCEL: '1', APP_MODE: 'demo' });
  assert.ok(validateDatabaseConfig(server));
  const browser = publicBuildConfig({}, project);
  assert.equal(browser.mode, 'supabase');
  assert.ok(browser.supabaseUrl === server.url && browser.supabaseAnonKey === server.publicKey);
});
test('variáveis explícitas preservam isolamento de ambientes e não combinam chaves entre projetos', () => {
  assert.equal(getDatabaseConfig({}).url, '');
  const override = { VERCEL: '1', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
  assert.equal(getDatabaseConfig(override).publicKey, 'sb_publishable_test');
  assert.equal(getDatabaseConfig({ VERCEL: '1', SUPABASE_URL: '' }).publicKey, '');
  assert.equal(publicBuildConfig({ VITE_SUPABASE_URL: 'https://other.supabase.co' }, project), null);
  assert.throws(() => publicBuildConfig({}, { ...project, publicKey: 'sb_secret_test' }), /pública/);
});
