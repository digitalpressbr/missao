import { useEffect, useRef, useState } from 'react'
import { criarGravador, podeGravar, LIMITE_SEGUNDOS } from '../lib/gravador'

// aoGravar(blob, ext) envia e devolve quando terminou. temAudio diz se já existe um áudio guardado.
export default function Gravador({ temAudio, aoGravar, aoApagar }) {
  const [fase, setFase] = useState(() => (podeGravar() ? (temAudio ? 'pronto' : 'parado') : 'sem'))
  const [segundos, setSegundos] = useState(0)
  const [previa, setPrevia] = useState(null)
  const gravador = useRef(null)
  const relogio = useRef(null)

  useEffect(() => () => {
    clearInterval(relogio.current)
    gravador.current?.cancelar()
  }, [])

  async function iniciar() {
    try {
      gravador.current = criarGravador()
      await gravador.current.iniciar()
      setSegundos(0)
      setFase('gravando')
      relogio.current = setInterval(() => setSegundos((s) => s + 1), 1000)
    } catch {
      setFase('sem')
    }
  }

  async function parar() {
    clearInterval(relogio.current)
    const blob = await gravador.current.parar()
    if (!blob || !blob.size) return setFase('parado')
    setPrevia(URL.createObjectURL(blob))
    setFase('enviando')
    try {
      await aoGravar(blob, gravador.current.formato.ext)
      setFase('pronto')
    } catch {
      setFase('falhou')
    }
  }

  useEffect(() => {
    if (fase === 'gravando' && segundos >= LIMITE_SEGUNDOS) parar()
  })

  function refazer() {
    setPrevia(null)
    aoApagar()
    setFase('parado')
  }

  if (fase === 'sem') return <p className="g-note">Sem acesso ao microfone neste aparelho. Escreva abaixo o que ela falou.</p>
  if (fase === 'parado') return <button type="button" className="g-btn g-ghost" onClick={iniciar}>Gravar áudio contando</button>
  if (fase === 'gravando') {
    return (
      <div className="g-rec" role="status">
        <b>Gravando 0:{String(segundos).padStart(2, '0')}</b>
        <button type="button" className="g-btn" onClick={parar}>Parar</button>
      </div>
    )
  }
  if (fase === 'enviando') return <p className="g-note" role="status">Salvando o áudio...</p>
  if (fase === 'falhou') {
    return (
      <div className="g-rec">
        <span>Não consegui salvar o áudio.</span>
        <button type="button" className="g-btn g-ghost" onClick={refazer}>Gravar de novo</button>
      </div>
    )
  }
  return (
    <div className="g-rec">
      <b>Áudio gravado</b>
      {previa && <audio controls src={previa} />}
      <button type="button" className="g-mini" onClick={refazer}>Gravar de novo</button>
    </div>
  )
}
