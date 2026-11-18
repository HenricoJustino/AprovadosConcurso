<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ArrowUpRight, ArrowRight, ArrowLeft, LayoutDashboard, BookOpen, ListChecks, RotateCcw, Library, Settings2, Bell, ChevronDown, ChevronRight, Check, X, LockKeyhole, Play, Target, Timer, Flame, GraduationCap, Calculator, Brain, Monitor, Search, Menu, LogOut, CircleHelp, CheckCircle2, AlertCircle, ExternalLink, TrendingUp } from 'lucide-vue-next';
import { api, configure, supabase } from './api.js';
import { summarize } from '../shared/progress.js';
import { signInWithGoogle, callbackError, createSessionScope } from '../shared/auth.js';
import LoginPage from './components/LoginPage.vue';
import StudentProfile from './components/StudentProfile.vue';
import ExamPractice from './components/ExamPractice.vue';
import { boards as initialBoards, subjects as initialSubjects, topics as initialTopics, officialSources as initialSources } from '../shared/catalog.js';

const route = ref('login'), mobileMenu = ref(false), catalog = ref({ boards: initialBoards, subjects: initialSubjects, topics: initialTopics, officialSources: initialSources }), config = ref(null), inventory = ref(null);
const error = ref(''), notice = ref(''), booting = ref(true), user = ref(null), attempts = ref([]);
const selectedSubject = ref('portugues'), selectedTopic = ref('regencia'), lessonOpen = ref(false), lessonRead = ref(false);
const selectedKind = ref('basic'), query = ref(''), questionItems = ref([]), questionTotal = ref(0), offset = ref(0), questionIndex = ref(0);
const selectedOption = ref(null), result = ref(null), busy = ref(false), loadingQuestions = ref(false), startedAt = ref(Date.now()), requestId = ref(crypto.randomUUID()), sessionAnswers = ref(0), reviewSession = ref(false);
const authEmail = ref(''), authPassword = ref(''), authSignup = ref(false), authBusy = ref(false);
const googleBusy = ref(false), savingGoal = ref(false), accountLoading = ref(false);
const sessionScope = createSessionScope();
let authSubscription;
const dailyGoal = ref(20);
const examReviewTarget = ref(null);
const names = { dashboard: 'Visão geral', boards: 'Bancas e matérias', questions: 'Banco de questões', review: 'Caderno de erros', library: 'Acervo e fontes', settings: 'Minha preparação', study: 'Sua sessão de estudo' };
const iconMap = { book: BookOpen, calculator: Calculator, brain: Brain, monitor: Monitor };
names.login = 'Entrar na minha conta';
names.profile = 'Meu perfil';
const stats = computed(() => summarize(attempts.value));
const subjects = computed(() => catalog.value?.subjects || []);
const topics = computed(() => catalog.value?.topics || []);
const currentSubject = computed(() => subjects.value.find(s => s.id === selectedSubject.value));
const subjectTopics = computed(() => topics.value.filter(t => t.subject_id === selectedSubject.value));
const topic = computed(() => topics.value.find(t => t.id === selectedTopic.value));
const currentQuestion = computed(() => questionItems.value[questionIndex.value]);
const topicState = id => stats.value.topicProgress[id] || { answered: 0, correct: 0, rate: 0, unlocked: false };
const answeredIds = computed(() => new Set(attempts.value.map(a => a.question_id)));
const remainingInTopic = id => Math.max(0, (topicCounts.value[id] || 0) - new Set(attempts.value.filter(a => a.topic_id === id && a.kind === 'basic').map(a => a.question_id)).size);
const topicCounts = ref({});
const subjectCount = id => topics.value.filter(t => t.subject_id === id).reduce((sum,t) => sum + (topicCounts.value[t.id] || 0), 0);
const unlocked = computed(() => topicState(selectedTopic.value).unlocked);
const displayName = computed(() => {
  const name = user.value?.user_metadata?.full_name || user.value?.user_metadata?.name;
  return typeof name === 'string' && name.trim() ? name.trim().split(/\s+/)[0] : user.value?.email?.split('@')[0] || 'estudante';
});
const latestAttempts = computed(() => {
  const latest = new Map();
  for (const a of [...attempts.value].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) latest.set(a.question_id, a);
  return [...latest.values()].reverse();
});
const wrongAttempts = computed(() => latestAttempts.value.filter(a => !a.correct));
const dailyProgress = computed(() => Math.min(100, Math.round(stats.value.today / dailyGoal.value * 100)));
const chartMax = computed(() => Math.max(5, ...stats.value.days.map(d => d.correct + d.wrong)));
const filteredTopics = computed(() => topics.value.filter(t => t.subject_id === selectedSubject.value && t.name.toLocaleLowerCase('pt-BR').includes(query.value.toLocaleLowerCase('pt-BR'))));
const recommendation = computed(() => {
  const practiced = topics.value.filter(t => topicState(t.id).answered > 0 && !topicState(t.id).unlocked);
  return practiced.sort((a, b) => topicState(a.id).rate - topicState(b.id).rate)[0] || topics.value.find(t => !topicState(t.id).unlocked) || topics.value[0];
});
function navigate(to) { if (!user.value) to = 'login'; route.value = to; window.history.replaceState({}, '', to === 'login' ? '/login' : to === 'profile' ? '/perfil' : '/'); mobileMenu.value = false; error.value = ''; notice.value = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function recordExamAttempt(a) { if (!attempts.value.some(old => old.request_id === a.request_id)) attempts.value.push(a); }
function subjectStats(id) {
  const a = attempts.value.filter(a => a.subject_id === id);
  return { total: a.length, rate: a.length ? Math.round(a.filter(a => a.correct).length / a.length * 100) : 0, mastered: topics.value.filter(t => t.subject_id === id && topicState(t.id).unlocked).length };
}
async function refreshData() {
  const scope = sessionScope.capture();
  const inventoryData = await api('/inventory');
  if (!sessionScope.isCurrent(scope)) return;
  inventory.value = inventoryData;
  const counts = await api('/question-counts');
  if (!sessionScope.isCurrent(scope)) return;
  topicCounts.value = counts.topics || {};
  const preferences = await api('/preferences');
  if (!sessionScope.isCurrent(scope)) return;
  dailyGoal.value = preferences.dailyGoal;
  const all = [];
  let more = true, page = 0;
  while (more) {
    const data = await api(`/attempts?page=${page++}`);
    if (!sessionScope.isCurrent(scope)) return;
    all.push(...data.attempts); more = data.hasMore;
  }
  attempts.value = all;
}
onMounted(async () => {
  window.addEventListener('auth-required', expireSession);
  try {
    const loginError = callbackError(window.location.href);
    config.value = await configure();
    if (supabase) {
      const { data: localSession } = await supabase.auth.getSession();
      const { data, error: sessionError } = localSession.session ? await supabase.auth.getUser() : { data: { user: null }, error: null };
      if (sessionError) { await supabase.auth.signOut({ scope: 'local' }); error.value = 'Sua sessão expirou. Entre novamente.'; }
      user.value = !sessionError && data.user && !data.user.is_anonymous ? data.user : null;
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        const previousId = user.value?.id;
        user.value = session?.user && !session.user.is_anonymous ? session.user : null;
        if (previousId !== user.value?.id) {
          sessionScope.invalidate();
          attempts.value = []; questionItems.value = []; result.value = null; inventory.value = null;
          selectedOption.value = null; sessionAnswers.value = 0; authPassword.value = ''; authEmail.value = '';
          dailyGoal.value = 20; lessonRead.value = false; savingGoal.value = false;
          busy.value = false; loadingQuestions.value = false; authBusy.value = false; googleBusy.value = false;
          accountLoading.value = !!user.value; navigate(user.value ? 'dashboard' : 'login');
          const scope = sessionScope.capture();
          if (user.value) setTimeout(async () => {
            if (!sessionScope.isCurrent(scope)) return;
            try { await refreshData(); } catch (e) { if (sessionScope.isCurrent(scope)) error.value = e.message; }
            finally { if (sessionScope.isCurrent(scope)) accountLoading.value = false; }
          }, 0);
        }
      });
      authSubscription = listener.subscription;
      if (loginError) error.value = loginError;
      if (window.location.pathname === '/auth/callback') {
        if (!user.value && !loginError) error.value = 'Não foi possível concluir o login. Tente entrar novamente.';
        window.history.replaceState({}, '', '/');
      }
    }
    const initialAuthError = error.value || loginError;
    navigate(user.value ? (window.location.pathname === '/perfil' ? 'profile' : 'dashboard') : 'login');
    if (initialAuthError) error.value = initialAuthError;
    if (user.value) {
      if (config.value.apiAvailable === false) error.value = 'Sua conta está conectada, mas a área de estudos está temporariamente indisponível. Tente recarregar em instantes.';
      else await refreshData();
    }
  } catch (e) { error.value = e.message; }
  finally { booting.value = false; }
});
onUnmounted(() => { authSubscription?.unsubscribe(); sessionScope.invalidate(); window.removeEventListener('auth-required', expireSession); });
function expireSession() {
  sessionScope.invalidate(); user.value = null; attempts.value = []; questionItems.value = []; result.value = null; inventory.value = null;
  accountLoading.value = false; navigate('login'); error.value = 'Sua sessão expirou. Entre novamente.';
  supabase?.auth.signOut({ scope: 'local' });
}
async function googleLogin() {
  if (authBusy.value || googleBusy.value) return;
  googleBusy.value = true; error.value = ''; notice.value = '';
  try { await signInWithGoogle(supabase?.auth, window.location.origin); }
  catch (e) { error.value = e.message; googleBusy.value = false; }
}
async function authenticate() {
  if (authBusy.value || googleBusy.value || !supabase) return;
  authBusy.value = true; error.value = ''; notice.value = '';
  try {
    const response = authSignup.value
      ? await supabase.auth.signUp({ email: authEmail.value, password: authPassword.value })
      : await supabase.auth.signInWithPassword({ email: authEmail.value, password: authPassword.value });
    if (response.error) throw response.error;
    if (authSignup.value && !response.data.session) notice.value = 'Confira seu e-mail para confirmar o cadastro. Depois entre na sua conta.';
    authPassword.value = '';
  } catch (e) { error.value = e.message; } finally { authBusy.value = false; }
}
async function logout() { const { error: e } = await supabase.auth.signOut({ scope: 'local' }); if (e) error.value = e.message; }
function openTopic(id) {
  const t = topics.value.find(t => t.id === id);
  selectedSubject.value = t.subject_id; selectedTopic.value = id; selectedKind.value = 'basic'; lessonOpen.value = true; lessonRead.value = false; navigate('boards');
}
function selectSubject(id) { selectedSubject.value = id; selectedTopic.value = topics.value.find(t => t.subject_id === id)?.id; lessonOpen.value = false; query.value = ''; }
function resetQuestion() { selectedOption.value = null; result.value = null; startedAt.value = Date.now(); requestId.value = crypto.randomUUID(); }
async function loadUnansweredPage(topicId, kind, initialOffset = 0) {
  let nextOffset = initialOffset;
  while (true) {
    const data = await api(`/questions?topic=${encodeURIComponent(topicId)}&kind=${kind}&offset=${nextOffset}`);
    const nextIndex = data.questions.findIndex(q => !answeredIds.value.has(q.id));
    if (nextIndex >= 0) return { questions: data.questions, total: data.total, offset: nextOffset, index: nextIndex };
    if (!data.questions.length || nextOffset + data.questions.length >= data.total) return { questions: [], total: data.total, offset: nextOffset, index: 0 };
    nextOffset += data.questions.length;
  }
}
async function startPractice(kind = 'basic') {
  if (kind === 'official' && !unlocked.value) { error.value = 'Pratique 5 questões básicas distintas deste assunto e alcance pelo menos 70% de acerto.'; return; }
  const scope = sessionScope.capture();
  loadingQuestions.value = true; error.value = ''; reviewSession.value = false;
  try {
    const data = await loadUnansweredPage(selectedTopic.value, kind);
    if (!sessionScope.isCurrent(scope)) return;
    questionItems.value = data.questions; questionTotal.value = data.total; questionIndex.value = data.index; offset.value = data.offset;
    selectedKind.value = kind; sessionAnswers.value = 0; resetQuestion(); navigate('study');
  } catch (e) { if (sessionScope.isCurrent(scope)) error.value = e.message; }
  finally { if (sessionScope.isCurrent(scope)) loadingQuestions.value = false; }
}
async function answer() {
  if (selectedOption.value === null || busy.value || result.value) return;
  const scope = sessionScope.capture();
  busy.value = true; error.value = '';
  try {
    const data = await api('/answers', { method: 'POST', body: JSON.stringify({ questionId: currentQuestion.value.id, selectedIndex: selectedOption.value, elapsedSeconds: Math.min(3600, Math.max(0, Math.floor((Date.now() - startedAt.value) / 1000))), requestId: requestId.value }) });
    if (!sessionScope.isCurrent(scope)) return;
    result.value = data;
    if (!attempts.value.some(a => a.request_id === data.request_id)) attempts.value.push(data);
    sessionAnswers.value++;
  } catch (e) { if (sessionScope.isCurrent(scope)) error.value = e.message; } finally { if (sessionScope.isCurrent(scope)) busy.value = false; }
}
async function nextQuestion() {
  if (reviewSession.value) { navigate('dashboard'); return; }
  const nextLocal = questionItems.value.findIndex((q, i) => i > questionIndex.value && !answeredIds.value.has(q.id));
  if (nextLocal >= 0) { questionIndex.value = nextLocal; resetQuestion(); return; }
  const scope = sessionScope.capture();
  loadingQuestions.value = true;
  try {
    const data = await loadUnansweredPage(selectedTopic.value, selectedKind.value, offset.value + questionItems.value.length);
    if (!sessionScope.isCurrent(scope)) return;
    if (data.questions.length) {
      questionItems.value = data.questions; questionTotal.value = data.total;
      offset.value = data.offset; questionIndex.value = data.index; resetQuestion();
    } else {
      questionItems.value = []; navigate('dashboard');
      notice.value = `Você concluiu as questões inéditas disponíveis neste assunto! ${sessionAnswers.value} respondidas nesta sessão.`;
    }
  } catch (e) { if (sessionScope.isCurrent(scope)) error.value = e.message; }
  finally { if (sessionScope.isCurrent(scope)) loadingQuestions.value = false; }
}
async function reviewAttempt(a) {
  const scope = sessionScope.capture();
  loadingQuestions.value = true; error.value = '';
  try {
    const data = await api(`/questions/${a.question_id}`);
    if (!sessionScope.isCurrent(scope)) return;
    if(data.exam_id) { examReviewTarget.value={examId:data.exam_id,questionId:data.id}; navigate('library'); return; }
    selectedTopic.value = a.topic_id; selectedSubject.value = a.subject_id; selectedKind.value = a.kind;
    questionItems.value = [data]; questionTotal.value = 1; questionIndex.value = 0; offset.value = 0; sessionAnswers.value = 0; reviewSession.value = true;
    resetQuestion(); navigate('study');
  } catch (e) { if (sessionScope.isCurrent(scope)) error.value = e.message; } finally { if (sessionScope.isCurrent(scope)) loadingQuestions.value = false; }
}
async function saveGoal() {
  if (savingGoal.value) return;
  const scope = sessionScope.capture();
  dailyGoal.value = Math.min(200, Math.max(5, Number(dailyGoal.value) || 20));
  savingGoal.value = true;
  try {
    await api('/preferences', { method: 'PUT', body: JSON.stringify({ dailyGoal: dailyGoal.value }) });
    if (sessionScope.isCurrent(scope)) notice.value = 'Meta diária atualizada.';
  } catch { if (sessionScope.isCurrent(scope)) error.value = 'Não foi possível salvar sua meta. Tente novamente.'; }
  finally { if (sessionScope.isCurrent(scope)) savingGoal.value = false; }
}
function exportHistory() {
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), attempts: attempts.value }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'aprovados-meu-historico.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const number = n => new Intl.NumberFormat('pt-BR').format(n || 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const formatDate = s => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(s));
function reloadApp() { window.location.reload(); }
</script>

<template>
  <LoginPage v-if="!user || booting" :config="config" :booting="booting" :error="error" :notice="notice" :google-busy="googleBusy" :auth-busy="authBusy" :auth-signup="authSignup" v-model:email="authEmail" v-model:password="authPassword" @google="googleLogin" @submit="authenticate" @toggle="authSignup = !authSignup" @reload="reloadApp"/>
  <div v-else class="app-shell">
    <button v-if="mobileMenu" class="sidebar-overlay" aria-label="Fechar menu" @click="mobileMenu = false"></button>
    <aside class="sidebar" :class="{ 'is-open': mobileMenu }">
      <a class="brand" href="#" @click.prevent="navigate('dashboard')"><span class="brand-icon"><GraduationCap :size="24" /></span><span>aprovados<span class="brand-dot">.</span><small>UM PASSO DE CADA VEZ</small></span></a>
      <div class="workspace-label">SUA JORNADA</div>
      <nav aria-label="Menu principal">
        <button v-for="item in [{ id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard }, { id: 'boards', label: 'Bancas e matérias', icon: BookOpen }, { id: 'questions', label: 'Banco de questões', icon: ListChecks }, { id: 'review', label: 'Caderno de erros', icon: RotateCcw }, { id: 'library', label: 'Acervo e fontes', icon: Library }]" :key="item.id" :class="{ active: route === item.id || route === 'study' && item.id === 'boards' }" @click="navigate(item.id)"><component :is="item.icon" :size="19"/><span>{{ item.label }}</span><span v-if="item.id === 'review' && wrongAttempts.length" class="nav-count">{{ wrongAttempts.length }}</span></button>
      </nav>
      <div class="sidebar-plan"><span class="tiny-label">SUA BANCA</span><div><span class="board-emblem">V</span><span>Vunesp<small>Preparação do básico à prova</small></span><CheckCircle2 :size="16" /></div></div>
      <div class="sidebar-bottom"><div class="sidebar-note"><span class="note-spark">✦</span><p>O que você aprende hoje<br>abre caminhos amanhã.</p></div><button class="settings-nav" :class="{ active: route === 'settings' }" @click="navigate('settings')"><Settings2 :size="18"/>Minha preparação</button><button class="settings-nav" :class="{ active: route === 'profile' }" @click="navigate('profile')"><GraduationCap :size="18"/>Meu perfil</button><div class="profile"><span class="avatar">{{ user ? displayName.slice(0,2).toUpperCase() : 'EU' }}</span><span>{{ user ? displayName : 'Meu espaço de estudo' }}<small>Conta do estudante</small></span><button v-if="user" class="icon-button" aria-label="Sair da conta" @click="logout"><LogOut :size="17"/></button></div></div>
    </aside>

    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-toggle" aria-label="Abrir menu" @click="mobileMenu = true"><Menu :size="22"/></button><span>Meu espaço</span><ChevronRight :size="14"/><strong>{{ names[route] }}</strong></div><div class="header-actions"><span class="status-dot"></span><span>{{ config?.mode === 'supabase' ? 'Supabase conectado' : 'Preparação Vunesp' }}</span><button class="icon-button" aria-label="Sobre o acervo" @click="navigate('library')"><CircleHelp :size="19"/></button><button class="mini-avatar" aria-label="Abrir meu perfil" @click="navigate('profile')">{{ user ? displayName.slice(0,2).toUpperCase() : 'EU' }}</button></div></header>

      <main id="main-content">
        <div v-if="error" class="alert error" role="alert"><AlertCircle :size="20"/><span>{{ error }}</span><button class="icon-button" aria-label="Fechar erro" @click="error = ''"><X :size="16"/></button></div>
        <div v-if="notice" class="alert success" role="status"><CheckCircle2 :size="20"/><span>{{ notice }}</span><button class="icon-button" aria-label="Fechar aviso" @click="notice = ''"><X :size="16"/></button></div>
        <div v-if="booting || accountLoading" class="loading-state"><span class="spinner"></span>{{ accountLoading ? 'Carregando seu progresso…' : 'Preparando seu espaço de estudo…' }}</div>
        <section v-else-if="!config" class="panel empty-state"><CircleHelp :size="32"/><h1>Vamos tentar novamente?</h1><p>Não conseguimos carregar a configuração de acesso. Seu histórico não foi apagado.</p><button class="button primary" @click="reloadApp">Recarregar a página<RotateCcw :size="17"/></button></section>
        <template v-else-if="user && catalog">
          <StudentProfile v-if="route === 'profile'" :user="user" :auth="supabase.auth" @saved="user = $event" @logout="logout"/>
          <template v-if="route === 'dashboard'">
            <div class="page-heading"><div><div class="eyebrow">CONSTÂNCIA TRANSFORMA</div><h1>Seu futuro começa no que você faz hoje<span class="green-dot">.</span></h1><p>Bom estudo, {{ displayName }}. Vamos dar mais um passo na sua aprovação?</p></div><span class="date-pill"><span></span>{{ new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date()) }}</span></div>
            <section class="hero"><div class="hero-copy"><span class="hero-tag"><span></span>DO BÁSICO À APROVAÇÃO</span><h2>Entender primeiro.<br>Acertar como consequência.</h2><p>Construa uma base sólida antes de encarar a prova.<br class="desktop-br"> Sua preparação tem um caminho — e começa aqui.</p><button class="button light" @click="openTopic(recommendation.id)">{{ stats.total ? 'Continuar minha jornada' : 'Começar minha jornada' }}<ArrowUpRight :size="19"/></button></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-star star-one">✧</div><div class="art-star star-two">✦</div><div class="paper paper-back"></div><div class="paper paper-front"><span class="paper-label">UM PASSO A MAIS</span><div class="paper-mark"><Check :size="30"/></div><span class="paper-title">Você é capaz.</span><span class="paper-line"></span><span class="paper-line short"></span><div class="paper-progress"><span></span></div><span class="paper-caption">Conhecimento que fica.</span></div><div class="floating-badge"><TrendingUp :size="18"/>Evolução, todos os dias</div></div></section>
            <div class="section-row"><h2>Um olhar para sua evolução</h2><span class="muted small">Seu histórico completo</span></div>
            <section class="metrics-grid" aria-label="Resumo do desempenho">
              <div class="metric-card"><div class="metric-top"><span>Questões resolvidas</span><span class="metric-icon sage"><ListChecks :size="19"/></span></div><strong>{{ number(stats.total) }}</strong><small>{{ stats.total ? 'Cada tentativa conta na sua jornada' : 'Sua primeira conquista começa aqui' }}</small></div>
              <div class="metric-card"><div class="metric-top"><span>Acertos no básico</span><span class="metric-icon blue"><Target :size="19"/></span></div><strong>{{ stats.basic.total ? stats.basic.rate + '%' : '—' }}</strong><small>{{ plural(stats.basic.correct, 'acerto', 'acertos') }} em {{ plural(stats.basic.total, 'tentativa', 'tentativas') }}</small></div>
              <div class="metric-card"><div class="metric-top"><span>Acertos em provas oficiais</span><span class="metric-icon sand"><GraduationCap :size="20"/></span></div><strong>{{ stats.official.total ? stats.official.rate + '%' : '—' }}</strong><small>{{ stats.official.total ? plural(stats.official.correct, 'acerto', 'acertos') + ' em ' + plural(stats.official.total, 'tentativa', 'tentativas') : 'Seu próximo nível de preparação' }}</small></div>
              <div class="metric-card"><div class="metric-top"><span>Tempo de prática</span><span class="metric-icon lavender"><Timer :size="19"/></span></div><strong>{{ stats.minutes }}<em>min</em></strong><small>Tempo registrado ao responder</small></div>
            </section>
            <div class="dashboard-middle">
              <section class="panel activity-panel"><div class="panel-heading"><div><h2>Consistência que constrói</h2><p>Suas respostas nos últimos 7 dias</p></div><span class="subtle-pill">Últimos 7 dias<ChevronDown :size="13"/></span></div><div class="chart-legend"><span><i class="legend-dot correct"></i>Acertos</span><span><i class="legend-dot wrong"></i>Erros</span></div><div class="bar-chart" role="img" :aria-label="stats.days.map(d => `${d.label}: ${d.correct} acertos e ${d.wrong} erros`).join('; ')"><div class="chart-grid"><span>{{ chartMax }}</span><span>{{ Math.round(chartMax / 2) }}</span><span>0</span></div><div class="chart-bars"><div v-for="day in stats.days" :key="day.date" class="chart-day"><div class="bar-space"><div class="bar-pair" :title="`${day.correct} acertos · ${day.wrong} erros`"><span class="bar bar-correct" :style="{ height: (day.correct / chartMax * 100) + '%' }"></span><span class="bar bar-wrong" :style="{ height: (day.wrong / chartMax * 100) + '%' }"></span></div></div><span>{{ day.label }}</span></div></div></div><p v-if="!stats.total" class="chart-empty-note">Responda sua primeira questão para começar a desenhar sua evolução.</p></section>
              <section class="panel daily-panel"><div class="panel-heading"><h2>Sua meta de hoje</h2><span class="metric-icon sand"><Flame :size="20"/></span></div><div class="goal-ring" :style="{ '--progress': dailyProgress * 3.6 + 'deg' }"><div><strong>{{ stats.today }}<span>/ {{ dailyGoal }}</span></strong><small>questões</small></div></div><h3>{{ dailyProgress >= 100 ? 'Meta alcançada. Muito bem!' : 'Um pouco hoje. Mais longe amanhã.' }}</h3><p>{{ dailyProgress >= 100 ? 'Você cumpriu seu compromisso de hoje.' : `Faltam ${Math.max(0, dailyGoal - stats.today)} questões para a sua meta diária.` }}</p><button class="text-button" @click="navigate('settings')">Ajustar minha meta<ArrowRight :size="15"/></button></section>
            </div>
            <div class="section-row"><div><h2>Suas matérias, seu caminho</h2><p class="muted small">Comece pelos fundamentos e avance com confiança.</p></div><button class="text-button" @click="navigate('boards')">Ver todas as trilhas<ArrowRight :size="15"/></button></div>
            <div class="subject-grid"><button v-for="subject in subjects" :key="subject.id" class="subject-card" @click="selectSubject(subject.id); navigate('boards')"><div class="subject-top"><span class="subject-icon" :style="{ color: subject.color, background: subject.color + '16' }"><component :is="iconMap[subject.icon]" :size="23"/></span><ArrowUpRight :size="18"/></div><h3>{{ subject.name }}</h3><p>{{ topics.filter(t => t.subject_id === subject.id).length }} assuntos · do conceito à prática</p><div class="subject-progress"><span :style="{ width: (subjectStats(subject.id).mastered / topics.filter(t => t.subject_id === subject.id).length * 100) + '%', background: subject.color }"></span></div><div class="subject-footer"><span>{{ subjectStats(subject.id).mastered }} assuntos com base consolidada</span><strong>{{ subjectStats(subject.id).total ? subjectStats(subject.id).rate + '%' : 'Começar' }}</strong></div></button></div>
            <section class="panel performance-panel"><div class="panel-heading"><div><h2>Desempenho sem misturar etapas</h2><p>O básico e a prova oficial têm indicadores próprios.</p></div><Target :size="20" class="muted"/></div><div class="performance-grid"><div v-for="kind in ['basic','official']" :key="kind" class="performance-detail"><div><span class="kind-dot" :class="kind"></span><h3>{{ kind === 'basic' ? 'Questões básicas' : 'Questões oficiais' }}</h3><span class="small muted">{{ plural(stats[kind].total, 'tentativa', 'tentativas') }}</span></div><div class="split-bar" :class="{ empty: !stats[kind].total }"><span :style="{ width: (stats[kind].total ? stats[kind].rate : 0) + '%' }"></span></div><div class="split-labels"><span><i class="legend-dot correct"></i>{{ plural(stats[kind].correct, 'acerto', 'acertos') }}</span><span><i class="legend-dot wrong"></i>{{ plural(stats[kind].wrong, 'erro', 'erros') }}</span></div></div></div></section>
          </template>

          <template v-if="route === 'boards'">
            <div class="page-heading"><div><div class="eyebrow">CONHECIMENTO EM CAMADAS</div><h1>Do primeiro conceito à prova<span class="green-dot">.</span></h1><p>Escolha sua matéria. Entenda o fundamento. Pratique. Avance.</p></div></div>
            <section class="board-banner"><span class="large-board-emblem">V</span><div><div class="eyebrow">BANCA ATIVA</div><h2>Vunesp</h2><p>Fundação para o Vestibular da Unesp</p></div><span class="subtle-pill"><CheckCircle2 :size="14"/>Trilhas disponíveis</span><span class="muted small future-boards">Novas bancas, em breve</span></section>
            <div class="subject-tabs" role="group" aria-label="Matéria"><button v-for="subject in subjects" :key="subject.id" :class="{ active: selectedSubject === subject.id }" @click="selectSubject(subject.id)"><component :is="iconMap[subject.icon]" :size="18"/>{{ subject.short }} <small>({{ number(subjectCount(subject.id)) }})</small></button></div>
            <div class="learning-layout"><section class="panel topic-list"><div class="panel-heading"><div><h2>{{ currentSubject?.name }}</h2><p>{{ subjectTopics.length }} assuntos · {{ number(subjectCount(selectedSubject)) }} questões disponíveis</p></div></div><button v-for="(t, i) in subjectTopics" :key="t.id" class="topic-item" :class="{ selected: selectedTopic === t.id }" @click="selectedTopic = t.id; lessonOpen = true; lessonRead = false"><span class="topic-number" :class="{ completed: topicState(t.id).unlocked }"><Check v-if="topicState(t.id).unlocked" :size="18"/><template v-else>{{ String(i + 1).padStart(2, '0') }}</template></span><span><strong>{{ t.name }}</strong><small>{{ number(topicCounts[t.id] || 0) }} questões · {{ number(remainingInTopic(t.id)) }} inéditas</small><small>{{ topicState(t.id).answered ? `${topicState(t.id).answered} questões distintas · ${topicState(t.id).rate}% de acerto` : 'Conceito + exemplos + prática' }}</small></span><ChevronRight :size="16"/></button></section>
              <section class="panel lesson-panel" v-if="topic"><div class="lesson-step"><span class="step-badge">01</span><span>ENTENDA O CONCEITO</span><span class="reading-time">Leitura rápida</span></div><h2>{{ topic.name }}</h2><p class="lesson-concept">{{ topic.concept }}</p><div class="example-box"><span class="tiny-label">NA PRÁTICA</span><p>{{ topic.example }}</p></div><div class="tip-box"><span>✦</span><p>{{ topic.tip }}</p></div><div class="lesson-divider"></div><div class="lesson-step"><span class="step-badge">02</span><span>CONSTRUA SUA BASE</span></div><p class="muted">Responda pelo menos 5 questões distintas e alcance 70% de acerto para liberar a etapa oficial deste assunto. Repetições não aumentam a contagem de questões distintas.</p><label class="read-check"><input v-model="lessonRead" type="checkbox">Li o conceito e estou pronto para praticar.</label><button class="button primary" :disabled="!lessonRead || loadingQuestions" @click="startPractice('basic')">{{ loadingQuestions ? 'Preparando…' : remainingInTopic(topic.id) ? 'Continuar de onde parei' : 'Revisar conteúdo' }}<ArrowRight :size="17"/></button><div class="official-step"><span class="metric-icon" :class="unlocked ? 'sage' : 'neutral'"><CheckCircle2 v-if="unlocked" :size="20"/><LockKeyhole v-else :size="20"/></span><div><h3>03 · Questões oficiais Vunesp</h3><p>{{ unlocked ? 'Base consolidada! Consulte o acervo oficial disponível.' : `${topicState(topic.id).answered}/5 questões distintas · ${topicState(topic.id).rate}% de acerto` }}</p></div><button class="text-button" :disabled="!unlocked || loadingQuestions" @click="startPractice('official')">{{ unlocked ? 'Acessar' : 'Bloqueado' }}<ArrowRight v-if="unlocked" :size="15"/></button></div></section>
            </div>
          </template>

          <template v-if="route === 'questions'">
            <ExamPractice :attempts="attempts" @attempt="recordExamAttempt"/>
            <div class="page-heading"><div><div class="eyebrow">PRÁTICA COM PROPÓSITO</div><h1>Uma questão de cada vez<span class="green-dot">.</span></h1><p>{{ number(inventory?.basic) }} exercícios básicos. Filtre por matéria e escolha o assunto.</p></div></div>
            <div class="inventory-banner"><Library :size="21"/><p><strong>Acervo transparente:</strong> {{ number(inventory?.generated) }} exercícios parametrizados, {{ number(inventory?.curated) }} questões autorais adicionais e {{ inventory?.official }} oficiais verificadas.</p></div>
            <section class="panel filters"><label>Matéria<select :value="selectedSubject" @change="selectSubject($event.target.value)"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label><label>Buscar assunto<div class="search-input"><Search :size="17"/><input v-model="query" placeholder="Ex.: regência verbal"></div></label></section>
            <div class="question-topic-grid"><section v-for="t in filteredTopics" :key="t.id" class="panel question-topic"><div class="topic-card-heading"><span class="metric-icon sage"><BookOpen :size="19"/></span><span class="subtle-pill">{{ topicState(t.id).unlocked ? 'Etapa oficial liberada' : 'Fundamentos' }}</span></div><h2>{{ t.name }}</h2><p><strong>{{ number(topicCounts[t.id] || 0) }} questões · {{ number(remainingInTopic(t.id)) }} inéditas</strong></p><p>{{ t.concept }}</p><button class="text-button" @click="openTopic(t.id)">Estudar e praticar<ArrowRight :size="16"/></button></section></div><div v-if="!filteredTopics.length" class="empty-state"><Search :size="32"/><h2>Nenhum assunto encontrado</h2><p>Tente outro termo ou escolha outra matéria.</p></div>
          </template>

          <template v-if="route === 'study'">
            <button class="text-button back-button" @click="navigate('boards')"><ArrowLeft :size="16"/>Voltar às matérias</button>
            <div class="page-heading"><div><div class="eyebrow">{{ reviewSession ? 'REVISAR TAMBÉM É AVANÇAR' : selectedKind === 'basic' ? 'CONSTRUINDO SUA BASE' : 'PREPARAÇÃO PARA A PROVA' }}</div><h1>{{ topic?.name }}</h1><p>{{ currentSubject?.name }}<span class="middle-dot">·</span>{{ selectedKind === 'basic' ? 'Prática básica autoral' : 'Questões oficiais Vunesp' }}</p></div><span v-if="currentQuestion" class="subtle-pill">Questão {{ offset + questionIndex + 1 }} de {{ number(questionTotal) }} · {{ number(remainingInTopic(selectedTopic)) }} inéditas</span></div>
            <section v-if="!currentQuestion" class="panel empty-state official-empty"><span class="metric-icon sand"><Library :size="27"/></span><h2>{{ selectedKind === 'official' ? 'Seu próximo nível está preparado' : 'Todas as questões concluídas' }}</h2><p v-if="selectedKind === 'official'">Ainda não há questões oficiais importadas para este assunto. Elas só aparecem após conferência com a prova aplicada e o gabarito definitivo.</p><p v-else>Você já respondeu todas as questões disponíveis neste assunto ou o banco ainda não foi populado.</p><div class="empty-actions"><button class="button primary" @click="startPractice('basic')">Continuar no básico<ArrowRight :size="17"/></button><button class="button secondary" @click="navigate('library')">Consultar fontes</button></div></section>
            <div v-else class="study-layout"><section class="panel question-panel"><div class="question-meta"><span class="tag" :class="selectedKind">{{ selectedKind === 'basic' ? 'BÁSICA' : 'OFICIAL' }}</span><span>{{ currentQuestion.origin }}</span></div><div v-if="currentQuestion.source" class="official-source">{{ currentQuestion.source.exam }} · {{ currentQuestion.source.role }} · {{ currentQuestion.source.year }} · Caderno {{ currentQuestion.source.booklet }} · Questão {{ currentQuestion.source.number }}</div><h2 class="question-prompt">{{ currentQuestion.prompt }}</h2><div class="answer-options" role="radiogroup" aria-label="Alternativas"><button v-for="(option, i) in currentQuestion.options" :key="i" role="radio" :aria-checked="selectedOption === i" :disabled="!!result || busy" class="answer-option" :class="{ chosen: selectedOption === i, 'is-correct': result && result.correct_index === i, 'is-wrong': result && selectedOption === i && !result.correct }" @click="selectedOption = i"><span class="answer-letter">{{ String.fromCharCode(65 + i) }}</span><span>{{ option }}</span><Check v-if="result && result.correct_index === i" :size="19"/><X v-else-if="result && selectedOption === i && !result.correct" :size="19"/></button></div><div v-if="result" class="answer-feedback" :class="{ incorrect: !result.correct }" role="status"><div><CheckCircle2 v-if="result.correct" :size="23"/><CircleHelp v-else :size="23"/><h3>{{ result.correct ? 'Muito bem! Mais um conceito consolidado.' : 'Tudo bem errar. Agora, entenda o porquê.' }}</h3></div><p>{{ result.explanation }}</p><a v-if="currentQuestion.source" :href="currentQuestion.source.answer_key_url" target="_blank" rel="noopener noreferrer" class="text-button">Conferir gabarito definitivo<ExternalLink :size="14"/></a></div><div class="question-actions"><span class="muted small">{{ result ? 'Seu desempenho já foi atualizado.' : 'Leia com calma. Você está aprendendo.' }}</span><button v-if="!result" class="button primary" :disabled="selectedOption === null || busy" @click="answer">{{ busy ? 'Corrigindo…' : 'Confirmar resposta' }}<Check :size="17"/></button><button v-else class="button primary" :disabled="loadingQuestions" @click="nextQuestion">{{ reviewSession ? 'Concluir revisão' : 'Próxima questão inédita' }}<ArrowRight :size="17"/></button></div></section><aside class="panel study-guide"><div class="eyebrow">SEU APOIO</div><h3>Lembre-se do conceito</h3><p>{{ topic?.concept }}</p><div class="lesson-divider"></div><span class="tiny-label">DICA PARA RESOLVER</span><p>{{ topic?.tip }}</p><div class="session-count"><strong>{{ sessionAnswers }}</strong><span>questões respondidas<br>nesta sessão</span></div></aside></div>
          </template>

          <template v-if="route === 'review'">
            <div class="page-heading"><div><div class="eyebrow">CADA ERRO, UMA OPORTUNIDADE</div><h1>O próximo acerto começa aqui<span class="green-dot">.</span></h1><p>Questões em que sua tentativa mais recente foi incorreta. Acerte na revisão para tirá-las deste caderno.</p></div><span class="subtle-pill">{{ wrongAttempts.length }} para revisar</span></div>
            <section v-if="!wrongAttempts.length" class="panel empty-state"><span class="metric-icon sage"><CheckCircle2 :size="30"/></span><h2>{{ stats.total ? 'Seu caderno está em dia' : 'Um espaço para aprender com os erros' }}</h2><p>{{ stats.total ? 'Nenhuma questão com erro na última tentativa. Continue praticando!' : 'As questões que você errar vão aparecer aqui para uma nova tentativa.' }}</p><button class="button primary" @click="navigate('boards')">Ir para as matérias<ArrowRight :size="17"/></button></section>
            <div v-else class="panel review-list"><div v-for="a in wrongAttempts" :key="a.question_id" class="review-row"><span class="metric-icon sand"><RotateCcw :size="19"/></span><div><h3>{{ topics.find(t => t.id === a.topic_id)?.name || a.topic_id }}</h3><p>{{ a.kind === 'basic' ? 'Questão básica' : 'Questão oficial' }} · {{ formatDate(a.created_at) }} · alternativa {{ String.fromCharCode(65 + a.selected_index) }}</p></div><button class="button secondary small-button" :disabled="loadingQuestions" @click="reviewAttempt(a)">Tentar novamente<ArrowRight :size="15"/></button></div></div>
          </template>

          <template v-if="route === 'library'">
            <ExamPractice :attempts="attempts" :target="examReviewTarget" @opened="examReviewTarget=null" @attempt="recordExamAttempt"/>
            <div class="page-heading"><div><div class="eyebrow">ORIGEM IMPORTA</div><h1>Um acervo em que você pode confiar<span class="green-dot">.</span></h1><p>Conteúdo autoral e questões oficiais têm origens e etapas de revisão diferentes.</p></div></div>
            <div class="library-summary"><div class="panel"><span class="metric-icon sage"><Calculator :size="22"/></span><strong>{{ number(inventory?.generated) }}</strong><h3>Exercícios parametrizados</h3><p>Variações de 8 modelos de matemática e lógica, com gabaritos calculados. Não são 10 mil conceitos diferentes nem questões da Vunesp.</p></div><div class="panel"><span class="metric-icon blue"><BookOpen :size="22"/></span><strong>{{ inventory?.curated || 0 }}</strong><h3>Questões introdutórias</h3><p>Português, informática e proposições. Conteúdo autoral de curadoria inicial, sujeito à revisão pedagógica.</p></div><div class="panel"><span class="metric-icon sand"><GraduationCap :size="23"/></span><strong>{{ inventory?.official || 0 }}</strong><h3>Oficiais verificadas</h3><p>Somente provas aplicadas, com identificação do caderno, da questão, da aplicação e do gabarito definitivo.</p></div></div>
            <section class="panel sources-panel"><div class="panel-heading"><div><h2>Fontes oficiais para consulta</h2><p>A página do concurso é uma referência de origem; não significa que suas questões já foram importadas.</p></div></div><a v-for="source in catalog.officialSources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="source-row"><span class="large-board-emblem">V</span><div><h3>{{ source.title }}</h3><p>{{ source.note }}</p><small>{{ source.url }}</small></div><ExternalLink :size="20"/></a></section>
            <section class="panel editorial-panel"><h2>Como uma questão oficial chega à sua trilha</h2><div class="editorial-steps"><div><span>01</span><h3>Prova aplicada</h3><p>Documento original e identificação da aplicação e do caderno.</p></div><div><span>02</span><h3>Conferência</h3><p>Texto, alternativas, imagens, gabarito definitivo e eventuais anulações.</p></div><div><span>03</span><h3>Classificação</h3><p>Matéria, assunto, explicação e registro de revisão e de uso.</p></div></div><p class="muted small">A estrutura aceita novas bancas. Nesta versão, apenas a Vunesp está ativa. A disponibilidade de matérias não substitui a conferência do edital do seu concurso.</p></section>
          </template>

          <template v-if="route === 'settings'">
            <div class="page-heading"><div><div class="eyebrow">NO SEU RITMO</div><h1>Uma preparação que cabe na sua rotina<span class="green-dot">.</span></h1><p>Defina um compromisso possível e acompanhe seus passos.</p></div></div>
            <div class="settings-grid"><section class="panel"><span class="metric-icon sand"><Target :size="22"/></span><h2>Meta diária de questões</h2><p class="muted">A meta considera todas as tentativas do dia, no horário de Brasília.</p><form class="goal-form" @submit.prevent="saveGoal"><label>Questões por dia<input v-model="dailyGoal" type="number" min="5" max="200" required></label><button class="button primary">Salvar meta<Check :size="17"/></button></form></section><section class="panel"><span class="metric-icon sage"><Library :size="22"/></span><h2>Seu histórico é seu</h2><p class="muted">Seu histórico está associado à sua conta e protegido por políticas de acesso no Supabase.</p><button class="button secondary" @click="exportHistory">Exportar meu histórico<ArrowUpRight :size="17"/></button></section></div>
            <section class="panel settings-note"><h2>Conta conectada</h2><p>Conectado como {{ user?.email }}. Seu progresso é salvo no banco após cada resposta.</p></section>
          </template>
          <footer><span>aprovados<span class="green-dot">.</span><span class="footer-divider">/</span>Seu esforço tem direção.</span><span>Um passo de cada vez.</span></footer>
        </template>
      </main>
    </div>
  </div>
</template>
