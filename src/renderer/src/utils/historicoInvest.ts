export const TAMANHO_PAGINA_INVEST = 25

export function indexarAtivos<T extends { id: string }>(ativos: readonly T[]): Map<string, T> {
  return new Map(ativos.map((a) => [a.id, a]))
}

export function paginarHistorico<T>(
  registros: readonly T[],
  solicitada: number
): { itens: T[]; pagina: number; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(registros.length / TAMANHO_PAGINA_INVEST))
  const pagina = Math.max(
    0,
    Math.min(totalPaginas - 1, Number.isFinite(solicitada) ? Math.trunc(solicitada) : 0)
  )
  const inicio = pagina * TAMANHO_PAGINA_INVEST
  return { itens: registros.slice(inicio, inicio + TAMANHO_PAGINA_INVEST), pagina, totalPaginas }
}
