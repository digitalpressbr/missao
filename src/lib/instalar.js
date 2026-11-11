// Instalação do app na tela inicial.
// O navegador entrega um "convite" (beforeinstallprompt) quando aceita instalar; guardamos para usar no botão.
import { useEffect, useState } from 'react'

// 'instalado' | 'botao' | 'ios-safari' | 'ios-outro' | 'android-abrir-chrome' | 'android-menu' | 'computador'
export function modoInstalar({ ua = '', toques = 0, instalado = false, temConvite = false } = {}) {
  if (instalado) return 'instalado'
  if (temConvite) return 'botao'
  // iPad recente se apresenta como Mac; o toque denuncia.
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && toques > 1)
  if (ios) return /crios|fxios|edgios|opios|gsa\//i.test(ua) ? 'ios-outro' : 'ios-safari'
  if (/android/i.test(ua)) {
    const dentroDeApp = /; wv\)/i.test(ua)
    const outroNavegador = /samsungbrowser|firefox|edga|opr\/|ucbrowser|miuibrowser/i.test(ua)
    return dentroDeApp || outroNavegador ? 'android-abrir-chrome' : 'android-menu'
  }
  return 'computador'
}

// Endereço especial que o Android abre direto no Chrome, saindo do navegador atual.
export function linkAbrirNoChrome(endereco) {
  const u = new URL(endereco)
  return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.android.chrome;end`
}

let convite = null
let instaladoAgora = false
const ouvintes = new Set()
const avisar = () => ouvintes.forEach((f) => f())

// Chamado uma vez na partida do app: o convite pode chegar antes de qualquer tela montar.
export function escutarConvite() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    convite = e
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    convite = null
    instaladoAgora = true
    avisar()
  })
}

function jaInstalado() {
  return instaladoAgora || window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function usarInstalacao() {
  const [, redesenhar] = useState(0)
  useEffect(() => {
    const f = () => redesenhar((n) => n + 1)
    ouvintes.add(f)
    return () => ouvintes.delete(f)
  }, [])

  const modo = modoInstalar({
    ua: navigator.userAgent || '',
    toques: navigator.maxTouchPoints || 0,
    instalado: jaInstalado(),
    temConvite: Boolean(convite),
  })

  async function instalar() {
    const c = convite
    if (!c) return
    convite = null
    try {
      c.prompt()
      const escolha = await c.userChoice
      if (escolha?.outcome === 'accepted') instaladoAgora = true
    } catch {
      // O navegador recusou mostrar o convite: o cartão volta para a orientação pelo menu.
    }
    avisar()
  }

  return { modo, instalar }
}
