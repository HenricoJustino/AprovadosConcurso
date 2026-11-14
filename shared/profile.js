export function readProfile(user) {
  const data = user?.user_metadata || {};
  const field = name => typeof data[name] === 'string' ? data[name] : '';
  return { full_name: field('full_name') || field('name'), phone: field('phone'), city: field('city'), study_goal: field('study_goal') };
}

export function validateProfile(input) {
  const limits = { full_name: 100, phone: 25, city: 100, study_goal: 200 };
  const data = {};
  for (const [name, max] of Object.entries(limits)) {
    if (typeof input[name] !== 'string') throw new Error('Preencha os dados do perfil corretamente.');
    data[name] = input[name].trim();
    if (data[name].length > max) throw new Error(`Use no máximo ${max} caracteres neste campo.`);
    if (/[\u0000-\u001f\u007f]/.test(data[name])) throw new Error('Remova os caracteres inválidos dos campos.');
  }
  if (data.full_name.length < 2) throw new Error('Informe seu nome com pelo menos 2 caracteres.');
  if (data.phone && !/^[+()\d\s.-]{7,25}$/.test(data.phone)) throw new Error('Informe um telefone válido ou deixe o campo vazio.');
  return data;
}

export async function saveStudentProfile(auth, input, expectedUserId) {
  const data = validateProfile(input);
  const current = await auth.getUser();
  if (current.error || !current.data.user || current.data.user.is_anonymous || current.data.user.id !== expectedUserId) throw new Error('Sua sessão mudou. Entre novamente para salvar seu perfil.');
  // A API Auth altera somente a conta autenticada; não aceita um ID de destino.
  // Metadados de perfil são dados de exibição, nunca critérios de autorização.
  const response = await auth.updateUser({ data });
  if (response.error) throw new Error('Não foi possível salvar seu perfil. Tente novamente.');
  if (response.data.user?.id !== expectedUserId) throw new Error('Sua sessão mudou. Recarregue a página.');
  return response.data.user;
}
