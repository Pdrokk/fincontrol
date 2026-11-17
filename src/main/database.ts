import { app } from 'electron'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

let banco: DatabaseSync | null = null

export function iniciarBanco(): void {
  const pasta = join(app.getPath('userData'), 'dados')

  mkdirSync(pasta, { recursive: true })

  const caminho = join(pasta, 'fincontrol.db')

  banco = new DatabaseSync(caminho)

  banco.exec(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
      categoria TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `)

  // Migração não destrutiva: lançamentos anteriores permanecem sem conta vinculada.
  const colunas = banco.prepare("PRAGMA table_info(transacoes)").all() as { name: string }[]
  if (!colunas.some((coluna) => coluna.name === 'conta_id')) {
    banco.exec('ALTER TABLE transacoes ADD COLUMN conta_id TEXT')
  }

  console.log('SQLite iniciado em:', caminho)
}

export function obterBanco(): DatabaseSync {
  if (!banco) {
    throw new Error('Banco de dados não inicializado.')
  }

  return banco
}

export interface Transacao {
  id: string
  descricao: string
  valorCentavos: number
  tipo: 'receita' | 'despesa'
  categoria: string
  data: string
  contaId: string | null
}

export type NovaTransacao = Omit<Transacao, 'id'>

export function listarTransacoes(): Transacao[] {
  const db = obterBanco()

  const registros = db
    .prepare(
      `
    SELECT
      id,
      descricao,
      valor_centavos AS valorCentavos,
      tipo,
      categoria,
      data,
      conta_id AS contaId
    FROM transacoes
    ORDER BY data DESC, rowid DESC
  `
    )
    .all()

  return registros as unknown as Transacao[]
}

function validarContaId(contaId: string | null | undefined): string | null {
  if (contaId == null || contaId === '') return null
  if (typeof contaId !== 'string') throw new Error('Conta inválida.')
  const existe = obterBanco().prepare('SELECT id FROM contas WHERE id = ?').get(contaId)
  if (!existe) throw new Error('Conta bancária não encontrada.')
  return contaId
}

export function salvarTransacao(dados: NovaTransacao): Transacao {
  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados inválidos.')
  }

  if (
    typeof dados.descricao !== 'string' ||
    !dados.descricao.trim() ||
    dados.descricao.length > 200
  ) {
    throw new Error('Descrição inválida.')
  }

  if (!Number.isSafeInteger(dados.valorCentavos) || dados.valorCentavos <= 0) {
    throw new Error('Valor inválido.')
  }

  if (dados.tipo !== 'receita' && dados.tipo !== 'despesa') {
    throw new Error('Tipo inválido.')
  }

  if (typeof dados.categoria !== 'string' || !dados.categoria.trim()) {
    throw new Error('Categoria inválida.')
  }

  if (
    typeof dados.data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) ||
    Number.isNaN(Date.parse(dados.data)) ||
    new Date(dados.data).toISOString().slice(0, 10) !== dados.data
  ) {
    throw new Error('Data inválida.')
  }

  const contaId = validarContaId(dados.contaId)

  const transacao: Transacao = {
    id: randomUUID(),
    descricao: dados.descricao.trim(),
    valorCentavos: dados.valorCentavos,
    tipo: dados.tipo,
    categoria: dados.categoria.trim(),
    data: dados.data,
    contaId
  }

  const db = obterBanco()

  db.prepare(
    `
    INSERT INTO transacoes (
      id,
      descricao,
      valor_centavos,
      tipo,
      categoria,
      data,
      conta_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    transacao.id,
    transacao.descricao,
    transacao.valorCentavos,
    transacao.tipo,
    transacao.categoria,
    transacao.data,
    transacao.contaId
  )

  return transacao
}

export function removerTransacao(id: string): void {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Identificador inválido.')
  }

  const db = obterBanco()

  db.prepare('DELETE FROM transacoes WHERE id = ?').run(id)
}

export function editarTransacao(id: string, dados: NovaTransacao): Transacao {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Identificador inválido.')
  }

  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados inválidos.')
  }

  if (
    typeof dados.descricao !== 'string' ||
    !dados.descricao.trim() ||
    dados.descricao.length > 200
  ) {
    throw new Error('Descrição inválida.')
  }

  if (!Number.isSafeInteger(dados.valorCentavos) || dados.valorCentavos <= 0) {
    throw new Error('Valor inválido.')
  }

  if (dados.tipo !== 'receita' && dados.tipo !== 'despesa') {
    throw new Error('Tipo inválido.')
  }

  if (
    typeof dados.categoria !== 'string' ||
    !dados.categoria.trim() ||
    dados.categoria.length > 100
  ) {
    throw new Error('Categoria inválida.')
  }

  if (
    typeof dados.data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) ||
    Number.isNaN(Date.parse(dados.data)) ||
    new Date(dados.data).toISOString().slice(0, 10) !== dados.data
  ) {
    throw new Error('Data inválida.')
  }

  const contaId = validarContaId(dados.contaId)
  const banco = obterBanco()

  const resultado = banco
    .prepare(
      `
    UPDATE transacoes
    SET
      descricao = ?,
      valor_centavos = ?,
      tipo = ?,
      categoria = ?,
      data = ?,
      conta_id = ?
    WHERE id = ?
  `
    )
    .run(
      dados.descricao.trim(),
      dados.valorCentavos,
      dados.tipo,
      dados.categoria.trim(),
      dados.data,
      contaId,
      id
    )

  if (resultado.changes === 0) {
    throw new Error('Transação não encontrada.')
  }

  return {
    id,
    descricao: dados.descricao.trim(),
    valorCentavos: dados.valorCentavos,
    tipo: dados.tipo,
    categoria: dados.categoria.trim(),
    data: dados.data,
    contaId
  }
}
