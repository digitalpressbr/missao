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
  it('com aula marcada pergunta as páginas; depois o jogador vai para a foto e o modo rápido pula a foto', () => {
    const marcar = [{ tipo: 'iniciar' }, { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'continuar' }]
    expect(seguir(estadoInicial('jogador'), ...marcar).passo).toBe('paginas')
    expect(seguir(estadoInicial('jogador'), ...marcar, { tipo: 'paginasOk' }).passo).toBe('foto')
    expect(seguir(estadoInicial('rapido'), ...marcar, { tipo: 'paginasOk' }).passo).toBe('detalhes')
  })
  it('passa matéria por matéria, na ordem das aulas, e o voltar refaz o caminho', () => {
    const ordem = aulas.map((a) => a.materia)
    let e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'Música' }, { tipo: 'marcarAula', materia: 'Math' }, { tipo: 'continuar', ordem })
    expect(e.marcadas).toEqual(['Math', 'Música'])
    expect(e.indice).toBe(0)
    e = r(e, { tipo: 'paginasOk' })
    expect([e.passo, e.indice]).toEqual(['paginas', 1])
    e = r(e, { tipo: 'paginasOk' })
    expect(e.passo).toBe('foto')
    e = r(e, { tipo: 'voltar' })
    expect([e.passo, e.indice]).toEqual(['paginas', 1])
    e = seguir(e, { tipo: 'voltar' }, { tipo: 'voltar' })
    expect(e.passo).toBe('aulas')
  })
  it('páginas: só número, sem repetir, e tocar de novo tira', () => {
    let e = seguir(estadoInicial(), { tipo: 'addPagina', materia: 'Math', pagina: '45' }, { tipo: 'addPagina', materia: 'Math', pagina: '045' },
      { tipo: 'addPagina', materia: 'Math', pagina: '4a6' }, { tipo: 'addPagina', materia: 'Math', pagina: '' }, { tipo: 'addPagina', materia: 'Math', pagina: '0' })
    expect(e.detalhes.Math.paginas).toEqual(['45', '46'])
    e = r(e, { tipo: 'tirarPagina', materia: 'Math', pagina: '45' })
    expect(e.detalhes.Math.paginas).toEqual(['46'])
  })
  it('onde e prazo: um toque escolhe, outro toque no mesmo desfaz', () => {
    let e = seguir(estadoInicial(), { tipo: 'definirOnde', materia: 'Math', onde: 'livro' }, { tipo: 'definirPrazo', materia: 'Math', prazo: '2026-11-12' })
    expect(e.detalhes.Math).toMatchObject({ onde: 'livro', prazo: '2026-11-12' })
    e = seguir(e, { tipo: 'definirOnde', materia: 'Math', onde: 'apostila' }, { tipo: 'definirPrazo', materia: 'Math', prazo: '2026-11-12' })
    expect(e.detalhes.Math).toMatchObject({ onde: 'apostila', prazo: null })
  })
  it('marcar duas vezes desmarca', () => {
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'marcarAula', materia: 'ELA' })
    expect(e.marcadas).toEqual([])
  })
  it('"não lembro" entrega com a marca', () => {
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'ELA' }, { tipo: 'continuar' }, { tipo: 'paginasOk' }, { tipo: 'semFoto' }, { tipo: 'naoLembro' })
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
    const e = seguir(estadoInicial(), { tipo: 'marcarAula', materia: 'Música' }, { tipo: 'marcarAula', materia: 'Math' }, { tipo: 'textoLivre', txt: '  trazer flauta ' },
      { tipo: 'definirOnde', materia: 'Math', onde: 'livro' }, { tipo: 'addPagina', materia: 'Math', pagina: '45' }, { tipo: 'addPagina', materia: 'Math', pagina: '46' },
      { tipo: 'definirPrazo', materia: 'Math', prazo: '2026-11-12' })
    const corpo = montarEntrega(e, aulas)
    expect(corpo.materias).toEqual([
      { materia: 'Math', professor: 'Prof. A', onde: 'livro', paginas: '45, 46', prazo: '2026-11-12' },
      { materia: 'Música', professor: null, onde: null, paginas: null, prazo: null },
    ])
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

describe('rascunho do modo rápido com mais de um filho', () => {
  it('cada filho tem o seu rascunho no celular dos pais', () => {
    const g = { m: new Map(), getItem(k) { return this.m.get(k) ?? null }, setItem(k, v) { this.m.set(k, v) }, removeItem(k) { this.m.delete(k) } }
    const e = { ...estadoInicial('rapido'), passo: 'aulas', marcadas: ['ELA'] }
    salvarRascunho(g, '2026-11-10', e, 'quadro-a')
    expect(lerRascunho(g, '2026-11-10', 'rapido', 'quadro-a').marcadas).toEqual(['ELA'])
    expect(lerRascunho(g, '2026-11-10', 'rapido', 'quadro-b')).toBe(null)
    expect(lerRascunho(g, '2026-11-10', 'rapido')).toBe(null)
  })
})
