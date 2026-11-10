// Regras puras da Missão do Dia.
// Sem dependência externa e sem acesso a rede ou tela: este mesmo arquivo roda no app e nas funções do servidor.
// Todo dia é uma string AAAA-MM-DD e toda hora é HH:MM, sempre no horário de Brasília.

const FUSO = 'America/Sao_Paulo'
export const HORA_AVISO_PAIS = '19:00'
export const LEMBRETES_PADRAO = { intervalo: 15, teto: 4 }
export const PRE_AVISOS_PADRAO = [10, 5]
const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

function partesSP(agora) {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  return Object.fromEntries(formato.formatToParts(agora).map((p) => [p.type, p.value]))
}

export function hojeSP(agora = new Date()) {
  const p = partesSP(agora)
  return `${p.year}-${p.month}-${p.day}`
}

export function horaSP(agora = new Date()) {
  const p = partesSP(agora)
  return `${p.hour}:${p.minute}`
}

function paraData(dia) {
  const [ano, mes, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, d))
}

export function somarDias(dia, n) {
  const data = paraData(dia)
  data.setUTCDate(data.getUTCDate() + n)
  return data.toISOString().slice(0, 10)
}

// 1 = segunda ... 7 = domingo
export function diaSemana(dia) {
  const n = paraData(dia).getUTCDay()
  return n === 0 ? 7 : n
}

export function inicioSemana(dia) {
  return somarDias(dia, 1 - diaSemana(dia))
}

export function ehDiaLetivo(dia, semAula = []) {
  return diaSemana(dia) <= 5 && !semAula.includes(dia)
}

// 'terça, 10/11'
export function dataExtenso(dia) {
  const [, mes, d] = dia.split('-')
  return `${DIAS[diaSemana(dia) - 1]}, ${d}/${mes}`
}

// Aceita 'HH:MM' e 'HH:MM:SS' (como o banco devolve).
export function minutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export function aulasDoDia(grade, dia) {
  const ds = diaSemana(dia)
  const vistas = new Set()
  return grade
    .filter((g) => g.dia_semana === ds)
    .sort((a, b) => a.ordem - b.ordem)
    .filter((g) => (vistas.has(g.materia) ? false : vistas.add(g.materia)))
    .map((g) => ({ materia: g.materia, professor: g.professor ?? null }))
}

export function estadoMissao(horario, hora, missao, letivo) {
  if (missao) return missao.status === 'parcial' ? 'parcial' : 'entregue'
  if (!letivo) return 'sem-aula'
  return minutos(hora) < minutos(horario.libera) ? 'antes' : 'liberada'
}

export function noHorario(horario, hora, origem) {
  if (origem === 'rapido') return true
  return minutos(hora) <= minutos(horario.bonus_ate)
}

export function robuxDaSemana(missoes, segunda) {
  const fim = somarDias(segunda, 6)
  return missoes.filter((m) => m.dia >= segunda && m.dia <= fim).reduce((soma, m) => soma + (m.robux || 0), 0)
}

// Sequência de dias letivos com entrega. A cada 5 dias seguidos ganha 1 escudo (máximo 2).
// Dia letivo perdido consome um escudo; sem escudo, a sequência volta a zero. Hoje só conta se já foi entregue.
export function sequencia(entregues, semAula, hoje) {
  if (!entregues.length) return { dias: 0, escudos: 0 }
  const feitos = new Set(entregues)
  let dia = [...entregues].sort()[0]
  let dias = 0
  let escudos = 0
  while (dia <= hoje) {
    if (feitos.has(dia)) {
      dias += 1
      if (dias % 5 === 0) escudos = Math.min(2, escudos + 1)
    } else if (ehDiaLetivo(dia, semAula) && dia !== hoje) {
      if (escudos > 0) escudos -= 1
      else dias = 0
    }
    dia = somarDias(dia, 1)
  }
  return { dias, escudos }
}

// 'duvida' quando ele marcou "não lembro" ou disse que a professora falou algo e não contou o quê.
export function seloTarefa(missao) {
  if (missao.nao_lembro) return 'duvida'
  const falouAlgo = Object.values(missao.respostas || {}).some((v) => v === true)
  const contou = Boolean(missao.audio_path) || Boolean((missao.texto_livre || '').trim())
  return falouAlgo && !contou ? 'duvida' : 'completo'
}

// aluno já vem com o artigo: 'o Léo', 'a Ana'.
export function recadoProfessora(tarefa, origem, aluno) {
  const quem = tarefa.professor || 'Professora'
  if (!tarefa.texto) {
    return `${quem}, ${aluno} disse que tem tarefa de ${tarefa.materia}, mas não lembrou os detalhes. Pode me passar o que precisa?`
  }
  const prazo = tarefa.prazo ? ` para ${dataExtenso(tarefa.prazo)}` : ''
  return `${quem}, ${aluno} trouxe tarefa de ${tarefa.materia}${prazo}: “${tarefa.texto}” Tem algum detalhe de como deve ser feito ou levado?`
}

// Quais avisos estão devidos agora. O chamador grava cada tipo enviado e passa em `enviados` na próxima vez.
// Devolve no máximo um aviso para o filho por chamada.
export function avisosDevidos(ctx) {
  const { horario, hora, letivo, missao, enviados = [] } = ctx
  const lembretes = ctx.lembretes || LEMBRETES_PADRAO
  const preAvisos = ctx.preAvisos || PRE_AVISOS_PADRAO
  const devidos = []

  if (missao) {
    if (!enviados.includes('entrega')) devidos.push({ tipo: 'entrega', para: 'pais' })
    return devidos
  }
  if (!letivo) return devidos

  const agora = minutos(hora)
  const libera = minutos(horario.libera)
  const limite = minutos(HORA_AVISO_PAIS)

  if (agora < libera) {
    // Só o pré-aviso mais próximo da hora cujo momento já chegou; os anteriores não saem atrasados.
    const [proximo] = preAvisos.filter((m) => agora >= libera - m).sort((a, b) => a - b)
    if (proximo !== undefined && !enviados.includes(`pre-${proximo}`)) devidos.push({ tipo: `pre-${proximo}`, para: 'filho' })
    return devidos
  }

  if (agora < limite) {
    if (!enviados.includes('liberada')) {
      devidos.push({ tipo: 'liberada', para: 'filho' })
    } else {
      const n = enviados.filter((e) => e.startsWith('lembrete-')).length + 1
      if (n <= lembretes.teto && agora >= libera + lembretes.intervalo * n) devidos.push({ tipo: `lembrete-${n}`, para: 'filho' })
    }
  } else if (!enviados.includes('sem-resposta')) {
    devidos.push({ tipo: 'sem-resposta', para: 'pais' })
  }
  return devidos
}
