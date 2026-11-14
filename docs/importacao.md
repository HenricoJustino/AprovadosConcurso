# Contrato para questões oficiais

O arquivo deve conter um array JSON, com 1 a 10.000 objetos. O exemplo abaixo é **apenas um modelo**: os textos entre colchetes devem ser substituídos por informações reais, conferidas. Não importe este exemplo como prova real.

```json
[
  {
    "topic_id": "regencia",
    "prompt": "[Enunciado integral conferido no caderno original, incluindo o texto de apoio necessário]",
    "options": ["[Texto de A]", "[Texto de B]", "[Texto de C]", "[Texto de D]", "[Texto de E]"],
    "correct_index": 0,
    "explanation": "[Explicação autoral revisada, coerente com o gabarito definitivo]",
    "status": "published",
    "source": {
      "exam": "[Código e nome do concurso]",
      "organization": "[Órgão]",
      "year": 2024,
      "role": "[Cargo]",
      "booklet": "[Tipo/versão do caderno]",
      "number": 1,
      "application_date": "2024-01-01",
      "exam_url": "https://documento.vunesp.com.br/[caminho-do-caderno]",
      "answer_key_url": "https://documento.vunesp.com.br/[caminho-do-gabarito-definitivo]",
      "answer_key_status": "definitive",
      "reviewer": "[Identificação do revisor]",
      "reviewed_at": "2026-11-14T15:00:00Z",
      "rights_basis": "[Registro da autorização/condição de uso verificada para a reprodução]"
    }
  }
]
```

`correct_index` começa em zero: A=0, B=1, C=2, D=3, E=4. O exemplo usa uma data e um índice ilustrativos, que precisam ser substituídos pelos reais.

Assuntos disponíveis: `regencia`, `crase`, `concordancia`, `pronomes`, `conectivos`, `interpretacao`, `operacoes`, `porcentagem`, `equacoes`, `medias`, `proporcoes`, `sequencias`, `contagem`, `proposicoes`, `seguranca`, `planilhas`, `internet`.

Para adicionar matérias e assuntos, atualizar `shared/catalog.js` e semear o catálogo antes de importar suas questões. A primeira versão tem somente `vunesp` ativa. Uma nova banca também exige ampliar os filtros/validações do importador e da API.

Conferir antes de importar:

- Aplicação correta: não misturar gabarito de reaplicação ou outro caderno.
- Gabarito definitivo, recursos, retificações e anulações.
- Texto de apoio completo e quebras legíveis; sem texto de cabeçalho/rodapé misturado.
- Alternativas na mesma ordem do caderno e resposta no intervalo.
- Tabelas e figuras acessíveis: se não houver representação fiel, manter fora do acervo.
- Classificação, explicação e condições de reprodução revisadas.

Links aceitos: HTTPS em `vunesp.com.br` ou seus subdomínios. Isso valida o formato/origem declarada, não o conteúdo remoto. O script não baixa esses links.
