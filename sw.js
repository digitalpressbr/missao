// Service worker da Missão do Dia: recebe os avisos e abre o app no toque.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Abertura do app: sempre pela rede (nada fica guardado). Sem internet, mostra um aviso em vez da tela de erro do navegador.
// Navegadores como o da Samsung só instalam o app de verdade quando existe este tratamento.
const SEM_INTERNET = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Missão do Dia</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#13132E;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px"><div><h1 style="font-size:1.4rem">Sem internet</h1><p>Conecte o celular e abra o app de novo.</p></div></body></html>'
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => new Response(SEM_INTERNET, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
  )
})

self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = { body: event.data ? event.data.text() : '' }
  }
  const base = self.registration.scope
  const corpo = dados.body || 'Tem novidade na missão de hoje.'
  const forte = Boolean(dados.forte)
  const mostrar = self.registration.showNotification(dados.title || 'Missão do Dia', {
    body: corpo,
    icon: base + 'icon-192.png',
    badge: base + 'icon-192.png',
    // Mesma etiqueta para o jogador: o lembrete novo substitui o anterior em vez de empilhar.
    tag: dados.tag || 'missao',
    renotify: true,
    requireInteraction: true,
    silent: false,
    // Chamada do jogador: cerca de 3 segundos de vibração (o toque em si é o do aparelho; a página não escolhe).
    vibrate: forte ? [400, 150, 400, 150, 400, 150, 400, 150, 800] : [200, 100, 200],
    data: { url: base, forte, corpo },
  })
  // Com o app aberto, o jogador também recebe a chamada em tela cheia, com o som do app.
  event.waitUntil(Promise.all([mostrar, forte ? avisarJanelas({ tipo: 'missao-aviso', texto: corpo }) : null]))
})

function janelasDoApp() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((janelas) => janelas.filter((j) => j.url.startsWith(self.registration.scope)))
}

function avisarJanelas(mensagem) {
  return janelasDoApp().then((janelas) => janelas.forEach((j) => j.postMessage(mensagem)))
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification.data || {}
  event.waitUntil(
    janelasDoApp().then((janelas) => {
      const aberta = janelas.find((j) => 'focus' in j)
      if (!aberta) return self.clients.openWindow(d.url || self.registration.scope)
      return aberta.focus().then((j) => {
        if (d.forte) (j || aberta).postMessage({ tipo: 'missao-aviso', texto: d.corpo, aberto: true })
      })
    })
  )
})
