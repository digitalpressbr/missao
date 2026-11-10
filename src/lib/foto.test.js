import { describe, it, expect } from 'vitest'
import { normalizarLeitura } from './foto'

const materias = ['ELA', 'Math']
describe('leitura da agenda', () => {
  it('descarta matéria que não estava marcada e repetida', () => {
    const r = normalizarLeitura({ legivel: true, tarefas: [
      { materia: 'ELA', texto: 'Trazer foto.', prazo: '2026-11-13', levar: 'foto' },
      { materia: 'História', texto: 'Ler.', prazo: null },
      { materia: 'ELA', texto: 'Outra.', prazo: null },
    ] }, materias)
    expect(r).toEqual({ legivel: true, tarefas: [{ materia: 'ELA', texto: 'Trazer foto.', prazo: '2026-11-13', levar: 'foto' }] })
  })
  it('prazo fora do formato vira vazio', () => {
    const r = normalizarLeitura({ legivel: true, tarefas: [{ materia: 'Math', texto: 'Página 84.', prazo: 'quinta' }] }, materias)
    expect(r.tarefas[0].prazo).toBe(null)
  })
  it('vazio, erro ou ilegível devolvem ilegível', () => {
    const vazio = { legivel: false, tarefas: [] }
    expect(normalizarLeitura(null, materias)).toEqual(vazio)
    expect(normalizarLeitura({ error: 'x' }, materias)).toEqual(vazio)
    expect(normalizarLeitura({ legivel: false, tarefas: [{ materia: 'ELA', texto: 'x' }] }, materias)).toEqual(vazio)
    expect(normalizarLeitura({ legivel: true, tarefas: [{ materia: 'ELA', texto: '  ' }] }, materias)).toEqual(vazio)
  })
  it('corta texto longo em 300', () => {
    const r = normalizarLeitura({ legivel: true, tarefas: [{ materia: 'ELA', texto: 'a'.repeat(500) }] }, materias)
    expect(r.tarefas[0].texto).toHaveLength(300)
  })
})
