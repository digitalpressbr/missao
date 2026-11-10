import { useEffect, useState } from 'react'
import { PERGUNTAS } from '../jogador/missaoEstado'
import { conferirTarefa, desmarcarSemAula, linkAssinado, marcarSemAula, marcarTroca } from '../lib/dados'
import { dataExtenso, diaSemana } from '../lib/regras'
import { resumoDaSemana, resumoDoDia } from './dadosPais'

const hhmm = (t) => String(t).slice(0, 5)
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function Copiar({ texto }) {
  const [rotulo, setRotulo] = useState('Copiar mensagem')
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setRotulo('Copiada')
    } catch {
      setRotulo('Segure o texto para copiar')
    }
  }
  return <button type="button" className="btn btn-small" onClick={copiar}>{rotulo}</button>
}

function Arquivos({ missao }) {
  const [foto, setFoto] = useState(null)
  const [audio, setAudio] = useState(null)
  const [cheia, setCheia] = useState(false)
  useEffect(() => {
    let vivo = true
    if (missao.foto_path) linkAssinado(missao.foto_path).then((u) => vivo && setFoto(u))
    if (missao.audio_path) linkAssinado(missao.audio_path).then((u) => vivo && setAudio(u))
    return () => { vivo = false }
  }, [missao.foto_path, missao.audio_path])
  if (!missao.foto_path && !missao.audio_path) return null
  return (
    <div className="cartao">
      {missao.foto_path && (
        <>
          <p className="lbl">Foto da agenda</p>
          {foto ? <img className="foto-mini" src={foto} alt="Foto da agenda, toque para ampliar" onClick={() => setCheia(true)} /> : <p className="meta">Carregando a foto...</p>}
        </>
      )}
      {missao.audio_path && (
        <>
          <p className="lbl">O que ele contou</p>
          {audio ? <audio controls src={audio} style={{ width: '100%' }} /> : <p className="meta">Carregando o áudio...</p>}
          {missao.transcricao ? <p className="quote">“{missao.transcricao}”</p> : <p className="meta">Sem transcrição. Ouça o áudio.</p>}
        </>
      )}
      {cheia && foto && (
        <div className="foto-cheia" role="dialog" aria-label="Foto da agenda ampliada" onClick={() => setCheia(false)}>
          <img src={foto} alt="Foto da agenda" />
        </div>
      )}
    </div>
  )
}

export function Hoje({ p, aoRapido }) {
  const [ocupado, setOcupado] = useState(false)
  const r = resumoDoDia({ missao: p.missao, tarefas: p.painel.tarefas, aulas: p.aulas, hora: p.hora, letivo: p.letivo, aluno: p.aluno })
  const nome = p.filho?.nome ?? 'Seu filho'
  const marcadoSemAula = p.painel.semAula.includes(p.hoje)

  const etiquetas = {
    aguardando: ['tag-idle', p.horario ? `Missão às ${hhmm(p.horario.libera)}` : 'Aguardando'],
    entregue: ['tag-ok', `Entregue às ${r.hora}`],
    parcial: ['tag-warn', `Entregue às ${r.hora}, falta a foto`],
    'sem-resposta': ['tag-warn', 'Sem resposta hoje'],
    'sem-aula': ['tag-idle', 'Sem aula hoje'],
  }
  const [classe, rotulo] = etiquetas[r.situacao]

  async function agir(acao) {
    setOcupado(true)
    try {
      await acao()
      await p.recarregar()
    } finally {
      setOcupado(false)
    }
  }

  const m = p.missao
  const respostas = m ? PERGUNTAS.filter((q) => m.respostas?.[q.id] === true) : []

  return (
    <>
      <div className="topo">
        <h2>{maiuscula(dataExtenso(p.hoje))}</h2>
        <span className={`tag ${classe}`}>{rotulo}</span>
      </div>

      {(r.situacao === 'aguardando' || r.situacao === 'sem-resposta') && (
        <>
          <div className="vazio">
            <p>{r.situacao === 'aguardando'
              ? `Quando ${p.aluno} entregar a missão, as tarefas aparecem aqui com a foto da agenda e o que a professora falou.`
              : `${maiuscula(p.aluno)} não entregou a missão hoje.`}</p>
          </div>
          <div className="bloco">
            <p className="lbl">Buscando na escola?</p>
            <p className="sub">Ele responde no seu celular, em um minuto. A foto da agenda fica para casa.</p>
            <button type="button" className="btn" onClick={aoRapido}>{nome} está comigo</button>
          </div>
          <button type="button" className="btn btn-ghost btn-small" disabled={ocupado} onClick={() => agir(() => marcarSemAula(p.painel.familia.id, p.hoje))}>Hoje não tem aula</button>
        </>
      )}

      {r.situacao === 'sem-aula' && (
        <>
          <div className="vazio"><p>Hoje não tem missão.</p></div>
          {marcadoSemAula && diaSemana(p.hoje) <= 5 && (
            <button type="button" className="btn btn-ghost btn-small" disabled={ocupado} onClick={() => agir(() => desmarcarSemAula(p.painel.familia.id, p.hoje))}>Desfazer: hoje tem aula</button>
          )}
        </>
      )}

      {m && (
        <>
          {m.nao_lembro && <p className="note">{maiuscula(p.aluno)} marcou “não lembro”. As mensagens para a professora estão prontas em cada tarefa.</p>}
          {!r.cartoes.length && <div className="vazio"><p>Sem tarefa hoje, segundo {p.aluno}.</p></div>}
          {r.cartoes.map((c) => (
            <article className="cartao" key={c.id}>
              <div className="cartao-topo">
                <div><b>{c.materia}</b>{c.professor && <small>{c.professor}</small>}</div>
                <span className={`tag ${c.selo === 'duvida' ? 'tag-warn' : 'tag-ok'}`}>{c.selo === 'duvida' ? 'Com dúvida' : 'Completo'}</span>
              </div>
              {c.texto
                ? <p>{c.texto}{c.prazo ? ` Para ${dataExtenso(c.prazo)}.` : ''}</p>
                : <p>Tem tarefa.{c.fotoPendente ? ' O texto entra quando ele fotografar a agenda.' : ' O app não conseguiu ler o texto na foto.'}</p>}
              {c.levar && <p className="meta">Levar: {c.levar}</p>}
              {c.fotoPendente && <p className="meta">Foto da agenda: pendente</p>}
              {c.recado && (
                <>
                  <p className="lbl">Mensagem pronta para a professora</p>
                  <p className="msg">{c.recado}</p>
                  <Copiar texto={c.recado} />
                </>
              )}
              <div className="linha">
                <button type="button" className={`btn btn-small ${c.conferencia === 'conferiu' ? '' : 'btn-ghost'}`} aria-pressed={c.conferencia === 'conferiu'} disabled={ocupado}
                  onClick={() => agir(() => conferirTarefa(c.id, c.conferencia === 'conferiu' ? null : 'conferiu'))}>Conferiu</button>
                <button type="button" className={`btn btn-small ${c.conferencia === 'faltou' ? '' : 'btn-ghost'}`} aria-pressed={c.conferencia === 'faltou'} disabled={ocupado}
                  onClick={() => agir(() => conferirTarefa(c.id, c.conferencia === 'faltou' ? null : 'faltou'))}>Faltou coisa</button>
              </div>
            </article>
          ))}
          {(respostas.length > 0 || m.texto_livre) && (
            <div className="cartao">
              <p className="lbl">A professora falou fora da agenda</p>
              {respostas.length > 0 && <div className="chips">{respostas.map((q) => <span className="chip" key={q.id}>{q.curto}</span>)}</div>}
              {m.texto_livre && <p className="quote">“{m.texto_livre}”</p>}
            </div>
          )}
          <Arquivos missao={m} />
          {r.cartoes.length > 0 && r.semTarefa.length > 0 && <p className="sub">Sem tarefa, segundo ele: {r.semTarefa.join(', ')}.</p>}
          <p className="note">Missão entregue. Pode liberar o jogo no controle de pais do celular dele.</p>
        </>
      )}
    </>
  )
}

export function Semana({ p }) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const s = resumoDaSemana({ missoes: p.painel.missoes, semAula: p.painel.semAula, hoje: p.hoje, trocas: p.painel.trocas })
  const pct = Math.min(100, Math.round((s.robux / p.meta) * 100))
  const nome = p.filho?.nome ?? 'ele'
  const classes = { ok: 'dia-ok', hoje: 'dia-hoje', perdido: 'dia-perdido', 'sem-aula': 'dia-sem-aula', futuro: '' }

  async function trocar() {
    setOcupado(true)
    try {
      await marcarTroca(s.segunda)
      await p.recarregar()
    } finally {
      setOcupado(false)
      setConfirmando(false)
    }
  }

  return (
    <>
      <h2>Semana de {nome}</h2>
      <div className="xp">
        <div className="xp-top"><span>Robux da semana</span><b>{s.robux} / {p.meta}</b></div>
        <div className="meter" role="img" aria-label={`${s.robux} de ${p.meta} Robux`}><i style={{ '--w': `${pct}%` }} /></div>
        <p className="sub">Cada missão entregue vale {p.painel.familia.robux_por_missao} Robux. Semana incompleta paga o que ele juntou.</p>
      </div>
      <div className="dias">
        {s.dias.map((d) => (
          <div className={`dia ${classes[d.estado]}`} key={d.dia}><span className="dot" /><small>{d.nome}</small></div>
        ))}
      </div>
      <p className="note">
        {s.sequencia} {s.sequencia === 1 ? 'dia seguido' : 'dias seguidos'} de missão entregue, {s.escudos} {s.escudos === 1 ? 'escudo' : 'escudos'}.
        O escudo segura a sequência quando ele perde um dia. Ganha um a cada 5 dias seguidos.
      </p>
      <div className="cartao">
        <p className="lbl">Troca de sábado</p>
        {s.trocaFeita ? (
          <p>Troca feita em {dataExtenso(s.trocaFeita.feita_em.slice(0, 10)).split(', ')[1]}: {s.trocaFeita.robux} Robux.</p>
        ) : confirmando ? (
          <>
            <p>Confirmar que {nome} recebeu {s.robux} Robux desta semana?</p>
            <div className="linha">
              <button type="button" className="btn btn-small" disabled={ocupado} onClick={trocar}>Confirmar</button>
              <button type="button" className="btn btn-small btn-ghost" disabled={ocupado} onClick={() => setConfirmando(false)}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <p className="sub">Vocês compram os Robux e marcam aqui. O app não compra nada.</p>
            <button type="button" className="btn" disabled={s.robux === 0} onClick={() => setConfirmando(true)}>Marcar troca feita</button>
          </>
        )}
      </div>
    </>
  )
}
