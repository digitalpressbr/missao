// Chamada em tela cheia do modo jogador. Chega de três lugares: a missão liberou com o app aberto,
// um aviso do celular chegou (ou foi tocado) com o app aberto, ou alguém apertou "Testar aviso".
const EVENTO = 'missao-alerta'

export const ALERTA_LIBERADA = { titulo: 'Missão liberada', texto: 'Relatório da escola, 2 minutos.' }
const ALERTA_TESTE = { titulo: 'Teste do alerta', texto: 'É assim que o app chama na hora da missão.', teste: true }

// Decide se o aviso vira chamada. `estado` é o da missão do dia; `passo`, o da tela do jogador.
export function alertaPara(aviso, { estado, passo, oculto = false }) {
  if (aviso?.teste) return ALERTA_TESTE
  if ((oculto && !aviso?.aberto) || passo !== 'inicio') return null
  if (estado === 'liberada') return { titulo: ALERTA_LIBERADA.titulo, texto: aviso?.texto || ALERTA_LIBERADA.texto }
  if (estado === 'antes') return { titulo: 'Falta pouco', texto: aviso?.texto || 'A missão de hoje já vai liberar.' }
  return null
}

export function pedirAlerta(detalhe) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: detalhe }))
}

// Devolve a função que desliga a escuta.
export function escutarAlertas(fn) {
  const doApp = (e) => fn(e.detail ?? {})
  const doAviso = (e) => {
    if (e.data?.tipo === 'missao-aviso') fn({ texto: e.data.texto, aberto: Boolean(e.data.aberto) })
  }
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null
  window.addEventListener(EVENTO, doApp)
  sw?.addEventListener('message', doAviso)
  return () => {
    window.removeEventListener(EVENTO, doApp)
    sw?.removeEventListener('message', doAviso)
  }
}
