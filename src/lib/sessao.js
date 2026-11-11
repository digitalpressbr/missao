// Entrada por nome de usuário. O e-mail interno existe só porque o serviço de login exige um; ninguém vê nem usa.
export function emailInterno(usuario) {
  const u = String(usuario ?? '').trim().toLowerCase()
  if (!/^[a-z0-9.-]{2,30}$/.test(u)) throw new Error('usuario_invalido')
  return `${u}.missao@example.com`
}

export function senhaValida(s) {
  return typeof s === 'string' && s.length >= 8
}

export function mensagemDeErro(e) {
  const msg = String(e?.message ?? e ?? '')
  if (msg === 'sem_familia') return 'Esta conta não está ligada a uma família.'
  if (msg === 'usuario_invalido' || /invalid login credentials/i.test(msg)) return 'Usuário ou senha não conferem.'
  if (e?.status === 429 || /rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos.'
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return 'Sem conexão. Tente de novo.'
  if (/different from the old/i.test(msg)) return 'Escolha uma senha diferente da provisória.'
  if (/password/i.test(msg) && /(least|short|weak)/i.test(msg)) return 'A senha precisa ter 8 caracteres ou mais.'
  return 'Não deu certo. Tente de novo.'
}

// Quadros de quem entrou (um por filho), do mais antigo para o mais novo.
// `linhas` são as linhas de membro da pessoa, cada uma com a família; `filhos`, os filhos que ela enxerga.
export function montarFamilias(linhas = [], filhos = []) {
  return [...linhas]
    .sort((a, b) => String(a.familia?.criado_em ?? '').localeCompare(String(b.familia?.criado_em ?? '')))
    .map((l) => {
      const f = filhos.find((x) => x.familia_id === l.familia_id)
      return {
        id: l.familia_id,
        tema: l.familia?.tema === 'rosa' ? 'rosa' : 'azul',
        filho: f ? { nome: f.nome, tratamento: f.tratamento ?? null, moldura: f.moldura ?? 0 } : null,
      }
    })
}

// O quadro aberto: o último escolhido neste aparelho, se ainda for da pessoa; senão o primeiro.
export function familiaAtiva(familias = [], guardada = null) {
  return familias.find((f) => f.id === guardada) ?? familias[0] ?? null
}
