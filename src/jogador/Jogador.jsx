import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { usarSessao } from '../comum/Sessao.jsx'
import AvatarImg, { MOLDURAS, linkDoAvatar } from '../comum/AvatarImg.jsx'
import Avisos from '../comum/Avisos.jsx'
import { usarPainel } from '../lib/usarPainel'
import { ALERTA_LIBERADA, alertaPara, escutarAlertas } from '../lib/alerta'
import { chamadasFuturas } from '../lib/chamadas'
import { apagarInscricoesDeAviso, avisarEntrega, definirMoldura, entregarMissao, mensagemEntrega } from '../lib/dados'
import { acaoPendente, agendarChamadas, ehNativo, escutarNativo, guardarAvatarDe } from '../lib/nativo'
import { noHorario, proximosDiasLetivos } from '../lib/regras'
import { pararAlerta, tocarAlerta, tocarVitoria } from '../lib/som'
import Alerta from './Alerta.jsx'
import { estadoInicial, lerRascunho, missaoReducer, montarEntrega, salvarRascunho } from './missaoEstado'
import { Aulas, Detalhes, Foto, Paginas } from './Passos.jsx'

function Barra({ de, para, meta }) {
  const [valor, setValor] = useState(de)
  useEffect(() => {
    const t = setTimeout(() => setValor(para), 80)
    return () => clearTimeout(t)
  }, [para])
  const pct = Math.min(100, Math.round((valor / meta) * 100))
  return (
    <div className="g-meter" role="img" aria-label={`${para} de ${meta} Robux`}>
      <i style={{ '--w': `${pct}%` }} />
    </div>
  )
}

function Semana({ de, robux, meta, texto }) {
  return (
    <div className="g-panel">
      <div className="g-row"><span>Troca de sábado</span><b>{robux} / {meta}</b></div>
      <Barra de={de ?? robux} para={robux} meta={meta} />
      <p className="g-sub">{texto}</p>
    </div>
  )
}

const hhmm = (t) => String(t).slice(0, 5)

export default function Jogador() {
  const { membro, sair, recarregar: recarregarSessao } = usarSessao()
  const p = usarPainel(membro.familia_id)
  const [estado, dispatch] = useReducer(missaoReducer, undefined, () => estadoInicial('jogador'))
  const [tela, setTela] = useState('missao')
  const [completando, setCompletando] = useState(false)
  const restaurado = useRef(false)
  const robuxAntes = useRef(0)
  const [alerta, setAlerta] = useState(null)
  const chamou = useRef(null) // dia em que a chamada da liberação já apareceu
  const agendaEnviada = useRef('')
  const [pedidoIniciar, setPedidoIniciar] = useState(false)
  const situacao = useRef({})
  situacao.current = { estado: p.estado, passo: estado.passo }

  const chamar = useCallback((a) => {
    setAlerta(a)
    tocarAlerta()
  }, [])
  const fecharAlerta = () => {
    pararAlerta()
    setAlerta(null)
  }

  // Rascunho: volta de onde parou se o app foi fechado no meio.
  useEffect(() => {
    if (!p.painel || restaurado.current) return
    restaurado.current = true
    if (!p.missao) {
      const r = lerRascunho(localStorage, p.hoje, 'jogador')
      if (r) {
        chamou.current = p.hoje // já começou a missão de hoje: não precisa ser chamado de novo
        dispatch({ tipo: 'restaurar', estado: r })
      }
    }
  }, [p.painel, p.missao, p.hoje])
  useEffect(() => {
    if (p.painel && restaurado.current && !completando) salvarRascunho(localStorage, p.hoje, estado)
  }, [estado, p.painel, p.hoje, completando])

  // Entrega: quem decide Robux, bônus e dia é o servidor.
  useEffect(() => {
    if (estado.passo !== 'enviando' || !p.painel) return undefined
    let vivo = true
    robuxAntes.current = p.robux
    entregarMissao({ ...montarEntrega(estado, p.aulas), familia: membro.familia_id })
      .then((missao) => {
        if (!vivo) return
        dispatch({ tipo: 'entregue', missao })
        if (!completando) tocarVitoria()
        avisarEntrega(membro.familia_id)
        p.recarregar()
      })
      .catch((e) => vivo && dispatch({ tipo: 'falhou', msg: mensagemEntrega(e) }))
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.passo])

  // App Android: o celular guarda a agenda das próximas chamadas e chama sozinho, com o app fechado.
  // A lista é refeita a cada mudança (entregou a missão, mudou o horário, virou o dia).
  useEffect(() => {
    if (!ehNativo() || !p.painel) return
    const fam = p.painel.familia
    const dados = {
      tema: fam.tema,
      nome: membro.nome,
      robux: fam.robux_por_missao,
      chamadas: chamadasFuturas({
        agora: Date.now(),
        hoje: p.hoje,
        horarios: p.painel.horarios,
        semAula: p.painel.semAula,
        entregueHoje: Boolean(p.missao),
        lembretes: { intervalo: fam.lembrete_intervalo, teto: fam.lembrete_teto },
        preAvisos: fam.pre_avisos,
        robux: fam.robux_por_missao,
      }),
    }
    const texto = JSON.stringify(dados)
    if (texto !== agendaEnviada.current) {
      agendaEnviada.current = texto
      agendarChamadas(dados)
    }
  }, [p.painel, p.missao, p.hoje, p.hora, membro.nome])

  // App Android: o avatar vai para a tela de chamada, e o aviso do navegador deixa de sair para não chamar em dobro.
  useEffect(() => {
    if (!ehNativo()) return
    apagarInscricoesDeAviso(membro.user_id)
    linkDoAvatar(membro.familia_id).then(guardarAvatarDe)
  }, [membro.user_id, membro.familia_id])

  // App Android: o jogador tocou em "Iniciar missão" na chamada do celular.
  useEffect(() => {
    const conferir = () => { if (acaoPendente() === 'iniciar') setPedidoIniciar(true) }
    conferir()
    return escutarNativo(conferir)
  }, [])
  useEffect(() => {
    if (!pedidoIniciar || !p.painel) return
    if (p.estado === 'liberada' && estado.passo === 'inicio') {
      chamou.current = p.hoje
      pararAlerta()
      setAlerta(null)
      setTela('missao')
      dispatch({ tipo: 'iniciar' })
    }
    // Antes da hora o relógio do app ainda vai virar: espera. No resto, o pedido já não vale.
    if (p.estado !== 'antes') setPedidoIniciar(false)
  }, [pedidoIniciar, p.painel, p.estado, estado.passo, p.hoje])

  // Missão liberada com o app aberto (ou aberto depois da liberação): chamada em tela cheia, uma vez por dia a cada abertura.
  useEffect(() => {
    if (pedidoIniciar) return
    if (p.estado === 'liberada' && estado.passo === 'inicio' && chamou.current !== p.hoje) {
      chamou.current = p.hoje
      chamar(ALERTA_LIBERADA)
    }
  }, [p.estado, estado.passo, p.hoje, chamar, pedidoIniciar])

  // Aviso do celular que chega (ou é tocado) com o app aberto, e o botão de teste.
  useEffect(() => escutarAlertas((aviso) => {
    const a = alertaPara(aviso, { ...situacao.current, oculto: document.hidden })
    if (a) chamar(a)
  }), [chamar])

  if (p.erro && !p.painel) {
    return (
      <main className="modo-jogador"><div className="tela">
        <h2>Sem conexão</h2>
        <p className="g-sub">Não consegui carregar seus dados.</p>
        <button type="button" className="g-btn" onClick={p.recarregar}>Tentar de novo</button>
      </div></main>
    )
  }
  if (!p.painel) return <main className="modo-jogador"><div className="tela"><p className="g-sub">Carregando...</p></div></main>

  const voltarAoInicio = () => { setCompletando(false); dispatch({ tipo: 'restaurar', estado: estadoInicial('jogador') }) }
  const completarFoto = () => {
    setCompletando(true)
    dispatch({ tipo: 'restaurar', estado: { ...estadoInicial('jogador'), passo: 'foto', marcadas: p.painel.tarefas.map((t) => t.materia) } })
  }
  const trocarMoldura = async (n) => { await definirMoldura(n); await recarregarSessao() }

  let conteudo
  if (tela === 'avatar') {
    conteudo = (
      <>
        <div>
          <button type="button" className="g-mini" onClick={() => setTela('missao')}>Voltar</button>
          <h2>Avatar</h2>
          <p className="g-sub">Escolha a moldura. Visuais novos chegam nas próximas versões.</p>
        </div>
        <div className="g-win"><AvatarImg familiaId={membro.familia_id} moldura={membro.moldura} nome={membro.nome} grande /></div>
        <div className="g-opt">
          <span>Moldura</span>
          <div className="g-sws">
            {MOLDURAS.map((m, i) => (
              <button type="button" key={m.nome} className="g-sw" aria-label={m.nome} aria-pressed={membro.moldura === i} style={{ background: m.cor }} onClick={() => trocarMoldura(i)} />
            ))}
          </div>
        </div>
        <Avisos jogo />
        <button type="button" className="g-btn g-ghost empurra" onClick={sair}>Sair da conta</button>
      </>
    )
  } else if (estado.passo === 'aulas') {
    conteudo = <Aulas aulas={p.aulas} estado={estado} dispatch={dispatch} />
  } else if (estado.passo === 'paginas') {
    conteudo = <Paginas key={estado.indice} aulas={p.aulas} estado={estado} dispatch={dispatch} hoje={p.hoje} prazos={proximosDiasLetivos(p.hoje, p.painel.semAula)} />
  } else if (estado.passo === 'foto') {
    conteudo = completando
      ? <Foto estado={estado} dispatch={(a) => (a.tipo === 'voltar' ? voltarAoInicio() : dispatch(a))} familiaId={membro.familia_id} dia={p.hoje} completando />
      : <Foto estado={estado} dispatch={dispatch} familiaId={membro.familia_id} dia={p.hoje} />
  } else if (estado.passo === 'detalhes') {
    conteudo = <Detalhes estado={estado} dispatch={dispatch} familiaId={membro.familia_id} dia={p.hoje} />
  } else if (estado.passo === 'enviando') {
    conteudo = <div className="g-win"><h2>Entregando...</h2></div>
  } else if (estado.passo === 'erro') {
    conteudo = (
      <>
        <h2>Não foi dessa vez</h2>
        <p className="g-erro" role="alert">{estado.erro}</p>
        <button type="button" className="g-btn" onClick={() => dispatch({ tipo: 'tentarDeNovo' })}>Tentar de novo</button>
      </>
    )
  } else if (estado.passo === 'fim') {
    const m = estado.missao
    conteudo = (
      <>
        <div className="g-win">
          <AvatarImg familiaId={membro.familia_id} moldura={membro.moldura} nome={membro.nome} grande />
          {!completando && <p className="g-gain">+{m.robux}</p>}
          <h2>{completando ? 'Missão completa' : 'Missão concluída'}</h2>
          {!completando && <p className="g-sub">Robux para sábado.{m.moedas ? ` Mais ${m.moedas} moedas de avatar pelo horário.` : ''}</p>}
        </div>
        <Semana de={completando ? undefined : robuxAntes.current} robux={completando ? p.robux : robuxAntes.current + m.robux} meta={p.meta} texto="No sábado você recebe o que juntou na semana." />
        {m.nao_lembro && <p className="g-note">Você marcou “não lembro”. Vale igual: seus pais perguntam para a professora.</p>}
        {m.status === 'parcial' && <p className="g-note">Falta só a foto da agenda. Dá para tirar depois, na tela inicial.</p>}
        <button type="button" className="g-btn" onClick={voltarAoInicio}>Voltar ao início</button>
      </>
    )
  } else {
    const h = p.horario
    let cartao
    if (p.estado === 'liberada') {
      const bonus = noHorario(h, p.hora, 'jogador')
      cartao = (
        <div className="g-quest">
          <h2>Missão de hoje</h2>
          <p className="g-sub">Relatório da escola, 2 minutos.{bonus ? ` Entregando até ${hhmm(h.bonus_ate)} tem bônus.` : ''}</p>
          <div className="g-loot">
            <span className="g-coin">+{p.painel.familia.robux_por_missao} Robux</span>
            {bonus && <span className="g-coin g-coin-alt">+{p.painel.familia.moedas_bonus} moedas no horário</span>}
          </div>
          <button type="button" className="g-btn" onClick={() => dispatch({ tipo: 'iniciar' })}>Iniciar missão</button>
        </div>
      )
    } else if (p.estado === 'antes') {
      cartao = (
        <div className="g-quest g-quest-quieta">
          <h2>Missão de hoje</h2>
          <p className="g-sub">Libera às {hhmm(h.libera)}. Vale {p.painel.familia.robux_por_missao} Robux.</p>
        </div>
      )
    } else if (p.estado === 'parcial') {
      cartao = (
        <div className="g-quest">
          <h2>Falta a foto da agenda</h2>
          <p className="g-sub">Os Robux de hoje já estão garantidos. Tire a foto para completar.</p>
          <button type="button" className="g-btn" onClick={completarFoto}>Tirar foto</button>
        </div>
      )
    } else if (p.estado === 'entregue') {
      cartao = (
        <div className="g-quest g-quest-quieta">
          <h2>Missão concluída</h2>
          <p className="g-sub">Seus pais já receberam o relatório de hoje.</p>
        </div>
      )
    } else {
      cartao = (
        <div className="g-quest g-quest-quieta">
          <h2>Hoje não tem missão</h2>
          <p className="g-sub">Volte no próximo dia de aula.</p>
        </div>
      )
    }
    conteudo = (
      <>
        <div className="g-id">
          <AvatarImg familiaId={membro.familia_id} moldura={membro.moldura} nome={membro.nome} />
          <div className="g-id-txt">
            <p className="g-name">{membro.nome}</p>
            <button type="button" className="g-mini" onClick={() => setTela('avatar')}>Avatar e avisos</button>
          </div>
        </div>
        <div className="g-stats">
          <div className="g-stat"><b>{p.robux}</b><small>Robux na semana</small></div>
          <div className="g-stat"><b>{p.dias}</b><small>dias seguidos</small></div>
          <div className="g-stat"><b>{p.escudos}</b><small>{p.escudos === 1 ? 'escudo' : 'escudos'}</small></div>
        </div>
        <Semana robux={p.robux} meta={p.meta} texto={`Cada missão entregue vale ${p.painel.familia.robux_por_missao} Robux. Semana cheia: ${p.meta}.`} />
        {cartao}
        <Avisos jogo soSePrecisar />
      </>
    )
  }

  const podeIniciar = Boolean(alerta) && !alerta.teste && p.estado === 'liberada' && estado.passo === 'inicio'
  const iniciarPeloAlerta = () => {
    fecharAlerta()
    setTela('missao')
    dispatch({ tipo: 'iniciar' })
  }

  return (
    <main className="modo-jogador">
      <div className="tela">{conteudo}</div>
      {alerta && (
        <Alerta
          membro={membro}
          titulo={alerta.titulo}
          texto={alerta.texto}
          robux={podeIniciar ? p.painel.familia.robux_por_missao : null}
          onIniciar={podeIniciar ? iniciarPeloAlerta : null}
          onFechar={fecharAlerta}
        />
      )}
    </main>
  )
}
