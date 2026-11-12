import { useEffect, useState } from 'react'
import { ativarAvisos, avisoDeTeste, ehIOS, estaInstalado, sincronizarInscricao, situacaoAvisos } from '../lib/push'
import { pedirAlerta } from '../lib/alerta'
import Instalar from './Instalar.jsx'

// Cartão de avisos e instalação. `jogo` usa o visual do jogador; `soSePrecisar` some quando já está tudo ligado.
export default function Avisos({ jogo = false, soSePrecisar = false }) {
  const [situacao, setSituacao] = useState(() => situacaoAvisos())
  const [msg, setMsg] = useState('')

  useEffect(() => {
    sincronizarInscricao()
  }, [])

  async function ligar() {
    setMsg('')
    try {
      await ativarAvisos()
      setSituacao(situacaoAvisos())
    } catch {
      setMsg('Não consegui ligar os avisos. Tente de novo.')
    }
  }

  async function testar() {
    // No modo jogador o teste mostra também a chamada em tela cheia, com o som (sai junto do toque, senão o navegador cala).
    if (jogo) pedirAlerta({ teste: true })
    try {
      await avisoDeTeste()
      setMsg('Aviso de teste enviado.')
    } catch {
      setMsg('Não consegui mostrar o aviso de teste.')
    }
  }

  const instalado = estaInstalado()
  if (soSePrecisar && situacao === 'pronto' && instalado) return null

  const caixa = jogo ? 'g-panel' : 'bloco'
  const sub = jogo ? 'g-sub' : 'sub'
  const botao = jogo ? 'g-btn g-ghost' : 'btn btn-ghost'

  let corpo
  if (situacao === 'instalar-antes') {
    corpo = <p className={sub}>No iPhone os avisos só chegam com o app instalado. No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra o app pelo ícone novo e volte aqui.</p>
  } else if (situacao === 'sem-suporte') {
    corpo = <p className={sub}>Este navegador não mostra avisos. Abra o app pelo Chrome.</p>
  } else if (situacao === 'bloqueado') {
    corpo = <p className={sub}>Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador, em Notificações, e abra o app de novo.</p>
  } else if (situacao === 'pedir') {
    corpo = (
      <>
        <p className={sub}>Ligue os avisos para o celular chamar na hora da missão.</p>
        <button type="button" className={botao} onClick={ligar}>Ligar avisos</button>
      </>
    )
  } else {
    corpo = (
      <>
        <p className={sub}>Avisos ligados neste aparelho.</p>
        {!soSePrecisar && <button type="button" className={botao} onClick={testar}>Testar aviso</button>}
      </>
    )
  }

  return (
    <div className={caixa}>
      <b>Avisos</b>
      {corpo}
      {!instalado && !ehIOS() && <Instalar jogo={jogo} solto />}
      {msg && <p className={sub} role="status">{msg}</p>}
    </div>
  )
}
