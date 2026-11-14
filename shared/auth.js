export const browserAuthOptions = Object.freeze({
  flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true
});

export function googleSignInOptions(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('O login exige HTTPS, exceto no ambiente local.');
  }
  return { provider: 'google', options: {
    redirectTo: new URL('/auth/callback', url.origin).href,
    queryParams: { prompt: 'select_account' }
  } };
}

export async function signInWithGoogle(auth, origin) {
  if (!auth) throw new Error('O login ainda não está disponível neste ambiente.');
  const { data, error } = await auth.signInWithOAuth(googleSignInOptions(origin));
  if (error) throw new Error('Não foi possível iniciar o login com Google. Tente novamente ou entre com seu e-mail.');
  if (!data?.url) throw new Error('O serviço de login não retornou o redirecionamento esperado.');
  return data.url;
}

export function callbackError(url) {
  const current = new URL(url);
  const hash = new URLSearchParams(current.hash.slice(1));
  const code = current.searchParams.get('error') || hash.get('error');
  if (!code && !current.searchParams.has('error_description') && !hash.has('error_description')) return '';
  return code === 'access_denied' ? 'O login foi cancelado. Você pode tentar novamente.'
    : 'Não foi possível concluir o login. Tente entrar novamente.';
}

// Invalida requisições pendentes quando a conta muda, inclusive em outra aba.
export function createSessionScope() {
  let version = 0;
  return { capture: () => version, isCurrent: value => value === version, invalidate: () => ++version };
}
