import assert from 'node:assert/strict'
import test from 'node:test'
import { comporCarteira } from '../src/renderer/src/utils/composicaoCarteira.ts'

const posicao = (codigo: string, valorAtualCentavos: number | null, arquivado = false): { codigo: string; tipo: string; valorAtualCentavos: number | null; arquivado: boolean } => ({ codigo, tipo: 'Ação', valorAtualCentavos, arquivado })

test('agrupa o mesmo ativo, exclui zerados, arquivados e valores desconhecidos', () => {
  const r = comporCarteira([posicao('PETR4', 2000), posicao('PETR4', 3000), posicao('USD', 15000), posicao('ZERO', 0), posicao('SEM', null), posicao('ARQ', 9999, true)])
  assert.equal(r.total, 20000)
  assert.deepEqual(r.segmentos.map(s => [s.nome, s.valor, s.percentual, s.inicio]), [['USD', 15000, 75, 0], ['PETR4', 5000, 25, 75]])
})
test('carteira grande mantém no máximo seis segmentos sem perder patrimônio', () => {
  const r = comporCarteira(Array.from({ length: 10 }, (_, i) => posicao('ATIVO' + i, (i + 1) * 100)))
  assert.equal(r.segmentos.length, 6)
  assert.equal(r.segmentos.at(-1)?.nome, 'Outros')
  assert.equal(r.segmentos.at(-1)?.valor, 1500)
  assert.equal(r.segmentos.reduce((s, a) => s + a.valor, 0), r.total)
  assert.ok(Math.abs(r.segmentos.reduce((s, a) => s + a.percentual, 0) - 100) < 1e-9)
})
test('sem valores positivos não cria fatias nem percentuais inválidos', () => {
  assert.deepEqual(comporCarteira([posicao('A', null), posicao('B', 0), posicao('C', -1), posicao('D', NaN)]), { total: 0, segmentos: [] })
  assert.deepEqual(comporCarteira([]), { total: 0, segmentos: [] })
})
test('um único ativo ocupa toda a rosca', () => {
  const r = comporCarteira([posicao('PETR4', 4128)])
  assert.equal(r.segmentos[0].percentual, 100)
  assert.equal(r.segmentos[0].inicio, 0)
})
