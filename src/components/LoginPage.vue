<script setup>
import { computed } from 'vue';
import { GraduationCap, ArrowRight, LockKeyhole, BookOpen, ChartNoAxesCombined, Check, RefreshCw } from 'lucide-vue-next';
import GoogleSignInButton from './GoogleSignInButton.vue';
const props = defineProps({ config: Object, booting: Boolean, error: String, notice: String, googleBusy: Boolean, authBusy: Boolean, authSignup: Boolean });
defineEmits(['google', 'submit', 'toggle', 'reload']);
const email = defineModel('email');
const password = defineModel('password');
const available = computed(() => props.config?.mode === 'supabase' && !props.booting);
const busy = computed(() => props.authBusy || props.googleBusy || props.booting);
</script>

<template>
  <main class="login-page">
    <section class="login-story" aria-label="Aprovados Concursos">
      <a class="login-brand" href="/login"><span><GraduationCap :size="27"/></span>aprovados<span class="brand-period">.</span></a>
      <div class="story-content">
        <span class="story-label">SUA PRÓXIMA CONQUISTA COMEÇA AQUI</span>
        <h1>Um plano de estudos.<br>Um futuro com<br><em>mais possibilidades.</em></h1>
        <p>Aprenda os fundamentos, pratique com confiança e acompanhe cada passo da sua preparação.</p>
        <div class="journey-card" aria-hidden="true">
          <div class="journey-heading"><span class="journey-icon"><BookOpen :size="20"/></span><div><strong>Do básico à aprovação</strong><small>Preparação para a banca Vunesp</small></div><span class="journey-tag">Sua jornada</span></div>
          <div class="journey-step"><span><Check :size="14"/></span><div><strong>Entenda o conceito</strong><small>Uma base sólida para começar</small></div><small>01</small></div>
          <div class="journey-step"><span><Check :size="14"/></span><div><strong>Pratique e evolua</strong><small>Questões no seu ritmo</small></div><small>02</small></div>
          <div class="journey-step last"><span><ChartNoAxesCombined :size="15"/></span><div><strong>Veja seu progresso</strong><small>Cada resposta conta</small></div><small>03</small></div>
        </div>
      </div>
      <p class="story-footer">Constância hoje. Novas oportunidades amanhã.</p>
    </section>

    <section class="login-entry" aria-label="Acesso à conta">
      <div class="entry-content">
        <span class="entry-badge"><LockKeyhole :size="14"/>SEU ESPAÇO PESSOAL</span>
        <h2>{{ authSignup ? 'Comece sua jornada' : 'Bom ter você aqui.' }}</h2>
        <p class="entry-subtitle">{{ authSignup ? 'Crie sua conta e construa sua preparação.' : 'Entre para continuar de onde parou.' }}</p>
        <div v-if="booting" class="entry-loading" role="status"><span class="spinner"></span>Preparando seu acesso…</div>
        <template v-else>
          <p v-if="error" class="entry-alert" role="alert">{{ error }}</p>
          <p v-if="notice" class="entry-alert positive" role="status">{{ notice }}</p>
          <GoogleSignInButton :busy="googleBusy" :disabled="!available || authBusy" @click="$emit('google')"/>
          <template v-if="available">
            <div class="entry-divider"><span>ou continue com e-mail</span></div>
            <form class="entry-form" @submit.prevent="$emit('submit')">
              <label>E-mail<input v-model="email" type="email" required autocomplete="email" placeholder="voce@exemplo.com" :disabled="busy"></label>
              <label>Senha<input v-model="password" type="password" required minlength="8" :autocomplete="authSignup ? 'new-password' : 'current-password'" placeholder="Sua senha de acesso" :disabled="busy"></label>
              <small v-if="authSignup">Use uma senha com pelo menos 8 caracteres.</small>
              <button class="entry-submit" :disabled="busy">{{ authBusy ? 'Aguarde…' : authSignup ? 'Criar minha conta' : 'Entrar na minha conta' }}<ArrowRight :size="18"/></button>
            </form>
            <p class="entry-switch">{{ authSignup ? 'Já tem uma conta?' : 'Primeira vez por aqui?' }} <button :disabled="busy" @click="$emit('toggle')">{{ authSignup ? 'Entrar' : 'Criar conta' }}</button></p>
          </template>
          <div v-else class="configuration-note" role="status"><LockKeyhole :size="20"/><strong>Seu acesso está protegido</strong><p>A autenticação está aguardando configuração. Assim que estiver disponível, entre na sua conta para estudar.</p><button @click="$emit('reload')"><RefreshCw :size="14"/>Tentar novamente</button></div>
        </template>
        <p class="entry-privacy"><LockKeyhole :size="14"/>Seu perfil, suas respostas e seu progresso ficam vinculados à sua conta.</p>
      </div>
      <footer class="entry-footer">Aprovados Concursos <span>Feito para o seu próximo passo.</span></footer>
    </section>
  </main>
</template>

<style scoped>
.login-page{min-height:100dvh;display:grid;grid-template-columns:1.05fr 1fr;padding:0;background:#fff;color:#172c29;font-size:14px}.login-story{background:#eef5f1;padding:42px clamp(28px,5vw,84px);display:flex;flex-direction:column;position:relative;overflow:hidden}.login-brand{display:inline-flex;align-items:center;width:max-content;gap:11px;font-size:27px;font-weight:750;letter-spacing:-1px;color:#153f35;text-decoration:none}.login-brand>span:first-child{display:grid;place-items:center;background:#174c40;color:#fff;width:43px;height:43px;border-radius:13px}.login-brand .brand-period{color:#61a689;margin-left:-10px}.story-content{margin:auto 0;padding:64px 0 45px;max-width:525px}.story-label{font-size:10px;letter-spacing:1.7px;font-weight:700;color:#5c7f72}.story-content h1{font-size:clamp(33px,3.3vw,52px);line-height:1.16;letter-spacing:-2px;font-weight:650;margin:22px 0}.story-content h1 em{font-style:normal;color:#37775e}.story-content>p{max-width:390px;font-size:14px;line-height:1.9;color:#6b7e77}.journey-card{background:#fff;padding:23px;border:1px solid #e1ebe5;border-radius:18px;box-shadow:0 16px 45px #224f3c08;margin-top:37px;max-width:420px}.journey-heading{display:flex;align-items:center;gap:12px;border-bottom:1px solid #edf1ef;padding-bottom:20px;margin-bottom:18px}.journey-icon{display:grid;place-items:center;width:40px;height:40px;background:#edf6f0;border-radius:12px;color:#31765a}.journey-heading strong,.journey-step strong{display:block;font-size:12px;font-weight:650}.journey-heading small,.journey-step small{display:block;font-size:10px;color:#8b9891;margin-top:5px}.journey-tag{margin-left:auto;background:#f4f7f5;padding:6px 8px;border-radius:5px;color:#6f8b7b;font-size:8px;white-space:nowrap}.journey-step{display:flex;align-items:center;gap:13px;padding:12px 2px}.journey-step>span{display:grid;place-items:center;background:#e6f1e9;color:#3c7b5c;width:27px;height:27px;border-radius:50%}.journey-step>small{margin-left:auto;color:#b5c2b9}.journey-step.last>span{background:#f0f3fb;color:#657bae}.story-footer{font-size:10px;color:#889c90;margin:0}.login-entry{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 45px 25px;position:relative}.entry-content{width:100%;max-width:365px;margin:auto 0;padding:35px 0}.entry-badge{display:inline-flex;align-items:center;gap:7px;color:#72867e;font-size:9px;font-weight:650;letter-spacing:1.3px}.entry-content h2{font-size:32px;letter-spacing:-1px;font-weight:650;margin:18px 0 10px;color:#203c33}.entry-subtitle{color:#84918b;font-size:13px;margin-bottom:32px}.entry-divider{border-top:1px solid #e9eeeb;text-align:center;margin:30px 0 17px;height:1px}.entry-divider span{background:#fff;position:relative;top:-9px;padding:0 13px;font-size:10px;color:#a0aaa4}.entry-form{display:grid;gap:18px}.entry-form label{display:grid;gap:9px;color:#4c6157;font-size:12px;font-weight:550}.entry-form input{min-width:0;width:100%;border:1px solid #dfe7e1;background:#fafcfb;padding:13px 14px;border-radius:9px;font-size:13px;min-height:46px;outline:none}.entry-form input:focus{border-color:#548e72;box-shadow:0 0 0 3px #548e7215}.entry-form small{color:#8c9b91;font-size:11px}.entry-submit{display:flex;align-items:center;justify-content:center;gap:12px;background:#1c5845;color:#fff;padding:14px 20px;min-height:47px;border-radius:9px;font-size:12px;font-weight:600;margin-top:5px}.entry-submit:hover{background:#174a3b}.entry-switch{text-align:center;color:#96a199;font-size:11px;margin-top:23px}.entry-switch button{color:#28694e;font-weight:650;background:none;padding:5px}.entry-privacy{display:flex;gap:8px;align-items:flex-start;color:#a0aaa4;line-height:1.8;font-size:10px;border-top:1px solid #edf1ed;padding-top:23px;margin-top:31px}.entry-privacy svg{flex-shrink:0;margin-top:3px}.entry-footer{border:0;width:100%;display:flex;justify-content:space-between;font-size:9px;color:#a1ada5;padding:30px 0 0;margin:0}.entry-footer span{font-size:9px}.entry-alert{padding:12px 14px;border-radius:8px;background:#fff1ed;color:#a65b47;font-size:12px;line-height:1.7;margin-bottom:18px}.entry-alert.positive{background:#eef7ef;color:#39694c}.configuration-note{margin-top:22px;padding:23px;border:1px solid #e5ece7;border-radius:12px;background:#fafcfb;display:grid;gap:12px;color:#769180}.configuration-note strong{color:#3e6451;font-size:13px}.configuration-note p{font-size:12px;line-height:1.8;color:#87968c}.configuration-note button{display:flex;gap:8px;align-items:center;font-size:11px;color:#37765a;background:none;width:max-content;padding:4px 0}.entry-loading{display:flex;gap:12px;align-items:center;color:#809389;padding:35px 0}.login-page button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:1000px){.login-story{padding:35px 30px}.story-content h1{font-size:38px}.journey-tag{display:none}.login-entry{padding:40px 30px 20px}}
@media(max-width:760px){.login-page{display:block}.login-story{padding:25px;background:#f1f6f2}.login-brand{font-size:24px}.login-brand>span:first-child{width:36px;height:36px}.story-content{padding:25px 0 6px;max-width:100%}.story-label{font-size:8px}.story-content h1{font-size:30px;letter-spacing:-1px;line-height:1.2;margin:12px 0}.story-content h1 br{display:initial}.story-content h1 em{display:block}.story-content>p,.journey-card,.story-footer{display:none}.login-entry{padding:25px;min-height:65vh}.entry-content{padding:16px 0;max-width:410px}.entry-content h2{font-size:28px}.entry-subtitle{margin-bottom:26px}.entry-footer{max-width:410px;padding-top:15px}.entry-privacy{margin-top:25px}}
</style>
