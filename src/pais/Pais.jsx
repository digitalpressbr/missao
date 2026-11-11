import { useEffect, useReducer, useRef, useState } from 'react'
import { usarSessao } from '../comum/Sessao.jsx'
import Avisos from '../comum/Avisos.jsx'
import { usarPainel } from '../lib/usarPainel'
import { avisarEntrega, entregarMissao, mensagemEntrega } from '../lib/dados'
import { estadoInicial, lerRascunho, missaoReducer, montarEntrega, salvarRascunho } from '../jogador/missaoEstado'
import { Aulas, Detalhes, Paginas } from '../jogador/Passos.jsx'
import { proximosDiasLetivos } from '../lib/regras'
import { Hoje, Semana } from './Telas.jsx'

// O filho responde no celular de quem busca.
function ModoRapido({ p, familiaId, aoFechar }) {
  const [estado, dispatch] = useReducer(missaoReducer, undefined, () => {
    const rascunho = lerRascunho(localStorage, p.hoje, 'rapido')
    return rascunho ?? { ...estadoInicial('rapido'), passo: 'aulas' }
  })
  const pronto = useRef(false)

  useEffect(() => {
    salvarRascunho(localStorage, p.hoje, estado)
  }, [estado, p.hoje])

  useEffect(() => {
    if (estado.passo !== 'enviando') return undefined
    let vivo = true
    entregarMissao(montarEntrega(estado, p.aulas))
      .then((missao) => {
        if (!vivo) return
        pronto.current = true
        dispatch({ tipo: 'entregue', missao })
        avisarEntrega()
        p.recarregar()
      })
      .catch((e) => vivo && dispatch({ tipo: 'falhou', msg: mensagemEntrega(e) }))
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.passo])

  const despachar = (a) => (a.tipo === 'voltar' && estado.passo === 'aulas' ? aoFechar() : dispatch(a))

  let conteudo
  if (estado.passo === 'aulas') conteudo = <Aulas aulas={p.aulas} estado={estado} dispatch={despachar} />
  else if (estado.passo === 'paginas') conteudo = <Paginas key={estado.indice} aulas={p.aulas} estado={estado} dispatch={despachar} hoje={p.hoje} prazos={proximosDiasLetivos(p.hoje, p.painel.semAula)} />
  else if (estado.passo === 'detalhes') conteudo = <Detalhes estado={estado} dispatch={despachar} familiaId={familiaId} dia={p.hoje} />
  else if (estado.passo === 'enviando') conteudo = <div className="g-win"><h2>Entregando...</h2></div>
  else if (estado.passo === 'erro') {
    conteudo = (
      <>
        <h2>Não foi dessa vez</h2>
        <p className="g-erro" role="alert">{estado.erro}</p>
        <button type="button" className="g-btn" onClick={() => dispatch({ tipo: 'tentarDeNovo' })}>Tentar de novo</button>
        <button type="button" className="g-btn g-ghost" onClick={aoFechar}>Fechar</button>
      </>
    )
  } else {
    const m = estado.missao
    conteudo = (
      <>
        <div className="g-win">
          <p className="g-gain">+{m?.robux ?? 0}</p>
          <h2>Missão concluída</h2>
          <p className="g-sub">Robux para sábado.{m?.moedas ? ` Mais ${m.moedas} moedas de avatar.` : ''}</p>
        </div>
        {m?.status === 'parcial' && <p className="g-note">Em casa falta só a foto da agenda, no celular dele.</p>}
        <button type="button" className="g-btn" onClick={aoFechar}>Devolver o celular</button>
      </>
    )
  }
  return <main className="modo-jogador"><div className="tela">{conteudo}</div></main>
}

export default function Pais() {
  const { membro, sair } = usarSessao()
  const p = usarPainel(membro.familia_id)
  const [aba, setAba] = useState('hoje')
  const [rapido, setRapido] = useState(false)

  if (p.erro && !p.painel) {
    return (
      <main><div className="tela">
        <h2>Sem conexão</h2>
        <p className="sub">Não consegui carregar os dados.</p>
        <button type="button" className="btn" onClick={p.recarregar}>Tentar de novo</button>
      </div></main>
    )
  }
  if (!p.painel) return <main><div className="tela"><p className="sub">Carregando...</p></div></main>
  if (rapido) return <ModoRapido p={p} familiaId={membro.familia_id} aoFechar={() => { setRapido(false); p.recarregar() }} />

  return (
    <main>
      <div className="tela">
        {aba === 'hoje' ? <Hoje p={p} aoRapido={() => setRapido(true)} /> : <Semana p={p} />}
        {aba === 'semana' && (
          <>
            <Avisos />
            <button type="button" className="btn btn-ghost btn-small" onClick={sair}>Sair da conta ({membro.usuario})</button>
          </>
        )}
        {aba === 'hoje' && <Avisos soSePrecisar />}
        <nav className="abas" aria-label="Seções">
          <button type="button" aria-pressed={aba === 'hoje'} onClick={() => setAba('hoje')}>Hoje</button>
          <button type="button" aria-pressed={aba === 'semana'} onClick={() => setAba('semana')}>Semana</button>
        </nav>
      </div>
    </main>
  )
}
