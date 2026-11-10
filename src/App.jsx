// Tarefa 1: só a tela de entrada, ainda sem ação. A sessão entra na Tarefa 4.
export default function App() {
  return (
    <main className="modo-jogador">
      <div className="tela entrar">
        <h1>Missão do Dia</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <label className="g-rotulo" htmlFor="usuario">
            Nome de usuário
            <input id="usuario" className="g-campo" autoCapitalize="none" autoCorrect="off" autoComplete="username" />
          </label>
          <label className="g-rotulo" htmlFor="senha">
            Senha
            <input id="senha" className="g-campo" type="password" autoComplete="current-password" />
          </label>
          <button className="g-btn" type="submit">Entrar</button>
        </form>
      </div>
    </main>
  )
}
