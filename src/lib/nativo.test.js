import { afterEach, describe, expect, it, vi } from 'vitest'
import { acaoPendente, agendarChamadas, ehNativo, pendenciasNativas, situacaoNativa } from './nativo'

afterEach(() => {
  delete window.MissaoNativo
})

describe('fora do app Android', () => {
  it('nada existe e nada quebra', () => {
    expect(ehNativo()).toBe(false)
    expect(situacaoNativa()).toBeNull()
    expect(acaoPendente()).toBe('')
    expect(() => agendarChamadas({ chamadas: [] })).not.toThrow()
  })
})

describe('dentro do app Android', () => {
  it('lê a situação do aparelho e entrega a agenda como texto', () => {
    const agendar = vi.fn()
    window.MissaoNativo = { situacao: () => '{"notificacoes":true,"sobrepor":false}', agendar, pendente: () => 'iniciar' }
    expect(ehNativo()).toBe(true)
    expect(situacaoNativa()).toEqual({ notificacoes: true, sobrepor: false })
    agendarChamadas({ chamadas: [{ quando: 1 }] })
    expect(agendar).toHaveBeenCalledWith('{"chamadas":[{"quando":1}]}')
    expect(acaoPendente()).toBe('iniciar')
  })
})

describe('pendenciasNativas', () => {
  it('lista só o que falta, na ordem em que pedimos', () => {
    const faltam = pendenciasNativas({ notificacoes: false, telaCheia: true, sobrepor: false, bateria: false, alarme: true })
    expect(faltam.map((f) => f.qual)).toEqual(['notificacoes', 'sobrepor', 'bateria'])
  })

  it('tudo liberado, ou sem resposta do aparelho, não pede nada', () => {
    expect(pendenciasNativas({ notificacoes: true, telaCheia: true, sobrepor: true, bateria: true, alarme: true })).toEqual([])
    expect(pendenciasNativas(null)).toEqual([])
  })
})
