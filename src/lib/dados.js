// Conversa com o servidor: leitura do painel, entrega da missão, arquivos e ações dos pais.
import { supabase } from '../api/supabase'
import { hojeSP, somarDias } from './regras'
import { comprimirImagem } from './comprimirImagem'
import { normalizarLeitura } from './foto'

const HISTORICO_DIAS = 70
const ESPERA_LEITURA_MS = 22000

function dadoOuErro(r) {
  if (r.error) throw r.error
  return r.data
}

export async function carregarPainel(familiaId, agora = new Date()) {
  const hoje = hojeSP(agora)
  const desde = somarDias(hoje, -HISTORICO_DIAS)
  const [familia, membros, grade, horarios, semAula, missoes, trocas] = await Promise.all([
    supabase.from('ms_familias').select('*').eq('id', familiaId).single(),
    supabase.from('ms_membros').select('user_id,papel,nome,tratamento,moldura,usuario').eq('familia_id', familiaId),
    supabase.from('ms_grade').select('dia_semana,ordem,materia,professor').eq('familia_id', familiaId),
    supabase.from('ms_horarios').select('dia_semana,libera,bonus_ate').eq('familia_id', familiaId),
    supabase.from('ms_dias_sem_aula').select('dia').eq('familia_id', familiaId).gte('dia', desde),
    supabase.from('ms_missoes').select('*').eq('familia_id', familiaId).gte('dia', desde).order('dia'),
    supabase.from('ms_trocas').select('*').eq('familia_id', familiaId).gte('semana_inicio', desde),
  ])
  const lista = dadoOuErro(missoes)
  const missaoHoje = lista.find((m) => m.dia === hoje) ?? null
  const tarefas = missaoHoje
    ? dadoOuErro(await supabase.from('ms_tarefas').select('*').eq('missao_id', missaoHoje.id).order('materia'))
    : []
  return {
    hoje,
    familia: dadoOuErro(familia),
    membros: dadoOuErro(membros),
    grade: dadoOuErro(grade),
    horarios: dadoOuErro(horarios),
    semAula: dadoOuErro(semAula).map((d) => d.dia),
    missoes: lista,
    trocas: dadoOuErro(trocas),
    missaoHoje,
    tarefas,
  }
}

export async function entregarMissao(corpo) {
  return dadoOuErro(await supabase.rpc('ms_entregar_missao', { p: corpo }))
}

export function mensagemEntrega(e) {
  const msg = String(e?.message ?? e ?? '')
  if (msg === 'cedo') return 'A missão ainda não liberou.'
  if (msg === 'sem_aula') return 'Hoje não tem missão.'
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return 'Sem conexão. Suas respostas estão guardadas.'
  return 'Não consegui entregar. Suas respostas estão guardadas.'
}

export async function enviarFoto(arquivo, familiaId, dia) {
  const pronta = await comprimirImagem(arquivo)
  const path = `${familiaId}/${dia}/foto.jpg`
  dadoOuErro(await supabase.storage.from('missao').upload(path, pronta, { upsert: true, contentType: pronta.type || 'image/jpeg' }))
  return path
}

// Nunca trava a missão: erro, demora ou foto ilegível devolvem { legivel: false }.
export async function lerAgenda(path, materias) {
  const espera = new Promise((resolver) => setTimeout(() => resolver(null), ESPERA_LEITURA_MS))
  const leitura = supabase.functions.invoke('ms-ler-agenda', { body: { path, materias } }).then((r) => (r.error ? null : r.data)).catch(() => null)
  return normalizarLeitura(await Promise.race([leitura, espera]), materias)
}

export async function enviarAudio(blob, ext, familiaId, dia) {
  const path = `${familiaId}/${dia}/audio.${ext}`
  dadoOuErro(await supabase.storage.from('missao').upload(path, blob, { upsert: true, contentType: blob.type || 'audio/webm' }))
  return path
}

// Sem transcrição o áudio continua valendo: os pais ouvem o original.
export async function transcrever(path) {
  try {
    const r = await supabase.functions.invoke('ms-transcrever', { body: { path } })
    return r.error ? '' : String(r.data?.texto ?? '')
  } catch {
    return ''
  }
}

export async function linkAssinado(path, segundos = 600) {
  const r = await supabase.storage.from('missao').createSignedUrl(path, segundos)
  return r.error ? null : r.data.signedUrl
}

// Avisa os pais na hora. Se falhar, o agendador do servidor manda em até 5 minutos.
export function avisarEntrega() {
  supabase.functions.invoke('ms-avisos', { body: { motivo: 'entrega' } }).catch(() => {})
}

export async function marcarTroca(segunda) {
  return dadoOuErro(await supabase.rpc('ms_marcar_troca', { p_segunda: segunda }))
}

export async function conferirTarefa(id, valor) {
  return dadoOuErro(await supabase.rpc('ms_conferir_tarefa', { p_tarefa: id, p_valor: valor }))
}

export async function marcarSemAula(familiaId, dia) {
  return dadoOuErro(await supabase.from('ms_dias_sem_aula').upsert({ familia_id: familiaId, dia }))
}

export async function desmarcarSemAula(familiaId, dia) {
  return dadoOuErro(await supabase.from('ms_dias_sem_aula').delete().eq('familia_id', familiaId).eq('dia', dia))
}

export async function definirMoldura(n) {
  return dadoOuErro(await supabase.rpc('ms_definir_moldura', { p_moldura: n }))
}
