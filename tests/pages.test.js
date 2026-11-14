import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

test('login isolado não oferece navegação ou demonstração; perfil renderiza campos e e-mail da conta', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: Login } = await server.ssrLoadModule('/src/components/LoginPage.vue');
    for (const mode of ['locked', 'supabase']) {
      const html = await renderToString(createSSRApp({ render: () => h(Login, { config: { mode } }) }));
      assert.match(html, /Bom ter você aqui/);
      assert.doesNotMatch(html, /Continuar na demonstração|Bancas e matérias|Banco de questões/);
      if (mode === 'supabase') assert.match(html, /Entrar na minha conta/);
      else assert.match(html, /Seu acesso está protegido/);
    }
    const { default: Profile } = await server.ssrLoadModule('/src/components/StudentProfile.vue');
    const html = await renderToString(createSSRApp({ render: () => h(Profile, { user: { id: 'test', email: 'aluno@example.test', user_metadata: { full_name: 'Aluno Teste' } }, auth: {} }) }));
    for (const field of ['Nome completo', 'Telefone', 'Cidade', 'Seu objetivo', 'aluno@example.test', 'Salvar alterações']) assert.ok(html.includes(field), field);
  } finally { await server.close(); }
});
