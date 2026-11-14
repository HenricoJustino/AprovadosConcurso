import test from 'node:test';
import assert from 'node:assert/strict';
import { readProfile, saveStudentProfile, validateProfile } from '../shared/profile.js';
const profile = { full_name: '  Rafael Henrico  ', city: 'Urutaí', phone: '(64) 99999-9999', study_goal: 'Minha aprovação' };
test('perfil salva campos permitidos na própria conta e recupera os dados persistidos', async () => {
  let stored = { id: 'student-a', user_metadata: { name: 'Henrico', provider_id: 'google-id' } };
  const auth = { getUser: async () => ({ data: { user: stored } }), updateUser: async args => {
    assert.deepEqual(Object.keys(args), ['data']);
    assert.equal('user_id' in args.data, false); assert.equal('role' in args.data, false);
    stored = { ...stored, user_metadata: { ...stored.user_metadata, ...args.data } };
    return { data: { user: stored } };
  } };
  const saved = await saveStudentProfile(auth, { ...profile, user_id: 'student-b', role: 'admin' }, 'student-a');
  assert.equal(saved.id, 'student-a');
  assert.equal(readProfile((await auth.getUser()).data.user).full_name, 'Rafael Henrico');
  assert.equal(saved.user_metadata.provider_id, 'google-id');
  assert.equal(readProfile(saved).city, 'Urutaí');
});
test('perfil rejeita sessão ausente, anônima ou trocada antes de atualizar', async () => {
  for (const user of [null, { id: 'student-b' }, { id: 'student-a', is_anonymous: true }]) {
    await assert.rejects(saveStudentProfile({ getUser: async () => ({ data: { user } }), updateUser: () => assert.fail('Não pode alterar outra conta') }, profile, 'student-a'), /sessão/);
  }
});
test('perfil valida nomes, tamanho e telefone e não confirma falha de persistência', async () => {
  for (const input of [{ ...profile, full_name: ' ' }, { ...profile, city: 'a'.repeat(101) }, { ...profile, phone: 'telefone inválido' }]) assert.throws(() => validateProfile(input));
  await assert.rejects(saveStudentProfile({ getUser: async () => ({ data: { user: { id: 'student-a' } } }), updateUser: async () => ({ error: new Error('network') }) }, profile, 'student-a'), /salvar/);
});
