import test from 'node:test';
import assert from 'node:assert/strict';
import { publicBuildConfig, resolveAppConfig } from '../shared/bootstrap.js';

const built = { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
test('login continua disponível se API estiver ausente, sem rede ou retornar HTML', async () => {
  const config = publicBuildConfig(built);
  for (const fetcher of [
    async () => ({ ok: false }),
    async () => { throw new Error('network'); },
    async () => ({ ok: true, json: async () => { throw new Error('HTML'); } })
  ]) {
    const result = await resolveAppConfig(config, fetcher);
    assert.equal(result.mode, 'supabase');
    assert.equal(result.apiAvailable, false);
    assert.equal(result.supabaseUrl, built.VITE_SUPABASE_URL);
  }
});
test('configuração antiga de demonstração nunca libera estudos; login pode usar a configuração pública do build', async () => {
  const result = await resolveAppConfig(publicBuildConfig(built), async () => ({ ok: true, json: async () => ({ mode: 'demo' }) }));
  assert.equal(result.mode, 'supabase');
  assert.equal(result.apiAvailable, false);
  const locked = await resolveAppConfig(null, async () => ({ ok: true, json: async () => ({ mode: 'locked' }) }));
  assert.equal(locked.mode, 'locked');
});
test('configuração ausente tem erro recuperável; chaves de administrador são recusadas', async () => {
  assert.equal(publicBuildConfig({}), null);
  assert.equal((await resolveAppConfig(null, async () => ({ ok: false }))).mode, 'locked');
  assert.throws(() => publicBuildConfig({ ...built, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' }), /pública/);
  const jwt = `eyJ.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.test`;
  assert.throws(() => publicBuildConfig({ ...built, VITE_SUPABASE_PUBLISHABLE_KEY: jwt }), /pública/);
});
