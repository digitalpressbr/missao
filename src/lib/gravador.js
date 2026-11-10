// Gravação de áudio pelo navegador. Chrome e Samsung gravam em webm; o Safari do iPhone grava em mp4.
const FORMATOS = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/mp4', ext: 'm4a' },
]
export const LIMITE_SEGUNDOS = 60

export function escolherFormato(suporta) {
  return FORMATOS.find((f) => suporta(f.mime)) ?? null
}

export function podeGravar() {
  return typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
    && escolherFormato((t) => MediaRecorder.isTypeSupported(t)) !== null
}

export function criarGravador() {
  const formato = escolherFormato((t) => MediaRecorder.isTypeSupported(t))
  let midia = null
  let gravador = null
  let pedacos = []
  return {
    formato,
    async iniciar() {
      midia = await navigator.mediaDevices.getUserMedia({ audio: true })
      pedacos = []
      gravador = new MediaRecorder(midia, { mimeType: formato.mime })
      gravador.ondataavailable = (ev) => ev.data.size && pedacos.push(ev.data)
      gravador.start()
    },
    parar() {
      return new Promise((resolver) => {
        if (!gravador || gravador.state === 'inactive') return resolver(null)
        gravador.onstop = () => {
          midia.getTracks().forEach((t) => t.stop())
          resolver(new Blob(pedacos, { type: formato.mime.split(';')[0] }))
        }
        gravador.stop()
      })
    },
    cancelar() {
      try {
        if (gravador && gravador.state !== 'inactive') gravador.stop()
      } catch {
        /* já parado */
      }
      midia?.getTracks().forEach((t) => t.stop())
    },
  }
}
