import { useEffect, useState } from 'react'
import { ativarAvisos, avisoDeTeste, ehIOS, estaInstalado, sincronizarInscricao, situacaoAvisos } from '../lib/push'
import { pedirAlerta } from '../lib/alerta'
import { ARQUIVO_ANDROID, VERSAO_ANDROID, ehNativo, escutarNativo, pedirNativo, pendenciasNativas, situacaoNativa, testarChamada, versaoNativa } from '../lib/nativo'
import Instalar from './Instalar.jsx'

const linkAndroid = () => `${import.meta.env.BASE_URL}${ARQUIVO_ANDROID}`

// Cartão de avisos e instalação. `jogo` usa o visual do jogador; `soSePrecisar` some quando já está tudo ligado.
export default function Avisos(props) {
  return ehNativo() ? <AvisosAndroid {...props} /> : <AvisosWeb {...props} />
}

// Dentro do app Android: quem chama é o próprio celular. Aqui se liberam as permissões e se testa a chamada.
function AvisosAndroid({ jogo = false, soSePrecisar = false }) {
  const [situacao, setSituacao] = useState(() => situacaoNativa())
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const atualizar = () => setSituacao(situacaoNativa())
    document.addEventListener('visibilitychange', atualizar)
    const parar = escutarNativo(atualizar)
    return () => {
      document.removeEventListener('visibilitychange', atualizar)
      parar()
    }
  }, [])

  const caixa = jogo ? 'g-panel' : 'bloco'
  const sub = jogo ? 'g-sub' : 'sub'
  const botao = jogo ? 'g-btn g-ghost' : 'btn btn-ghost'

  if (!jogo) {
    if (soSePrecisar) return null
    return (
      <div className={caixa}>
        <b>Avisos</b>
        <p className={sub}>Este app é o do jogador: ele chama na hora da missão. O aviso de entrega para os pais chega pelo app instalado pelo navegador.</p>
      </div>
    )
  }

  const faltam = pendenciasNativas(situacao)
  const desatualizado = versaoNativa() < VERSAO_ANDROID
  if (soSePrecisar && !faltam.length && !desatualizado) return null

  function testar() {
    testarChamada()
    setMsg('A chamada toca em 10 segundos. Saia do app ou bloqueie a tela para ver.')
  }

  return (
    <div className={caixa}>
      <b>Chamada da missão</b>
      {faltam.length ? (
        <>
          <p className={sub}>{faltam[0].texto}{faltam.length > 1 ? ` Faltam ${faltam.length} ajustes.` : ''}</p>
          <button type="button" className={jogo ? 'g-btn' : 'btn'} onClick={() => pedirNativo(faltam[0].qual)}>{faltam[0].botao}</button>
        </>
      ) : (
        <>
          <p className={sub}>Chamada ligada neste aparelho.</p>
          {!soSePrecisar && <button type="button" className={botao} onClick={testar}>Testar chamada</button>}
        </>
      )}
      {desatualizado && <a className={botao} href={linkAndroid()}>Atualizar o app</a>}
      {msg && <p className={sub} role="status">{msg}</p>}
    </div>
  )
}

function AvisosWeb({ jogo = false, soSePrecisar = false }) {
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
  // No Android o jogador tem o app próprio, que chama com o celular fechado.
  const ofereceAndroid = jogo && !soSePrecisar && /android/i.test(navigator.userAgent || '')
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
      {ofereceAndroid && (
        <>
          <p className={sub}>No Android existe o app próprio: ele toca o som da missão com o celular fechado e abre a chamada por cima do jogo.</p>
          <a className={botao} href={linkAndroid()}>Baixar o app Android</a>
        </>
      )}
      {msg && <p className={sub} role="status">{msg}</p>}
    </div>
  )
}
