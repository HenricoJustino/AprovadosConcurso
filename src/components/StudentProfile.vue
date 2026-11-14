<script setup>
import { reactive, ref, watch, computed } from 'vue';
import { UserRound, Mail, ShieldCheck, Check, LogOut, Target, CalendarDays } from 'lucide-vue-next';
import { readProfile, saveStudentProfile } from '../../shared/profile.js';
const props = defineProps({ user: { type: Object, required: true }, auth: { type: Object, required: true } });
const emit = defineEmits(['saved', 'logout']);
const form = reactive(readProfile(props.user));
const saving = ref(false), error = ref(''), success = ref('');
const initial = computed(() => (readProfile(props.user).full_name || props.user.email || 'A').slice(0, 1).toUpperCase());
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(readProfile(props.user)));
const memberSince = computed(() => props.user.created_at ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(props.user.created_at)) : 'Conta ativa');
watch(() => props.user.id, () => { Object.assign(form, readProfile(props.user)); error.value = ''; success.value = ''; });
async function save() {
  if (saving.value) return;
  const id = props.user.id;
  saving.value = true; error.value = ''; success.value = '';
  try {
    const user = await saveStudentProfile(props.auth, form, id);
    if (props.user.id !== id) return;
    emit('saved', user); Object.assign(form, readProfile(user)); success.value = 'Perfil atualizado com sucesso.';
  } catch (e) { if (props.user.id === id) error.value = e.message; }
  finally { saving.value = false; }
}
function cancel() { Object.assign(form, readProfile(props.user)); error.value = ''; success.value = ''; }
</script>

<template>
  <section class="student-profile">
    <div class="page-heading"><div><div class="eyebrow">SUA CONTA</div><h1>Meu perfil<span class="green-dot">.</span></h1><p>Um espaço com a sua identidade. Mantenha seus dados atualizados.</p></div><span class="profile-secure"><ShieldCheck :size="15"/>Conta protegida</span></div>
    <div class="profile-layout">
      <aside class="profile-card">
        <span class="profile-photo">{{ initial }}</span><h2>{{ readProfile(user).full_name || 'Estudante' }}</h2><p>{{ user.email }}</p><span class="student-chip"><UserRound :size="13"/>Estudante</span>
        <div class="profile-card-divider"></div><div class="profile-detail"><CalendarDays :size="16"/><span>Por aqui desde<small>{{ memberSince }}</small></span></div><div class="profile-detail"><Target :size="16"/><span>Sua preparação<small>Vunesp · do básico à prova</small></span></div>
        <button class="profile-signout" @click="$emit('logout')"><LogOut :size="16"/>Sair da minha conta</button>
      </aside>
      <div>
        <form class="profile-form panel" @submit.prevent="save">
          <div class="profile-section-heading"><span class="profile-section-icon"><UserRound :size="21"/></span><div><h2>Informações pessoais</h2><p>Como você quer ser chamado na sua jornada.</p></div></div>
          <p v-if="error" class="profile-feedback failure" role="alert">{{ error }}</p><p v-if="success" class="profile-feedback" role="status"><Check :size="17"/>{{ success }}</p>
          <fieldset :disabled="saving"><label class="wide">Nome completo<input v-model="form.full_name" autocomplete="name" minlength="2" maxlength="100" required placeholder="Seu nome completo"></label>
          <label>Telefone <span>(opcional)</span><input v-model="form.phone" type="tel" autocomplete="tel" maxlength="25" placeholder="(00) 00000-0000"></label><label>Cidade <span>(opcional)</span><input v-model="form.city" autocomplete="address-level2" maxlength="100" placeholder="Onde você mora"></label>
          <label class="wide">Seu objetivo <span>(opcional)</span><input v-model="form.study_goal" maxlength="200" placeholder="Ex.: conquistar minha aprovação no próximo concurso"></label></fieldset>
          <div class="profile-form-actions"><span>As alterações são salvas na sua conta.</span><button type="button" class="button secondary" :disabled="saving || !dirty" @click="cancel">Cancelar</button><button class="button primary" :disabled="saving || !dirty">{{ saving ? 'Salvando…' : 'Salvar alterações' }}<Check :size="16"/></button></div>
        </form>
        <section class="profile-account panel"><span class="profile-section-icon"><Mail :size="20"/></span><div><h2>Acesso à conta</h2><p>{{ user.email }}</p><small>Seu e-mail identifica sua conta e preserva o vínculo com seu histórico de estudos.</small></div><ShieldCheck :size="20"/></section>
        <p class="profile-footnote"><ShieldCheck :size="15"/>Suas respostas, metas e estatísticas continuam vinculadas à sua conta ao editar o perfil.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-secure{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;background:#edf6ef;border-radius:20px;color:#5d886c;font-size:10px;white-space:nowrap}.profile-layout{display:grid;grid-template-columns:255px minmax(0,1fr);gap:25px;align-items:start}.profile-card{background:#fff;border:1px solid #e3eae5;border-radius:15px;text-align:center;padding:32px 23px}.profile-photo{display:grid;place-items:center;width:79px;height:79px;margin:0 auto 20px;background:#eaf3ec;color:#377152;border:5px solid #f6f9f6;border-radius:50%;font-size:29px;font-weight:650}.profile-card h2{font-size:18px;line-height:1.5;overflow-wrap:anywhere}.profile-card>p{font-size:11px;color:#90a095;overflow-wrap:anywhere;margin:7px 0 13px}.student-chip{display:inline-flex;gap:6px;align-items:center;font-size:10px;padding:6px 10px;background:#f3f7f3;color:#72917a;border-radius:20px}.profile-card-divider{border-top:1px solid #edf1ec;margin:25px 0}.profile-detail{display:flex;gap:12px;text-align:left;padding:10px 0;color:#8a9d8f;font-size:10px;align-items:center}.profile-detail small{display:block;color:#516d58;margin-top:5px;font-size:11px;line-height:1.7}.profile-signout{display:flex;align-items:center;justify-content:center;gap:9px;border-top:1px solid #edf1ec;padding:24px 0 0;margin:20px 0 0;width:100%;background:none;color:#8e9a91;font-size:11px}.profile-signout:hover{color:#b26959}.profile-form{border-radius:15px;padding:29px}.profile-section-heading{display:flex;gap:13px;align-items:center;margin-bottom:29px}.profile-section-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#f0f6f1;color:#6b9073;flex-shrink:0}.profile-section-heading h2,.profile-account h2{font-size:15px;letter-spacing:-.2px}.profile-section-heading p{font-size:11px;color:#94a094;margin-top:6px}.profile-form fieldset{border:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:22px 19px;min-width:0}.profile-form label{display:grid;gap:9px;font-size:11px;color:#52705a}.profile-form label>span{display:contents;font-size:10px;color:#a0ada1;font-weight:400}.profile-form label.wide{grid-column:1/-1}.profile-form input{width:100%;min-width:0;border:1px solid #dee7df;border-radius:8px;padding:13px;background:#fcfdfb;font-size:12px;color:#3c5b46}.profile-form input:focus{outline:2px solid #c5ddcb;outline-offset:1px}.profile-form-actions{border-top:1px solid #edf1ec;display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:28px;padding-top:24px}.profile-form-actions>span{margin-right:auto;color:#9ba79c;font-size:9px;line-height:1.6}.profile-form-actions .button{font-size:10px;padding:11px 15px;min-height:39px}.profile-account{display:flex;align-items:flex-start;gap:14px;margin-top:20px;border-radius:15px;padding:24px 29px}.profile-account p{color:#69846e;font-size:12px;margin:9px 0}.profile-account small{font-size:10px;color:#a0aba0;line-height:1.8;display:block}.profile-account>svg{margin-left:auto;flex-shrink:0;color:#91ad97}.profile-footnote{display:flex;gap:7px;font-size:10px;line-height:1.8;color:#9aa79b;padding:19px 5px}.profile-footnote svg{flex-shrink:0;margin-top:2px}.profile-feedback{display:flex;gap:9px;align-items:center;padding:12px;border-radius:8px;color:#427852;background:#eef7ef;margin-bottom:20px;font-size:12px}.profile-feedback.failure{color:#ad6252;background:#fff3ef}
@media(max-width:1150px){.profile-layout{grid-template-columns:210px minmax(0,1fr);gap:17px}.profile-form{padding:23px}.profile-form-actions{flex-wrap:wrap}.profile-form-actions>span{flex-basis:100%}.profile-card{padding:27px 17px}.profile-account{padding:23px}}
@media(max-width:760px){.profile-layout{grid-template-columns:1fr}.profile-card{display:none}.profile-secure{display:none}.profile-form fieldset{grid-template-columns:1fr}.profile-form label.wide{grid-column:auto}.profile-form-actions .button{flex:1}.profile-footnote{font-size:9px}.profile-account{padding:23px}}
</style>
