import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { boards, subjects, topics } from '../shared/catalog.js';
import { questions } from '../server/content.js';

const literal = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const curated = questions.filter(q => q.editorial_status !== 'generated');
const sql = `-- Acervo autoral v1. Gerado por npm run seed:sql. Sem credenciais.
-- Reexecutável: IDs determinísticos; não apaga tentativas nem questões oficiais.
begin;
insert into public.boards(id,name,active)
select id,name,active from jsonb_to_recordset(${literal(boards)}) as x(id text,name text,active boolean)
on conflict(id) do update set name=excluded.name,active=excluded.active;
insert into public.subjects(id,name)
select id,name from jsonb_to_recordset(${literal(subjects)}) as x(id text,name text)
on conflict(id) do update set name=excluded.name;
insert into public.topics(id,subject_id,name,concept,example,tip)
select id,subject_id,name,concept,example,tip from jsonb_to_recordset(${literal(topics)}) as x(id text,subject_id text,name text,concept text,example text,tip text)
on conflict(id) do update set name=excluded.name,concept=excluded.concept,example=excluded.example,tip=excluded.tip;
select public.admin_import_questions(${literal(curated)});
with vars as (
 select i,11+i%50 a,2+i/50 b,100+i%50 initial_stock,1+i/50 removed,
  100*(1+i%50) base,1+i/50 percent,1+i%50 x,2+i/50 coefficient,3+i%7 additive,
  30+i%50 center,1+i/50 delta,2+i%50 unit,2+i/50 quantity,
  1+i%50 first_term,1+i/50 step,2+i%50 shirts,2+i/50 pants
 from generate_series(0,1249) as s(i)
), recipes as (
 select r.* from vars cross join lateral (values
 ('operacoes',format('Uma biblioteca tinha %s livros e recebeu mais %s. Quantos livros passou a ter?',a,b),a+b,format('Some o acervo inicial aos livros recebidos: %s + %s = %s livros.',a,b,a+b),i),
 ('operacoes',format('Um estoque tinha %s cadernos. Foram retirados %s. Quantos restam?',initial_stock,removed),initial_stock-removed,format('Subtraia a retirada do estoque inicial: %s − %s = %s cadernos.',initial_stock,removed,initial_stock-removed),i+1),
 ('porcentagem',format('Calcule %s%% de %s.',percent,base),base*percent/100,format('%s%% significa %s/100. Então %s × %s ÷ 100 = %s.',percent,percent,base,percent,base*percent/100),i+2),
 ('equacoes',format('Resolva a equação %sx + %s = %s. Qual é o valor de x?',coefficient,additive,coefficient*x+additive),x,format('Subtraia %s: %sx = %s. Divida por %s: x = %s. Conferência: %s × %s + %s = %s.',additive,coefficient,coefficient*x,coefficient,x,coefficient,x,additive,coefficient*x+additive),i+3),
 ('medias',format('Qual é a média aritmética de %s, %s e %s?',center-delta,center,center+delta),center,format('Some os três valores e divida por 3: (%s + %s + %s) ÷ 3 = %s ÷ 3 = %s.',center-delta,center,center+delta,center*3,center),i),
 ('proporcoes',format('Dois cadernos custam R$ %s. Mantendo o preço unitário, quanto custam %s cadernos, em reais?',unit*2,quantity),unit*quantity,format('Cada caderno custa %s ÷ 2 = R$ %s. Portanto, %s × %s = R$ %s.',unit*2,unit,quantity,unit,unit*quantity),i+1),
 ('sequencias',format('A sequência começa em %s e soma sempre %s: %s, %s, %s, %s. Qual é o próximo termo?',first_term,step,first_term,first_term+step,first_term+2*step,first_term+3*step),first_term+4*step,format('A regra dada é somar %s. Logo, %s + %s = %s.',step,first_term+3*step,step,first_term+4*step),i+2),
 ('contagem',format('Há %s modelos de camiseta e %s modelos de calça. Quantos conjuntos diferentes podem ser formados escolhendo uma camiseta e uma calça, sem restrições?',shirts,pants),shirts*pants,format('Pelo princípio multiplicativo: %s possibilidades de camiseta × %s de calça = %s conjuntos.',shirts,pants,shirts*pants),i+3)
 ) as r(topic_id,prompt,answer,explanation,rotation)
), content as (
 select substr(encode(sha256(convert_to(r.topic_id||':'||r.prompt,'UTF8')),'hex'),1,32) id,
  t.subject_id,r.topic_id,r.prompt,r.explanation,(4-r.rotation%4)%4 correct_index,
  (select jsonb_agg(v.value::text order by (v.idx-r.rotation%4+4)%4)
    from (values (0,r.answer),(1,greatest(0,r.answer-1)),(2,r.answer+1),(3,r.answer+2)) as v(idx,value)) options
 from recipes r join public.topics t on t.id=r.topic_id
), inserted as (
 insert into public.questions(id,board_id,subject_id,topic_id,kind,difficulty,prompt,options,origin,editorial_status,generator_version,status)
 select id,'vunesp',subject_id,topic_id,'basic','iniciante',prompt,options,'Autoral · exercício parametrizado','generated','1','published' from content
 on conflict(id) do nothing returning id
)
insert into private.question_keys(question_id,correct_index,explanation)
select c.id,c.correct_index,c.explanation from content c
where c.id in (select id from inserted union select id from public.questions)
on conflict(question_id) do nothing;
commit;
`;
await writeFile(new URL('../supabase/seed.sql', import.meta.url), sql, 'utf8');
// A mesma serialização é conferida no banco após a importação.
const canonical = [...questions].sort((a,b) => a.id.localeCompare(b.id)).map(q => [
  q.id,q.board_id,q.subject_id,q.topic_id,q.kind,q.difficulty,q.prompt,
  '[' + q.options.map(o => JSON.stringify(o)).join(', ') + ']',q.correct_index,q.explanation,q.origin,q.editorial_status,q.generator_version || ''
].join('|')).join('\n');
console.log(JSON.stringify({ file: 'supabase/seed.sql', bytes: Buffer.byteLength(sql), questions: questions.length, checksum: createHash('md5').update(canonical).digest('hex') }));
