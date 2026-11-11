import { useState } from 'react'
import { usarSessao } from './Sessao.jsx'
import { mensagemDeErro } from '../lib/sessao'
import Instalar from './Instalar.jsx'

export default function Entrar() {
  const { entrar, erro: erroDaSessao } = usarSessao()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(erroDaSessao ? mensagemDeErro(erroDaSessao) : '')

  async function enviar(ev) {
    ev.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await entrar(usuario, senha)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="modo-jogador">
      <div className="tela entrar">
        <h1>Missão do Dia</h1>
        <form onSubmit={enviar}>
          <label className="g-rotulo" htmlFor="usuario">
            Nome de usuário
            <input id="usuario" className="g-campo" value={usuario} onChange={(e) => setUsuario(e.target.value)}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required />
          </label>
          <label className="g-rotulo" htmlFor="senha">
            Senha
            <input id="senha" className="g-campo" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password" required />
          </label>
          {erro && <p className="g-erro" role="alert">{erro}</p>}
          <button className="g-btn" type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
        </form>
        <Instalar jogo />
      </div>
    </main>
  )
}
