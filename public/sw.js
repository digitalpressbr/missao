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
  event.waitUntil(
    self.registration.showNotification(dados.title || 'Missão do Dia', {
      body: dados.body || 'Tem novidade na missão de hoje.',
      icon: base + 'icon-192.png',
      badge: base + 'icon-192.png',
      // Mesma etiqueta para o jogador: o lembrete novo substitui o anterior em vez de empilhar.
      tag: dados.tag || 'missao',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: dados.forte ? [300, 120, 300, 120, 300, 120, 600] : [200, 100, 200],
      data: { url: base },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (j.url.startsWith(self.registration.scope) && 'focus' in j) return j.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
