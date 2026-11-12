import { describe, expect, it } from 'vitest'
import { ALERTA_LIBERADA, alertaPara } from './alerta'

describe('alertaPara', () => {
  const naTelaInicial = { estado: 'liberada', passo: 'inicio' }

  it('chama em tela cheia quando o aviso chega com a missão liberada e a tela inicial aberta', () => {
    expect(alertaPara({ texto: 'Ainda dá tempo de entregar a missão de hoje.' }, naTelaInicial)).toEqual({
      titulo: 'Missão liberada',
      texto: 'Ainda dá tempo de entregar a missão de hoje.',
    })
  })

  it('usa o texto padrão quando o aviso vem sem texto', () => {
    expect(alertaPara({}, naTelaInicial)).toEqual(ALERTA_LIBERADA)
  })

  it('antes da liberação avisa que falta pouco, sem falar em missão liberada', () => {
    expect(alertaPara({ texto: 'Missão libera em 10 minutos.' }, { estado: 'antes', passo: 'inicio' })).toEqual({
      titulo: 'Falta pouco',
      texto: 'Missão libera em 10 minutos.',
    })
  })

  it('não interrompe quem já está no meio da missão', () => {
    for (const passo of ['aulas', 'paginas', 'foto', 'detalhes', 'enviando', 'erro', 'fim']) {
      expect(alertaPara({ texto: 'x' }, { estado: 'liberada', passo })).toBeNull()
    }
  })

  it('não chama depois da entrega nem em dia sem missão', () => {
    expect(alertaPara({ texto: 'x' }, { estado: 'entregue', passo: 'inicio' })).toBeNull()
    expect(alertaPara({ texto: 'x' }, { estado: 'sem-missao', passo: 'inicio' })).toBeNull()
  })

  it('com o app escondido não guarda chamada velha para depois', () => {
    expect(alertaPara({ texto: 'x' }, { ...naTelaInicial, oculto: true })).toBeNull()
  })

  it('aberto pelo toque no aviso, chama mesmo que a tela ainda conste como escondida', () => {
    expect(alertaPara({ texto: 'x', aberto: true }, { ...naTelaInicial, oculto: true })).toEqual({ titulo: 'Missão liberada', texto: 'x' })
  })

  it('o teste aparece em qualquer situação e vem marcado como teste', () => {
    const a = alertaPara({ teste: true }, { estado: 'entregue', passo: 'fim', oculto: true })
    expect(a.teste).toBe(true)
    expect(a.titulo).toBe('Teste do alerta')
  })
})
