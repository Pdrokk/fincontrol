import { randomUUID } from 'node:crypto'
import { obterBanco } from './database'
import { inicioDeSalarioRetroativo, hojeLocalISO } from './regrasFinanceiras'

export interface SalarioRecorrente {
  id: string
  contaId: string
  descricao: string
  valorCentavos: number
  dia: number
  mesInicio: string
  quantidadeMeses: number
  ativo: number
}
export type NovoSalarioRecorrente = Omit<SalarioRecorrente, 'id' | 'ativo'> & {
  permitirRetroativo?: boolean
}

export function criarTabelaSalarios(): void {
  obterBanco().exec(`
    CREATE TABLE IF NOT EXISTS salarios_recorrentes (
      id TEXT PRIMARY KEY,
      conta_id TEXT NOT NULL REFERENCES contas(id),
      descricao TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK(valor_centavos > 0),
      dia INTEGER NOT NULL CHECK(dia BETWEEN 1 AND 28),
      mes_inicio TEXT NOT NULL,
      quantidade_meses INTEGER NOT NULL CHECK(quantidade_meses BETWEEN 1 AND 120),
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS salarios_lancamentos (
      salario_id TEXT NOT NULL REFERENCES salarios_recorrentes(id),
      competencia TEXT NOT NULL,
      transacao_id TEXT NOT NULL REFERENCES transacoes(id),
      PRIMARY KEY(salario_id, competencia),
      UNIQUE(transacao_id)
    );
  `)
}

export function listarSalarios(): SalarioRecorrente[] {
  return obterBanco().prepare(`
    SELECT id, conta_id AS contaId, descricao, valor_centavos AS valorCentavos,
      dia, mes_inicio AS mesInicio, quantidade_meses AS quantidadeMeses, ativo
    FROM salarios_recorrentes ORDER BY criado_em DESC
  `).all() as unknown as SalarioRecorrente[]
}

function mesAdicionar(inicio: string, offset: number): string {
  const [ano, mes] = inicio.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1 + offset, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function cadastrarSalario(dados: NovoSalarioRecorrente): SalarioRecorrente {
  if (!dados || typeof dados !== 'object') throw new Error('Salário inválido.')
  if (typeof dados.contaId !== 'string' || !obterBanco().prepare('SELECT id FROM contas WHERE id = ?').get(dados.contaId))
    throw new Error('Selecione uma conta existente.')
  if (typeof dados.descricao !== 'string' || dados.descricao.trim().length < 3 || dados.descricao.length > 200)
    throw new Error('Descrição inválida.')
  if (!Number.isSafeInteger(dados.valorCentavos) || dados.valorCentavos <= 0)
    throw new Error('Valor inválido.')
  if (!Number.isInteger(dados.dia) || dados.dia < 1 || dados.dia > 28)
    throw new Error('Escolha um dia entre 1 e 28.')
  if (typeof dados.mesInicio !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.mesInicio))
    throw new Error('Mês inicial inválido.')
  if (!Number.isInteger(dados.quantidadeMeses) || dados.quantidadeMeses < 1 || dados.quantidadeMeses > 120)
    throw new Error('Escolha entre 1 e 120 meses.')
  if (inicioDeSalarioRetroativo(dados.mesInicio, dados.dia) && dados.permitirRetroativo !== true)
    throw new Error('Este salário tem parcelas retroativas. Confirme explicitamente o lançamento de meses anteriores.')
  const salario: SalarioRecorrente = {
    id: randomUUID(), contaId: dados.contaId, descricao: dados.descricao.trim(),
    valorCentavos: dados.valorCentavos, dia: dados.dia, mesInicio: dados.mesInicio,
    quantidadeMeses: dados.quantidadeMeses, ativo: 1
  }
  obterBanco().prepare(`
    INSERT INTO salarios_recorrentes
      (id, conta_id, descricao, valor_centavos, dia, mes_inicio, quantidade_meses, ativo, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(salario.id, salario.contaId, salario.descricao, salario.valorCentavos,
    salario.dia, salario.mesInicio, salario.quantidadeMeses, new Date().toISOString())
  processarSalariosVencidos()
  return salario
}

export function desativarSalario(id: string): void {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Identificador inválido.')
  const db = obterBanco()
  const resultado = db.prepare('UPDATE salarios_recorrentes SET ativo = 0 WHERE id = ?').run(id)
  if (resultado.changes === 0) throw new Error('Salário recorrente não encontrado.')
}

export function processarSalariosVencidos(): void {
  const db = obterBanco()
  const hojeLocal = hojeLocalISO()
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const salario of listarSalarios().filter((s) => s.ativo === 1)) {
      for (let i = 0; i < salario.quantidadeMeses; i++) {
        const competencia = mesAdicionar(salario.mesInicio, i)
        const data = `${competencia}-${String(salario.dia).padStart(2, '0')}`
        if (data > hojeLocal) break
        const existente = db.prepare(`
          SELECT transacao_id FROM salarios_lancamentos
          WHERE salario_id = ? AND competencia = ?
        `).get(salario.id, competencia)
        if (existente) continue
        // Se o salário já foi registrado manualmente, vincula o lançamento
        // em vez de creditar dinheiro pela segunda vez.
        const manual = db.prepare(`
          SELECT t.id FROM transacoes t
          WHERE t.conta_id = ? AND t.tipo = 'receita'
            AND LOWER(t.categoria) = LOWER('Salário')
            AND t.valor_centavos = ?
            AND substr(t.data, 1, 7) = ?
            AND NOT EXISTS (
              SELECT 1 FROM salarios_lancamentos sl WHERE sl.transacao_id = t.id
            )
          ORDER BY ABS(CAST(substr(t.data, 9, 2) AS INTEGER) - ?), t.rowid DESC
          LIMIT 1
        `).get(salario.contaId, salario.valorCentavos, competencia, salario.dia) as
          | { id: string }
          | undefined
        if (manual) {
          db.prepare(`
            INSERT INTO salarios_lancamentos (salario_id, competencia, transacao_id)
            VALUES (?, ?, ?)
          `).run(salario.id, competencia, manual.id)
          continue
        }
        const id = randomUUID()
        db.prepare(`
          INSERT INTO transacoes
            (id, descricao, valor_centavos, tipo, categoria, data, conta_id)
          VALUES (?, ?, ?, 'receita', 'Salário', ?, ?)
        `).run(id, salario.descricao, salario.valorCentavos, data, salario.contaId)
        db.prepare(`
          INSERT INTO salarios_lancamentos (salario_id, competencia, transacao_id)
          VALUES (?, ?, ?)
        `).run(salario.id, competencia, id)
      }
    }
    db.exec('COMMIT')
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}
