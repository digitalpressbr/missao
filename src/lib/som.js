// Sons próprios do app: a vitória é feita na hora pelo navegador e a chamada é um arquivo nosso. Nenhum som de terceiros.
let contexto = null

function ctx() {
  const Classe = window.AudioContext || window.webkitAudioContext
  if (!Classe) return null
  contexto = contexto || new Classe()
  if (contexto.state === 'suspended') contexto.resume().catch(() => {})
  return contexto
}

function nota(c, frequencia, inicio, duracao, tipo = 'square', volume = 0.12) {
  const osc = c.createOscillator()
  const ganho = c.createGain()
  osc.type = tipo
  osc.frequency.value = frequencia
  ganho.gain.setValueAtTime(0.0001, inicio)
  ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.02)
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao)
  osc.connect(ganho).connect(c.destination)
  osc.start(inicio)
  osc.stop(inicio + duracao + 0.02)
}

// Missão concluída: quatro notas subindo.
export function tocarVitoria() {
  try {
    const c = ctx()
    if (!c) return
    const t = c.currentTime + 0.02
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(c, f, t + i * 0.11, i === 3 ? 0.4 : 0.14))
  } catch {
    /* aparelho sem som: segue em silêncio */
  }
}

// Chamada da missão: toque próprio do app, pouco mais de 3 segundos (public/alerta-missao.mp3, composição nossa).
// Sem toque da pessoa na tela o navegador pode recusar o som; aí a chamada aparece muda.
let alerta = null

export function tocarAlerta() {
  try {
    alerta = alerta || new Audio(`${import.meta.env.BASE_URL}alerta-missao.mp3`)
    alerta.currentTime = 0
    alerta.play()?.catch(() => {})
  } catch {
    /* segue em silêncio */
  }
}

export function pararAlerta() {
  try {
    alerta?.pause()
  } catch {
    /* nada tocando */
  }
}
