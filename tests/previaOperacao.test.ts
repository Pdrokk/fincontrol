import assert from 'node:assert/strict'
import test from 'node:test'
import { preverOperacao } from '../src/renderer/src/utils/previaOperacao.ts'

test('compra considera taxas e quantidade resultante', () => {
  assert.deepEqual(preverOperacao('compra', 10000, 150, 2, 3, 20000), {
    caixa: -10150,
    restante: 5,
    erro: ''
  })
})
test('venda total e provento preservam o impacto correto', () => {
  assert.deepEqual(preverOperacao('venda', 6000, 200, 20, 20), {
    caixa: 5800,
    restante: 0,
    erro: ''
  })
  assert.deepEqual(preverOperacao('provento', 500, 10, 0, 20), {
    caixa: 490,
    restante: 20,
    erro: ''
  })
})
test('saldo insuficiente, quantidade excedente e taxas inválidas', () => {
  assert.match(preverOperacao('compra', 100, 1, 1, 2, 100).erro, /Saldo insuficiente/)
  assert.match(preverOperacao('venda', 100, 0, 3, 2).erro, /superior/)
  assert.notEqual(preverOperacao('venda', 100, 100, 1, 2).erro, '')
  assert.notEqual(preverOperacao('provento', 100, 101, 0, 2).erro, '')
})
test('frações, valores extremos e entradas inválidas', () => {
  assert.equal(preverOperacao('venda', 100, 0, 0.1, 0.3).restante, 0.2)
  assert.notEqual(preverOperacao('compra', 100, 0, 0.000000001, 0).erro, '')
  assert.notEqual(preverOperacao('compra', 1e12, 1, 1, 0).erro, '')
  assert.notEqual(preverOperacao('compra', NaN, 0, 1, 0).erro, '')
  assert.notEqual(preverOperacao('compra', 100, -1, 1, 0).erro, '')
  assert.notEqual(preverOperacao('compra', 100, 0, 1, 10000).erro, '')
})
