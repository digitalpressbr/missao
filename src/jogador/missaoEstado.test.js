import { describe, it, expect } from 'vitest'
import { estadoInicial, missaoReducer as r, montarEntrega, salvarRascunho, lerRascunho } from './missaoEstado'

const aulas = [{ materia: 'Math', professor: 'Prof. A' }, { materia: 'ELA', professor: 'Prof. B' }, { materia: 'Música', professor: null }]
const seguir = (estado, ...acoes) => acoes.reduce(r, estado)
function guardaFalsa() {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }
}

describe('passos da missão', () => {
  it('sem aula marcada entrega direto, sem matérias', () => {
    const e = seguir(estadoInicial(), { tipo: 'iniciar' }, { tipo: 'continuar' })
    expect(e.passo).toBe('enviando')
    expect(montarEntrega(e, aulas).materias).toEqual([])
  })
  it('jogador com aula marcada vai para a foto; modo rápido pula a foto', () => {
    const marcar = [{ tipo: 'iniciar' }, { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'continuar' }]
    expect(seguir(estadoInicial('jogador'), ...marcar).passo).toBe('foto')
    expect(seguir(estadoInicial('rapido'), ...marcar).passo).toBe('detalhes')
  })
  it('marcar duas vezes desmarca', () => {
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'marcarAula', materia: 'ELA' })
    expect(e.marcadas).toEqual([])
  })
  it('"não lembro" entrega com a marca', () => {
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'continuar' }, { tipo: 'semFoto' }, { tipo: 'naoLembro' })
    expect(e.passo).toBe('enviando')
    expect(montarEntrega(e, aulas).nao_lembro).toBe(true)
  })
  it('falha mantém tudo e permite tentar de novo', () => {
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'continuar' },
      { tipo: 'fotoPronta', path: 'f/d/foto.jpg', lida: [{ materia: 'ELA', texto: 'x' }], legivel: true }, { tipo: 'fotoConfirmada' },
      { tipo: 'responder', id: 'surpresa', valor: true }, { tipo: 'audioPronto', path: 'f/d/audio.webm', transcricao: 'embrulhar' },
      { tipo: 'entregar' }, { tipo: 'falhou', msg: 'Sem conexão.' })
    expect(e.passo).toBe('erro')
    expect(e.marcadas).toEqual(['ELA'])
    expect(e.respostas).toEqual({ surpresa: true })
    expect(e.foto.path).toBe('f/d/foto.jpg')
    expect(e.audio.path).toBe('f/d/audio.webm')
    expect(r(e, { tipo: 'tentarDeNovo' }).passo).toBe('enviando')
  })
  it('entrega leva só as matérias marcadas, com a professora da grade', () => {
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'Música' }, { tipo: 'marcarAula', materia: 'Math' }, { tipo: 'textoLivre', txt: '  trazer flauta ' })
    const corpo = montarEntrega(e, aulas)
    expect(corpo.materias).toEqual([{ materia: 'Math', professor: 'Prof. A' }, { materia: 'Música', professor: null }])
    expect(corpo.texto_livre).toBe('trazer flauta')
    expect(corpo.origem).toBe('jogador')
    expect(corpo.foto_path).toBe(null)
  })
})

describe('rascunho no aparelho', () => {
  it('guarda em andamento, restaura e apaga ao concluir', () => {
    const g = guardaFalsa()
    const e = seguir(estadoInicial(), { tipo: 'iniciar' }, { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'continuar' })
    salvarRascunho(g, '2026-11-10', e)
    expect(g.m.has('missao-rascunho-2026-11-10')).toBe(true)
    expect(lerRascunho(g, '2026-11-10').marcadas).toEqual(['ELA'])
    expect(lerRascunho(g, '2026-11-11')).toBe(null)
    salvarRascunho(g, '2026-11-10', r(e, { tipo: 'entregue', missao: { id: 1 } }))
    expect(g.m.size).toBe(0)
  })
  it('app fechado no meio do envio volta com "tentar de novo"', () => {
    const g = guardaFalsa()
    salvarRascunho(g, '2026-11-10', seguir(estadoInicial(), { tipo: 'iniciar' }, { tipo: 'continuar' }))
    const e = lerRascunho(g, '2026-11-10')
    expect(e.passo).toBe('erro')
    expect(e.erro).toMatch(/guardadas/)
  })
  it('rascunho estragado é ignorado', () => {
    const g = guardaFalsa()
    g.setItem('missao-rascunho-2026-11-10', '{quebrado')
    expect(lerRascunho(g, '2026-11-10')).toBe(null)
  })
})
