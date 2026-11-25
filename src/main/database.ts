import { ehCategoriaSalario } from './regrasFinanceiras'
import { app } from 'electron'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

let banco: DatabaseSync | null = null

export function caminhoBanco(): string {
  return join(app.getPath('userData'), 'dados', 'fincontrol.db')
}

export function fecharBanco(): void {
  banco?.close()
  banco = null
}

export function iniciarBanco(): void {
  if (banco) return
  const pasta = join(app.getPath('userData'), 'dados')

  mkdirSync(pasta, { recursive: true })

  const caminho = caminhoBanco()

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
  const colunas = banco.prepare('PRAGMA table_info(transacoes)').all() as { name: string }[]
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

  if (typeof dados.categoria !== 'string' || !dados.categoria.trim() || dados.categoria.length > 100) {
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
  // Não registrar manualmente um segundo salário na mesma competência quando
  // a recorrência já gerou aquele recebimento na conta.
  if (dados.tipo === 'receita' && ehCategoriaSalario(dados.categoria)) {
    const duplicado = obterBanco().prepare(`
      SELECT 1 FROM salarios_lancamentos sl
      JOIN transacoes t ON t.id = sl.transacao_id
      WHERE t.conta_id IS ? AND t.valor_centavos = ?
        AND substr(t.data, 1, 7) = ? AND t.categoria = 'Salário'
      LIMIT 1
    `).get(contaId, dados.valorCentavos, dados.data.slice(0, 7))
    if (duplicado) {
      throw new Error('Esse salário já foi registrado pela recorrência neste mês. Confira o histórico antes de adicionar outra receita.')
    }
  }

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
  if (db.prepare('SELECT 1 FROM salarios_lancamentos WHERE transacao_id = ?').get(id)) {
    throw new Error('Este lançamento pertence a um salário recorrente. Desative a programação para interromper os próximos recebimentos.')
  }
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
  if (banco.prepare('SELECT 1 FROM salarios_lancamentos WHERE transacao_id = ?').get(id)) {
    throw new Error('Lançamentos de salário recorrente não podem ser editados individualmente.')
  }
  // A proteção de salário duplicado também precisa valer na edição. Do contrário,
  // uma despesa/receita comum poderia ser convertida em salário já recebido.
  if (dados.tipo === 'receita' && ehCategoriaSalario(dados.categoria)) {
    const duplicado = banco.prepare(`
      SELECT 1 FROM salarios_lancamentos sl
      JOIN transacoes t ON t.id = sl.transacao_id
      WHERE t.id <> ? AND t.conta_id IS ? AND t.valor_centavos = ?
        AND substr(t.data, 1, 7) = ? AND t.categoria = 'Salário'
      LIMIT 1
    `).get(id, contaId, dados.valorCentavos, dados.data.slice(0, 7))
    if (duplicado) {
      throw new Error('Esse salário já foi registrado pela recorrência neste mês.')
    }
  }

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
