import { describe, it, expect } from 'vitest'
import * as r from './regras'

describe('dia e hora em Brasília', () => {
  it('23:30 de terça em Brasília ainda é terça', () => {
    expect(r.hojeSP(new Date('2026-11-11T02:30:00Z'))).toBe('2026-11-10')
    expect(r.horaSP(new Date('2026-11-10T16:15:00Z'))).toBe('13:15')
  })
  it('semana', () => {
    expect(r.diaSemana('2026-11-10')).toBe(2)
    expect(r.diaSemana('2026-11-15')).toBe(7)
    expect(r.inicioSemana('2026-11-14')).toBe('2026-11-09')
    expect(r.inicioSemana('2026-11-09')).toBe('2026-11-09')
    expect(r.ehDiaLetivo('2026-11-14', [])).toBe(false)
    expect(r.ehDiaLetivo('2026-11-10', ['2026-11-10'])).toBe(false)
    expect(r.ehDiaLetivo('2026-11-10', [])).toBe(true)
  })
})

describe('missão', () => {
  const h = { libera: '13:15', bonus_ate: '13:30' }
  it('estado', () => {
    expect(r.estadoMissao(h, '13:14', null, true)).toBe('antes')
    expect(r.estadoMissao(h, '13:15', null, true)).toBe('liberada')
    expect(r.estadoMissao(h, '09:00', null, false)).toBe('sem-aula')
    expect(r.estadoMissao(h, '14:00', { status: 'parcial' }, true)).toBe('parcial')
    expect(r.estadoMissao(h, '12:50', { status: 'entregue' }, true)).toBe('entregue')
  })
  it('aceita hora do banco com segundos', () => {
    expect(r.estadoMissao({ libera: '13:15:00', bonus_ate: '13:30:00' }, '13:15', null, true)).toBe('liberada')
  })
  it('bônus de horário', () => {
    expect(r.noHorario(h, '13:30', 'jogador')).toBe(true)
    expect(r.noHorario(h, '13:31', 'jogador')).toBe(false)
    expect(r.noHorario(h, '12:40', 'rapido')).toBe(true)
  })
  it('aulas sem repetir matéria', () => {
    const grade = [
      { dia_semana: 2, ordem: 4, materia: 'Português', professor: 'Prof. B' },
      { dia_semana: 2, ordem: 1, materia: 'Math', professor: 'Prof. A' },
      { dia_semana: 2, ordem: 5, materia: 'Português', professor: 'Prof. B' },
      { dia_semana: 3, ordem: 1, materia: 'ELA', professor: 'Prof. C' },
    ]
    expect(r.aulasDoDia(grade, '2026-11-10')).toEqual([
      { materia: 'Math', professor: 'Prof. A' },
      { materia: 'Português', professor: 'Prof. B' },
    ])
  })
})

describe('Robux e sequência', () => {
  it('soma só a semana pedida', () => {
    const m = [{ dia: '2026-11-02', robux: 100 }, { dia: '2026-11-09', robux: 100 }, { dia: '2026-11-10', robux: 100 }]
    expect(r.robuxDaSemana(m, '2026-11-09')).toBe(200)
  })
  const semana1 = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']
  it('sem nenhuma entrega', () => {
    expect(r.sequencia([], [], '2026-11-10')).toEqual({ dias: 0, escudos: 0 })
  })
  it('5 dias seguidos dão 1 escudo; hoje ainda em aberto não quebra', () => {
    expect(r.sequencia([...semana1, '2026-11-09'], [], '2026-11-10')).toEqual({ dias: 6, escudos: 1 })
  })
  it('dia perdido consome o escudo e não zera', () => {
    expect(r.sequencia([...semana1, '2026-11-09', '2026-11-11'], [], '2026-11-11')).toEqual({ dias: 7, escudos: 0 })
  })
  it('sem escudo, dia perdido zera', () => {
    expect(r.sequencia(['2026-11-09', '2026-11-11'], [], '2026-11-11')).toEqual({ dias: 1, escudos: 0 })
  })
  it('dia sem aula não conta como perdido', () => {
    expect(r.sequencia(['2026-11-09', '2026-11-11'], ['2026-11-10'], '2026-11-11')).toEqual({ dias: 2, escudos: 0 })
  })
  it('escudo para em 2', () => {
    const quinze = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', ...semana1]
    expect(r.sequencia(quinze, [], '2026-11-06')).toEqual({ dias: 15, escudos: 2 })
  })
})

describe('painel e avisos', () => {
  it('selo', () => {
    expect(r.seloTarefa({ nao_lembro: true, respostas: {} })).toBe('duvida')
    expect(r.seloTarefa({ nao_lembro: false, respostas: { surpresa: true } })).toBe('duvida')
    expect(r.seloTarefa({ nao_lembro: false, respostas: { surpresa: true }, audio_path: 'a' })).toBe('completo')
    expect(r.seloTarefa({ nao_lembro: false, respostas: { surpresa: true }, texto_livre: 'embrulhar' })).toBe('completo')
    expect(r.seloTarefa({ nao_lembro: false, respostas: { levar: false } })).toBe('completo')
  })
  it('recado', () => {
    // Nomes fictícios: este repositório é público.
    const t = { materia: 'ELA', professor: 'Prof. Marta', texto: 'Trazer uma foto da família.', prazo: '2026-11-13' }
    expect(r.recadoProfessora(t, 'jogador', 'o Léo')).toBe('Prof. Marta, o Léo trouxe tarefa de ELA para sexta, 13/11: “Trazer uma foto da família.” Tem algum detalhe de como deve ser feito ou levado?')
    expect(r.recadoProfessora({ ...t, texto: null }, 'rapido', 'o Léo')).toBe('Prof. Marta, o Léo disse que tem tarefa de ELA, mas não lembrou os detalhes. Pode me passar o que precisa?')
    expect(r.recadoProfessora({ ...t, prazo: null }, 'jogador', 'o Léo')).toBe('Prof. Marta, o Léo trouxe tarefa de ELA: “Trazer uma foto da família.” Tem algum detalhe de como deve ser feito ou levado?')
    expect(r.recadoProfessora({ ...t, professor: null, texto: null }, 'jogador', 'a Ana')).toBe('Professora, a Ana disse que tem tarefa de ELA, mas não lembrou os detalhes. Pode me passar o que precisa?')
    expect(r.dataExtenso('2026-11-10')).toBe('terça, 10/11')
  })
  const h = { libera: '13:15', bonus_ate: '13:30' }
  const base = { horario: h, letivo: true, missao: null }
  it('contagem antes da missão', () => {
    expect(r.avisosDevidos({ ...base, hora: '13:04', enviados: [] })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '13:05', enviados: [] })).toEqual([{ tipo: 'pre-10', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '13:10', enviados: ['pre-10'] })).toEqual([{ tipo: 'pre-5', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '13:12', enviados: [] })).toEqual([{ tipo: 'pre-5', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '13:12', enviados: ['pre-5'] })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '13:05', missao: { status: 'parcial' }, enviados: ['entrega'] })).toEqual([])
  })
  it('liberação e lembretes com teto', () => {
    expect(r.avisosDevidos({ ...base, hora: '13:15', enviados: [] })).toEqual([{ tipo: 'liberada', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '13:15', enviados: ['pre-10', 'pre-5'] })).toEqual([{ tipo: 'liberada', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '13:29', enviados: ['liberada'] })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '13:30', enviados: ['liberada'] })).toEqual([{ tipo: 'lembrete-1', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '14:20', enviados: ['liberada'] })).toEqual([{ tipo: 'lembrete-1', para: 'filho' }])
    expect(r.avisosDevidos({ ...base, hora: '13:45', enviados: ['liberada', 'lembrete-1'] })).toEqual([{ tipo: 'lembrete-2', para: 'filho' }])
    const todos = ['liberada', 'lembrete-1', 'lembrete-2', 'lembrete-3', 'lembrete-4']
    expect(r.avisosDevidos({ ...base, hora: '15:00', enviados: todos })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '13:30', enviados: ['liberada'], lembretes: { intervalo: 30, teto: 1 } })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '13:45', enviados: ['liberada'], lembretes: { intervalo: 30, teto: 1 } })).toEqual([{ tipo: 'lembrete-1', para: 'filho' }])
  })
  it('pais', () => {
    const todos = ['liberada', 'lembrete-1', 'lembrete-2', 'lembrete-3', 'lembrete-4']
    expect(r.avisosDevidos({ ...base, hora: '19:00', enviados: todos })).toEqual([{ tipo: 'sem-resposta', para: 'pais' }])
    expect(r.avisosDevidos({ ...base, hora: '19:05', enviados: [...todos, 'sem-resposta'] })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '13:40', missao: { status: 'entregue' }, enviados: ['liberada'] })).toEqual([{ tipo: 'entrega', para: 'pais' }])
    expect(r.avisosDevidos({ ...base, hora: '13:45', missao: { status: 'entregue' }, enviados: ['liberada', 'entrega'] })).toEqual([])
    expect(r.avisosDevidos({ ...base, hora: '12:40', missao: { status: 'parcial' }, enviados: [] })).toEqual([{ tipo: 'entrega', para: 'pais' }])
  })
  it('dia sem aula não avisa ninguém', () => {
    expect(r.avisosDevidos({ ...base, letivo: false, hora: '13:15', enviados: [] })).toEqual([])
    expect(r.avisosDevidos({ ...base, letivo: false, hora: '19:00', enviados: [] })).toEqual([])
  })
})

describe('tarefa anotada no livro: onde, páginas e prazo', () => {
  it('lista de páginas aceita texto do banco e lista do app', () => {
    expect(r.listaPaginas('45, 46')).toEqual(['45', '46'])
    expect(r.listaPaginas(['7'])).toEqual(['7'])
    expect(r.listaPaginas(null)).toEqual([])
    expect(r.listaPaginas('')).toEqual([])
  })
  it('descreve onde e quais páginas', () => {
    expect(r.ondeEPaginas({ onde: 'livro', paginas: '45, 46' })).toBe('Livro, páginas 45 e 46')
    expect(r.ondeEPaginas({ paginas: '12' })).toBe('Página 12')
    expect(r.ondeEPaginas({ onde: 'apostila', paginas: '3, 4, 8' })).toBe('Apostila, páginas 3, 4 e 8')
    expect(r.ondeEPaginas({ onde: 'caderno' })).toBe('Caderno, sem a página')
    expect(r.ondeEPaginas({})).toBe('')
  })
  it('próximos dias de aula pulam fim de semana e dia sem aula', () => {
    expect(r.proximosDiasLetivos('2026-11-11', ['2026-11-13'], 4)).toEqual(['2026-11-12', '2026-11-16', '2026-11-17', '2026-11-18'])
    expect(r.diaCurto('2026-11-12')).toBe('qui 12/11')
  })
  it('selo de cada tarefa: sem página e sem texto é dúvida', () => {
    const missao = { nao_lembro: false, respostas: {} }
    expect(r.seloDaTarefa(missao, { paginas: '45' })).toBe('completo')
    expect(r.seloDaTarefa(missao, { texto: 'Ler o capítulo.' })).toBe('completo')
    expect(r.seloDaTarefa(missao, { onde: 'livro' })).toBe('duvida')
    expect(r.seloDaTarefa({ nao_lembro: true, respostas: {} }, { paginas: '45' })).toBe('duvida')
  })
  it('recado para a professora cita as páginas quando não há texto', () => {
    const t = { materia: 'ELA', professor: 'Prof. Marta', onde: 'livro', paginas: '45, 46', prazo: '2026-11-13' }
    expect(r.recadoProfessora(t, 'jogador', 'o Léo')).toBe('Prof. Marta, o Léo trouxe tarefa de ELA para sexta, 13/11 (livro, páginas 45 e 46). Tem algum detalhe de como deve ser feito ou levado?')
    expect(r.recadoProfessora({ ...t, paginas: null }, 'jogador', 'o Léo')).toBe('Prof. Marta, o Léo disse que tem tarefa de ELA, mas não lembrou os detalhes. Pode me passar o que precisa?')
  })
  it('aviso de entrega para os pais já traz a tarefa', () => {
    const tarefas = [
      { materia: 'Matemática', onde: 'livro', paginas: '45, 46', prazo: '2026-11-12' },
      { materia: 'ELA', paginas: '9' },
      { materia: 'Ciências' },
    ]
    expect(r.resumoEntrega({ filho: 'Léo', tarefas })).toBe('Léo entregou a missão. Matemática: livro, p. 45 e 46, para qui 12/11. ELA: p. 9. Ciências: não lembrou a página.')
    expect(r.resumoEntrega({ filho: 'Léo', tarefas: [] })).toBe('Léo entregou a missão: sem tarefa hoje.')
    expect(r.resumoEntrega({ filho: 'Léo', tarefas: [{ materia: 'ELA', texto: 'Trazer uma foto da família.' }] })).toBe('Léo entregou a missão. ELA: Trazer uma foto da família.')
    const muitas = Array.from({ length: 12 }, (_, i) => ({ materia: `Matéria número ${i}`, onde: 'apostila', paginas: '100, 101, 102', prazo: '2026-11-12' }))
    expect(r.resumoEntrega({ filho: 'Léo', tarefas: muitas }).length).toBeLessThanOrEqual(300)
  })
})
