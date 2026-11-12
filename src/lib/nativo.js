// Ponte com o app Android próprio. `window.MissaoNativo` só existe dentro dele;
// no navegador e no iPhone tudo aqui vira "não tem" e o app segue como sempre.
const ponte = () => (typeof window !== 'undefined' ? window.MissaoNativo ?? null : null)

// Versão do app Android que este código espera. Subiu aqui, o app instalado mostra "Atualizar".
export const VERSAO_ANDROID = 1
// O arquivo fica fora do endereço do app (/missao/): dentro dele, o celular abre o app já instalado em vez de baixar.
export const LINK_ANDROID = 'https://github.com/digitalpressbr/missao/releases/latest/download/missao-do-dia.apk'

export const ehNativo = () => Boolean(ponte())

export function versaoNativa() {
  try { return Number(ponte()?.versao() ?? 0) } catch { return 0 }
}

// { notificacoes, telaCheia, sobrepor, bateria, alarme } ou null fora do app Android.
export function situacaoNativa() {
  try { return JSON.parse(ponte().situacao()) } catch { return null }
}

const PEDIDOS = [
  { qual: 'notificacoes', botao: 'Permitir notificações', texto: 'Permita as notificações para o celular tocar na hora da missão.' },
  { qual: 'telaCheia', botao: 'Permitir tela cheia', texto: 'Permita a notificação em tela cheia para a chamada abrir com o celular bloqueado.' },
  { qual: 'sobrepor', botao: 'Permitir sobre outros apps', texto: 'Permita aparecer sobre outros apps para a chamada abrir por cima do jogo.' },
  { qual: 'bateria', botao: 'Liberar a bateria', texto: 'Deixe o app sem restrição de bateria para a chamada não atrasar.' },
  { qual: 'alarme', botao: 'Permitir alarmes', texto: 'Permita alarmes e lembretes para a chamada sair na hora certa.' },
]

// O que ainda falta liberar no aparelho, na ordem em que pedimos.
export function pendenciasNativas(situacao) {
  if (!situacao) return []
  return PEDIDOS.filter((p) => situacao[p.qual] === false)
}

export function pedirNativo(qual) {
  try { ponte()?.pedir(qual) } catch { /* fora do app Android */ }
}

export function testarChamada() {
  try { ponte()?.testar() } catch { /* fora do app Android */ }
}

// Entrega ao celular a agenda das próximas chamadas. Lista vazia desliga tudo.
export function agendarChamadas(dados) {
  try { ponte()?.agendar(JSON.stringify(dados)) } catch { /* fora do app Android */ }
}

// 'iniciar' quando o jogador tocou em "Iniciar missão" na chamada do celular. Lê e apaga.
export function acaoPendente() {
  try { return ponte()?.pendente() || '' } catch { return '' }
}

// O celular avisa quando o app volta para a frente ou uma permissão muda.
export function escutarNativo(fn) {
  window.addEventListener('missao-nativo', fn)
  return () => window.removeEventListener('missao-nativo', fn)
}

// Manda o avatar para a tela de chamada do celular.
export async function guardarAvatarDe(url) {
  const p = ponte()
  if (!p || !url) return
  try {
    const blob = await (await fetch(url)).blob()
    const dados = await new Promise((resolver, rejeitar) => {
      const leitor = new FileReader()
      leitor.onload = () => resolver(String(leitor.result))
      leitor.onerror = rejeitar
      leitor.readAsDataURL(blob)
    })
    p.guardarAvatar(dados.slice(dados.indexOf(',') + 1))
  } catch {
    /* sem avatar a chamada mostra a inicial do nome */
  }
}
