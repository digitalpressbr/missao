import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './estilos.css'
import { escutarConvite } from './lib/instalar'
import { registrarServiceWorker } from './lib/push'

// Antes de montar as telas: o convite de instalação pode chegar a qualquer momento.
escutarConvite()
// Registra cedo: é o que faz o navegador tratar o endereço como app instalável (ícone próprio, sem atalho de favorito).
window.addEventListener('load', () => {
  registrarServiceWorker()?.catch(() => {})
})

createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
