# Aprovados Concursos

Sistema local em **Vue 3 + Vite**, **Node.js + Express** e **Supabase (PostgreSQL + Auth + RLS)**. Inicialmente apenas Vunesp. Bancas, matérias e assuntos têm identificadores próprios para permitir expansão.

**Login Google:** botão de acesso, sessão persistente, dashboard/histórico separados por usuário e meta diária pessoal. Consulte [configuração do Google e Supabase](docs/login-google.md). Execute também a migração `002_student_settings.sql`.

**Verificar a configuração preenchida no `.env`:** `npm.cmd run check:supabase`. A API aceita chave pública nova `SUPABASE_PUBLISHABLE_KEY` ou a chave anon legada, inclusive pelos nomes equivalentes `VITE_`. Valores reais não devem ser colocados no `.env.example` nem enviados ao GitHub.

## Iniciar no Windows

Requisito: Node.js 22.18 ou superior. No terminal do VS Code, dentro desta pasta:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Abra **http://127.0.0.1:5173**. A API fica em **http://127.0.0.1:3001**. `npm.cmd` evita o bloqueio do arquivo npm.ps1 no PowerShell. Se a porta já estiver ocupada, encerre a instância anterior ou ajuste a porta e o proxy em `vite.config.js`.

O modo padrão é `demo`: funciona sem chaves, permite estudar, corrigir, revisar e ver o dashboard. O histórico fica no `localStorage` deste navegador. Não é um ambiente multiusuário autenticado. A conta Supabase é necessária para sincronizar entre dispositivos. O histórico local não migra automaticamente para contas.

Para servir a compilação pelo Node:

```powershell
npm.cmd run build
npm.cmd start
```

Abra http://127.0.0.1:3001. O servidor escuta somente no loopback por padrão. Para publicação, configurar HTTPS, domínio, política de origens, observabilidade e processo de execução conforme o provedor; nada foi publicado automaticamente.

## Jornada do aluno

1. **Bancas e matérias**: Vunesp, Português, Matemática, Raciocínio Lógico e Informática.
2. **Conceito**: uma explicação curta, exemplo e dica por assunto.
3. **Prática básica**: alternativas, correção após envio e explicação imediata.
4. **Etapa oficial**: exige 5 questões básicas distintas e pelo menos 70% de acerto no mesmo assunto. Usa a última tentativa de cada questão; repetir uma questão não aumenta o número distinto. No Supabase essa regra também é aplicada no banco, não somente na tela.
5. **Caderno de erros**: última tentativa incorreta; um acerto na revisão tira a questão do caderno.
6. **Dashboard**: tentativas, acertos e erros separados por básico/oficial, taxa por matéria, tempo ativo até confirmar resposta, atividade em 7 dias e meta diária (Brasília).

O dashboard considera todas as tentativas, incluindo revisões. A liberação da etapa oficial usa questões distintas. O tempo é declarado pelo navegador e não é uma métrica antifraude. No modo demo, a meta diária fica neste navegador; no modo Supabase, pertence à conta e é sincronizada no banco.

## Acervo inicial: 10.053 questões básicas

| Conteúdo | Quantidade | Origem |
| --- | ---: | --- |
| Matemática: operações, porcentagem, equações, médias e proporções | 7.500 | Exercícios parametrizados de 6 modelos |
| Lógica: sequências e princípio multiplicativo | 2.500 | Exercícios parametrizados de 2 modelos |
| Português | 33 | Questões autorais introdutórias |
| Proposições lógicas | 5 | Questões autorais introdutórias |
| Informática | 15 | Questões autorais introdutórias |
| **Oficiais Vunesp já carregadas** | **0** | Aguardam documentos e revisão |

São **10.000 variações de 8 modelos**, com enunciados únicos e gabarito calculado, mais 53 introdutórias. Não são 10.000 conteúdos diferentes nem 10.000 questões oficiais. A distribuição inicial é concentrada em matemática/lógica; não representa a distribuição de nenhum edital. O conteúdo autoral está identificado como curadoria inicial ou parametrizado e ainda demanda revisão pedagógica independente. Não há garantia de cobertura completa de edital.

Os testes recalculam independentemente as 10 mil respostas a partir dos dados do enunciado, verificam duplicações e integridade dos vínculos. Isso verifica o cálculo, não substitui revisão pedagógica.

## Conectar ao Supabase

1. Crie seu projeto Supabase.
2. Execute `supabase/migrations/001_initial.sql` no SQL Editor **uma vez**, em banco novo. Depois execute `002_student_settings.sql`. Os scripts criam tabelas, índices, políticas e funções.
3. Em `.env`, configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`. Para popular/importar questões, configure também `SUPABASE_SERVICE_ROLE_KEY`.
4. Execute `npm.cmd run seed`. As 10.053 questões, matérias e conceitos serão enviados em lotes de 200. O seed pode ser repetido: IDs são determinísticos e respostas existentes não são apagadas. Cada lote é atômico, não o seed inteiro; após falha, execute novamente.
5. Altere `APP_MODE=supabase` e reinicie `npm.cmd run dev`.
6. Cadastre uma conta pela interface. Se a confirmação por e-mail estiver ativa, confirme antes de entrar. Configure as URLs de redirecionamento e os e-mails no painel do Supabase conforme o ambiente.

As variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_ANON_KEY` são alternativas públicas aceitas pelo servidor. O navegador recebe as configurações públicas da API em `/api/config`. A chave `service_role` é utilizada **apenas pelos scripts administrativos**, nunca pelo servidor de respostas nem pelo frontend. Não compartilhe o `.env` nem o adicione ao Git.

### Segurança do banco

- Enunciados e alternativas ficam em `public.questions`; gabarito e explicação, em `private.question_keys`.
- Alunos autenticados apenas leem questões publicadas e o próprio histórico.
- A função `submit_answer` valida o usuário, corrige, verifica os pré-requisitos e grava o resultado em transação.
- Repetir uma requisição com o mesmo `request_id` não cria outra tentativa no Supabase.
- Alunos não podem inserir/editar tentativas ou questões diretamente. A importação é exclusiva de `service_role`.
- A API valida JWT no servidor com `auth.getUser`, e acessa o banco com o token do aluno para manter RLS.
- Não exponha o modo demo na internet como produto com contas; ele não tem isolamento/autenticação de alunos.

## Questões oficiais de provas anteriores

Fonte inicial verificada: [Vunesp — TJSP2401, Escrevente 2024](https://www.vunesp.com.br/TJSP2401), seção Provas e Gabaritos. Essa referência **não implica** que o conteúdo foi copiado ou importado. Aplicações diferentes e versões de caderno devem ser tratadas separadamente, incluindo reaplicações e anulações.

O sistema não inventa questões oficiais e não faz scraping de plataformas de terceiros. Para popular o banco oficial, é necessário obter os cadernos e os gabaritos definitivos na fonte oficial, verificar as condições de reprodução, transcrever/conferir e classificar. O importador valida os metadados declarados; **não autentica automaticamente a veracidade dos documentos nem a autorização de uso**. A aprovação é responsabilidade da revisão editorial.

Para auxiliar a transcrição de um PDF local com texto:

```powershell
npm.cmd run extract:pdf -- prova.pdf rascunho.txt
```

A extração cria somente um rascunho. PDFs escaneados exigem OCR externo e revisão. Questões com figuras/tabelas precisam de transcrição textual fiel: esta primeira versão não possui upload de imagens para questões. Não publique questões que dependem de uma figura ausente.

Veja o formato em [docs/importacao.md](docs/importacao.md). Depois de montar um JSON revisado:

```powershell
npm.cmd run import:questions -- prova-revisada.json --dry-run
npm.cmd run import:questions -- prova-revisada.json
```

O primeiro comando valida sem gravar. O segundo exige a chave administrativa e envia lotes atômicos. Questões anuladas usam `status: "annulled"` e não são exibidas. IDs consideram concurso, data de aplicação, cargo, caderno e número. Reimportações não alteram enunciado/gabarito de questões já respondidas; para correções editoriais, crie um processo de revisão de estatísticas antes de mudar respostas históricas.

## Estrutura

```text
src/                  Interface Vue e cliente da API
server/               API e geração do banco autoral
shared/               Matérias, conceitos e cálculo de progresso
supabase/migrations/  SQL do banco, RLS e funções transacionais
scripts/              Seed, validação, importação e extração de PDF
tests/                Conteúdo, progresso, API e importação
docs/                 Contrato de importação e verificação manual
```

## Verificação

```powershell
npm.cmd test
npm.cmd run build
```

Sem dependências instaladas, os testes do conteúdo e do progresso ainda funcionam:

```powershell
node --test tests/content.test.js tests/progress.test.js
```

Os testes de prática usam o modo demo automaticamente; não usam o banco real do `.env`. O banco requer verificação em projeto Supabase real, conforme [docs/verificacao.md](docs/verificacao.md) e [docs/login-google.md](docs/login-google.md). Não considere a migração validada em produção apenas porque os testes locais passaram.
