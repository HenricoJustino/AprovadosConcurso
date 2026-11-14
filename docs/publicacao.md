# Publicação: Vue, Node e Supabase

## O que roda em cada lugar

- O Vue é compilado pelo Vite para `dist` e servido como site.
- A API Express roda em `api/index.js` como função Node na Vercel. As chamadas `/api/*` são encaminhadas pelo `vercel.json`.
- Tabelas, questões, gabaritos e progresso persistente ficam no Supabase. O servidor local não precisa continuar ligado para o site publicado funcionar.
- O login usa a configuração pública compilada no frontend se a API ficar indisponível. O dashboard e o envio de respostas ainda exigem a API; indisponibilidade não vira um histórico fictício.

## Variáveis da hospedagem

Configure nos ambientes Production/Preview utilizados:

```dotenv
APP_MODE=supabase
SUPABASE_URL=<URL do projeto>
SUPABASE_PUBLISHABLE_KEY=<chave pública publishable>
VITE_SUPABASE_URL=<mesma URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<mesma chave pública>
```

As chaves `anon` legadas continuam aceitas. Sem `APP_MODE`, a API seleciona Supabase automaticamente quando encontra URL e chave pública. Uma declaração antiga de `APP_MODE=demo` bloqueia o acesso às APIs. Sem configuração, o sistema usa `mode: "locked"` e continua exigindo login.

As variáveis `VITE_` são públicas e entram no build. Depois de alterá-las, faça novo deploy. Não coloque `service_role`, `sb_secret_...` ou segredos do Google em variáveis `VITE_`. O `.env` local não é enviado ao GitHub ou à hospedagem automaticamente.

Na Vercel, use o diretório raiz do projeto, preset Vite, build `npm run build` e saída `dist`. A pasta `api` deve permanecer na raiz. Publicar somente o conteúdo de `dist` em uma hospedagem estática não publica o backend.

Verifique `/api/health` e `/api/config` após o deploy. A configuração deve retornar JSON e `mode: "supabase"`; uma página HTML/404 indica roteamento errado. `/api/config` expõe apenas a URL e a chave pública necessárias ao cliente.

## Banco

No projeto de destino já verificado, foram aplicadas a estrutura inicial e a proteção dos gabaritos. O acervo importado contém **10.053 questões básicas, 10.053 gabaritos, 17 assuntos e 4 matérias**. Nenhuma questão oficial foi inventada/importada nesta carga.

O checksum de enunciados, opções, classificações, gabaritos e explicações conferido entre fonte local e banco é `3867c945e2825fd18a9f638e26298922`. Os testes transacionais de correção, idempotência e isolamento foram executados e revertidos; nenhuma conta ou resposta de teste foi persistida.

Para reproduzir em **outro banco novo**, executar nesta ordem:

1. `supabase/migrations/001_initial.sql`;
2. `supabase/migrations/002_student_settings.sql`;
3. `supabase/security.sql`;
4. `supabase/seed.sql`.

`npm run seed:sql` regenera o SQL do acervo a partir do catálogo e do gerador local. O seed é reexecutável e não apaga respostas nem questões oficiais. `supabase/tests/rls.sql` valida as políticas usando uma transação que termina em rollback.

## Google

Além de habilitar o provedor com seu cliente OAuth no Supabase, adicione à lista de Redirect URLs do Supabase:

`https://aprovadosconcurso.vercel.app/auth/callback`

O callback autorizado no Google Cloud é o do Supabase, não o endereço acima. Veja [login-google.md](login-google.md). Habilitação do provedor e credenciais OAuth não são definidas pela migração das tabelas.
