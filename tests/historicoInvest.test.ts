import assert from 'node:assert/strict'
import test from 'node:test'
import { performance } from 'node:perf_hooks'
import { indexarAtivos, paginarHistorico, TAMANHO_PAGINA_INVEST } from '../src/renderer/src/utils/historicoInvest.ts'

test('paginação conserva todos os registros na ordem original', () => {
  const dados = Array.from({ length: 1003 }, (_, i) => i)
  const paginas = paginarHistorico(dados, 0).totalPaginas
  const reunidos = Array.from({ length: paginas }, (_, i) => paginarHistorico(dados, i).itens).flat()
  assert.deepEqual(reunidos, dados)
  assert.equal(paginarHistorico(dados, 0).itens.length, TAMANHO_PAGINA_INVEST)
  assert.equal(paginarHistorico(dados, paginas - 1).itens.length, 3)
})
test('página inválida ou dados reduzidos não deixam a tabela vazia', () => {
  assert.deepEqual(paginarHistorico([], 99), { itens: [], pagina: 0, totalPaginas: 1 })
  assert.equal(paginarHistorico([1, 2], 99).pagina, 0)
  assert.equal(paginarHistorico([1, 2], -1).pagina, 0)
  assert.equal(paginarHistorico([1, 2], NaN).pagina, 0)
})
test('índice preserva os códigos inclusive quando não há correspondência', () => {
  const ativos = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), codigo: 'ATIVO' + i }))
  const ids = Array.from({ length: 20000 }, (_, i) => String(i % 1001))
  const inicio = performance.now()
  const antes = ids.map(id => ativos.find(a => a.id === id)?.codigo ?? 'Ativo')
  const msAntes = performance.now() - inicio
  const t = performance.now()
  const indice = indexarAtivos(ativos)
  const depois = ids.map(id => indice.get(id)?.codigo ?? 'Ativo')
  const msDepois = performance.now() - t
  assert.deepEqual(depois, antes)
  console.log('Benchmark sintético 1.000 ativos / 20.000 registros: busca linear=' + msAntes.toFixed(2) + 'ms, índice=' + msDepois.toFixed(2) + 'ms')
})
