// Limpa a resposta da leitura da agenda antes de mostrar e de gravar.
const DATA = /^\d{4}-\d{2}-\d{2}$/
const cortar = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

export function normalizarLeitura(resposta, materias) {
  const vazio = { legivel: false, tarefas: [] }
  if (!resposta || resposta.legivel !== true || !Array.isArray(resposta.tarefas)) return vazio
  const vistas = new Set()
  const tarefas = resposta.tarefas
    .filter((t) => t && materias.includes(t.materia) && !vistas.has(t.materia) && vistas.add(t.materia))
    .map((t) => ({
      materia: t.materia,
      texto: cortar(t.texto, 300),
      prazo: typeof t.prazo === 'string' && DATA.test(t.prazo) ? t.prazo : null,
      levar: cortar(t.levar, 200),
    }))
    .filter((t) => t.texto)
  return tarefas.length ? { legivel: true, tarefas } : vazio
}
