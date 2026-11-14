import test from 'node:test';
import assert from 'node:assert/strict';
import { browserAuthOptions, signInWithGoogle, googleSignInOptions, callbackError, createSessionScope } from '../shared/auth.js';
import { getDatabaseConfig, validateDatabaseConfig } from '../server/config.js';

test('Google usa PKCE, escolha de conta e retorno na mesma origem', () => {
  assert.equal(browserAuthOptions.flowType, 'pkce');
  assert.equal(browserAuthOptions.detectSessionInUrl, true);
  assert.equal(googleSignInOptions('http://127.0.0.1:5173').options.redirectTo, 'http://127.0.0.1:5173/auth/callback');
  const options = googleSignInOptions('https://estudos.example/');
  assert.equal(options.provider, 'google');
  assert.equal(options.options.queryParams.prompt, 'select_account');
  assert.equal(options.options.redirectTo, 'https://estudos.example/auth/callback');
  assert.throws(() => googleSignInOptions('http://estudos.example'));
});
test('login Google encaminha contrato ao SDK e trata falhas e ambiente sem login', async () => {
  let received;
  const auth = { signInWithOAuth: async options => { received = options; return { data: { url: 'https://accounts.google.com/' }, error: null }; } };
  assert.equal(await signInWithGoogle(auth, 'https://estudos.example'), 'https://accounts.google.com/');
  assert.equal(received.provider, 'google');
  await assert.rejects(() => signInWithGoogle(null, 'https://estudos.example'), /não está disponível/);
  await assert.rejects(() => signInWithGoogle({ signInWithOAuth: async () => ({ error: new Error('provider disabled') }) }, 'https://estudos.example'), /Não foi possível iniciar/);
});
test('callback apresenta mensagem segura sem refletir texto arbitrário da URL', () => {
  assert.match(callbackError('https://app.example/auth/callback?error=access_denied'), /cancelado/);
  assert.match(callbackError('https://app.example/#error=server_error&error_description=SECRET'), /Não foi possível/);
  assert.equal(callbackError('https://app.example/?code=secret'), '');
  assert.equal(callbackError('https://app.example/?error_description=SECRET').includes('SECRET'), false);
});
test('trocar usuário ou sair invalida respostas assíncronas da sessão anterior', () => {
  const scope = createSessionScope();
  const pendingUserA = scope.capture();
  scope.invalidate();
  const pendingUserB = scope.capture();
  assert.equal(scope.isCurrent(pendingUserA), false);
  assert.equal(scope.isCurrent(pendingUserB), true);
  scope.invalidate();
  assert.equal(scope.isCurrent(pendingUserB), false);
});
test('API aceita nomes VITE e publishable, priorizando configuração do servidor', () => {
  const fallback = getDatabaseConfig({ VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' });
  assert.deepEqual(validateDatabaseConfig(fallback), fallback);
  assert.equal(getDatabaseConfig({ SUPABASE_URL: 'server', VITE_SUPABASE_URL: 'client' }).url, 'server');
});
test('chaves privadas ou de projeto diferente nunca são enviadas ao navegador', () => {
  const jwt = payload => `eyJ.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test`;
  assert.throws(() => validateDatabaseConfig({ url: 'https://test.supabase.co', publicKey: 'sb_secret_test' }), /secreta/);
  assert.throws(() => validateDatabaseConfig({ url: 'https://test.supabase.co', publicKey: jwt({ role: 'service_role', ref: 'test' }) }), /anon/);
  assert.throws(() => validateDatabaseConfig({ url: 'https://test.supabase.co', publicKey: jwt({ role: 'anon', ref: 'other' }) }), /diferentes/);
  assert.throws(() => validateDatabaseConfig({ url: 'https://example.com', publicKey: 'sb_publishable_test' }), /supabase.co/);
});
