import { randomUUID } from 'node:crypto'
import { obterBanco } from './database'

export type TipoConta = 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'

export interface Conta {
  id: string
  banco: string
  nome: string
  tipo: TipoConta
  saldoInicialCentavos: number
  saldoAtualCentavos: number
}

export interface NovaConta {
  banco: string
  nome: string
  tipo: TipoConta
  saldoInicialCentavos: number
}

export interface Transferencia {
  id: string
  origemId: string
  destinoId: string
  valorCentavos: number
  data: string
  descricao: string
}

export type NovaTransferencia = Omit<Transferencia, 'id'>

export function criarTabelaContas(): void {
  const db = obterBanco()
  const colunas = db.prepare("PRAGMA table_info(contas)").all() as { name: string }[]
  // Banco legado: ampliar o CHECK de tipo sem descartar contas existentes.
  const tabela = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='contas'").get() as { sql: string } | undefined
  if (tabela && !tabela.sql.includes("'salario'")) {
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec(`
        CREATE TABLE contas_nova (
          id TEXT PRIMARY KEY,
          banco TEXT NOT NULL,
          nome TEXT NOT NULL,
          tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'salario', 'dinheiro', 'outra')),
          saldo_inicial_centavos INTEGER NOT NULL CHECK (saldo_inicial_centavos >= 0),
          criado_em TEXT NOT NULL
        );
        INSERT INTO contas_nova (id, banco, nome, tipo, saldo_inicial_centavos, criado_em)
        SELECT id, banco, nome, tipo, saldo_inicial_centavos, criado_em FROM contas;
        DROP TABLE contas;
        ALTER TABLE contas_nova RENAME TO contas;
      `)
      db.exec('COMMIT')
    } catch (erro) {
      db.exec('ROLLBACK')
      throw erro
    }
  }
  if (!tabela) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contas (
        id TEXT PRIMARY KEY,
        banco TEXT NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'salario', 'dinheiro', 'outra')),
        saldo_inicial_centavos INTEGER NOT NULL CHECK (saldo_inicial_centavos >= 0),
        criado_em TEXT NOT NULL
      );
    `)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS transferencias (
      id TEXT PRIMARY KEY,
      origem_id TEXT NOT NULL REFERENCES contas(id),
      destino_id TEXT NOT NULL REFERENCES contas(id),
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      data TEXT NOT NULL,
      descricao TEXT NOT NULL,
      CHECK (origem_id <> destino_id)
    );
    CREATE INDEX IF NOT EXISTS idx_transferencias_origem ON transferencias(origem_id);
    CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON transferencias(destino_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_conta ON transacoes(conta_id);
  `)
  void colunas
}

export function listarContas(): Conta[] {
  const db = obterBanco()
  const registros = db.prepare(`
    SELECT c.id, c.banco, c.nome, c.tipo,
      c.saldo_inicial_centavos AS saldoInicialCentavos,
      c.saldo_inicial_centavos
      + COALESCE((SELECT SUM(CASE WHEN t.tipo = 'receita' THEN t.valor_centavos ELSE -t.valor_centavos END)
                   FROM transacoes t WHERE t.conta_id = c.id), 0)
      + COALESCE((SELECT SUM(valor_centavos) FROM transferencias WHERE destino_id = c.id), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM transferencias WHERE origem_id = c.id), 0)
        AS saldoAtualCentavos
    FROM contas c ORDER BY c.criado_em DESC
  `).all()
  return registros as unknown as Conta[]
}

export function cadastrarConta(dados: NovaConta): Conta {
  if (!dados || typeof dados !== 'object') throw new Error('Dados inválidos.')
  if (typeof dados.banco !== 'string' || !dados.banco.trim() || dados.banco.length > 100)
    throw new Error('Informe um banco válido.')
  if (typeof dados.nome !== 'string' || !dados.nome.trim() || dados.nome.length > 100)
    throw new Error('Informe um nome de conta válido.')

  const tipos: TipoConta[] = ['corrente', 'poupanca', 'salario', 'dinheiro', 'outra']
  if (!tipos.includes(dados.tipo)) throw new Error('Tipo de conta inválido.')
  if (!Number.isSafeInteger(dados.saldoInicialCentavos) || dados.saldoInicialCentavos < 0)
    throw new Error('Saldo inicial inválido.')

  const conta: Conta = {
    id: randomUUID(),
    banco: dados.banco.trim(),
    nome: dados.nome.trim(),
    tipo: dados.tipo,
    saldoInicialCentavos: dados.saldoInicialCentavos,
    saldoAtualCentavos: dados.saldoInicialCentavos
  }
  obterBanco().prepare(`
    INSERT INTO contas (id, banco, nome, tipo, saldo_inicial_centavos, criado_em)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(conta.id, conta.banco, conta.nome, conta.tipo, conta.saldoInicialCentavos, new Date().toISOString())
  return conta
}

export function listarTransferencias(): Transferencia[] {
  return obterBanco().prepare(`
    SELECT id, origem_id AS origemId, destino_id AS destinoId,
      valor_centavos AS valorCentavos, data, descricao
    FROM transferencias ORDER BY data DESC, rowid DESC
  `).all() as unknown as Transferencia[]
}

export function transferirEntreContas(dados: NovaTransferencia): Transferencia {
  if (!dados || typeof dados !== 'object') throw new Error('Transferência inválida.')
  if (typeof dados.origemId !== 'string' || typeof dados.destinoId !== 'string' ||
      dados.origemId === dados.destinoId) throw new Error('Escolha duas contas diferentes.')
  if (!Number.isSafeInteger(dados.valorCentavos) || dados.valorCentavos <= 0)
    throw new Error('Valor inválido.')
  if (typeof dados.descricao !== 'string' || !dados.descricao.trim() || dados.descricao.length > 200)
    throw new Error('Descrição inválida.')
  if (typeof dados.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) ||
      Number.isNaN(Date.parse(dados.data)) || new Date(dados.data).toISOString().slice(0, 10) !== dados.data)
    throw new Error('Data inválida.')

  const db = obterBanco()
  db.exec('BEGIN IMMEDIATE')
  try {
    const contas = listarContas()
    const origem = contas.find((c) => c.id === dados.origemId)
    const destino = contas.find((c) => c.id === dados.destinoId)
    if (!origem || !destino) throw new Error('Conta não encontrada.')
    if (origem.saldoAtualCentavos < dados.valorCentavos)
      throw new Error('Saldo insuficiente na conta de origem.')

    const transferencia: Transferencia = { id: randomUUID(), ...dados, descricao: dados.descricao.trim() }
    db.prepare(`
      INSERT INTO transferencias (id, origem_id, destino_id, valor_centavos, data, descricao)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(transferencia.id, transferencia.origemId, transferencia.destinoId,
      transferencia.valorCentavos, transferencia.data, transferencia.descricao)
    db.exec('COMMIT')
    return transferencia
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}
