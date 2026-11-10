// Service worker da Missão do Dia: recebe os avisos e abre o app no toque.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

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
