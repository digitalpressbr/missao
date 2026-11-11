import { describe, it, expect } from 'vitest'
import { resumoDoDia, resumoDaSemana } from './dadosPais'

const aulas = [{ materia: 'Math', professor: 'Prof. A' }, { materia: 'ELA', professor: 'Prof. B' }, { materia: 'Música', professor: null }]
const base = { aulas, letivo: true, aluno: 'o Léo' }
const entregue = { status: 'entregue', origem: 'jogador', nao_lembro: false, respostas: {}, foto_path: 'f/d/foto.jpg', entregue_em: '2026-11-10T16:22:00Z' }

describe('resumo do dia', () => {
  it('sem missão: aguardando antes das 19:00, sem resposta depois', () => {
    expect(resumoDoDia({ ...base, missao: null, hora: '18:59' }).situacao).toBe('aguardando')
    expect(resumoDoDia({ ...base, missao: null, hora: '19:00' }).situacao).toBe('sem-resposta')
    expect(resumoDoDia({ ...base, missao: null, hora: '19:30', letivo: false }).situacao).toBe('sem-aula')
  })
  it('entregue mostra a hora de Brasília, os cartões e quem ficou sem tarefa', () => {
    const r = resumoDoDia({ ...base, hora: '14:00', missao: entregue,
      tarefas: [{ id: 1, materia: 'ELA', professor: 'Prof. B', texto: 'Trazer foto.', prazo: '2026-11-13' }] })
    expect(r.situacao).toBe('entregue')
    expect(r.hora).toBe('13:22')
    expect(r.cartoes).toHaveLength(1)
    expect(r.cartoes[0]).toMatchObject({ materia: 'ELA', selo: 'completo', recado: null, fotoPendente: false, texto: 'Trazer foto.' })
    expect(r.semTarefa).toEqual(['Math', 'Música'])
  })
  it('parcial: cartão sem texto e com foto pendente', () => {
    const r = resumoDoDia({ ...base, hora: '13:00', missao: { ...entregue, status: 'parcial', origem: 'rapido', foto_path: null },
      tarefas: [{ id: 1, materia: 'ELA', professor: 'Prof. B', texto: null }] })
    expect(r.situacao).toBe('parcial')
    expect(r.cartoes[0]).toMatchObject({ texto: null, fotoPendente: true })
  })
  it('tarefa anotada no livro: páginas no cartão, sem foto pendente; sem página vira dúvida com recado', () => {
    const r = resumoDoDia({ ...base, hora: '14:00', missao: { ...entregue, foto_path: null },
      tarefas: [{ id: 1, materia: 'Math', professor: 'Prof. A', onde: 'livro', paginas: '45, 46', prazo: '2026-11-12' }, { id: 2, materia: 'ELA', professor: 'Prof. B' }] })
    expect(r.situacao).toBe('entregue')
    expect(r.cartoes[0]).toMatchObject({ paginas: 'Livro, páginas 45 e 46', prazo: '2026-11-12', selo: 'completo', fotoPendente: false, recado: null })
    expect(r.cartoes[1]).toMatchObject({ paginas: null, selo: 'duvida' })
    expect(r.cartoes[1].recado).toContain('não lembrou os detalhes')
  })
  it('"não lembro" traz o recado pronto em todos os cartões', () => {
    const r = resumoDoDia({ ...base, hora: '14:00', missao: { ...entregue, nao_lembro: true },
      tarefas: [{ id: 1, materia: 'ELA', professor: 'Prof. B', texto: 'Trazer foto.' }, { id: 2, materia: 'Math', professor: 'Prof. A', texto: null }] })
    expect(r.cartoes.map((c) => c.selo)).toEqual(['duvida', 'duvida'])
    expect(r.cartoes[0].recado).toContain('Prof. B, o Léo trouxe tarefa de ELA')
    expect(r.cartoes[1].recado).toContain('não lembrou os detalhes')
  })
})

describe('resumo da semana', () => {
  const missoes = [{ dia: '2026-11-09', robux: 100 }, { dia: '2026-11-10', robux: 100 }]
  it('quinta-feira, com feriado na quarta', () => {
    const r = resumoDaSemana({ missoes, semAula: ['2026-11-11'], hoje: '2026-11-12', trocas: [] })
    expect(r.segunda).toBe('2026-11-09')
    expect(r.robux).toBe(200)
    expect(r.dias.map((d) => d.estado)).toEqual(['ok', 'ok', 'sem-aula', 'hoje', 'futuro'])
    expect(r.sequencia).toBe(2)
    expect(r.trocaFeita).toBe(null)
  })
  it('dia letivo sem entrega aparece como perdido', () => {
    const r = resumoDaSemana({ missoes: [missoes[0]], semAula: [], hoje: '2026-11-11', trocas: [] })
    expect(r.dias.map((d) => d.estado)).toEqual(['ok', 'perdido', 'hoje', 'futuro', 'futuro'])
  })
  it('sábado mostra a semana que acabou e a troca feita', () => {
    const r = resumoDaSemana({ missoes, semAula: [], hoje: '2026-11-14', trocas: [{ semana_inicio: '2026-11-09', robux: 200, feita_em: '2026-11-14T13:00:00Z' }] })
    expect(r.fimDeSemana).toBe(true)
    expect(r.robux).toBe(200)
    expect(r.trocaFeita).toEqual({ robux: 200, feita_em: '2026-11-14T13:00:00Z' })
  })
})
