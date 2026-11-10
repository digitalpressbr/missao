import { useState } from 'react'
import { usarSessao } from './Sessao.jsx'
import { mensagemDeErro, senhaValida } from '../lib/sessao'

export default function CriarSenha() {
  const { membro, trocarSenha, sair } = usarSessao()
  const [nova, setNova] = useState('')
  const [repete, setRepete] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(ev) {
    ev.preventDefault()
    if (!senhaValida(nova)) return setErro('A senha precisa ter 8 caracteres ou mais.')
    if (nova !== repete) return setErro('As duas senhas não são iguais.')
    setEnviando(true)
    setErro('')
    try {
      await trocarSenha(nova)
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEnviando(false)
    }
  }

  return (
    <main className="modo-jogador">
      <div className="tela entrar">
        <div>
          <h1>Crie sua senha</h1>
          <p className="g-sub">Olá, {membro.nome}. A senha que você recebeu era provisória. Escolha a sua, com 8 caracteres ou mais.</p>
        </div>
        <form onSubmit={enviar}>
          <label className="g-rotulo" htmlFor="nova">
            Senha nova
            <input id="nova" className="g-campo" type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" required />
          </label>
          <label className="g-rotulo" htmlFor="repete">
            Repita a senha
            <input id="repete" className="g-campo" type="password" value={repete} onChange={(e) => setRepete(e.target.value)} autoComplete="new-password" required />
          </label>
          {erro && <p className="g-erro" role="alert">{erro}</p>}
          <button className="g-btn" type="submit" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar senha'}</button>
          <button className="g-btn g-ghost" type="button" onClick={sair}>Sair</button>
        </form>
      </div>
    </main>
  )
}
