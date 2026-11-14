# Login Google e contas individuais

O login usa Supabase Auth com OAuth/PKCE. Não é necessário criar ou armazenar senhas Google no sistema. O usuário escolhe sua conta no Google e volta para `/auth/callback`; o SDK restaura a sessão. Nome e e-mail vêm da identidade autenticada. Tentativas e meta diária pertencem ao `auth.users.id`, nunca ao e-mail enviado por um formulário.

## Banco e variáveis

1. Execute `001_initial.sql` se for um banco novo e depois `002_student_settings.sql` no SQL Editor do projeto. Em banco já configurado, execute somente a migração 002 pendente.
2. Copie `.env.example` para `.env` **apenas se ainda não houver um `.env`**. Não sobrescreva suas credenciais existentes.
3. Preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (formato novo `sb_publishable_...`) **ou** `SUPABASE_ANON_KEY` (JWT legado com papel `anon`). Os nomes equivalentes `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_ANON_KEY` também são aceitos.
4. Ative `APP_MODE=supabase` e reinicie o servidor. O `.env` não vai ao Git; `.env.example` deve conter somente nomes e exemplos vazios.
5. Rode `npm.cmd run check:supabase`. O comando verifica formato, conexão Auth, se o Google está habilitado e se as tabelas são reconhecidas. Não exibe valores das chaves. Formato válido sozinho não prova que uma chave é aceita pelo servidor.

A chave `SUPABASE_SERVICE_ROLE_KEY` continua exclusiva do seed/importador. Não é necessária para login ou para ler/gravar o próprio progresso. A API recusa chaves secretas e JWTs de administrador nos campos públicos.

## Google Cloud e Supabase

1. No Google Cloud, configure a tela de consentimento OAuth com o nome/domínio do aplicativo. Enquanto estiver em teste, inclua os e-mails de teste permitidos conforme as regras do projeto Google.
2. Crie um cliente OAuth do tipo **Aplicativo da Web**.
3. Nos URIs autorizados de redirecionamento do cliente Google, adicione a URL exibida no painel Supabase para o provedor Google: normalmente `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
4. Em Supabase > Authentication > Sign In / Providers > Google, habilite o provedor e informe o Client ID e Client Secret do Google. O Client Secret fica apenas no Supabase, nunca no frontend, no `.env.example` ou no GitHub.
5. Em Authentication > URL Configuration, configure o Site URL e adicione à lista de Redirect URLs as URLs do aplicativo efetivamente utilizadas:

| Ambiente | Redirect URL do aplicativo |
| --- | --- |
| Vite local | `http://127.0.0.1:5173/auth/callback` |
| Vite com localhost | `http://localhost:5173/auth/callback` |
| Compilação servida pelo Node | `http://127.0.0.1:3001/auth/callback` |
| Produção | `https://SEU-DOMINIO/auth/callback` |

O callback cadastrado no **Google** é o endereço do **Supabase**. As URLs de retorno cadastradas no **Supabase** são as do **Aprovados**. Não são intercambiáveis. Use exatamente a mesma origem na qual iniciou o login; o PKCE precisa do armazenamento daquele navegador/origem.

## Isolamento e verificação

- A API valida o JWT com `auth.getUser`. As consultas usam o token do aluno e as políticas RLS.
- `attempts` já restringe leitura ao próprio usuário. `student_settings` restringe leitura, inserção e alteração da meta ao dono.
- Ao sair ou trocar de conta, o histórico e as questões em memória são limpos. Respostas de requisições antigas são descartadas pela versão da sessão.
- A demonstração não é uma conta pessoal. Seu histórico local não migra automaticamente para o usuário Google.
- Sessões persistem no mesmo navegador. Em computador compartilhado, o aluno deve sair da conta ao terminar. O botão sair encerra a sessão local deste aplicativo.

Teste real após configuração: entre com Google A, responda uma questão e altere a meta; saia, entre com Google B e confirme histórico vazio e meta padrão; volte à conta A e confirme a persistência. Em duas abas, sair em uma deve atualizar a outra. Cancele o consentimento e confirme a mensagem de cancelamento. Tente novamente e confirme o retorno ao dashboard sem código/token na URL.

Os testes automatizados verificam o contrato OAuth, as mensagens de erro, a invalidação de requisições ao trocar conta, a validação das chaves e as regras da API. A conclusão real do login Google e as políticas do banco remoto dependem da configuração dos projetos e de testes com contas reais.

Referências: [Supabase: login Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls).
