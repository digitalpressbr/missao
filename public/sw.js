// Service worker da Missão do Dia. Os avisos entram na Tarefa 9.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
