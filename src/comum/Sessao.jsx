import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../api/supabase'
import { emailInterno } from '../lib/sessao'

const Contexto = createContext(null)

async function buscarMembro(userId) {
  const r = await supabase.from('ms_membros').select('*').eq('user_id', userId).maybeSingle()
  if (r.error) throw r.error
  if (!r.data) throw new Error('sem_familia')
  return r.data
}

export function ProvedorDeSessao({ children }) {
  const [estado, setEstado] = useState({ carregando: true, membro: null, erro: null })

  const recarregar = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return setEstado({ carregando: false, membro: null, erro: null })
      const membro = await buscarMembro(data.session.user.id)
      setEstado({ carregando: false, membro, erro: null })
    } catch (e) {
      setEstado({ carregando: false, membro: null, erro: e })
    }
  }, [])

  useEffect(() => {
    recarregar()
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setEstado({ carregando: false, membro: null, erro: null })
    })
    return () => data.subscription.unsubscribe()
  }, [recarregar])

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
    await supabase.auth.signOut()
  }, [])

  return <Contexto.Provider value={{ ...estado, entrar, trocarSenha, sair, recarregar }}>{children}</Contexto.Provider>
}

export function usarSessao() {
  return useContext(Contexto)
}
