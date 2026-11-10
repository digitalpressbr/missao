// Passos da missão. Servem ao celular do jogador e ao modo rápido no celular dos pais.
import { useRef, useState } from 'react'
import { PERGUNTAS, algumSim } from './missaoEstado'
import { enviarAudio, enviarFoto, lerAgenda, transcrever } from '../lib/dados'
import { dataExtenso } from '../lib/regras'
import Gravador from './Gravador.jsx'

const FOTOS = 'image/jpeg,image/png,image/heic,image/heif,image/webp'
const NOTA_RAPIDA = 'Modo rápido, no celular de quem busca. A foto da agenda fica para casa.'

function Cabeca({ titulo, sub, aoVoltar }) {
  return (
    <div>
      {aoVoltar && <button type="button" className="g-mini" onClick={aoVoltar}>Voltar</button>}
      <h2>{titulo}</h2>
      {sub && <p className="g-sub">{sub}</p>}
    </div>
  )
}

export function Aulas({ aulas, estado, dispatch }) {
  return (
    <>
      <Cabeca titulo="Hoje teve estas aulas" sub="Marque quem passou tarefa." aoVoltar={() => dispatch({ tipo: 'voltar' })} />
      {estado.origem === 'rapido' && <p className="g-note">{NOTA_RAPIDA}</p>}
      {aulas.map((a) => {
        const marcada = estado.marcadas.includes(a.materia)
        return (
          <button type="button" key={a.materia} className="g-pick" aria-pressed={marcada} onClick={() => dispatch({ tipo: 'marcarAula', materia: a.materia })}>
            <span><b>{a.materia}</b>{a.professor && <small>{a.professor}</small>}</span>
            <span className="g-chip">{marcada ? 'Tem tarefa' : 'Não tem'}</span>
          </button>
        )
      })}
      <button type="button" className="g-btn" onClick={() => dispatch({ tipo: 'continuar' })}>
        {estado.marcadas.length ? 'Continuar' : 'Nenhuma passou tarefa'}
      </button>
    </>
  )
}

export function Foto({ estado, dispatch, familiaId, dia, completando = false }) {
  const [fase, setFase] = useState('parada') // parada | enviando | lendo | falhou
  const [previa, setPrevia] = useState(null)
  const camera = useRef(null)
  const galeria = useRef(null)

  async function escolher(ev) {
    const arquivo = ev.target.files?.[0]
    ev.target.value = ''
    if (!arquivo) return
    setPrevia(URL.createObjectURL(arquivo))
    setFase('enviando')
    try {
      const path = await enviarFoto(arquivo, familiaId, dia)
      setFase('lendo')
      const leitura = await lerAgenda(path, estado.marcadas)
      dispatch({ tipo: 'fotoPronta', path, lida: leitura.tarefas, legivel: leitura.legivel })
      setFase('parada')
    } catch {
      setFase('falhou')
    }
  }

  const confirmar = () => dispatch({ tipo: completando ? 'entregar' : 'fotoConfirmada' })
  const refazer = () => { setPrevia(null); dispatch({ tipo: 'refazerFoto' }) }
  const ocupado = fase === 'enviando' || fase === 'lendo'

  return (
    <>
      <Cabeca titulo="Foto da agenda" sub={estado.foto ? 'Confira se o app leu certo.' : 'Abra a agenda na página de hoje.'} aoVoltar={ocupado ? null : () => dispatch({ tipo: 'voltar' })} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={escolher} />
      <input ref={galeria} type="file" accept={FOTOS} hidden onChange={escolher} />

      <div className="g-cam">{previa ? <img src={previa} alt="Foto da agenda" /> : <span>{estado.foto ? 'Foto enviada' : 'Câmera'}</span>}</div>

      {fase === 'enviando' && <p className="g-note" role="status">Enviando a foto...</p>}
      {fase === 'lendo' && <p className="g-note" role="status">Lendo a agenda...</p>}
      {fase === 'falhou' && <p className="g-erro" role="alert">Não consegui enviar a foto. Tente de novo ou envie sem foto.</p>}

      {estado.foto && !ocupado && (
        <>
          {estado.foto.legivel ? (
            <div className="g-read">
              <p>O app leu:</p>
              <ul>
                {estado.foto.lida.map((t) => (
                  <li key={t.materia}><b>{t.materia}:</b> {t.texto}{t.prazo ? ` Para ${dataExtenso(t.prazo)}.` : ''}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="g-note">Não consegui ler. A foto vai para seus pais assim mesmo.</p>
          )}
          <button type="button" className="g-btn" onClick={confirmar}>{estado.foto.legivel ? 'Está certo' : 'Continuar'}</button>
          <button type="button" className="g-btn g-ghost" onClick={refazer}>Tirar outra</button>
        </>
      )}

      {!estado.foto && !ocupado && (
        <>
          <button type="button" className="g-btn" onClick={() => camera.current.click()}>Tirar foto</button>
          <button type="button" className="g-btn g-ghost" onClick={() => galeria.current.click()}>Escolher da galeria</button>
          {!completando && <button type="button" className="g-mini" onClick={() => dispatch({ tipo: 'semFoto' })}>Enviar sem foto</button>}
        </>
      )}
    </>
  )
}

export function Detalhes({ estado, dispatch, familiaId, dia }) {
  async function gravar(blob, ext) {
    const path = await enviarAudio(blob, ext, familiaId, dia)
    const texto = await transcrever(path)
    dispatch({ tipo: 'audioPronto', path, transcricao: texto })
  }
  const falou = algumSim(estado)

  return (
    <>
      <Cabeca titulo="A professora falou algo a mais?" sub="Vale o que ela disse em voz alta, fora da agenda." aoVoltar={() => dispatch({ tipo: 'voltar' })} />
      {estado.origem === 'rapido' && <p className="g-note">{NOTA_RAPIDA}</p>}
      {PERGUNTAS.map((p) => (
        <div className="g-q" key={p.id}>
          <span>{p.texto}</span>
          <span className="g-yn">
            <button type="button" aria-pressed={estado.respostas[p.id] === true} onClick={() => dispatch({ tipo: 'responder', id: p.id, valor: true })}>Sim</button>
            <button type="button" aria-pressed={estado.respostas[p.id] === false} onClick={() => dispatch({ tipo: 'responder', id: p.id, valor: false })}>Não</button>
          </span>
        </div>
      ))}
      {falou && (
        <>
          <Gravador temAudio={Boolean(estado.audio)} aoGravar={gravar} aoApagar={() => dispatch({ tipo: 'semAudio' })} />
          <label className="g-rotulo" htmlFor="texto-livre">
            Ou escreva em uma frase o que ela falou
            <textarea id="texto-livre" className="g-campo" rows={2} maxLength={300} value={estado.textoLivre}
              onChange={(e) => dispatch({ tipo: 'textoLivre', txt: e.target.value })} />
          </label>
        </>
      )}
      <button type="button" className="g-btn" onClick={() => dispatch({ tipo: 'entregar' })}>Entregar missão</button>
      <button type="button" className="g-btn g-ghost" onClick={() => dispatch({ tipo: 'naoLembro' })}>Não lembro</button>
    </>
  )
}
