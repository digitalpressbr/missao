// Monta o que o painel dos pais mostra, a partir dos dados já carregados. Sem rede e sem tela.
import { HORA_AVISO_PAIS, horaSP, inicioSemana, minutos, recadoProfessora, robuxDaSemana, seloTarefa, sequencia, somarDias, diaSemana } from '../lib/regras'

const NOMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

export function resumoDoDia({ missao, tarefas = [], aulas = [], hora, letivo, aluno }) {
  let situacao
  if (missao) situacao = missao.status === 'parcial' ? 'parcial' : 'entregue'
  else if (!letivo) situacao = 'sem-aula'
  else situacao = minutos(hora) >= minutos(HORA_AVISO_PAIS) ? 'sem-resposta' : 'aguardando'

  const selo = missao ? seloTarefa(missao) : null
  const cartoes = missao
    ? tarefas.map((t) => ({
        id: t.id,
        materia: t.materia,
        professor: t.professor ?? null,
        selo,
        texto: t.texto ?? null,
        prazo: t.prazo ?? null,
        levar: t.levar ?? null,
        conferencia: t.conferencia ?? null,
        fotoPendente: !missao.foto_path,
        recado: selo === 'duvida' ? recadoProfessora(t, missao.origem, aluno) : null,
      }))
    : []
  const comTarefa = new Set(cartoes.map((c) => c.materia))
  return {
    situacao,
    hora: missao ? horaSP(new Date(missao.entregue_em)) : null,
    cartoes,
    semTarefa: missao ? aulas.map((a) => a.materia).filter((m) => !comTarefa.has(m)) : [],
  }
}

export function resumoDaSemana({ missoes = [], semAula = [], hoje, trocas = [] }) {
  const segunda = inicioSemana(hoje)
  const entregues = new Set(missoes.map((m) => m.dia))
  const dias = NOMES.map((nome, i) => {
    const dia = somarDias(segunda, i)
    let estado
    if (entregues.has(dia)) estado = 'ok'
    else if (semAula.includes(dia)) estado = 'sem-aula'
    else if (dia === hoje) estado = 'hoje'
    else estado = dia < hoje ? 'perdido' : 'futuro'
    return { dia, nome, estado }
  })
  const seq = sequencia([...entregues], semAula, hoje)
  const troca = trocas.find((t) => t.semana_inicio === segunda) ?? null
  return {
    segunda,
    robux: robuxDaSemana(missoes, segunda),
    dias,
    sequencia: seq.dias,
    escudos: seq.escudos,
    trocaFeita: troca ? { robux: troca.robux, feita_em: troca.feita_em } : null,
    fimDeSemana: diaSemana(hoje) > 5,
  }
}
