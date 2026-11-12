import { describe, expect, it } from 'vitest'
import { chamadasFuturas, instanteSP } from './chamadas'

// 2026-11-16 é segunda-feira.
const HORARIOS = [1, 2, 3, 4, 5].map((dia_semana) => ({ dia_semana, libera: dia_semana === 1 ? '17:45:00' : '13:15:00', bonus_ate: '19:00:00' }))
const base = { hoje: '2026-11-16', horarios: HORARIOS, robux: 100, dias: 1 }
const as = (dia, hora) => new Date(`${dia}T${hora}:00-03:00`).getTime()

describe('instanteSP', () => {
  it('converte dia e minuto de Brasília para o instante certo', () => {
    expect(instanteSP('2026-11-16', 17 * 60 + 45)).toBe(as('2026-11-16', '17:45'))
    expect(instanteSP('2026-11-16', 0)).toBe(as('2026-11-16', '00:00'))
  })
})

describe('chamadasFuturas', () => {
  it('monta a régua do dia: dois pré-avisos, liberação e quatro lembretes', () => {
    const lista = chamadasFuturas({ ...base, agora: as('2026-11-16', '08:00') })
    expect(lista.map((c) => c.tipo)).toEqual(['pre-10', 'pre-5', 'liberada', 'lembrete-1', 'lembrete-2', 'lembrete-3', 'lembrete-4'])
    expect(lista[0].quando).toBe(as('2026-11-16', '17:35'))
    expect(lista[2]).toMatchObject({ quando: as('2026-11-16', '17:45'), titulo: 'Missão liberada', texto: 'Missão de hoje liberada. 100 Robux esperando.' })
    expect(lista[3].quando).toBe(as('2026-11-16', '18:00'))
  })

  it('não agenda lembrete depois das 19:00, hora em que o aviso passa para os pais', () => {
    const lista = chamadasFuturas({ ...base, agora: as('2026-11-16', '08:00') })
    expect(lista.at(-1).quando).toBe(as('2026-11-16', '18:45'))
    const tarde = chamadasFuturas({ ...base, horarios: [{ dia_semana: 1, libera: '18:40', bonus_ate: '19:00' }], agora: as('2026-11-16', '08:00') })
    expect(tarde.map((c) => c.tipo)).toEqual(['pre-10', 'pre-5', 'liberada', 'lembrete-1'])
  })

  it('só devolve o que ainda vai acontecer', () => {
    const lista = chamadasFuturas({ ...base, agora: as('2026-11-16', '17:50') })
    expect(lista.map((c) => c.tipo)).toEqual(['lembrete-1', 'lembrete-2', 'lembrete-3', 'lembrete-4'])
  })

  it('missão entregue hoje tira as chamadas de hoje e mantém as de amanhã', () => {
    const lista = chamadasFuturas({ ...base, dias: 2, entregueHoje: true, agora: as('2026-11-16', '17:50') })
    expect(lista).toHaveLength(7)
    expect(lista[0].quando).toBe(as('2026-11-17', '13:05'))
  })

  it('pula fim de semana e dia marcado sem aula', () => {
    const lista = chamadasFuturas({ ...base, hoje: '2026-11-20', dias: 5, semAula: ['2026-11-23'], agora: as('2026-11-20', '23:00') })
    expect(new Set(lista.map((c) => new Date(c.quando - 3 * 3600 * 1000).toISOString().slice(0, 10)))).toEqual(new Set(['2026-11-24']))
  })

  it('respeita a régua da família: sem lembrete e um pré-aviso só', () => {
    const lista = chamadasFuturas({ ...base, lembretes: { intervalo: 15, teto: 0 }, preAvisos: [3], agora: as('2026-11-16', '08:00') })
    expect(lista.map((c) => c.tipo)).toEqual(['pre-3', 'liberada'])
  })

  it('sem horário para o dia não agenda nada', () => {
    expect(chamadasFuturas({ ...base, horarios: [], agora: as('2026-11-16', '08:00') })).toEqual([])
  })
})
