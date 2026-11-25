interface PosicaoComposicao {
  codigo: string
  tipo: string
  arquivado: boolean
  valorAtualCentavos: number | null
}

export interface SegmentoCarteira {
  id: string
  nome: string
  valor: number
  percentual: number
  inicio: number
}

export function comporCarteira(posicoes: readonly PosicaoComposicao[]): { total: number; segmentos: SegmentoCarteira[] } {
  const grupos = new Map<string, { id: string; nome: string; valor: number }>()
  for (const p of posicoes) {
    if (p.arquivado || p.valorAtualCentavos === null || !Number.isSafeInteger(p.valorAtualCentavos) || p.valorAtualCentavos <= 0) continue
    const id = JSON.stringify([p.codigo, p.tipo])
    const anterior = grupos.get(id)
    grupos.set(id, { id, nome: p.codigo, valor: (anterior?.valor ?? 0) + p.valorAtualCentavos })
  }
  const ordenados = [...grupos.values()].sort((a, b) => b.valor - a.valor || a.id.localeCompare(b.id))
  const total = ordenados.reduce((s, a) => s + a.valor, 0)
  const principais = ordenados.length > 6 ? [...ordenados.slice(0, 5), { id: 'outros', nome: 'Outros', valor: ordenados.slice(5).reduce((s, a) => s + a.valor, 0) }] : ordenados
  let inicio = 0
  const segmentos = principais.map(a => {
    const percentual = a.valor / total * 100
    const segmento = { ...a, percentual, inicio }
    inicio += percentual
    return segmento
  })
  return { total, segmentos }
}
