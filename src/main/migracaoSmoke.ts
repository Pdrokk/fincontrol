import { criarTabelasInvestimentos } from './investimentos'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { iniciarBanco, obterBanco, fecharBanco, listarTransacoes } from './database'
import { criarTabelaContas, listarContas } from './contas'
import { criarTabelasCartoes } from './cartoes'
import { criarTabelaSalarios } from './salarios'

/**
 * Simula upgrade de base antiga com tabelas existentes sem colunas novas.
 * Usa um banco descartável e a migração real da aplicação.
 */
export function executarMigracaoLegadaSmoke(): void {
  const pasta = mkdtempSync(join(tmpdir(), 'fincontrol-legado-'))
  const dados = join(pasta, 'dados')
  mkdirSync(dados, { recursive: true })
  const caminho = join(dados, 'fincontrol.db')
  const legado = new DatabaseSync(caminho)
  try {
    legado.exec(`
      CREATE TABLE contas (
        id TEXT PRIMARY KEY, banco TEXT NOT NULL, nome TEXT NOT NULL,
        tipo TEXT NOT NULL, cor TEXT NOT NULL,
        saldo_inicial_centavos INTEGER NOT NULL, criado_em TEXT NOT NULL
      );
      INSERT INTO contas VALUES ('legado-1', 'Inter', 'Minha conta antiga',
        'corrente', '#ff8800', 12000, '2025-01-01');
      CREATE TABLE transacoes (
        id TEXT PRIMARY KEY, descricao TEXT NOT NULL, valor_centavos INTEGER NOT NULL,
        tipo TEXT NOT NULL, categoria TEXT NOT NULL, data TEXT NOT NULL
      );
      INSERT INTO transacoes VALUES ('transacao-antiga', 'Gasto legado', 1000,
        'despesa', 'Alimentação', '2025-01-15');
      CREATE TABLE pagamentos_fatura (
        id TEXT PRIMARY KEY, cartao_id TEXT NOT NULL, competencia TEXT NOT NULL,
        conta_id TEXT NOT NULL, data_pagamento TEXT NOT NULL,
        valor_centavos INTEGER NOT NULL,
        UNIQUE (cartao_id, competencia)
      );
      CREATE TABLE pagamentos_parcelas (
        id TEXT PRIMARY KEY, parcela_id TEXT NOT NULL UNIQUE, conta_id TEXT NOT NULL,
        data_pagamento TEXT NOT NULL, valor_centavos INTEGER NOT NULL
      );
    `)
  } finally {
    legado.close()
  }

  app.setPath('userData', pasta)
  try {
    iniciarBanco()
    criarTabelaContas()
    criarTabelasCartoes()
    criarTabelaSalarios()
    criarTabelasInvestimentos(obterBanco())
    obterBanco().exec('PRAGMA foreign_keys = ON')

    const conta = listarContas().find(c => c.id === 'legado-1')
    assert.ok(conta)
    assert.equal(conta.saldoAtualCentavos, 12000)
    assert.equal(conta.cor, '#ff8800', 'Não apagar a cor do banco antigo')
    const tx = listarTransacoes().find(t => t.id === 'transacao-antiga')
    assert.ok(tx)
    assert.equal(tx.contaId, null)
    assert.equal(tx.valorCentavos, 1000)

    for (const tabela of ['transacoes', 'contas', 'pagamentos_parcelas', 'pagamentos_fatura']) {
      const colunas = obterBanco().prepare(`PRAGMA table_info(${tabela})`)
        .all() as { name: string }[]
      const nomes = new Set(colunas.map(c => c.name))
      if (tabela === 'contas') assert.ok(nomes.has('cor'))
      if (tabela === 'transacoes') assert.ok(nomes.has('conta_id'))
      if (tabela.startsWith('pagamentos')) assert.ok(nomes.has('estornado'))
    }
    // As duas tabelas antigas possuíam UNIQUE em todas as linhas.
    // Os novos índices só podem ser únicos para pagamentos não estornados.
    for (const [tabela, colunas] of [
      ['pagamentos_fatura', 'cartao_id,competencia'],
      ['pagamentos_parcelas', 'parcela_id']
    ]) {
      const indices = obterBanco().prepare(`PRAGMA index_list("${tabela}")`).all() as
        { name: string; origin: string }[]
      assert.ok(!indices.some((idx) => {
        if (idx.origin !== 'u') return false
        const nomes = (obterBanco().prepare(`PRAGMA index_info("${idx.name}")`).all() as
          { name: string }[]).map(c => c.name).join(',')
        return nomes === colunas
      }), 'Migração não removeu a unicidade global de ' + tabela)
      assert.ok(indices.some(idx => idx.origin === 'c' && idx.name.includes('ativa')),
        'Índice ativo ausente em ' + tabela)
    }
    const resultado = obterBanco().prepare('PRAGMA integrity_check').get() as
      | { integrity_check: string } | undefined
    assert.equal(resultado?.integrity_check, 'ok')
    console.info('FINCONTROL_MIGRACAO_OK: SQLite legado preservado e migrado')
  } finally {
    fecharBanco()
    rmSync(pasta, { recursive: true, force: true })
  }
}
