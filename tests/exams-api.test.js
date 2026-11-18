import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/http.js';
process.env.APP_MODE='supabase';
process.env.SUPABASE_URL='https://test.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
const {app}=await import('../server/index.js');

test('provas exigem login; listagem, numeração, imagens e falhas usam RLS do aluno',async t=>{
  const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original;});
  let missing=false;
  globalThis.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input.url), headers=new Headers(init?.headers);
    assert.equal(headers.get('authorization'),'Bearer student-token');
    let result;
    if(url.pathname==='/auth/v1/user') result={id:'11111111-1111-4111-8111-111111111111',role:'authenticated',aud:'authenticated'};
    else if(url.pathname==='/rest/v1/official_exams') {
      assert.equal(url.searchParams.get('status'),'eq.published');
      if(missing) return new Response(JSON.stringify({code:'PGRST205',message:'not migrated'}),{status:404,headers:{'Content-Type':'application/json'}});
      result=[{id:'EXAM-1',total_questions:60}];
    } else if(url.pathname==='/rest/v1/questions') {
      assert.equal(url.searchParams.get('exam_id'),'eq.EXAM-1');
      assert.equal(url.searchParams.get('status'),'eq.published');
      assert.equal(url.searchParams.get('order'),'question_number.asc');
      result=[{id:'q',exam_id:'EXAM-1',question_number:2,subject_id:'portugues',source:{pages:[3]}}];
    } else if(url.pathname==='/rest/v1/exam_pages') {
      assert.equal(url.searchParams.get('exam_id'),'eq.EXAM-1');
      result=url.searchParams.get('page_number')==='eq.3'?[{page_number:3,image_data:'data:image/jpeg;base64,/9j/',alt:'Original'}]:[];
    } else assert.fail(url.pathname);
    return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  };
  for(const path of ['/exams','/exams/EXAM-1/questions','/exams/EXAM-1/pages/3']) assert.equal((await request(app,`/api${path}`)).status,401);
  const options={headers:{Authorization:'Bearer student-token'}};
  assert.equal((await (await request(app,'/api/exams',options)).json()).exams.length,1);
  const questions=await (await request(app,'/api/exams/EXAM-1/questions',options)).json();
  assert.equal(questions.questions[0].subject_name,'Língua Portuguesa');
  assert.equal('correct_index' in questions.questions[0],false);
  const page=await request(app,'/api/exams/EXAM-1/pages/3',options); assert.equal(page.status,200);
  assert.equal((await request(app,'/api/exams/EXAM-1/pages/999',options)).status,404);
  assert.equal((await request(app,'/api/exams/EXAM-1/pages/nope',options)).status,400);
  missing=true; assert.deepEqual(await(await request(app,'/api/exams',options)).json(),{exams:[]});
});
