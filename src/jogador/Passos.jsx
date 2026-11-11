// Passos da missão. Servem ao celular do jogador e ao modo rápido no celular dos pais.
import { useRef, useState } from 'react'
import { ONDE, PERGUNTAS, algumSim, detalheDe } from './missaoEstado'
import { enviarAudio, enviarFoto, lerAgenda, transcrever } from '../lib/dados'
import { dataExtenso, diaCurto, somarDias } from '../lib/regras'
import Gravador from './Gravador.jsx'

const FOTOS = 'image/jpeg,image/png,image/heic,image/heif,image/webp'
const NOTA_RAPIDA = 'Modo rápido, no celular de quem busca.'

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
      <button type="button" className="g-btn" onClick={() => dispatch({ tipo: 'continuar', ordem: aulas.map((a) => a.materia) })}>
        {estado.marcadas.length ? 'Continuar' : 'Nenhuma passou tarefa'}
      </button>
    </>
  )
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

// Uma matéria por vez: onde está a tarefa, quais páginas e para quando.
// `prazos` são os próximos dias de aula; quem chama troca a `key` a cada matéria para zerar o visor.
export function Paginas({ aulas, estado, dispatch, hoje, prazos }) {
  const [visor, setVisor] = useState('')
  const materia = estado.marcadas[estado.indice]
  const aula = aulas.find((a) => a.materia === materia)
  const d = detalheDe(estado, materia)
  const total = estado.marcadas.length
  const sub = `${aula?.professor ? `${aula.professor}. ` : ''}${total > 1 ? `Tarefa ${estado.indice + 1} de ${total}.` : ''}`.trim()

  const guardar = () => {
    if (visor) dispatch({ tipo: 'addPagina', materia, pagina: visor })
    setVisor('')
  }
  const seguir = () => {
    guardar()
    dispatch({ tipo: 'paginasOk' })
  }

  return (
    <>
      <Cabeca titulo={materia} sub={sub || null} aoVoltar={() => dispatch({ tipo: 'voltar' })} />

      <p className="g-lbl">Onde é a tarefa?</p>
      <div className="g-chips">
        {ONDE.map((o) => (
          <button type="button" key={o.id} className="g-tag" aria-pressed={d.onde === o.id} onClick={() => dispatch({ tipo: 'definirOnde', materia, onde: o.id })}>{o.nome}</button>
        ))}
      </div>

      <p className="g-lbl">Quais páginas? Tem mais de uma: digite e toque em “Mais uma”.</p>
      {d.paginas.length > 0 && (
        <div className="g-chips">
          {d.paginas.map((p) => (
            <button type="button" key={p} className="g-tag g-tag-pag" aria-label={`Tirar a página ${p}`} onClick={() => dispatch({ tipo: 'tirarPagina', materia, pagina: p })}>{p} ×</button>
          ))}
        </div>
      )}
      <div className={visor ? 'g-visor' : 'g-visor g-visor-vazio'} aria-live="polite">{visor || 'Página'}</div>
      <div className="g-teclado">
        {TECLAS.map((t) => (
          <button type="button" key={t} onClick={() => setVisor((v) => (v + t).slice(0, 4))}>{t}</button>
        ))}
        <button type="button" aria-label="Apagar" onClick={() => setVisor((v) => v.slice(0, -1))}>⌫</button>
        <button type="button" onClick={() => setVisor((v) => (v ? (v + '0').slice(0, 4) : v))}>0</button>
        <button type="button" className="g-tecla-mais" disabled={!visor} onClick={guardar}>Mais uma</button>
      </div>

      <p className="g-lbl">Para quando?</p>
      <div className="g-chips">
        {prazos.map((dia) => (
          <button type="button" key={dia} className="g-tag" aria-pressed={d.prazo === dia} onClick={() => dispatch({ tipo: 'definirPrazo', materia, prazo: dia })}>
            {dia === somarDias(hoje, 1) ? `Amanhã, ${diaCurto(dia)}` : diaCurto(dia)}
          </button>
        ))}
      </div>

      <button type="button" className="g-btn" onClick={seguir}>Continuar</button>
      {!d.paginas.length && !visor && <button type="button" className="g-btn g-ghost" onClick={() => dispatch({ tipo: 'paginasOk' })}>Não lembro a página</button>}
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
      <Cabeca titulo={completando || estado.foto ? 'Foto da agenda' : 'Tem bilhete ou algo na agenda?'} sub={estado.foto ? 'Confira se o app leu certo.' : 'Se tiver, tire uma foto. Se não tiver, é só pular.'} aoVoltar={ocupado ? null : () => dispatch({ tipo: 'voltar' })} />
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
          {!completando && <button type="button" className="g-btn g-ghost" onClick={() => dispatch({ tipo: 'semFoto' })}>Não tem, pular</button>}
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
      <Cabeca titulo="A professora falou algo a mais?" sub="Vale recado, bilhete ou qualquer coisa que ela disse em voz alta." aoVoltar={() => dispatch({ tipo: 'voltar' })} />
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
