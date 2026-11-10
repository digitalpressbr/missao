// Estado da missão no celular: passos, respostas e rascunho guardado no aparelho.
export const PERGUNTAS = [
  { id: 'levar', texto: 'É para levar alguma coisa?', curto: 'Levar algo' },
  { id: 'jeito', texto: 'Tem um jeito certo de fazer?', curto: 'Jeito certo' },
  { id: 'surpresa', texto: 'É surpresa ou segredo?', curto: 'Surpresa' },
  { id: 'dia', texto: 'Tem dia marcado?', curto: 'Dia marcado' },
]

export function estadoInicial(origem = 'jogador') {
  return {
    passo: 'inicio', origem, marcadas: [], foto: null, semFoto: false,
    respostas: {}, audio: null, textoLivre: '', naoLembro: false, erro: null, missao: null,
  }
}

export function algumSim(estado) {
  return Object.values(estado.respostas).some((v) => v === true)
}

export function missaoReducer(e, a) {
  switch (a.tipo) {
    case 'iniciar':
      return { ...e, passo: 'aulas' }
    case 'marcarAula':
      return { ...e, marcadas: e.marcadas.includes(a.materia) ? e.marcadas.filter((m) => m !== a.materia) : [...e.marcadas, a.materia] }
    case 'continuar':
      if (!e.marcadas.length) return { ...e, passo: 'enviando' }
      return { ...e, passo: e.origem === 'rapido' ? 'detalhes' : 'foto' }
    case 'fotoPronta':
      return { ...e, semFoto: false, foto: { path: a.path, lida: a.lida ?? [], legivel: Boolean(a.legivel) } }
    case 'refazerFoto':
      return { ...e, foto: null }
    case 'fotoConfirmada':
      return { ...e, passo: 'detalhes' }
    case 'semFoto':
      return { ...e, foto: null, semFoto: true, passo: 'detalhes' }
    case 'responder':
      return { ...e, respostas: { ...e.respostas, [a.id]: a.valor } }
    case 'audioPronto':
      return { ...e, audio: { path: a.path, transcricao: a.transcricao ?? '' } }
    case 'semAudio':
      return { ...e, audio: null }
    case 'textoLivre':
      return { ...e, textoLivre: a.txt }
    case 'naoLembro':
      return { ...e, naoLembro: true, passo: 'enviando' }
    case 'entregar':
      return { ...e, passo: 'enviando' }
    case 'entregue':
      return { ...e, passo: 'fim', missao: a.missao, erro: null }
    case 'falhou':
      return { ...e, passo: 'erro', erro: a.msg }
    case 'tentarDeNovo':
      return { ...e, passo: 'enviando', erro: null }
    case 'voltar':
      if (e.passo === 'aulas') return { ...e, passo: 'inicio' }
      if (e.passo === 'foto') return { ...e, passo: 'aulas' }
      if (e.passo === 'detalhes') return { ...e, passo: e.origem === 'rapido' ? 'aulas' : 'foto' }
      return e
    case 'restaurar':
      return a.estado
    default:
      return e
  }
}

// Corpo da função ms_entregar_missao. `aulas` é a lista do dia, com a professora de cada matéria.
export function montarEntrega(e, aulas) {
  return {
    origem: e.origem,
    nao_lembro: e.naoLembro,
    materias: aulas.filter((a) => e.marcadas.includes(a.materia)).map((a) => ({ materia: a.materia, professor: a.professor ?? null })),
    respostas: e.respostas,
    foto_path: e.foto?.path ?? null,
    foto_lida: e.foto?.lida ?? [],
    audio_path: e.audio?.path ?? null,
    transcricao: e.audio?.transcricao ?? null,
    texto_livre: e.textoLivre.trim() || null,
  }
}

function chave(dia, origem) {
  return origem === 'rapido' ? `missao-rascunho-rapido-${dia}` : `missao-rascunho-${dia}`
}
const GUARDAR = ['aulas', 'foto', 'detalhes', 'enviando', 'erro']

export function salvarRascunho(guarda, dia, e) {
  try {
    if (e.passo === 'fim' || e.passo === 'inicio') guarda.removeItem(chave(dia, e.origem))
    else if (GUARDAR.includes(e.passo)) guarda.setItem(chave(dia, e.origem), JSON.stringify(e))
  } catch {
    /* aparelho sem espaço ou em modo privado: segue sem rascunho */
  }
}

export function lerRascunho(guarda, dia, origem = 'jogador') {
  try {
    const bruto = guarda.getItem(chave(dia, origem))
    if (!bruto) return null
    const e = { ...estadoInicial(origem), ...JSON.parse(bruto) }
    // Fechou o app no meio do envio: volta com as respostas guardadas e o botão de tentar de novo.
    if (e.passo === 'enviando') return { ...e, passo: 'erro', erro: 'A entrega não terminou. Suas respostas estão guardadas.' }
    return e
  } catch {
    return null
  }
}
