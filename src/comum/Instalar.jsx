import { linkAbrirNoChrome, usarInstalacao } from '../lib/instalar'

// Cartão de instalação. Some quando o app já está instalado.
// `jogo` usa o visual do jogador; `solto` tira a caixa (para ir dentro de outro cartão).
export default function Instalar({ jogo = false, solto = false }) {
  const { modo, instalar } = usarInstalacao()
  if (modo === 'instalado') return null

  const sub = jogo ? 'g-sub' : 'sub'
  const botao = jogo ? 'g-btn' : 'btn'

  let corpo
  if (modo === 'botao') {
    corpo = (
      <>
        <p className={sub}>Deixa o ícone na tela inicial e abre direto, sem navegador.</p>
        <button type="button" className={botao} onClick={instalar}>Instalar o app</button>
      </>
    )
  } else if (modo === 'android-abrir-chrome') {
    corpo = (
      <>
        <p className={sub}>Este navegador não instala o app. Abra no Chrome e toque em “Instalar o app”.</p>
        <a className={botao} href={linkAbrirNoChrome(window.location.href)}>Abrir no Chrome</a>
      </>
    )
  } else if (modo === 'android-menu') {
    corpo = <p className={sub}>Toque nos três pontos do Chrome, em “Adicionar à tela inicial” e depois em “Instalar”.</p>
  } else if (modo === 'ios-safari') {
    corpo = <p className={sub}>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra o app pelo ícone novo.</p>
  } else if (modo === 'ios-outro') {
    corpo = <p className={sub}>No iPhone a instalação é pelo Safari. Abra este endereço no Safari, toque em Compartilhar e em “Adicionar à Tela de Início”.</p>
  } else {
    corpo = <p className={sub}>No Chrome, use o ícone de instalar que aparece na barra de endereço.</p>
  }

  if (solto) return <>{corpo}</>
  return (
    <div className={jogo ? 'g-panel' : 'bloco'}>
      <b>Instalar no celular</b>
      {corpo}
    </div>
  )
}
