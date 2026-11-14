# Verificação manual

## Interface

1. Sem sessão, abra `/`, `/perfil` e tente acessar questões. Somente o login deve aparecer e a API deve retornar 401. Entre com uma conta nova e abra o dashboard. Todos os números de desempenho devem estar zerados, sem dados fictícios.
2. Abra Bancas e matérias > Português > Regência verbal. Leia e marque a confirmação de leitura; só então inicie a prática.
3. Responda incorretamente e veja explicação, alternativa correta e atualização de erros. Recarregue: o histórico deve ser recuperado da conta no Supabase.
4. Revise no Caderno de erros e acerte. A questão deve sair da lista, mas ambas as tentativas continuam no dashboard.
5. Responda 5 questões básicas distintas com 4 acertos. A etapa oficial do assunto deve liberar. Repetir uma mesma questão não deve bastar.
6. Sem importação oficial, mostre estado vazio com explicação e acesso às fontes. Nenhum exercício autoral deve aparecer como oficial.
7. Verifique filtros por matéria, busca de assunto, próxima questão após a vigésima, exportação e alteração da meta.
8. Em 390px de largura, confira menu lateral, alternativas, botões e textos sem rolagem horizontal. Use teclado e foco visível.

## Supabase (projeto de teste)

1. Execute a migração em banco novo, faça seed e repita o seed. A quantidade deve continuar em 10.053.
2. Crie dois usuários. Cada um só deve ler as próprias linhas de `attempts`.
3. Sem autenticação, tentar ler questões e tentativas deve falhar/não retornar linhas.
4. Com token de aluno, tentar inserir/alterar tentativas ou chamar `admin_import_questions` deve falhar.
5. Acessar `private.question_keys` pelo cliente do aluno deve falhar. Nenhuma resposta da listagem deve incluir gabarito.
6. Envie a mesma resposta duas vezes com o mesmo `request_id`; deve existir apenas uma tentativa. Reutilizar o ID com outra alternativa deve falhar.
7. Importe uma questão oficial real revisada em projeto de teste. Responda sem pré-requisitos e confira a rejeição da função SQL. Depois consolide a base e confirme que o envio funciona.
8. Confira prova e gabarito nos links; use `annulled` para retirar uma questão de circulação.
9. Confira que mais de 1.000 tentativas são carregadas por paginação e continuam nos totais.
10. Faça logout e login com outra conta. O histórico anterior não deve permanecer na interface.

Não use dados de alunos reais nesta verificação. Esta lista não foi executada em um banco remoto sem as credenciais do projeto.
