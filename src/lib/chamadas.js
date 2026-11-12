// Agenda das chamadas para o app Android: as mesmas horas e os mesmos textos que o servidor usa nos avisos.
// O celular guarda a lista e chama sozinho, com o app fechado.
import { HORA_AVISO_PAIS, LEMBRETES_PADRAO, PRE_AVISOS_PADRAO, diaSemana, ehDiaLetivo, minutos, somarDias } from './regras'

// O Brasil não tem horário de verão: Brasília fica sempre 3 horas atrás do horário universal.
export function instanteSP(dia, minutosDoDia) {
  const [ano, mes, d] = dia.split('-').map(Number)
  return Date.UTC(ano, mes - 1, d, 3, minutosDoDia)
}

// Chamadas que ainda vão acontecer, da mais próxima para a mais distante.
// `agora` em milissegundos; `hoje` no formato AAAA-MM-DD; `entregueHoje` tira as de hoje.
export function chamadasFuturas({ agora, hoje, horarios = [], semAula = [], entregueHoje = false, lembretes, preAvisos, robux = 0, dias = 14 }) {
  const intervalo = lembretes?.intervalo ?? LEMBRETES_PADRAO.intervalo
  const teto = lembretes?.teto ?? LEMBRETES_PADRAO.teto
  const antes = Array.isArray(preAvisos) ? preAvisos : PRE_AVISOS_PADRAO
  const limite = minutos(HORA_AVISO_PAIS)
  const lista = []

  for (let i = 0; i < dias; i++) {
    const dia = somarDias(hoje, i)
    const horario = horarios.find((h) => h.dia_semana === diaSemana(dia))
    if (!horario || !ehDiaLetivo(dia, semAula)) continue
    if (i === 0 && entregueHoje) continue
    const libera = minutos(horario.libera)
    const doDia = []
    for (const m of antes) {
      if (libera - m >= 0) doDia.push({ minuto: libera - m, tipo: `pre-${m}`, titulo: 'Falta pouco', texto: `Missão libera em ${m} minutos.` })
    }
    if (libera < limite) {
      doDia.push({ minuto: libera, tipo: 'liberada', titulo: 'Missão liberada', texto: `Missão de hoje liberada. ${robux} Robux esperando.` })
      for (let n = 1; n <= teto; n++) {
        const minuto = libera + intervalo * n
        if (minuto < limite) doDia.push({ minuto, tipo: `lembrete-${n}`, titulo: 'Missão esperando', texto: 'Ainda dá tempo de entregar a missão de hoje.' })
      }
    }
    for (const c of doDia) {
      const quando = instanteSP(dia, c.minuto)
      if (quando > agora) lista.push({ quando, tipo: c.tipo, titulo: c.titulo, texto: c.texto })
    }
  }
  return lista.sort((a, b) => a.quando - b.quando)
}
