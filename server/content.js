import { createHash } from 'node:crypto';
import { topics } from '../shared/catalog.js';

const makeId = value => createHash('sha256').update(value).digest('hex').slice(0, 32);
function question(topicId, prompt, options, correct, explanation, extra = {}) {
  const t = topics.find(t => t.id === topicId);
  return { id: makeId(`${topicId}:${prompt}`), board_id: 'vunesp', subject_id: t.subject_id, topic_id: topicId,
    kind: 'basic', difficulty: 'iniciante', prompt, options, correct_index: correct, explanation,
    origin: 'Autoral · curadoria inicial', editorial_status: 'initial', ...extra };
}
const curated = [
  ['regencia', 'O que a regência verbal estuda?', ['A relação entre o verbo e seus complementos.', 'A divisão das palavras em sílabas.', 'A escrita correta das palavras.', 'A formação do plural dos nomes.'], 0, 'A regência trata da relação que o verbo estabelece com os complementos, incluindo a necessidade de preposição.'],
  ['regencia', 'Complete: “Eu gosto ___ estudar”.', ['a', 'em', 'de', 'por'], 2, 'O verbo gostar exige a preposição de: quem gosta, gosta de algo.'],
  ['regencia', 'Na norma-padrão, complete: “Os alunos obedeceram ___ professor”.', ['o', 'ao', 'do', 'pelo'], 1, 'Obedecer pede complemento com a preposição a. A preposição a se une ao artigo o: ao professor.'],
  ['regencia', 'Com o sentido de ver, qual construção segue a regência tradicional de assistir?', ['Assisti o filme.', 'Assisti no filme.', 'Assisti pelo filme.', 'Assisti ao filme.'], 3, 'Assistir no sentido de ver é transitivo indireto na regência tradicional: assistir a. Assim, a + o filme = ao filme.'],
  ['regencia', 'Em “Preciso de ajuda”, o termo “de” é:', ['Um artigo.', 'Uma preposição exigida pelo verbo.', 'Um pronome pessoal.', 'Um verbo auxiliar.'], 1, 'Precisar, no sentido de necessitar, rege a preposição de.'],
  ['regencia', 'Qual frase apresenta complemento direto, sem preposição exigida pelo verbo?', ['Gosto de música.', 'Obedeço à regra.', 'Comprei um livro.', 'Preciso de tempo.'], 2, 'Comprar é transitivo direto nesse uso: quem compra, compra algo. Um livro é objeto direto.'],
  ['regencia', 'Complete segundo a norma-padrão: “Prefiro estudar ___ desistir”.', ['do que', 'a', 'de', 'para'], 1, 'A construção tradicional é preferir uma coisa a outra. Aqui: prefiro estudar a desistir.'],
  ['regencia', 'Complete: “Ela se lembrou ___ compromisso”.', ['o', 'ao', 'do', 'pelo'], 2, 'No uso pronominal, lembrar-se rege de: lembrou-se de + o compromisso = do compromisso.'],
  ['crase', 'Em “Vou à escola”, o acento grave marca:', ['O plural de escola.', 'A fusão de a + a.', 'A separação de duas vogais.', 'Uma sílaba tônica do verbo.'], 1, 'O verbo ir pede a preposição a e escola vem com artigo a: a + a = à.'],
  ['crase', 'Qual lacuna deve receber “à”?', ['Começou ___ estudar.', 'Entreguei o texto ___ uma colega.', 'Fui ___ biblioteca.', 'O curso começa ___ partir de maio.'], 2, 'Ir a + a biblioteca forma à biblioteca. Não se usa crase antes de verbo, de uma nesse contexto ou em a partir de.'],
  ['crase', 'Qual frase está correta?', ['Comecei à estudar.', 'O aluno respondeu à lápis.', 'Fomos à pé.', 'Entreguei a carta à professora.'], 3, 'Entregar algo a alguém: a + a professora = à professora. Estudar é verbo; lápis e pé são masculinos e não recebem essa crase.'],
  ['crase', 'O teste de trocar uma palavra feminina por uma masculina pode ajudar a identificar:', ['A fusão de preposição e artigo, se surgir “ao”.', 'O número de sílabas.', 'O tempo verbal.', 'O plural do substantivo.'], 0, 'Por exemplo, vou à escola corresponde a vou ao colégio. O teste é uma pista, não dispensa a análise do contexto.'],
  ['crase', 'Em qual expressão não ocorre crase?', ['À noite.', 'À tarde.', 'À direita.', 'A partir de hoje.'], 3, 'A partir de contém o verbo partir. Não há artigo feminino antes desse verbo.'],
  ['concordancia', 'Complete: “Os candidatos ___ preparados”.', ['está', 'estão', 'estamos', 'estou'], 1, 'O sujeito os candidatos está na terceira pessoa do plural: estão.'],
  ['concordancia', 'Complete: “A lista de candidatos ___ na mesa”.', ['estão', 'estamos', 'está', 'estais'], 2, 'O núcleo do sujeito é lista, singular. De candidatos é um termo que especifica lista.'],
  ['concordancia', 'Qual frase está de acordo com a norma-padrão?', ['Haviam muitas vagas.', 'Havia muitas vagas.', 'Existia muitas vagas.', 'Os candidatos chegou.'], 1, 'Haver no sentido de existir é impessoal e fica no singular. Existir concordaria com vagas: existiam.'],
  ['concordancia', 'Em “As provas começaram”, qual é o núcleo do sujeito?', ['As', 'começaram', 'provas', 'Não há sujeito.'], 2, 'Provas é o substantivo central do sujeito as provas. O verbo concorda com ele no plural.'],
  ['concordancia', 'Complete: “Faz dois anos que ela ___”.', ['estudam', 'estuda', 'estudamos', 'estudais'], 1, 'Ela pede estuda. Na indicação de tempo decorrido, fazer é impessoal: faz dois anos.'],
  ['pronomes', 'Em “Meu caderno está aqui”, “meu” é um pronome:', ['Possessivo.', 'Relativo.', 'Indefinido.', 'Interrogativo.'], 0, 'Meu indica posse em relação à primeira pessoa.'],
  ['pronomes', 'Em “O livro que comprei é bom”, “que” retoma:', ['bom', 'comprei', 'livro', 'é'], 2, 'O pronome relativo que retoma o antecedente livro e liga as orações.'],
  ['pronomes', 'Qual frase segue a colocação pronominal esperada após palavra negativa?', ['Não avisaram-me.', 'Não me avisaram.', 'Não avisaram eu.', 'Não avisaram a eu.'], 1, 'A palavra não favorece a próclise: pronome antes do verbo, não me avisaram.'],
  ['pronomes', 'Qual palavra pode funcionar como pronome demonstrativo?', ['aquele', 'rapidamente', 'estudar', 'porque'], 0, 'Aquele indica posição ou referência em relação às pessoas do discurso.'],
  ['pronomes', 'Em “Ela chegou cedo”, “ela” substitui ou representa:', ['Uma ação.', 'Uma pessoa ou referente feminino no singular.', 'Uma circunstância de tempo.', 'Uma ligação causal.'], 1, 'Ela é pronome pessoal da terceira pessoa do singular.'],
  ['conectivos', 'Em “Estudou, mas não passou”, “mas” indica:', ['Adição.', 'Conclusão.', 'Oposição.', 'Explicação.'], 2, 'Mas introduz contraste entre estudar e não passar.'],
  ['conectivos', 'Em “Se chover, ficarei em casa”, “se” expressa:', ['Condição.', 'Conclusão.', 'Adição.', 'Comparação.'], 0, 'A chuva é apresentada como condição para ficar em casa.'],
  ['conectivos', 'Complete com ideia de conclusão: “Revisou todo o conteúdo; ___, estava preparado”.', ['porém', 'portanto', 'embora', 'se'], 1, 'Portanto introduz uma conclusão decorrente da informação anterior.'],
  ['conectivos', 'Em “Leu e fez anotações”, a palavra “e” relaciona as ações por:', ['Oposição.', 'Exclusão.', 'Condição.', 'Adição.'], 3, 'Nesse contexto, e acrescenta uma ação à outra.'],
  ['conectivos', 'Em “Não saiu porque estava doente”, a segunda oração expressa:', ['Causa.', 'Conclusão.', 'Alternância.', 'Finalidade.'], 0, 'Estar doente é apresentado como causa de não sair.'],
  ['interpretacao', 'Leia: “Mesmo com chuva, Lia caminhou até a biblioteca”. Qual informação é explícita?', ['Lia gosta de chuva.', 'Lia caminhou até a biblioteca.', 'A biblioteca estava fechada.', 'Lia comprou um livro.'], 1, 'O texto afirma a caminhada até a biblioteca. As outras informações não são fornecidas.'],
  ['interpretacao', 'Leia: “Pedro voltou a estudar”. O verbo “voltou” permite inferir que:', ['Pedro nunca estudou.', 'Pedro já havia estudado antes.', 'Pedro foi aprovado.', 'Pedro não gosta de estudar.'], 1, 'Voltar a fazer algo pressupõe uma ocorrência anterior. Não permite concluir aprovação ou preferências.'],
  ['interpretacao', 'Leia: “Alguns alunos chegaram cedo”. Qual conclusão é garantida?', ['Todos chegaram cedo.', 'Ninguém chegou cedo.', 'Pelo menos um aluno chegou cedo.', 'Todos chegaram atrasados.'], 2, 'Alguns afirma a existência de alunos que chegaram cedo, sem afirmar que todos o fizeram.'],
  ['interpretacao', 'Uma inferência adequada deve:', ['Ser sustentada por pistas do texto.', 'Repetir uma opinião pessoal.', 'Adicionar qualquer fato provável.', 'Ignorar o contexto.'], 0, 'Inferências se apoiam em elementos textuais e relações justificáveis.'],
  ['interpretacao', 'Leia: “A biblioteca fecha às 18 horas”. Qual alternativa extrapola o texto?', ['A biblioteca tem um horário de fechamento.', 'O fechamento informado é às 18 horas.', 'O texto informa quando a biblioteca fecha.', 'A biblioteca abre às 8 horas.'], 3, 'O horário de abertura não foi informado.'],
  ['proposicoes', 'Qual frase é uma proposição?', ['Feche a porta!', 'Que horas são?', 'O número 4 é par.', 'Estude mais!'], 2, 'O número 4 é par é uma afirmação à qual se atribui verdadeiro ou falso. Ordens e perguntas não são proposições nesse sentido.'],
  ['proposicoes', 'Qual é a negação de “Todos os alunos estudaram”?', ['Nenhum aluno estudou.', 'Pelo menos um aluno não estudou.', 'Todos os alunos não estudaram.', 'Pelo menos um aluno estudou.'], 1, 'Para negar uma afirmação universal, basta existir um contraexemplo.'],
  ['proposicoes', 'Se P é verdadeira e Q é falsa, P e Q é:', ['Verdadeira.', 'Falsa.', 'Impossível de avaliar.', 'Verdadeira e falsa.'], 1, 'A conjunção só é verdadeira quando ambas as proposições são verdadeiras.'],
  ['proposicoes', 'Se P é verdadeira e Q é falsa, P ou Q, no sentido inclusivo, é:', ['Falsa.', 'Indeterminada.', 'Verdadeira.', 'Uma pergunta.'], 2, 'Na disjunção inclusiva, basta pelo menos uma proposição verdadeira.'],
  ['proposicoes', 'A negação de “Ana estuda e trabalha” é:', ['Ana não estuda e não trabalha.', 'Ana não estuda ou não trabalha.', 'Ana estuda ou trabalha.', 'Ana estuda e não trabalha.'], 1, 'Pela lei de De Morgan, a negação de P e Q é não P ou não Q.'],
  ['seguranca', 'Uma mensagem pede sua senha por um link urgente. A melhor atitude é:', ['Enviar a senha para confirmar.', 'Clicar e informar todos os dados.', 'Verificar pelo canal oficial, sem usar o link suspeito.', 'Repassar o link aos colegas.'], 2, 'A urgência pode ser técnica de phishing. Verifique pelo serviço oficial e não entregue credenciais.'],
  ['seguranca', 'Qual propriedade limita o acesso à informação às pessoas autorizadas?', ['Confidencialidade.', 'Disponibilidade.', 'Velocidade.', 'Compressão.'], 0, 'Confidencialidade trata do acesso por pessoas autorizadas.'],
  ['seguranca', 'Integridade da informação busca proteger contra:', ['Qualquer acesso à internet.', 'Alterações indevidas.', 'A criação de cópias.', 'O uso de senhas.'], 1, 'Integridade significa preservar a informação contra alterações indevidas ou não detectadas.'],
  ['seguranca', 'Qual prática melhora uma estratégia de backup?', ['Guardar a única cópia no mesmo disco.', 'Nunca testar restauração.', 'Manter cópias e testar a recuperação.', 'Usar a mesma senha em tudo.'], 2, 'Uma cópia só é útil se puder ser recuperada. Separação das cópias e testes reduzem o risco.'],
  ['seguranca', 'O segundo fator de autenticação tem como objetivo:', ['Eliminar qualquer risco.', 'Acrescentar uma verificação ao acesso.', 'Substituir todos os backups.', 'Tornar qualquer mensagem confiável.'], 1, 'O segundo fator acrescenta uma barreira. Ele não elimina todos os riscos.'],
  ['planilhas', 'Qual referência mantém coluna e linha ao ser copiada?', ['A1', '$A1', 'A$1', '$A$1'], 3, 'O cifrão antes da coluna e da linha torna ambas absolutas.'],
  ['planilhas', 'Se A1 = 2, A2 = 3 e A3 = 5, qual é o resultado de =SOMA(A1:A3)?', ['5', '8', '10', '235'], 2, 'O intervalo A1:A3 inclui as três células: 2 + 3 + 5 = 10.'],
  ['planilhas', 'Em uma planilha, B3 identifica:', ['Coluna 3, linha B.', 'Coluna B, linha 3.', 'A terceira planilha.', 'Uma senha.'], 1, 'As letras indicam colunas; os números, linhas.'],
  ['planilhas', 'Ao copiar a fórmula =A1 uma linha para baixo, a referência relativa se torna:', ['=A2', '=B1', '=$A$1', '=A0'], 0, 'A referência relativa acompanha o deslocamento: uma linha abaixo de A1 é A2.'],
  ['planilhas', 'Em geral, qual símbolo inicia uma fórmula em uma célula?', ['#', '@', '=', '!'], 2, 'O sinal de igual informa que a célula contém uma fórmula.'],
  ['internet', 'Qual das opções é um navegador?', ['Firefox.', 'Uma planilha.', 'Um cabo de rede.', 'Um arquivo PDF.'], 0, 'Firefox é um programa para navegar na web.'],
  ['internet', 'O uso de HTTPS garante, por si só:', ['Que a loja é honesta.', 'Que todo arquivo é seguro.', 'Proteção dos dados em trânsito na conexão.', 'Que não há propaganda.'], 2, 'HTTPS protege a conexão, mas um site fraudulento também pode usar HTTPS.'],
  ['internet', 'Qual é a função principal de um mecanismo de busca?', ['Localizar conteúdos a partir de uma consulta.', 'Trocar o processador.', 'Desligar a rede.', 'Imprimir automaticamente.'], 0, 'Mecanismos de busca indexam conteúdos e retornam resultados para consultas.'],
  ['internet', 'Qual cuidado ajuda a identificar um endereço falso?', ['Confiar somente no cadeado.', 'Conferir o domínio completo.', 'Abrir todos os anexos.', 'Desativar atualizações.'], 1, 'O domínio pode imitar visualmente o endereço legítimo. O cadeado sozinho não comprova legitimidade.'],
  ['internet', 'Um navegador e um mecanismo de busca são:', ['Sempre o mesmo programa.', 'Conceitos distintos: o navegador acessa páginas; a busca localiza conteúdos.', 'Ambos peças físicas do computador.', 'Tipos de senha.'], 1, 'O navegador é a aplicação de acesso; a busca é um serviço que pode ser acessado nela.']
].map(row => question(...row));

const format = n => Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4))).replace('.', ',');
function numeric(topicId, prompt, answer, explanation, i) {
  // Distratores sempre distintos; rotação determinística evita resposta fixa.
  const values = [answer, Math.max(0, answer - 1), answer + 1, answer + 2];
  const shift = i % values.length;
  const options = values.slice(shift).concat(values.slice(0, shift)).map(format);
  return question(topicId, prompt, options, (4 - shift) % 4, explanation,
    { origin: 'Autoral · exercício parametrizado', editorial_status: 'generated', generator_version: '1' });
}
export function generateQuestions() {
  const all = [...curated];
  for (let i = 0; i < 1250; i++) {
    const a = 11 + i % 50, b = 2 + Math.floor(i / 50);
    all.push(numeric('operacoes', `Uma biblioteca tinha ${a} livros e recebeu mais ${b}. Quantos livros passou a ter?`, a + b, `Some o acervo inicial aos livros recebidos: ${a} + ${b} = ${a + b} livros.`, i));
    const start = 100 + i % 50, removed = 1 + Math.floor(i / 50);
    all.push(numeric('operacoes', `Um estoque tinha ${start} cadernos. Foram retirados ${removed}. Quantos restam?`, start - removed, `Subtraia a retirada do estoque inicial: ${start} − ${removed} = ${start - removed} cadernos.`, i + 1));
    const base = 100 * (1 + i % 50), percent = 1 + Math.floor(i / 50), value = base * percent / 100;
    all.push(numeric('porcentagem', `Calcule ${percent}% de ${base}.`, value, `${percent}% significa ${percent}/100. Então ${base} × ${percent} ÷ 100 = ${value}.`, i + 2));
    const x = 1 + i % 50, coef = 2 + Math.floor(i / 50), offset = 3 + i % 7, rhs = coef * x + offset;
    all.push(numeric('equacoes', `Resolva a equação ${coef}x + ${offset} = ${rhs}. Qual é o valor de x?`, x, `Subtraia ${offset}: ${coef}x = ${rhs - offset}. Divida por ${coef}: x = ${x}. Conferência: ${coef} × ${x} + ${offset} = ${rhs}.`, i + 3));
    const center = 30 + i % 50, delta = 1 + Math.floor(i / 50);
    all.push(numeric('medias', `Qual é a média aritmética de ${center - delta}, ${center} e ${center + delta}?`, center, `Some os três valores e divida por 3: (${center - delta} + ${center} + ${center + delta}) ÷ 3 = ${center * 3} ÷ 3 = ${center}.`, i));
    const unit = 2 + i % 50, quantity = 2 + Math.floor(i / 50);
    all.push(numeric('proporcoes', `Dois cadernos custam R$ ${unit * 2}. Mantendo o preço unitário, quanto custam ${quantity} cadernos, em reais?`, unit * quantity, `Cada caderno custa ${unit * 2} ÷ 2 = R$ ${unit}. Portanto, ${quantity} × ${unit} = R$ ${unit * quantity}.`, i + 1));
    const first = 1 + i % 50, step = 1 + Math.floor(i / 50);
    all.push(numeric('sequencias', `A sequência começa em ${first} e soma sempre ${step}: ${first}, ${first + step}, ${first + 2 * step}, ${first + 3 * step}. Qual é o próximo termo?`, first + 4 * step, `A regra dada é somar ${step}. Logo, ${first + 3 * step} + ${step} = ${first + 4 * step}.`, i + 2));
    const shirts = 2 + i % 50, pants = 2 + Math.floor(i / 50);
    all.push(numeric('contagem', `Há ${shirts} modelos de camiseta e ${pants} modelos de calça. Quantos conjuntos diferentes podem ser formados escolhendo uma camiseta e uma calça, sem restrições?`, shirts * pants, `Pelo princípio multiplicativo: ${shirts} possibilidades de camiseta × ${pants} de calça = ${shirts * pants} conjuntos.`, i + 3));
  }
  return all;
}
export const questions = generateQuestions();
export const questionMap = new Map(questions.map(q => [q.id, q]));
export const publicQuestion = q => {
  const { correct_index, explanation, ...publicFields } = q;
  return publicFields;
};
