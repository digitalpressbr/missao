import { ProvedorDeSessao, usarSessao } from './comum/Sessao.jsx'
import Entrar from './comum/Entrar.jsx'
import CriarSenha from './comum/CriarSenha.jsx'
import Jogador from './jogador/Jogador.jsx'
import Pais from './pais/Pais.jsx'

function Rotas() {
  const { carregando, membro } = usarSessao()
  if (carregando) return <main className="modo-jogador"><div className="tela entrar"><p className="g-sub">Carregando...</p></div></main>
  if (!membro) return <Entrar />
  if (membro.trocar_senha) return <CriarSenha />
  return membro.papel === 'filho' ? <Jogador /> : <Pais />
}

export default function App() {
  return (
    <ProvedorDeSessao>
      <Rotas />
    </ProvedorDeSessao>
  )
}
