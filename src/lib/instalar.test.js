import { describe, expect, it } from 'vitest'
import { linkAbrirNoChrome, modoInstalar } from './instalar'

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36'
const DENTRO_DE_APP = 'Mozilla/5.0 (Linux; Android 15; SM-S938B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36'
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1'
const CHROME_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1'
const IPAD_COMO_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15'
const CHROME_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

describe('modoInstalar', () => {
  it('app já instalado não mostra nada', () => {
    expect(modoInstalar({ ua: CHROME_ANDROID, instalado: true, temConvite: true })).toBe('instalado')
  })
  it('com o convite do navegador na mão, mostra o botão em qualquer aparelho', () => {
    expect(modoInstalar({ ua: CHROME_ANDROID, temConvite: true })).toBe('botao')
    expect(modoInstalar({ ua: SAMSUNG, temConvite: true })).toBe('botao')
    expect(modoInstalar({ ua: CHROME_PC, temConvite: true })).toBe('botao')
  })
  it('Chrome no Android sem convite ensina o caminho do menu', () => {
    expect(modoInstalar({ ua: CHROME_ANDROID })).toBe('android-menu')
  })
  it('navegador da Samsung e link aberto dentro de outro app mandam abrir no Chrome', () => {
    expect(modoInstalar({ ua: SAMSUNG })).toBe('android-abrir-chrome')
    expect(modoInstalar({ ua: DENTRO_DE_APP })).toBe('android-abrir-chrome')
  })
  it('iPhone no Safari ensina o Compartilhar', () => {
    expect(modoInstalar({ ua: SAFARI_IPHONE, toques: 5 })).toBe('ios-safari')
  })
  it('iPhone em outro navegador manda abrir no Safari', () => {
    expect(modoInstalar({ ua: CHROME_IPHONE, toques: 5 })).toBe('ios-outro')
  })
  it('iPad que se apresenta como Mac conta como iOS', () => {
    expect(modoInstalar({ ua: IPAD_COMO_MAC, toques: 5 })).toBe('ios-safari')
    expect(modoInstalar({ ua: IPAD_COMO_MAC, toques: 0 })).toBe('computador')
  })
  it('computador sem convite cai na orientação do navegador', () => {
    expect(modoInstalar({ ua: CHROME_PC })).toBe('computador')
    expect(modoInstalar({})).toBe('computador')
  })
})

describe('linkAbrirNoChrome', () => {
  it('monta o endereço que o Android abre direto no Chrome', () => {
    expect(linkAbrirNoChrome('https://exemplo.test/missao/?a=1#x'))
      .toBe('intent://exemplo.test/missao/#Intent;scheme=https;package=com.android.chrome;end')
  })
})
