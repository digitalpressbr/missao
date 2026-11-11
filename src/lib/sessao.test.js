import { describe, it, expect } from 'vitest'
import { emailInterno, familiaAtiva, mensagemDeErro, montarFamilias, senhaValida } from './sessao'

describe('entrada por nome de usuário', () => {
  it('monta o e-mail interno', () => {
    expect(emailInterno(' Leo ')).toBe('leo.missao@example.com')
    expect(emailInterno('ana.clara')).toBe('ana.clara.missao@example.com')
  })
  it('recusa caractere estranho e nome vazio', () => {
    expect(() => emailInterno('leo@casa')).toThrow('usuario_invalido')
    expect(() => emailInterno('le o')).toThrow('usuario_invalido')
    expect(() => emailInterno('')).toThrow('usuario_invalido')
  })
  it('senha de 8 ou mais', () => {
    expect(senhaValida('1234567')).toBe(false)
    expect(senhaValida('12345678')).toBe(true)
  })
  it('mensagens', () => {
    expect(mensagemDeErro({ message: 'Invalid login credentials' })).toBe('Usuário ou senha não conferem.')
    expect(mensagemDeErro(new Error('usuario_invalido'))).toBe('Usuário ou senha não conferem.')
    expect(mensagemDeErro({ status: 429, message: 'x' })).toBe('Muitas tentativas. Espere alguns minutos.')
    expect(mensagemDeErro(new TypeError('Failed to fetch'))).toBe('Sem conexão. Tente de novo.')
    expect(mensagemDeErro(new Error('sem_familia'))).toBe('Esta conta não está ligada a uma família.')
    expect(mensagemDeErro({ message: 'New password should be different from the old password.' })).toBe('Escolha uma senha diferente da provisória.')
    expect(mensagemDeErro({ message: 'qualquer outra coisa' })).toBe('Não deu certo. Tente de novo.')
  })
})

describe('quadros de quem entrou', () => {
  const linhas = [
    { familia_id: 'b', familia: { tema: 'rosa', criado_em: '2026-02-01T10:00:00Z' } },
    { familia_id: 'a', familia: { tema: 'azul', criado_em: '2026-01-01T10:00:00Z' } },
  ]
  const filhos = [
    { familia_id: 'a', nome: 'Léo', tratamento: 'o Léo', moldura: 1 },
    { familia_id: 'b', nome: 'Ana', tratamento: 'a Ana', moldura: 0 },
  ]

  it('ordena do mais antigo para o mais novo e liga cada quadro ao seu filho', () => {
    expect(montarFamilias(linhas, filhos)).toEqual([
      { id: 'a', tema: 'azul', filho: { nome: 'Léo', tratamento: 'o Léo', moldura: 1 } },
      { id: 'b', tema: 'rosa', filho: { nome: 'Ana', tratamento: 'a Ana', moldura: 0 } },
    ])
  })
  it('tema desconhecido vira azul e quadro sem filho fica sem nome', () => {
    expect(montarFamilias([{ familia_id: 'c', familia: { tema: 'verde' } }], [])).toEqual([{ id: 'c', tema: 'azul', filho: null }])
    expect(montarFamilias([{ familia_id: 'c' }], filhos)).toEqual([{ id: 'c', tema: 'azul', filho: null }])
  })
  it('abre o quadro guardado no aparelho; se não for mais da pessoa, abre o primeiro', () => {
    const fs = montarFamilias(linhas, filhos)
    expect(familiaAtiva(fs, 'b').id).toBe('b')
    expect(familiaAtiva(fs, 'zz').id).toBe('a')
    expect(familiaAtiva(fs, null).id).toBe('a')
    expect(familiaAtiva([], 'a')).toBe(null)
  })
})
