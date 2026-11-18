import { randomUUID } from 'node:crypto'
import { obterBanco } from './database'
import { listarContas } from './contas'

export interface Cartao {
  id: string
  contaId: string | null
  nome: string
  banco: string
  limiteCentavos: number
  limiteUtilizadoCentavos: number
  limiteDisponivelCentavos: number
  diaFechamento: number
  diaVencimento: number
}

export type NovoCartao = Omit<Cartao, 'id' | 'limiteUtilizadoCentavos' | 'limiteDisponivelCentavos'>

export interface Compra {
  id: string
  cartaoId: string
  descricao: string
  categoria: string
  data: string
  valorCentavos: number
  numeroParcelas: number
}

export type NovaCompra = Omit<Compra, 'id'>

export interface FaturaPrevista {
  cartaoId: string
  competencia: string
  vencimento: string
  totalCentavos: number
  quantidadeParcelas: number
  paga: boolean
  pagamentoId: string | null
  contaPagamentoId: string | null
  dataPagamento: string | null
}

export interface PagamentoFatura {
  id: string
  cartaoId: string
  competencia: string
  contaId: string
  dataPagamento: string
  valorCentavos: number
}

export type NovoPagamentoFatura = Pick<
  PagamentoFatura,
  'cartaoId' | 'competencia' | 'contaId' | 'dataPagamento'
>

export interface ParcelaRelatorio {
  id: string
  descricao: string
  valorCentavos: number
  tipo: 'despesa'
  categoria: string
  data: string
  contaId: null
  origem: 'cartao'
}

export function criarTabelasCartoes(): void {
  obterBanco().exec(`
    CREATE TABLE IF NOT EXISTS cartoes (
      id TEXT PRIMARY KEY,
      conta_id TEXT REFERENCES contas(id),
      nome TEXT NOT NULL,
      banco TEXT NOT NULL,
      limite_centavos INTEGER NOT NULL CHECK (limite_centavos >= 0),
      dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 28),
      dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 28),
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compras_cartao (
      id TEXT PRIMARY KEY,
      cartao_id TEXT NOT NULL REFERENCES cartoes(id),
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      data TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      numero_parcelas INTEGER NOT NULL CHECK (numero_parcelas BETWEEN 1 AND 120),
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parcelas_cartao (
      id TEXT PRIMARY KEY,
      compra_id TEXT NOT NULL REFERENCES compras_cartao(id),
      cartao_id TEXT NOT NULL REFERENCES cartoes(id),
      numero INTEGER NOT NULL,
      competencia TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      UNIQUE (compra_id, numero)
    );

    CREATE TABLE IF NOT EXISTS pagamentos_fatura (
      id TEXT PRIMARY KEY,
      cartao_id TEXT NOT NULL REFERENCES cartoes(id),
      competencia TEXT NOT NULL,
      conta_id TEXT NOT NULL REFERENCES contas(id),
      data_pagamento TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      UNIQUE (cartao_id, competencia)
    );

    CREATE INDEX IF NOT EXISTS idx_pagamentos_fatura_conta ON pagamentos_fatura(conta_id);

    CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_mes
      ON parcelas_cartao(cartao_id, competencia);
  `)
}

export function listarCartoes(): Cartao[] {
  const registros = obterBanco()
    .prepare(
      `
    SELECT c.id, c.conta_id AS contaId, c.nome, c.banco,
      c.limite_centavos AS limiteCentavos,
      c.dia_fechamento AS diaFechamento,
      c.dia_vencimento AS diaVencimento,
      COALESCE((SELECT SUM(p.valor_centavos) FROM parcelas_cartao p
                WHERE p.cartao_id = c.id), 0)
      - COALESCE((SELECT SUM(pf.valor_centavos) FROM pagamentos_fatura pf
                  WHERE pf.cartao_id = c.id), 0) AS limiteUtilizadoCentavos
    FROM cartoes c ORDER BY c.criado_em DESC
  `
    )
    .all() as unknown as Omit<Cartao, 'limiteDisponivelCentavos'>[]
  return registros.map((c) => ({
    ...c,
    limiteDisponivelCentavos: c.limiteCentavos - c.limiteUtilizadoCentavos
  }))
}

export function cadastrarCartao(dados: NovoCartao): Cartao {
  if (!dados || typeof dados !== 'object') throw new Error('Cartão inválido.')
  if (typeof dados.nome !== 'string' || !dados.nome.trim() || dados.nome.length > 100)
    throw new Error('Nome do cartão inválido.')
  if (typeof dados.banco !== 'string' || !dados.banco.trim() || dados.banco.length > 100)
    throw new Error('Nome do banco inválido.')
  if (!Number.isSafeInteger(dados.limiteCentavos) || dados.limiteCentavos < 0)
    throw new Error('Limite inválido.')
  if (!Number.isInteger(dados.diaFechamento) || dados.diaFechamento < 1 || dados.diaFechamento > 28)
    throw new Error('Dia de fechamento inválido (1 a 28).')
  if (!Number.isInteger(dados.diaVencimento) || dados.diaVencimento < 1 || dados.diaVencimento > 28)
    throw new Error('Dia de vencimento inválido (1 a 28).')
  const contaId = dados.contaId || null
  if (contaId && !obterBanco().prepare('SELECT 1 FROM contas WHERE id = ?').get(contaId))
    throw new Error('Conta vinculada inexistente.')
  const cartao: Cartao = {
    id: randomUUID(),
    contaId,
    nome: dados.nome.trim(),
    banco: dados.banco.trim(),
    limiteCentavos: dados.limiteCentavos,
    limiteUtilizadoCentavos: 0,
    limiteDisponivelCentavos: dados.limiteCentavos,
    diaFechamento: dados.diaFechamento,
    diaVencimento: dados.diaVencimento
  }
  obterBanco()
    .prepare(
      `
    INSERT INTO cartoes
      (id, conta_id, nome, banco, limite_centavos, dia_fechamento, dia_vencimento, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      cartao.id,
      cartao.contaId,
      cartao.nome,
      cartao.banco,
      cartao.limiteCentavos,
      cartao.diaFechamento,
      cartao.diaVencimento,
      new Date().toISOString()
    )
  return cartao
}

function validarData(data: string): void {
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    Number.isNaN(Date.parse(data)) ||
    new Date(data).toISOString().slice(0, 10) !== data
  ) {
    throw new Error('Data inválida.')
  }
}

function somarMeses(ano: number, mes: number, quantidade: number): string {
  const dt = new Date(Date.UTC(ano, mes - 1 + quantidade, 1))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
}

function competenciaInicial(data: string, diaFechamento: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return somarMeses(ano, mes, dia > diaFechamento ? 1 : 0)
}

export function cadastrarCompra(dados: NovaCompra): Compra {
  if (!dados || typeof dados !== 'object') throw new Error('Compra inválida.')
  if (typeof dados.cartaoId !== 'string' || !dados.cartaoId) throw new Error('Selecione um cartão.')
  if (
    typeof dados.descricao !== 'string' ||
    !dados.descricao.trim() ||
    dados.descricao.length > 200
  )
    throw new Error('Descrição inválida.')
  if (
    typeof dados.categoria !== 'string' ||
    !dados.categoria.trim() ||
    dados.categoria.length > 100
  )
    throw new Error('Categoria inválida.')
  validarData(dados.data)
  if (!Number.isSafeInteger(dados.valorCentavos) || dados.valorCentavos <= 0)
    throw new Error('Valor inválido.')
  if (
    !Number.isInteger(dados.numeroParcelas) ||
    dados.numeroParcelas < 1 ||
    dados.numeroParcelas > 120 ||
    dados.numeroParcelas > dados.valorCentavos
  )
    throw new Error('Quantidade de parcelas inválida.')

  const db = obterBanco()
  const cartao = db.prepare('SELECT * FROM cartoes WHERE id = ?').get(dados.cartaoId) as
    { dia_fechamento: number } | undefined
  if (!cartao) throw new Error('Cartão não encontrado.')

  const compra: Compra = {
    id: randomUUID(),
    cartaoId: dados.cartaoId,
    descricao: dados.descricao.trim(),
    categoria: dados.categoria.trim(),
    data: dados.data,
    valorCentavos: dados.valorCentavos,
    numeroParcelas: dados.numeroParcelas
  }
  const [ano, mes] = competenciaInicial(dados.data, cartao.dia_fechamento).split('-').map(Number)
  const base = Math.floor(compra.valorCentavos / compra.numeroParcelas)
  const resto = compra.valorCentavos % compra.numeroParcelas

  db.exec('BEGIN IMMEDIATE')
  try {
    const cartaoAtual = listarCartoes().find((item) => item.id === compra.cartaoId)
    if (!cartaoAtual || compra.valorCentavos > cartaoAtual.limiteDisponivelCentavos) {
      throw new Error('Limite disponível insuficiente para esta compra.')
    }
    // Não alterar o valor de uma fatura já quitada.
    const verificarQuitacao = db.prepare(
      'SELECT id FROM pagamentos_fatura WHERE cartao_id = ? AND competencia = ?'
    )
    for (let i = 0; i < compra.numeroParcelas; i++) {
      const competencia = somarMeses(ano, mes, i)
      if (verificarQuitacao.get(compra.cartaoId, competencia)) {
        throw new Error(
          'Já existe fatura paga neste período. Não é possível incluir novas parcelas.'
        )
      }
    }
    db.prepare(
      `
      INSERT INTO compras_cartao
        (id, cartao_id, descricao, categoria, data, valor_centavos, numero_parcelas, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      compra.id,
      compra.cartaoId,
      compra.descricao,
      compra.categoria,
      compra.data,
      compra.valorCentavos,
      compra.numeroParcelas,
      new Date().toISOString()
    )

    const inserirParcela = db.prepare(`
      INSERT INTO parcelas_cartao (id, compra_id, cartao_id, numero, competencia, valor_centavos)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (let i = 0; i < compra.numeroParcelas; i++) {
      const centavos = base + (i < resto ? 1 : 0)
      inserirParcela.run(
        randomUUID(),
        compra.id,
        compra.cartaoId,
        i + 1,
        somarMeses(ano, mes, i),
        centavos
      )
    }
    db.exec('COMMIT')
    return compra
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}

export function listarCompras(): Compra[] {
  return obterBanco()
    .prepare(
      `
    SELECT id, cartao_id AS cartaoId, descricao, categoria, data,
      valor_centavos AS valorCentavos, numero_parcelas AS numeroParcelas
    FROM compras_cartao ORDER BY data DESC, criado_em DESC
  `
    )
    .all() as unknown as Compra[]
}

function vencimentoFatura(competencia: string, fechamento: number, vencimento: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const mesVencimento = somarMeses(ano, mes, vencimento <= fechamento ? 1 : 0)
  return `${mesVencimento}-${String(vencimento).padStart(2, '0')}`
}

export function listarFaturasPrevistas(): FaturaPrevista[] {
  const cartoes = listarCartoes()
  const parcelas = obterBanco()
    .prepare(
      `
    SELECT p.cartao_id AS cartaoId, p.competencia,
      SUM(p.valor_centavos) AS totalCentavos,
      COUNT(*) AS quantidadeParcelas,
      pf.id AS pagamentoId, pf.conta_id AS contaPagamentoId,
      pf.data_pagamento AS dataPagamento
    FROM parcelas_cartao p
    LEFT JOIN pagamentos_fatura pf
      ON pf.cartao_id = p.cartao_id AND pf.competencia = p.competencia
    GROUP BY p.cartao_id, p.competencia, pf.id, pf.conta_id, pf.data_pagamento
    ORDER BY p.competencia ASC
  `
    )
    .all() as unknown as Omit<FaturaPrevista, 'vencimento' | 'paga'>[]
  return parcelas.map((p) => {
    const cartao = cartoes.find((c) => c.id === p.cartaoId)
    if (!cartao) throw new Error('Cartão de fatura não encontrado.')
    return {
      ...p,
      paga: p.pagamentoId !== null,
      vencimento: vencimentoFatura(p.competencia, cartao.diaFechamento, cartao.diaVencimento)
    }
  })
}

export function listarParcelasParaRelatorios(): ParcelaRelatorio[] {
  const registros = obterBanco()
    .prepare(
      `
    SELECT p.id, (c.descricao || ' (' || p.numero || '/' || c.numero_parcelas || ')') AS descricao,
      p.valor_centavos AS valorCentavos, c.categoria, p.competencia
    FROM parcelas_cartao p
    JOIN compras_cartao c ON c.id = p.compra_id
    ORDER BY p.competencia ASC, p.numero ASC
  `
    )
    .all() as unknown as {
    id: string
    descricao: string
    valorCentavos: number
    categoria: string
    competencia: string
  }[]
  return registros.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    valorCentavos: r.valorCentavos,
    categoria: r.categoria,
    data: r.competencia + '-01',
    tipo: 'despesa',
    contaId: null,
    origem: 'cartao'
  }))
}

export function pagarFatura(dados: NovoPagamentoFatura): PagamentoFatura {
  if (!dados || typeof dados !== 'object') throw new Error('Pagamento inválido.')
  if (
    typeof dados.cartaoId !== 'string' ||
    !dados.cartaoId ||
    typeof dados.contaId !== 'string' ||
    !dados.contaId
  ) {
    throw new Error('Selecione um cartão e uma conta.')
  }
  if (typeof dados.competencia !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.competencia)) {
    throw new Error('Competência inválida.')
  }
  validarData(dados.dataPagamento)

  const db = obterBanco()
  db.exec('BEGIN IMMEDIATE')
  try {
    const cartao = db.prepare('SELECT id FROM cartoes WHERE id = ?').get(dados.cartaoId)
    if (!cartao) throw new Error('Cartão não encontrado.')

    const fatura = db
      .prepare(
        `
      SELECT SUM(valor_centavos) AS total
      FROM parcelas_cartao
      WHERE cartao_id = ? AND competencia = ?
    `
      )
      .get(dados.cartaoId, dados.competencia) as { total: number | null } | undefined
    const total = fatura?.total
    if (!total || !Number.isSafeInteger(total) || total <= 0) {
      throw new Error('Fatura inexistente ou inválida.')
    }

    const anterior = db
      .prepare(
        `
      SELECT id FROM pagamentos_fatura WHERE cartao_id = ? AND competencia = ?
    `
      )
      .get(dados.cartaoId, dados.competencia)
    if (anterior) throw new Error('Fatura já paga.')

    // Contas são recalculadas dentro da transação de gravação.
    const conta = listarContas().find((c) => c.id === dados.contaId)
    if (!conta) throw new Error('Conta bancária não encontrada.')
    if (conta.saldoAtualCentavos < total) throw new Error('Saldo insuficiente na conta.')

    const pagamento: PagamentoFatura = {
      id: randomUUID(),
      cartaoId: dados.cartaoId,
      competencia: dados.competencia,
      contaId: dados.contaId,
      dataPagamento: dados.dataPagamento,
      valorCentavos: total
    }
    db.prepare(
      `
      INSERT INTO pagamentos_fatura
        (id, cartao_id, competencia, conta_id, data_pagamento, valor_centavos)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      pagamento.id,
      pagamento.cartaoId,
      pagamento.competencia,
      pagamento.contaId,
      pagamento.dataPagamento,
      pagamento.valorCentavos
    )
    db.exec('COMMIT')
    return pagamento
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}
