import { randomUUID } from 'node:crypto'
import { obterBanco } from './database'
import { podeExcluirConta, validarOperacaoImediata } from './regrasFinanceiras'

export type TipoConta = 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'

export interface Conta {
  id: string
  banco: string
  nome: string
  tipo: TipoConta
  cor: string
  saldoInicialCentavos: number
  saldoAtualCentavos: number
}

export interface NovaConta {
  banco: string
  nome: string
  tipo: TipoConta
  cor: string
  saldoInicialCentavos: number
}

export type AlteracaoConta = Pick<Conta, 'banco' | 'nome' | 'tipo' | 'cor'>

export interface AjusteSaldo {
  id: string
  contaId: string
  diferencaCentavos: number
  saldoAnteriorCentavos: number
  saldoDesejadoCentavos: number
  motivo: string
  data: string
}

export interface NovoAjusteSaldo {
  contaId: string
  saldoDesejadoCentavos: number
  motivo: string
  data: string
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
  // Banco legado: ampliar o CHECK de tipo sem descartar contas existentes.
  const tabela = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='contas'")
    .get() as { sql: string } | undefined
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

  const colunasConta = db.prepare('PRAGMA table_info(contas)').all() as { name: string }[]
  if (!colunasConta.some((c) => c.name === 'cor')) {
    db.exec("ALTER TABLE contas ADD COLUMN cor TEXT NOT NULL DEFAULT '#2563eb'")
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
    CREATE TABLE IF NOT EXISTS ajustes_saldo (
      id TEXT PRIMARY KEY,
      conta_id TEXT NOT NULL REFERENCES contas(id),
      diferenca_centavos INTEGER NOT NULL,
      saldo_anterior_centavos INTEGER NOT NULL,
      saldo_desejado_centavos INTEGER NOT NULL,
      motivo TEXT NOT NULL,
      data TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ajustes_saldo_conta ON ajustes_saldo(conta_id);
  `)
}

export function listarContas(): Conta[] {
  const db = obterBanco()
  const registros = db
    .prepare(
      `
    SELECT c.id, c.banco, c.nome, c.tipo, c.cor,
      c.saldo_inicial_centavos AS saldoInicialCentavos,
      c.saldo_inicial_centavos
      + COALESCE((SELECT SUM(CASE WHEN t.tipo = 'receita' THEN t.valor_centavos ELSE -t.valor_centavos END)
                   FROM transacoes t WHERE t.conta_id = c.id AND t.data <= date('now', 'localtime')), 0)
      + COALESCE((SELECT SUM(valor_centavos) FROM transferencias WHERE destino_id = c.id AND data <= date('now', 'localtime')), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM transferencias WHERE origem_id = c.id AND data <= date('now', 'localtime')), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM pagamentos_fatura pf WHERE pf.conta_id = c.id
                   AND pf.data_pagamento <= date('now', 'localtime')
                   AND pf.estornado = 0), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM pagamentos_parcelas pp WHERE pp.conta_id = c.id
                   AND pp.data_pagamento <= date('now', 'localtime')
                   AND pp.estornado = 0), 0)
      + COALESCE((SELECT SUM(diferenca_centavos) FROM ajustes_saldo WHERE conta_id = c.id AND data <= date('now', 'localtime')), 0)
        AS saldoAtualCentavos
    FROM contas c ORDER BY c.criado_em DESC
  `
    )
    .all()
  return registros as unknown as Conta[]
}

function validarCor(cor: string): string {
  if (typeof cor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(cor))
    throw new Error('Cor hexadecimal inválida.')
  return cor.toLowerCase()
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
    cor: validarCor(dados.cor),
    banco: dados.banco.trim(),
    nome: dados.nome.trim(),
    tipo: dados.tipo,
    saldoInicialCentavos: dados.saldoInicialCentavos,
    saldoAtualCentavos: dados.saldoInicialCentavos
  }
  obterBanco()
    .prepare(
      `
    INSERT INTO contas (id, banco, nome, tipo, cor, saldo_inicial_centavos, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      conta.id,
      conta.banco,
      conta.nome,
      conta.tipo,
      conta.cor,
      conta.saldoInicialCentavos,
      new Date().toISOString()
    )
  return conta
}

export function editarConta(id: string, dados: AlteracaoConta): Conta {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Conta inválida.')
  if (!dados || typeof dados !== 'object') throw new Error('Dados inválidos.')
  if (typeof dados.banco !== 'string' || !dados.banco.trim() || dados.banco.length > 100)
    throw new Error('Informe um banco válido.')
  if (typeof dados.nome !== 'string' || !dados.nome.trim() || dados.nome.length > 100)
    throw new Error('Informe um nome válido.')
  const tipos: TipoConta[] = ['corrente', 'poupanca', 'salario', 'dinheiro', 'outra']
  if (!tipos.includes(dados.tipo)) throw new Error('Tipo de conta inválido.')

  const db = obterBanco()
  const cor = validarCor(dados.cor)
  const resultado = db.prepare('UPDATE contas SET banco = ?, nome = ?, tipo = ?, cor = ? WHERE id = ?')
    .run(dados.banco.trim(), dados.nome.trim(), dados.tipo, cor, id)
  if (resultado.changes !== 1) throw new Error('Conta não encontrada.')
  const conta = listarContas().find((c) => c.id === id)
  if (!conta) throw new Error('Conta não encontrada.')
  return conta
}

function validarDataAjuste(data: string): void {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      Number.isNaN(Date.parse(data)) || new Date(data).toISOString().slice(0, 10) !== data)
    throw new Error('Data inválida.')
}

export function ajustarSaldo(dados: NovoAjusteSaldo): AjusteSaldo {
  if (!dados || typeof dados !== 'object') throw new Error('Ajuste inválido.')
  if (typeof dados.contaId !== 'string' || !dados.contaId)
    throw new Error('Selecione uma conta.')
  if (!Number.isSafeInteger(dados.saldoDesejadoCentavos) || dados.saldoDesejadoCentavos < 0)
    throw new Error('Saldo desejado inválido.')
  if (typeof dados.motivo !== 'string' || dados.motivo.trim().length < 3 ||
      dados.motivo.length > 200) throw new Error('Informe o motivo do ajuste.')
  validarDataAjuste(dados.data)
  validarOperacaoImediata(dados.data)

  const db = obterBanco()
  db.exec('BEGIN IMMEDIATE')
  try {
    const conta = listarContas().find((c) => c.id === dados.contaId)
    if (!conta) throw new Error('Conta não encontrada.')
    const diferenca = dados.saldoDesejadoCentavos - conta.saldoAtualCentavos
    if (!Number.isSafeInteger(diferenca) || diferenca === 0)
      throw new Error('Informe um saldo diferente do saldo atual.')

    const ajuste: AjusteSaldo = {
      id: randomUUID(),
      contaId: conta.id,
      diferencaCentavos: diferenca,
      saldoAnteriorCentavos: conta.saldoAtualCentavos,
      saldoDesejadoCentavos: dados.saldoDesejadoCentavos,
      motivo: dados.motivo.trim(),
      data: dados.data
    }
    db.prepare(`
      INSERT INTO ajustes_saldo (
        id, conta_id, diferenca_centavos, saldo_anterior_centavos,
        saldo_desejado_centavos, motivo, data, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ajuste.id, ajuste.contaId, ajuste.diferencaCentavos,
      ajuste.saldoAnteriorCentavos, ajuste.saldoDesejadoCentavos,
      ajuste.motivo, ajuste.data, new Date().toISOString())
    db.exec('COMMIT')
    return ajuste
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}

export function listarAjustesSaldo(): AjusteSaldo[] {
  return obterBanco().prepare(`
    SELECT id, conta_id AS contaId, diferenca_centavos AS diferencaCentavos,
      saldo_anterior_centavos AS saldoAnteriorCentavos,
      saldo_desejado_centavos AS saldoDesejadoCentavos, motivo, data
    FROM ajustes_saldo
    ORDER BY criado_em DESC, rowid DESC
  `).all() as unknown as AjusteSaldo[]
}

export function excluirConta(id: string): void {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Conta inválida.')
  const db = obterBanco()
  db.exec('BEGIN IMMEDIATE')
  try {
    const existe = db.prepare('SELECT id FROM contas WHERE id = ?').get(id)
    if (!existe) throw new Error('Conta não encontrada.')
    const conta = listarContas().find((c) => c.id === id)
    if (!conta || !podeExcluirConta(conta.saldoAtualCentavos) ||
        conta.saldoInicialCentavos !== 0) {
      throw new Error('Não é possível excluir uma conta com saldo. Zere-a por transferência ou saque registrado.')
    }
    const dependencias = [
      ['transacoes', 'conta_id'],
      ['transferencias', 'origem_id'],
      ['transferencias', 'destino_id'],
      ['pagamentos_fatura', 'conta_id'],
      ['pagamentos_parcelas', 'conta_id'],
      ['estornos_pagamentos', 'conta_id'],
      ['cartoes', 'conta_id'],
      ['ajustes_saldo', 'conta_id'],
      ['salarios_recorrentes', 'conta_id']
    ] as const
    for (const [tabela, coluna] of dependencias) {
      const quantidade = db.prepare(`SELECT COUNT(*) AS n FROM ${tabela} WHERE ${coluna} = ?`).get(id) as {n: number}
      if (quantidade.n > 0) {
        throw new Error('Esta conta possui histórico ou vínculos. Para preservar pagamentos e transações, remova os vínculos antes de excluir.')
      }
    }
    db.prepare('DELETE FROM contas WHERE id = ?').run(id)
    db.exec('COMMIT')
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}

export function listarTransferencias(): Transferencia[] {
  return obterBanco()
    .prepare(
      `
    SELECT id, origem_id AS origemId, destino_id AS destinoId,
      valor_centavos AS valorCentavos, data, descricao
    FROM transferencias ORDER BY data DESC, rowid DESC
  `
    )
    .all() as unknown as Transferencia[]
}

export function transferirEntreContas(dados: NovaTransferencia): Transferencia {
  if (!dados || typeof dados !== 'object') throw new Error('Transferência inválida.')
  if (
    typeof dados.origemId !== 'string' ||
    typeof dados.destinoId !== 'string' ||
    dados.origemId === dados.destinoId
  )
    throw new Error('Escolha duas contas diferentes.')
  if (!Number.isSafeInteger(dados.valorCentavos) || dados.valorCentavos <= 0)
    throw new Error('Valor inválido.')
  if (
    typeof dados.descricao !== 'string' ||
    !dados.descricao.trim() ||
    dados.descricao.length > 200
  )
    throw new Error('Descrição inválida.')
  if (
    typeof dados.data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) ||
    Number.isNaN(Date.parse(dados.data)) ||
    new Date(dados.data).toISOString().slice(0, 10) !== dados.data
  )
    throw new Error('Data inválida.')

  validarOperacaoImediata(dados.data)
  const db = obterBanco()
  db.exec('BEGIN IMMEDIATE')
  try {
    const contas = listarContas()
    const origem = contas.find((c) => c.id === dados.origemId)
    const destino = contas.find((c) => c.id === dados.destinoId)
    if (!origem || !destino) throw new Error('Conta não encontrada.')
    if (origem.saldoAtualCentavos < dados.valorCentavos)
      throw new Error('Saldo insuficiente na conta de origem.')

    const transferencia: Transferencia = {
      id: randomUUID(),
      ...dados,
      descricao: dados.descricao.trim()
    }
    db.prepare(
      `
      INSERT INTO transferencias (id, origem_id, destino_id, valor_centavos, data, descricao)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      transferencia.id,
      transferencia.origemId,
      transferencia.destinoId,
      transferencia.valorCentavos,
      transferencia.data,
      transferencia.descricao
    )
    db.exec('COMMIT')
    return transferencia
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}
