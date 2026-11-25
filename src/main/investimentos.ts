import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export const TIPOS_ATIVO = ['Ação', 'ETF', 'FII', 'Moeda', 'Cripto', 'Renda fixa', 'Outro'] as const
export interface NovoAtivo { codigo: string; nome: string; tipo: string; instituicao: string; valorInformadoCentavos?: number | null; quantidadeMercado?: number | null }
export interface Operacao { ativoId: string; contaId: string; tipo: 'compra' | 'venda' | 'provento'; quantidade: number; valorCentavos: number; taxasCentavos: number; data: string }
export interface Posicao extends NovoAtivo { valorInformadoCentavos: number | null; quantidadeMercado: number | null; precoMercado: number | null; cotacaoEm: string | null; consultaEm: string | null; fonteCotacao: string | null; id: string; quantidade: number; custoCentavos: number; cotacaoCentavos: number | null; valorAtualCentavos: number | null; realizadoCentavos: number; proventosCentavos: number }
export interface Movimento extends Operacao { id: string; caixaCentavos: number; custoBaixadoCentavos: number }

export function criarTabelasInvestimentos(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ativos_investimento (
      id TEXT PRIMARY KEY, codigo TEXT NOT NULL, nome TEXT NOT NULL,
      tipo TEXT NOT NULL, instituicao TEXT NOT NULL, cotacao_centavos INTEGER,
      UNIQUE(codigo, instituicao)
    );
    CREATE TABLE IF NOT EXISTS movimentos_investimento (
      id TEXT PRIMARY KEY, ativo_id TEXT NOT NULL REFERENCES ativos_investimento(id) ON DELETE RESTRICT,
      conta_id TEXT NOT NULL REFERENCES contas(id) ON DELETE RESTRICT,
      tipo TEXT NOT NULL CHECK(tipo IN ('compra','venda','provento')),
      quantidade INTEGER NOT NULL CHECK(quantidade >= 0),
      valor_centavos INTEGER NOT NULL CHECK(valor_centavos > 0),
      taxas_centavos INTEGER NOT NULL CHECK(taxas_centavos >= 0),
      caixa_centavos INTEGER NOT NULL, custo_baixado_centavos INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invest_ativo ON movimentos_investimento(ativo_id, data);
    CREATE INDEX IF NOT EXISTS idx_invest_conta ON movimentos_investimento(conta_id, data);
  `)
  const colunas = db.prepare('PRAGMA table_info(ativos_investimento)').all() as { name: string }[]
  if (!colunas.some(c => c.name === 'valor_informado_centavos')) db.exec('ALTER TABLE ativos_investimento ADD COLUMN valor_informado_centavos INTEGER')
  for (const [nome, tipo] of [['quantidade_mercado','INTEGER'],['preco_mercado','REAL'],['cotacao_em','TEXT'],['consulta_em','TEXT'],['fonte_cotacao','TEXT']]) {
    if (!colunas.some(c => c.name === nome)) db.exec('ALTER TABLE ativos_investimento ADD COLUMN '+nome+' '+tipo)
  }
}

function inteiro(n: number, minimo = 0): boolean {
  return Number.isSafeInteger(n) && n >= minimo && n <= 1_000_000_000_000
}
function texto(s: string, max: number, obrigatorio = true): boolean {
  return typeof s === 'string' && s.length <= max && (!obrigatorio || !!s.trim())
}
export function cadastrarAtivo(db: DatabaseSync, dados: NovoAtivo): string {
  if (!dados || !texto(dados.codigo, 30) || !texto(dados.nome, 100) ||
      !texto(dados.instituicao, 100, false) || !TIPOS_ATIVO.some(t => t === dados.tipo))
    throw new Error('Dados do ativo inválidos.')
  const valor = dados.valorInformadoCentavos ?? null
  if (valor !== null && !inteiro(valor)) throw new Error('Valor patrimonial inválido.')
  const quantidade = dados.quantidadeMercado ?? null
  const unidades = quantidade === null ? null : validarQuantidadeMercado(quantidade)
  if (unidades !== null && (valor !== null || !ativoComCotacao(dados.codigo, dados.tipo))) throw new Error('Escolha um ativo da B3 ou USD/EUR para acompanhamento por quantidade.')
  const id = randomUUID()
  db.prepare('INSERT INTO ativos_investimento (id,codigo,nome,tipo,instituicao,valor_informado_centavos,quantidade_mercado) VALUES (?,?,?,?,?,?,?)')
    .run(id, dados.codigo.trim().toUpperCase(), dados.nome.trim(), dados.tipo, dados.instituicao.trim(), valor, unidades)
  return id
}
export function listarPosicoes(db: DatabaseSync): Posicao[] {
  const linhas = db.prepare(`
    SELECT a.id,a.codigo,a.nome,a.tipo,a.instituicao,a.cotacao_centavos AS cotacaoCentavos,a.valor_informado_centavos AS valorInformadoCentavos,a.quantidade_mercado / 100000000.0 AS quantidadeMercado,
      a.preco_mercado AS precoMercado,a.cotacao_em AS cotacaoEm,a.consulta_em AS consultaEm,a.fonte_cotacao AS fonteCotacao,
      COALESCE(SUM(CASE m.tipo WHEN 'compra' THEN m.quantidade WHEN 'venda' THEN -m.quantidade ELSE 0 END),0) AS unidades,
      COALESCE(SUM(CASE m.tipo WHEN 'compra' THEN -m.caixa_centavos WHEN 'venda' THEN -m.custo_baixado_centavos ELSE 0 END),0) AS custoCentavos,
      COALESCE(SUM(CASE WHEN m.tipo='venda' THEN m.caixa_centavos-m.custo_baixado_centavos ELSE 0 END),0) AS realizadoCentavos,
      COALESCE(SUM(CASE WHEN m.tipo='provento' THEN m.caixa_centavos ELSE 0 END),0) AS proventosCentavos
    FROM ativos_investimento a LEFT JOIN movimentos_investimento m ON m.ativo_id=a.id
    GROUP BY a.id ORDER BY a.codigo
  `).all() as unknown as (Omit<Posicao,'quantidade'|'valorAtualCentavos'> & { unidades: number })[]
  return linhas.map(({ unidades, ...a }) => ({
    ...a, quantidade: a.quantidadeMercado ?? unidades / 1e8,
    valorAtualCentavos: a.quantidadeMercado !== null ? valorMercado(a.quantidadeMercado,a.precoMercado) : a.valorInformadoCentavos ?? (unidades === 0 ? 0 : a.cotacaoCentavos === null ? null : Math.round(unidades / 1e8 * a.cotacaoCentavos))
  }))
}
export function listarMovimentos(db: DatabaseSync): Movimento[] {
  return db.prepare(`SELECT id,ativo_id AS ativoId,conta_id AS contaId,tipo,quantidade/100000000.0 AS quantidade,
    valor_centavos AS valorCentavos,taxas_centavos AS taxasCentavos,data,caixa_centavos AS caixaCentavos,
    custo_baixado_centavos AS custoBaixadoCentavos FROM movimentos_investimento ORDER BY data DESC,rowid DESC`)
    .all() as unknown as Movimento[]
}
export function atualizarValorAtivo(db: DatabaseSync, id: string, centavos: number): void {
  if (!inteiro(centavos)) throw new Error('Valor patrimonial inválido.')
  if (!db.prepare('UPDATE ativos_investimento SET valor_informado_centavos=? WHERE id=? AND valor_informado_centavos IS NOT NULL').run(centavos,id).changes) throw new Error('Ativo de acompanhamento não encontrado.')
}
export function atualizarCotacao(db: DatabaseSync, id: string, centavos: number): void {
  if (!inteiro(centavos, 1)) throw new Error('Cotação inválida.')
  if (!db.prepare('UPDATE ativos_investimento SET cotacao_centavos=? WHERE id=?').run(centavos,id).changes)
    throw new Error('Ativo não encontrado.')
}
export function registrarOperacao(db: DatabaseSync, dados: Operacao, saldo: (id: string) => number | undefined, hoje: string): void {
  if (!dados || !['compra','venda','provento'].includes(dados.tipo) ||
      !inteiro(dados.valorCentavos,1) || !inteiro(dados.taxasCentavos) ||
      !Number.isFinite(dados.quantidade) || dados.quantidade < 0 ||
      typeof dados.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) ||
      !Number.isFinite(Date.parse(dados.data)) || new Date(dados.data).toISOString().slice(0,10) !== dados.data ||
      dados.data > hoje) throw new Error('Operação inválida. Confira valores e data.')
  const unidades = Math.round(dados.quantidade * 1e8)
  if (!inteiro(unidades, dados.tipo === 'provento' ? 0 : 1) ||
      Math.abs(unidades / 1e8 - dados.quantidade) > 1e-12 ||
      (dados.tipo === 'provento' && unidades !== 0)) throw new Error('Quantidade inválida (até oito casas decimais).')
  const caixa = dados.tipo === 'compra' ? -dados.valorCentavos-dados.taxasCentavos : dados.valorCentavos-dados.taxasCentavos
  if (!inteiro(Math.abs(caixa),1) || (dados.tipo !== 'compra' && caixa <= 0)) throw new Error('Valor líquido inválido.')
  db.exec('BEGIN IMMEDIATE')
  try {
    const ativo = listarPosicoes(db).find(a => a.id === dados.ativoId)
    const disponivel = saldo(dados.contaId)
    if (!ativo || disponivel === undefined) throw new Error('Ativo ou conta não encontrado.')
    if (ativo.valorInformadoCentavos !== null || ativo.quantidadeMercado !== null) throw new Error('Este ativo é apenas de acompanhamento e não movimenta contas.')
    const ultima = db.prepare('SELECT MAX(data) AS data FROM movimentos_investimento WHERE ativo_id=?').get(dados.ativoId) as { data: string | null }
    if (ultima.data && dados.data < ultima.data) throw new Error('Registre operações de cada ativo em ordem cronológica.')
    if (caixa < 0 && disponivel < -caixa) throw new Error('Saldo insuficiente.')
    const atual = Math.round(ativo.quantidade * 1e8)
    if (dados.tipo === 'compra' && (!inteiro(atual + unidades) || !inteiro(ativo.custoCentavos - caixa)))
      throw new Error('Posição excede o limite suportado.')
    if (dados.tipo === 'venda' && unidades > atual) throw new Error('Quantidade superior à posição disponível.')
    const custoBaixado = dados.tipo === 'venda' ? (unidades === atual ? ativo.custoCentavos : Number((BigInt(ativo.custoCentavos)*BigInt(unidades)+BigInt(Math.floor(atual/2)))/BigInt(atual))) : 0
    db.prepare(`INSERT INTO movimentos_investimento
      (id,ativo_id,conta_id,tipo,quantidade,valor_centavos,taxas_centavos,caixa_centavos,custo_baixado_centavos,data)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(),dados.ativoId,dados.contaId,dados.tipo,unidades,dados.valorCentavos,dados.taxasCentavos,caixa,custoBaixado,dados.data)
    db.exec('COMMIT')
  } catch (erro) { db.exec('ROLLBACK'); throw erro }
}

export function ativoComCotacao(codigo: string, tipo: string): boolean {
  const c = codigo.trim().toUpperCase()
  return (['Ação','ETF','FII'].includes(tipo) && /^[A-Z]{4}[0-9]{1,2}$/.test(c)) || (tipo === 'Moeda' && ['USD','EUR'].includes(c))
}
function validarQuantidadeMercado(q: number): number {
  const unidades = Math.round(q * 1e8)
  if (!Number.isFinite(q) || !inteiro(unidades,1) || Math.abs(unidades / 1e8 - q) > 1e-12) throw new Error('Quantidade inválida (até 10.000 unidades e 8 casas decimais).')
  return unidades
}
export function valorMercado(q: number, preco: number | null): number | null {
  if (preco === null) return null
  const valor = Math.round(q * preco * 100)
  return Number.isSafeInteger(valor) && valor >= 0 ? valor : null
}
export interface Cotacao { preco: number; data: string; fonte: 'BRAPI' | 'BCB PTAX' }
export function salvarCotacaoMercado(db: DatabaseSync, id: string, cotacao: Cotacao, consultadaEm = new Date().toISOString()): void {
  if (!Number.isFinite(cotacao.preco) || cotacao.preco <= 0 || cotacao.preco > 1e9 || !Number.isFinite(Date.parse(cotacao.data))) throw new Error('Cotação inválida.')
  db.prepare('UPDATE ativos_investimento SET preco_mercado=?,cotacao_em=?,consulta_em=?,fonte_cotacao=? WHERE id=? AND quantidade_mercado IS NOT NULL')
    .run(cotacao.preco,cotacao.data,consultadaEm,cotacao.fonte,id)
}
export function atualizarQuantidadeMercado(db: DatabaseSync, id: string, quantidade: number): void {
  const unidades = validarQuantidadeMercado(quantidade)
  if (!db.prepare('UPDATE ativos_investimento SET quantidade_mercado=? WHERE id=? AND quantidade_mercado IS NOT NULL').run(unidades,id).changes)
    throw new Error('Posição de mercado não encontrada.')
}
