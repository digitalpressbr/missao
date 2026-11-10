import { describe, it, expect } from 'vitest'
import { emailInterno, senhaValida, mensagemDeErro } from './sessao'

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
