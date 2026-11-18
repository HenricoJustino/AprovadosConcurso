<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../api.js';

const props = defineProps({ attempts: { type: Array, default: () => [] }, target: {type:Object,default:null} });
const emit = defineEmits(['attempt','opened']);
const exams = ref([]), chosen = ref(null), questions = ref([]), current = ref(null), pages = ref([]);
const loading = ref(false), pageLoading = ref(false), sending = ref(false), error = ref(''), result = ref(null), selected = ref(null);
const loaded = ref(false), filter = ref(''), replay = ref(false), zoom = ref(false);
let active = true, pageRequest = 0, requestId = crypto.randomUUID(), startedAt = Date.now();
onBeforeUnmount(()=>{active=false;pageRequest++;pageCache.clear();});
const answered = computed(() => new Set(props.attempts.map(a => a.question_id)));
const visibleExams = computed(() => exams.value.filter(e => `${e.title} ${e.role} ${e.year}`.toLocaleLowerCase('pt-BR').includes(filter.value.toLocaleLowerCase('pt-BR'))));
const examAttempts = e => new Set(props.attempts.filter(a => questions.value.some(q => q.id === a.question_id && q.exam_id === e.id)).map(a => a.question_id)).size;
const remaining = computed(() => questions.value.filter(q => !answered.value.has(q.id)).length);
const pageCache = new Map();

async function loadExams() {
  loading.value = true; error.value = '';
  try { const data=await api('/exams'); if(!active) return; exams.value = data.exams; loaded.value = true; }
  catch(e) { error.value = e.message; }
  finally { loading.value = false; }
}
async function choose(exam, review = false, questionId = null) {
  if (loading.value) return;
  loading.value = true; error.value = ''; current.value = null; chosen.value = exam; replay.value = review;
  try {
    const data=await api(`/exams/${encodeURIComponent(exam.id)}/questions`);
    if(!active) return;
    questions.value = data.questions;
    await showQuestion((questionId ? questions.value.find(q=>q.id===questionId) : questions.value.find(q => review || !answered.value.has(q.id))) || null);
  } catch(e) { error.value = e.message; }
  finally { loading.value = false; }
}
async function showQuestion(q) {
  const serial = ++pageRequest;
  current.value = q; selected.value = null; result.value = null; pages.value = []; zoom.value = false;
  requestId = crypto.randomUUID(); startedAt = Date.now();
  if (!q) { pageLoading.value = false; return; }
  pageLoading.value = true; error.value = '';
  try {
    const images = [];
    for (const number of q.source.pages) {
      const key = `${q.exam_id}:${number}`;
      if (!pageCache.has(key)) {
        const p = await api(`/exams/${encodeURIComponent(q.exam_id)}/pages/${number}`);
        if (serial !== pageRequest) return;
        if (pageCache.size >= 8) pageCache.delete(pageCache.keys().next().value);
        pageCache.set(key,p);
      }
      images.push(pageCache.get(key));
    }
    if (serial === pageRequest) pages.value = images;
  } catch(e) { if (serial === pageRequest) error.value = e.message; }
  finally { if (serial === pageRequest) pageLoading.value = false; }
}
async function answer() {
  if (!current.value || selected.value === null || sending.value || result.value || pageLoading.value || !pages.value.length) return;
  sending.value = true; error.value = '';
  try {
    const data = await api('/answers', { method: 'POST', body: JSON.stringify({ questionId:current.value.id, selectedIndex:selected.value, elapsedSeconds:Math.min(3600, Math.max(0,Math.floor((Date.now()-startedAt)/1000))), requestId }) });
    if(!active) return;
    result.value = data; emit('attempt',data);
  } catch(e) { error.value = e.message; }
  finally { sending.value = false; }
}
async function next() {
  const index = questions.value.findIndex(q => q.id === current.value?.id);
  const q = questions.value.slice(index+1).find(q => replay.value || !answered.value.has(q.id));
  await showQuestion(q || null);
}
function back() { pageRequest++; chosen.value = null; current.value = null; pages.value = []; error.value = ''; }
onMounted(async()=>{
  if(!props.target) return;
  const target={...props.target}; emit('opened');
  await loadExams();
  if(!active) return;
  const exam=exams.value.find(e=>e.id===target.examId);
  if(exam) await choose(exam,true,target.questionId);
  else if(!error.value) error.value='A prova desta revisão não está disponível.';
});
</script>

<template>
  <section class="panel exam-practice">
    <div class="panel-heading"><div><h2>Provas aplicadas da Vunesp</h2><p>Escolha uma aplicação e um caderno. A correção usa o gabarito correspondente, com as anulações fora da pontuação.</p></div></div>
    <div v-if="error" class="exam-error" role="alert">{{ error }} <button class="text-button" @click="chosen ? choose(chosen,replay) : loadExams()" :disabled="loading || sending">Tentar novamente</button></div>
    <template v-if="!chosen">
      <button v-if="!loaded" class="button primary" :disabled="loading" @click="loadExams">{{ loading ? 'Consultando acervo…' : 'Ver provas disponíveis' }}</button>
      <template v-else>
        <label class="exam-search">Buscar prova, cargo ou ano<input v-model="filter" placeholder="Ex.: Soldado 2025"></label>
        <p v-if="!exams.length" class="muted">As provas aparecerão aqui quando a importação documental for concluída no banco.</p>
        <p v-else-if="!visibleExams.length" class="muted">Nenhuma prova corresponde à busca.</p>
        <div class="exam-grid"><article v-for="e in visibleExams" :key="e.id" class="exam-card">
          <span class="subtle-pill">{{ e.year }} · Caderno {{ e.booklet }}</span><h3>{{ e.title }}</h3>
          <p>{{ e.published_questions }} questões para praticar · {{ e.annulled_questions }} anuladas</p>
          <p class="muted">{{ e.role }}</p>
          <button class="button primary" :disabled="loading" @click="choose(e)">Continuar prova</button>
          <div class="exam-links"><a :href="e.exam_url" target="_blank" rel="noopener noreferrer">Caderno original</a><a :href="e.answer_key_url" target="_blank" rel="noopener noreferrer">Gabarito</a></div>
        </article></div>
      </template>
    </template>
    <template v-else>
      <button class="text-button" :disabled="loading || sending" @click="back">← Voltar às provas</button>
      <h3>{{ chosen.title }}</h3>
      <p>{{ questions.length }} questões válidas · {{ remaining }} inéditas · {{ chosen.annulled_questions }} anuladas, fora da prática</p>
      <p v-if="loading" role="status">Preparando sua prova…</p>
      <div v-else-if="!current && !error" class="empty-state"><h3>Prova concluída</h3><p>Você já respondeu {{ examAttempts(chosen) }} questões desta aplicação. Seu progresso está salvo na sua conta.</p><button class="button secondary" @click="choose(chosen,true)">Revisar a prova inteira</button></div>
      <template v-if="current">
        <h3>Questão {{ current.question_number }} · {{ current.subject_name }}</h3>
        <p class="muted">Leia o número {{ current.question_number }} nas páginas abaixo, incluindo os textos de apoio. Selecione a letra da alternativa no caderno original.</p>
        <div class="exam-links"><a :href="`${chosen.exam_url}#page=${current.source.pages[0]}`" target="_blank" rel="noopener noreferrer">Abrir PDF original</a><button class="text-button" @click="zoom=!zoom">{{ zoom ? 'Ajustar à tela' : 'Ampliar páginas' }}</button></div>
        <p v-if="pageLoading" role="status">Carregando páginas originais…</p>
        <div class="exam-pages" :class="{zoom}"><figure v-for="p in pages" :key="p.page_number"><img :src="p.image_data" :alt="p.alt"><figcaption>Página {{ p.page_number }} · Consulte a questão {{ current.question_number }}</figcaption></figure></div>
        <div class="answer-options exam-options" role="radiogroup" aria-label="Resposta da questão"><button v-for="(option,i) in current.options" :key="i" class="answer-option" role="radio" :aria-checked="selected===i" :disabled="!!result || sending || pageLoading || !pages.length" :class="{chosen:selected===i,'is-correct':result?.correct_index===i,'is-wrong':result && selected===i && !result.correct}" @click="selected=i"><span class="answer-letter">{{ String.fromCharCode(65+i) }}</span><span>{{ option }}</span></button></div>
        <div v-if="result" class="answer-feedback" :class="{incorrect:!result.correct}" role="status"><h3>{{ result.correct ? 'Resposta correta' : `Resposta incorreta. Gabarito: ${String.fromCharCode(65+result.correct_index)}` }}</h3><p>{{ result.explanation }}</p><a :href="chosen.answer_key_url" target="_blank" rel="noopener noreferrer">Consultar gabarito da aplicação</a></div>
        <div class="question-actions"><button v-if="!result" class="button primary" :disabled="selected===null || sending || pageLoading || !pages.length" @click="answer">{{ sending ? 'Corrigindo…' : 'Confirmar resposta' }}</button><button v-else class="button primary" :disabled="pageLoading" @click="next">Próxima questão</button></div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.exam-practice{margin:24px 0;padding:24px}.exam-search{display:grid;gap:8px;margin:20px 0}.exam-search input{padding:12px;border:1px solid #dce2da;border-radius:8px;background:transparent;color:inherit}.exam-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.exam-card{padding:20px;border:1px solid #dce2da;border-radius:12px}.exam-card h3{margin:15px 0}.exam-card p{margin:12px 0}.exam-links{display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin:16px 0}.exam-links a{color:#456e55;text-decoration:underline}.exam-error{padding:14px;background:#fff1ed;color:#953e2b;border-radius:8px;margin:16px 0}.exam-pages{overflow-x:auto;background:#e9ece8;border-radius:10px}.exam-pages figure{margin:0 0 16px}.exam-pages img{display:block;width:100%;height:auto;background:white}.exam-pages.zoom img{width:1400px;max-width:none}.exam-pages figcaption{text-align:center;padding:10px;color:#46564a}.exam-options{margin-top:20px}.exam-practice>.question-actions{justify-content:flex-end}.exam-practice .answer-feedback a{color:inherit;text-decoration:underline}
</style>
