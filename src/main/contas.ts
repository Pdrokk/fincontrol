import { randomUUID } from 'node:crypto'
import { obterBanco } from './database'

export type TipoConta = 'corrente' | 'poupanca' | 'dinheiro' | 'outra'

export interface Conta {
  id: string
  banco: string
  nome: string
  tipo: TipoConta
  saldoInicialCentavos: number
}

export interface NovaConta {
  banco: string
  nome: string
  tipo: TipoConta
  saldoInicialCentavos: number
}

export function criarTabelaContas(): void {
  const db = obterBanco()

  db.exec(`
    CREATE TABLE IF NOT EXISTS contas (
      id TEXT PRIMARY KEY,
      banco TEXT NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL
        CHECK (
          tipo IN (
            'corrente',
            'poupanca',
            'dinheiro',
            'outra'
          )
        ),
      saldo_inicial_centavos INTEGER NOT NULL
        CHECK (saldo_inicial_centavos >= 0),
      criado_em TEXT NOT NULL
    );
  `)
}

export function listarContas(): Conta[] {
  const db = obterBanco()

  const registros = db
    .prepare(
      `
    SELECT
      id,
      banco,
      nome,
      tipo,
      saldo_inicial_centavos AS saldoInicialCentavos
    FROM contas
    ORDER BY criado_em DESC
  `
    )
    .all()

  return registros as unknown as Conta[]
}

export function cadastrarConta(dados: NovaConta): Conta {
  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados da conta inválidos.')
  }

  if (typeof dados.banco !== 'string' || !dados.banco.trim() || dados.banco.length > 100) {
    throw new Error('Informe um banco válido.')
  }

  if (typeof dados.nome !== 'string' || !dados.nome.trim() || dados.nome.length > 100) {
    throw new Error('Informe um nome para a conta.')
  }

  const tiposPermitidos: TipoConta[] = ['corrente', 'poupanca', 'dinheiro', 'outra']

  if (!tiposPermitidos.includes(dados.tipo)) {
    throw new Error('Tipo de conta inválido.')
  }

  if (!Number.isSafeInteger(dados.saldoInicialCentavos) || dados.saldoInicialCentavos < 0) {
    throw new Error('Saldo inicial inválido.')
  }

  const conta: Conta = {
    id: randomUUID(),
    banco: dados.banco.trim(),
    nome: dados.nome.trim(),
    tipo: dados.tipo,
    saldoInicialCentavos: dados.saldoInicialCentavos
  }

  const db = obterBanco()

  db.prepare(
    `
    INSERT INTO contas (
      id,
      banco,
      nome,
      tipo,
      saldo_inicial_centavos,
      criado_em
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    conta.id,
    conta.banco,
    conta.nome,
    conta.tipo,
    conta.saldoInicialCentavos,
    new Date().toISOString()
  )

  return conta
}
