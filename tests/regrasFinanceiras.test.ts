import assert from 'node:assert/strict'
import test from 'node:test'
import { hojeLocalISO, naoEhFuturo, validarOperacaoImediata,
  inicioDeSalarioRetroativo, podeExcluirConta, ehCategoriaSalario } from '../src/main/regrasFinanceiras.ts'

test('datas locais ISO mantêm o calendário da máquina', () => {
  const d = new Date(2026, 10, 19, 23, 59)
  assert.equal(hojeLocalISO(d), '2026-11-19')
})

test('operações imediatas recusam datas futuras', () => {
  assert.equal(naoEhFuturo('2026-11-19', '2026-11-19'), true)
  assert.equal(naoEhFuturo('2027-01-01', '2026-11-19'), false)
  assert.doesNotThrow(() => validarOperacaoImediata('2026-11-19', '2026-11-19'))
  assert.throws(
    () => validarOperacaoImediata('2027-01-01', '2026-11-19'),
    /Escolha hoje/
  )
})

test('salário retroativo requer consentimento explícito', () => {
  assert.equal(inicioDeSalarioRetroativo('2026-10', 5, '2026-11-19'), true)
  assert.equal(inicioDeSalarioRetroativo('2026-11', 25, '2026-11-19'), false)
  assert.equal(inicioDeSalarioRetroativo('2026-11', 19, '2026-11-19'), false)
})

test('contas com saldo diferente de zero não podem ser excluídas', () => {
  assert.equal(podeExcluirConta(0), true)
  assert.equal(podeExcluirConta(50000), false)
  assert.equal(podeExcluirConta(-1), false)
})


test('proteção de salário recorrente reconhece categoria com espaços e maiúsculas', () => {
  assert.equal(ehCategoriaSalario('Salário'), true)
  assert.equal(ehCategoriaSalario(' SALÁRIO  '), true)
  assert.equal(ehCategoriaSalario('salário'), true)
  assert.equal(ehCategoriaSalario('Salários'), false)
  assert.equal(ehCategoriaSalario('Outros'), false)
})
