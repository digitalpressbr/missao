// Sons próprios do app, feitos na hora pelo navegador. Nenhum arquivo de som de terceiros.
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

// Missão liberada, com o app aberto: dois toques.
export function tocarChamada() {
  try {
    const c = ctx()
    if (!c) return
    const t = c.currentTime + 0.02
    nota(c, 880, t, 0.16, 'triangle', 0.16)
    nota(c, 1174.66, t + 0.2, 0.26, 'triangle', 0.16)
  } catch {
    /* segue em silêncio */
  }
}
