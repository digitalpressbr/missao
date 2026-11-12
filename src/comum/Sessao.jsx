import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../api/supabase'
import { emailInterno, familiaAtiva, montarFamilias } from '../lib/sessao'
import { agendarChamadas } from '../lib/nativo'

const Contexto = createContext(null)
const GUARDA_FAMILIA = 'missao-familia'
const GUARDA_TEMA = 'missao-tema'
const VAZIO = { carregando: false, linhas: [], familias: [], erro: null }

function ler(chave) {
  try { return localStorage.getItem(chave) } catch { return null }
}
function guardar(chave, valor) {
  try { localStorage.setItem(chave, valor) } catch { /* modo privado: segue sem guardar */ }
}

// Cada filho tem o seu quadro. O filho está em um; os responsáveis, em todos.
async function buscarQuadros(userId) {
  const r = await supabase.from('ms_membros').select('*, familia:ms_familias(tema,criado_em)').eq('user_id', userId)
  if (r.error) throw r.error
  if (!r.data?.length) throw new Error('sem_familia')
  const f = await supabase.from('ms_membros').select('familia_id,nome,tratamento,moldura').eq('papel', 'filho')
  return { linhas: r.data, familias: montarFamilias(r.data, f.error ? [] : f.data) }
}

export function ProvedorDeSessao({ children }) {
  const [estado, setEstado] = useState({ ...VAZIO, carregando: true })
  const [escolhida, setEscolhida] = useState(() => ler(GUARDA_FAMILIA))

  const recarregar = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return setEstado(VAZIO)
      setEstado({ carregando: false, erro: null, ...(await buscarQuadros(data.session.user.id)) })
    } catch (e) {
      setEstado({ ...VAZIO, erro: e })
    }
  }, [])

  useEffect(() => {
    recarregar()
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setEstado(VAZIO)
    })
    return () => data.subscription.unsubscribe()
  }, [recarregar])

  const familia = useMemo(() => familiaAtiva(estado.familias, escolhida), [estado.familias, escolhida])
  const membro = useMemo(() => estado.linhas.find((l) => l.familia_id === familia?.id) ?? estado.linhas[0] ?? null, [estado.linhas, familia])

  // As cores do modo jogador seguem o quadro aberto. O aparelho lembra a última, para a tela de entrada.
  useEffect(() => {
    if (!familia) return
    document.documentElement.dataset.tema = familia.tema
    guardar(GUARDA_TEMA, familia.tema)
    // Barra do aparelho na cor do jogo, só para o filho; o painel dos pais não muda.
    const barra = document.querySelector('meta[name="theme-color"]')
    if (barra) barra.content = membro?.papel === 'filho' && familia.tema === 'rosa' ? '#FFE4F0' : '#13132E'
  }, [familia, membro?.papel])

  const escolherFamilia = useCallback((id) => {
    setEscolhida(id)
    guardar(GUARDA_FAMILIA, id)
  }, [])

  const entrar = useCallback(async (usuario, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email: emailInterno(usuario), password: senha })
    if (error) throw error
    await recarregar()
  }, [recarregar])

  const trocarSenha = useCallback(async (nova) => {
    const { error } = await supabase.auth.updateUser({ password: nova })
    if (error) throw error
    const r = await supabase.rpc('ms_senha_trocada')
    if (r.error) throw r.error
    await recarregar()
  }, [recarregar])

  const sair = useCallback(async () => {
    agendarChamadas({ chamadas: [] }) // app Android: sem conta aberta o celular não chama
    await supabase.auth.signOut()
  }, [])

  const valor = { carregando: estado.carregando, erro: estado.erro, membro, familia, familias: estado.familias, escolherFamilia, entrar, trocarSenha, sair, recarregar }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usarSessao() {
  return useContext(Contexto)
}
