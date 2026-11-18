const instructions = [
  'Assinale a alternativa em que o verbo “gostar” está empregado de acordo com a norma-padrão.',
  'Assinale a alternativa em que o verbo “obedecer” está empregado de acordo com a norma-padrão.',
  'Considerando o sentido de “presenciar”, assinale o emprego adequado do verbo “assistir” na norma-padrão.',
  'Assinale a alternativa que expressa a preferência pela leitura em vez da conversa e respeita a regência do verbo “preferir”.',
  'No sentido de “necessitar”, qual alternativa emprega o verbo “precisar” segundo a norma-padrão?',
  'Assinale a alternativa que indica a ida ao setor de atendimento e emprega corretamente o acento grave.',
  'Para registrar a presença no encontro, assinale a alternativa que emprega corretamente o acento grave.',
  'Ao descrever o retorno ao local de consulta, qual alternativa emprega corretamente o acento grave?',
  'Para registrar a entrega do formulário, assinale a alternativa em que o acento grave está empregado corretamente.',
  'Assinale a alternativa que expressa corretamente, quanto ao emprego do acento grave, a menção ao que foi decidido.',
  'Assinale a alternativa em que o verbo concorda com o núcleo do sujeito.',
  'Qual alternativa emprega corretamente o verbo “haver” com sentido de “existir”?',
  'Assinale a alternativa que respeita a concordância do verbo “existir” com seu sujeito.',
  'Qual alternativa emprega corretamente o verbo “fazer” para indicar tempo decorrido?',
  'Assinale a alternativa que respeita a concordância verbal na indicação da chegada dos documentos.',
  'Assinale a alternativa em que a colocação do pronome átono está de acordo com a norma-padrão.',
  'Qual alternativa emprega corretamente o pronome relativo para retomar o nome anterior?',
  'Assinale a alternativa em que a relação de posse é expressa por um pronome empregado corretamente.',
  'Assinale a alternativa em que o pronome pessoal exerce corretamente a função de sujeito.',
  'Qual alternativa apresenta um pronome demonstrativo que concorda com o substantivo a que se refere?',
  'O resultado contrariou a expectativa de quem revisou o material. Qual alternativa estabelece essa relação entre as orações?',
  'Apesar do cansaço, a revisão foi realizada. Qual alternativa expressa essa relação com um conectivo adequado?',
  'A realização da revisão depende da existência de prazo. Qual alternativa expressa essa relação entre as orações?',
  'O erro foi corrigido como resultado da revisão. Qual alternativa estabelece essa relação com um conectivo adequado?',
  'A chuva foi o motivo para ficar em casa. Qual alternativa estabelece essa relação entre as orações?',
  'Qual conclusão sobre o aviso é sustentada pelo trecho?',
  'Qual conclusão sobre o edital pode ser tirada a partir do trecho?',
  'Assinale a conclusão sobre o relatório que pode ser confirmada pelo trecho.',
  'Com base no trecho, o que se pode concluir sobre o comunicado?',
  'Assinale a conclusão sobre a solicitação que decorre do trecho.'
];

export function presentPortugueseQuestion(question) {
  if (question.generator_version !== 'pt-1') return question;
  const marker = question.prompt.match(/ \(Situação (\d+)\.\)$/u);
  const model = Number(marker?.[1]);
  const instruction = instructions[model - 1];
  if (!instruction) return question;
  if (model <= 10) return { ...question, prompt: instruction };

  if (model >= 26) {
    const passage = question.prompt.match(/^Leia o trecho: [“"]([^”"]+)[”"]/u)?.[1];
    if (!passage) return question;
    const text = passage.replace(/, ([^,.]+)\.$/u, ' $1.').replace('após a reunião', 'depois do almoço');
    return { ...question, prompt: `Leia o trecho. “${text}” ${instruction}` };
  }

  // Recover only neutral context from the original record.
  const context = question.prompt.match(/^Em um exercício de revisão realizado por ([^,]+), ([^,]+), ([^,]+), /u);
  if (!context) return question;
  const [, name, place, time] = context;
  const when = time.replace('após a reunião', 'depois do almoço');
  const where = place[0].toUpperCase() + place.slice(1);
  const setting = model <= 20
    ? `${where}, ${name} revisou um texto ${when}.`
    : `${name} trabalhou na revisão de um texto ${place} ${when}.`;
  return { ...question, prompt: `${setting} ${instruction}` };
}

export function directPracticeIdentity(question) {
  const model = question.generator_version === 'pt-1' && question.prompt.match(/\(Situação ([1-9]|10)\.\)$/u);
  return model ? `portuguese-model-${model[1]}` : question.id;
}
