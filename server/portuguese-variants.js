// Questões autorais parametrizadas de Língua Portuguesa. Não são questões oficiais.
// Cada item combina uma situação textual, um fenômeno linguístico e distratores revisáveis.
const actors = ['Ana','Bruna','Carla','Diana','Elisa','Fernanda','Giovana','Helena','Isabela','Júlia','Larissa','Marina','Natália','Olívia','Paula','Renata','Sofia','Talita','Vitória','Yasmin','Alice','Beatriz','Camila','Débora','Ester'];
const settings = ['na biblioteca','na escola','no escritório','na secretaria','no laboratório','na universidade','na reunião','no curso','na repartição','no arquivo'];
const situations = ['durante a manhã','antes do intervalo','após a reunião','no início da semana','durante o expediente'];
const items = [
  ['regencia','gostou','do relatório','gostar exige a preposição de','gostou do relatório','gostou o relatório','gostou ao relatório','gostou pelo relatório'],
  ['regencia','obedeceu','ao regulamento','obedecer exige a preposição a','obedeceu ao regulamento','obedeceu o regulamento','obedeceu do regulamento','obedeceu pelo regulamento'],
  ['regencia','assistiu','à palestra','assistir, no sentido de presenciar, rege a','assistiu à palestra','assistiu a palestra','assistiu da palestra','assistiu pela palestra'],
  ['regencia','preferiu','a leitura à conversa','preferir uma coisa a outra exige a','preferiu a leitura à conversa','preferiu a leitura do que a conversa','preferiu a leitura pela conversa','preferiu a leitura de conversa'],
  ['regencia','precisou','de orientação','precisar, no sentido de necessitar, rege de','precisou de orientação','precisou orientação','precisou à orientação','precisou pela orientação'],
  ['crase','dirigiu-se','à secretaria','a preposição a funde-se com o artigo a','dirigiu-se à secretaria','dirigiu-se a secretaria','dirigiu-se á secretaria','dirigiu-se à uma secretaria'],
  ['crase','compareceu','à reunião','comparecer a + a reunião produz à','compareceu à reunião','compareceu a reunião','compareceu á reunião','compareceu à uma reunião'],
  ['crase','voltou','à biblioteca','voltar a + a biblioteca produz à','voltou à biblioteca','voltou a biblioteca','voltou á biblioteca','voltou à uma biblioteca'],
  ['crase','entregou o formulário','à diretora','entregar algo a alguém: a + a diretora','entregou o formulário à diretora','entregou o formulário a diretora','entregou o formulário á diretora','entregou o formulário à uma diretora'],
  ['crase','referiu-se','à decisão','referir-se a + a decisão produz à','referiu-se à decisão','referiu-se a decisão','referiu-se á decisão','referiu-se à uma decisão'],
  ['concordancia','registrou','o resultado','o núcleo singular do sujeito exige verbo no singular','A lista de candidatos chegou','A lista de candidatos chegaram','A lista de candidatos chegamos','A lista de candidatos chegastes'],
  ['concordancia','registrou','o resultado','haver no sentido de existir é impessoal','Havia vagas disponíveis','Haviam vagas disponíveis','Houveram vagas disponíveis','Havíamos vagas disponíveis'],
  ['concordancia','registrou','o resultado','existir concorda com o sujeito plural','Existiam documentos pendentes','Existia documentos pendentes','Existe documentos pendentes','Existimos documentos pendentes'],
  ['concordancia','registrou','o resultado','fazer indicando tempo decorrido é impessoal','Faz três anos','Fazem três anos','Fizeram três anos','Fazemos três anos'],
  ['concordancia','registrou','o resultado','o núcleo plural do sujeito exige plural','Os documentos chegaram','Os documentos chegou','Os documentos chegamos','Os documentos chegaste'],
  ['pronomes','registrou','o resultado','a palavra negativa atrai o pronome átono','Não me avisaram','Não avisaram-me','Não avisaram eu','Não avisaram a mim-me'],
  ['pronomes','registrou','o resultado','o pronome relativo retoma o substantivo anterior','O documento que li','O documento cujo li','O documento onde li','O documento quem li'],
  ['pronomes','registrou','o resultado','o possessivo indica relação de posse','Meu relatório está pronto','Mim relatório está pronto','Eu relatório está pronto','Me relatório está pronto'],
  ['pronomes','registrou','o resultado','o pronome pessoal reto exerce função de sujeito','Ela entregou o parecer','Mim entregou o parecer','Me entregou o parecer','Lhe entregou o parecer'],
  ['pronomes','registrou','o resultado','o demonstrativo concorda com o nome feminino plural','Estas propostas são válidas','Este propostas são válidas','Isto propostas são válidas','Esta propostas são válidas'],
  ['conectivos','revisou','o documento','mas introduz oposição','Revisou, mas encontrou falhas','Revisou, portanto encontrou falhas','Revisou, porque encontrou falhas','Revisou, conforme encontrou falhas'],
  ['conectivos','revisou','o documento','embora introduz concessão','Embora estivesse cansada, revisou','Porque estivesse cansada, revisou','Portanto estivesse cansada, revisou','Conforme estivesse cansada, revisou'],
  ['conectivos','revisou','o documento','se introduz condição','Se houver prazo, revisará','Embora houver prazo, revisará','Portanto houver prazo, revisará','Mas houver prazo, revisará'],
  ['conectivos','revisou','o documento','portanto introduz conclusão','Revisou; portanto, corrigiu o erro','Revisou; embora, corrigiu o erro','Revisou; mas, corrigiu o erro','Revisou; caso, corrigiu o erro'],
  ['conectivos','revisou','o documento','porque introduz causa','Ficou em casa porque chovia','Ficou em casa portanto chovia','Ficou em casa embora chovia','Ficou em casa contudo chovia'],
  ['interpretacao','releu','o aviso','a informação explícita deve estar escrita no texto','O aviso foi relido','O aviso foi ignorado','O aviso foi publicado ontem','O aviso foi alterado'],
  ['interpretacao','consultou','o edital','consultar não implica concordar com o conteúdo','O edital foi consultado','O edital foi aprovado','O edital foi revogado','O edital foi modificado'],
  ['interpretacao','analisou','o relatório','analisar não significa necessariamente corrigir','O relatório foi analisado','O relatório foi corrigido','O relatório foi descartado','O relatório foi publicado'],
  ['interpretacao','recebeu','o comunicado','receber não implica ler ou aceitar','O comunicado foi recebido','O comunicado foi aceito','O comunicado foi respondido','O comunicado foi destruído'],
  ['interpretacao','arquivou','a solicitação','arquivar não demonstra deferimento','A solicitação foi arquivada','A solicitação foi deferida','A solicitação foi negada','A solicitação foi publicada']
];
export function portugueseVariants(question) {
  const all = [];
  for (let i=0; i<7500; i++) {
    const pattern = items[i % items.length];
    const [topic,verb,object,rule,correct,...wrong] = pattern;
    const actor = actors[Math.floor(i/items.length)%actors.length];
    const setting = settings[Math.floor(i/(items.length*actors.length))%settings.length];
    const situation = situations[Math.floor(i/(items.length*actors.length*settings.length))%situations.length];
    const context = `${actor}, ${setting}, ${situation}`;
    const promptBase = topic === 'interpretacao'
      ? `Leia o trecho: “${actor} ${verb} ${object} ${setting}, ${situation}.” Considerando exclusivamente a informação expressa, assinale a conclusão necessariamente verdadeira.`
      : topic === 'concordancia' || topic === 'pronomes' || topic === 'conectivos'
        ? `Em um exercício de revisão realizado por ${context}, qual alternativa está de acordo com a norma-padrão e com a relação sintática indicada?`
        : `Ao redigir um registro ${context}, a candidata empregou o verbo “${verb}” em referência a “${object}”. Qual construção respeita a norma-padrão?`;
    const prompt = `${promptBase} (Situação ${i % items.length + 1}.)`;
    const answers = [correct,...wrong];
    const rotation = i % 4;
    const options = answers.slice(rotation).concat(answers.slice(0,rotation));
    all.push(question(topic,prompt,options,(4-rotation)%4,
      `A resposta é “${correct}”: ${rule}. O contexto não altera a regra cobrada.`,
      {difficulty: i%5===0?'intermediario':'avancado',origin:'Autoral · exercício contextualizado parametrizado',editorial_status:'initial',generator_version:'pt-1'}));
  }
  return all;
}
