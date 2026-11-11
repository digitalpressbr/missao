import { useCallback, useEffect, useMemo, useState } from 'react'
import { carregarPainel } from './dados'
import { aulasDoDia, diaSemana, ehDiaLetivo, estadoMissao, hojeSP, horaSP, inicioSemana, pronomes, robuxDaSemana, sequencia } from './regras'

// Carrega os dados da família, recarrega quando o app volta para a frente e acompanha o relógio.
export function usarPainel(familiaId) {
  const [painel, setPainel] = useState(null)
  const [erro, setErro] = useState(null)
  const [agora, setAgora] = useState(() => new Date())

  const recarregar = useCallback(async () => {
    try {
      setPainel(await carregarPainel(familiaId))
      setErro(null)
    } catch (e) {
      setErro(e)
    }
  }, [familiaId])

  useEffect(() => {
    recarregar()
    const relogio = setInterval(() => setAgora(new Date()), 30000)
    const recarga = setInterval(() => { if (!document.hidden) recarregar() }, 60000)
    const aoVoltar = () => { if (!document.hidden) { setAgora(new Date()); recarregar() } }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      clearInterval(relogio)
      clearInterval(recarga)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [recarregar])

  const hoje = hojeSP(agora)
  useEffect(() => {
    if (painel && painel.hoje !== hoje) recarregar()
  }, [painel, hoje, recarregar])

  const derivado = useMemo(() => {
    if (!painel) return null
    const hora = horaSP(agora)
    const horario = painel.horarios.find((h) => h.dia_semana === diaSemana(hoje)) ?? null
    const letivo = Boolean(horario) && ehDiaLetivo(hoje, painel.semAula)
    const missao = painel.hoje === hoje ? painel.missaoHoje : null
    const filho = painel.membros.find((m) => m.papel === 'filho') ?? null
    const seq = sequencia(painel.missoes.map((m) => m.dia), painel.semAula, hoje)
    return {
      hoje,
      hora,
      horario,
      letivo,
      missao,
      filho,
      aluno: filho?.tratamento || filho?.nome || 'o aluno',
      ...pronomes(filho?.tratamento),
      aulas: aulasDoDia(painel.grade, hoje),
      estado: estadoMissao(horario ?? { libera: '00:00', bonus_ate: '00:00' }, hora, missao, letivo),
      robux: robuxDaSemana(painel.missoes, inicioSemana(hoje)),
      meta: painel.familia.robux_por_missao * 5,
      dias: seq.dias,
      escudos: seq.escudos,
    }
  }, [painel, agora, hoje])

  return { painel, erro, recarregar, ...(derivado ?? {}) }
}
