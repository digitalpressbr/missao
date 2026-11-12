import { useEffect, useRef } from 'react'
import AvatarImg from '../comum/AvatarImg.jsx'

// Chamada em tela cheia: cobre o app inteiro até o jogador responder.
export default function Alerta({ membro, titulo, texto, robux, onIniciar, onFechar }) {
  const principal = useRef(null)
  useEffect(() => {
    principal.current?.focus()
  }, [])

  return (
    <div className="g-alerta" role="alertdialog" aria-modal="true" aria-labelledby="alerta-titulo" aria-describedby="alerta-texto">
      <div className="g-alerta-meio">
        <div className="g-alerta-heroi">
          <span className="g-alerta-raios" aria-hidden="true" />
          <AvatarImg familiaId={membro.familia_id} moldura={membro.moldura} nome={membro.nome} grande />
        </div>
        <h1 id="alerta-titulo">{titulo}</h1>
        <p id="alerta-texto" className="g-alerta-texto">{texto}</p>
        {robux ? <p className="g-gain">+{robux} <small>Robux</small></p> : null}
      </div>
      <div className="g-alerta-pe">
        {onIniciar && <button type="button" className="g-btn" ref={principal} onClick={onIniciar}>Iniciar missão</button>}
        <button type="button" className={onIniciar ? 'g-btn g-ghost' : 'g-btn'} ref={onIniciar ? null : principal} onClick={onFechar}>
          {onIniciar ? 'Agora não' : 'Entendi'}
        </button>
      </div>
    </div>
  )
}
