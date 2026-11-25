import { criarTabelasInvestimentos } from '../src/main/investimentos.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { CONSULTA_SALDOS_CONTAS } from '../src/main/consultasFinanceiras.ts'

function bancoTeste(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE contas (
      id TEXT PRIMARY KEY, banco TEXT, nome TEXT, tipo TEXT, cor TEXT,
      saldo_inicial_centavos INTEGER, criado_em TEXT
    );
    CREATE TABLE transacoes (
      id TEXT PRIMARY KEY, conta_id TEXT, tipo TEXT, valor_centavos INTEGER, data TEXT
    );
    CREATE TABLE transferencias (
      id TEXT PRIMARY KEY, origem_id TEXT, destino_id TEXT, valor_centavos INTEGER, data TEXT
    );
    CREATE TABLE pagamentos_fatura (
      id TEXT PRIMARY KEY, conta_id TEXT, valor_centavos INTEGER,
      data_pagamento TEXT, estornado INTEGER DEFAULT 0
    );
    CREATE TABLE pagamentos_parcelas (
      id TEXT PRIMARY KEY, conta_id TEXT, valor_centavos INTEGER,
      data_pagamento TEXT, estornado INTEGER DEFAULT 0
    );
    CREATE TABLE ajustes_saldo (
      id TEXT PRIMARY KEY, conta_id TEXT, diferenca_centavos INTEGER, data TEXT
    );
    INSERT INTO contas VALUES ('A', 'Banco', 'Conta A', 'corrente', '#2563eb', 10000, '2000-01-01');
    INSERT INTO contas VALUES ('B', 'Banco', 'Conta B', 'corrente', '#2563eb', 0, '2000-01-01');
  `)
  criarTabelasInvestimentos(db)
  return db
}

function saldo(db: DatabaseSync, id: string): number {
  const contas = db.prepare(CONSULTA_SALDOS_CONTAS).all() as unknown as {
    id: string
    saldoAtualCentavos: number
  }[]
  const conta = contas.find((c) => c.id === id)
  assert.ok(conta)
  return conta.saldoAtualCentavos
}

test('receita agendada no futuro não aumenta dinheiro disponível', () => {
  const db = bancoTeste()
  try {
    db.exec(`INSERT INTO transacoes VALUES ('t1', 'A', 'receita', 50000, '2999-01-01')`)
    assert.equal(saldo(db, 'A'), 10000)
    db.exec(`INSERT INTO transacoes VALUES ('t2', 'A', 'receita', 1500, '2000-01-01')`)
    assert.equal(saldo(db, 'A'), 11500)
  } finally { db.close() }
})

test('transferência agendada não movimenta saldo até a data', () => {
  const db = bancoTeste()
  try {
    db.exec(`INSERT INTO transferencias VALUES ('f1', 'A', 'B', 3000, '2999-01-01')`)
    assert.equal(saldo(db, 'A'), 10000)
    assert.equal(saldo(db, 'B'), 0)
    db.exec(`INSERT INTO transferencias VALUES ('f2', 'A', 'B', 4000, '2000-01-01')`)
    assert.equal(saldo(db, 'A'), 6000)
    assert.equal(saldo(db, 'B'), 4000)
  } finally { db.close() }
})

test('pagamento futuro não reduz conta, pagamento efetivo sim', () => {
  const db = bancoTeste()
  try {
    db.exec(`INSERT INTO pagamentos_parcelas VALUES ('p1', 'A', 1000, '2999-01-01', 0)`)
    assert.equal(saldo(db, 'A'), 10000)
    db.exec(`INSERT INTO pagamentos_parcelas VALUES ('p2', 'A', 1500, '2000-01-01', 0)`)
    assert.equal(saldo(db, 'A'), 8500)
  } finally { db.close() }
})

test('estorno deixa de debitar o banco e preserva a linha do pagamento', () => {
  const db = bancoTeste()
  try {
    db.exec(`INSERT INTO pagamentos_fatura VALUES ('f1', 'A', 3500, '2000-01-01', 0)`)
    assert.equal(saldo(db, 'A'), 6500)
    db.exec(`UPDATE pagamentos_fatura SET estornado = 1 WHERE id = 'f1'`)
    assert.equal(saldo(db, 'A'), 10000)
    assert.equal(
      (db.prepare("SELECT count(*) AS n FROM pagamentos_fatura").get() as {n: number}).n, 1
    )
  } finally { db.close() }
})

test('ajustes com data futura não afetam saldo de hoje', () => {
  const db = bancoTeste()
  try {
    db.exec(`INSERT INTO ajustes_saldo VALUES ('a1', 'A', 50000, '2999-01-01')`)
    assert.equal(saldo(db, 'A'), 10000)
    db.exec(`INSERT INTO ajustes_saldo VALUES ('a2', 'A', -2000, '2000-01-01')`)
    assert.equal(saldo(db, 'A'), 8000)
  } finally { db.close() }
})

test('nenhuma das consultas duplica valores entre pagamentos e transferências', () => {
  const db = bancoTeste()
  try {
    db.exec(`INSERT INTO transacoes VALUES ('t1', 'A', 'receita', 10000, '2000-01-01')`)
    db.exec(`INSERT INTO transferencias VALUES ('f1', 'A', 'B', 5000, '2000-01-01')`)
    db.exec(`INSERT INTO pagamentos_parcelas VALUES ('p1', 'A', 2500, '2000-01-01', 0)`)
    assert.equal(saldo(db, 'A'), 12500)
    assert.equal(saldo(db, 'B'), 5000)
  } finally { db.close() }
})
