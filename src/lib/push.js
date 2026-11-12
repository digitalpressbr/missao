// Avisos no celular (Web Push).
// iPhone: só funciona com o app instalado na Tela de Início (iOS 16.4 ou mais novo),
// e o pedido de permissão precisa sair de um toque da pessoa.
import { supabase } from '../api/supabase'
import { ehNativo } from './nativo'

export const VAPID_PUBLICA = 'BNMbgh0RCgSneUDwj0_asexMD6Y70P4uFASKaDuiKlVhteWSh5KUIdGhfib7N5hbvGJbkuOfWTPHdc9ZHS_1LHE'

export function chaveParaBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const b64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function suportaPush() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function estaInstalado() {
  return ehNativo() || window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function ehIOS() {
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

export function ehSamsungInternet() {
  return /SamsungBrowser/i.test(navigator.userAgent || '')
}

// 'pronto' | 'bloqueado' | 'pedir' | 'instalar-antes' | 'sem-suporte'
export function situacaoAvisos() {
  if (ehIOS() && !estaInstalado()) return 'instalar-antes'
  if (!suportaPush()) return 'sem-suporte'
  if (Notification.permission === 'granted') return 'pronto'
  if (Notification.permission === 'denied') return 'bloqueado'
  return 'pedir'
}

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  const base = import.meta.env.BASE_URL
  return navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
}

async function inscrever() {
  const reg = (await registrarServiceWorker()) || (await navigator.serviceWorker.ready)
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID_PUBLICA) })
  const j = sub.toJSON()
  const { error } = await supabase.from('ms_push_inscricoes').upsert({
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    aparelho: (navigator.userAgent || '').slice(0, 200),
  })
  if (error) throw error
}

// Chamar dentro do toque no botão.
export async function ativarAvisos() {
  const permissao = await Notification.requestPermission()
  if (permissao === 'granted') await inscrever()
  return permissao
}

// Já autorizado: garante que a inscrição deste aparelho está gravada (o iPhone às vezes troca o endereço).
export async function sincronizarInscricao() {
  if (situacaoAvisos() !== 'pronto') return
  try {
    await inscrever()
  } catch {
    /* sem rede ou sem suporte: tenta de novo na próxima abertura */
  }
}

export async function avisoDeTeste() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Missão do Dia', {
    body: 'Os avisos estão funcionando neste aparelho.',
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icon-192.png`,
    tag: 'missao-teste',
    vibrate: [200, 100, 200],
  })
}
