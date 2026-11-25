import assert from 'node:assert/strict'
import { test } from 'node:test'
import { performance } from 'node:perf_hooks'

test('pesquisa indexada preserva resultados e mede custo com 20 mil transações', () => {
  const registros = Array.from({ length: 20000 }, (_, i) => ({
    id: String(i),
    descricao: `Compra mercado número ${i}`,
    categoria: i % 3 === 0 ? 'Transporte' : 'Alimentação',
    contaId: String(i % 5)
  }))
  const contas = new Map(Array.from({ length: 5 }, (_, i) => [
    String(i), { nome: `Conta ${i}`, banco: i % 2 ? 'Inter' : 'Nubank' }
  ]))
  const pesquisas = ['mercado', 'transporte', 'inter', 'conta 3', '19999', 'não existe', 'alim']
  const anterior = (texto) => {
    const busca = texto.toLocaleLowerCase('pt-BR')
    return registros.filter(t => {
      const conta = contas.get(t.contaId)
      return [t.descricao, t.categoria, conta?.nome, conta?.banco]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca)
    }).map(t => t.id)
  }
  const comIndice = (texto, indice) => {
    const busca = texto.toLocaleLowerCase('pt-BR')
    return registros.filter(t => (indice.get(t.id) ?? '').includes(busca)).map(t => t.id)
  }

  const t0 = performance.now()
  const esperados = pesquisas.map(anterior)
  const msAnterior = performance.now() - t0

  const t1 = performance.now()
  const indice = new Map(registros.map(t => {
    const conta = contas.get(t.contaId)
    return [t.id, [t.descricao, t.categoria, conta?.nome, conta?.banco]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')]
  }))
  const obtidos = pesquisas.map(texto => comIndice(texto, indice))
  const msIndexado = performance.now() - t1

  assert.deepEqual(obtidos, esperados)
  console.log(`Benchmark sintético 20.000 lançamentos / 7 pesquisas (inclui indexação): anterior=${msAnterior.toFixed(1)}ms, indexado=${msIndexado.toFixed(1)}ms`)
})
