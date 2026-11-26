import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import {
  criarTabelasInvestimentos,
  cadastrarAtivo,
  listarPosicoes,
  listarMovimentos,
  atualizarCotacao,
  atualizarValorAtivo,
  registrarOperacao,
  salvarCotacaoMercado,
  atualizarQuantidadeMercado,
  excluirAtivo,
  reativarAtivo,
  valorMercado,
  registrarObservacaoCarteira,
  listarEvolucaoPatrimonio,
  listarHistoricoCotacoes,
  type Operacao
} from '../src/main/investimentos.ts'

function ambiente(): {
  db: DatabaseSync
  id: string
  saldo: () => number
  operar: (dados: Partial<Operacao>) => void
} {
  const db = new DatabaseSync(':memory:')
  db.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE contas(id TEXT PRIMARY KEY); INSERT INTO contas VALUES ('a')"
  )
  criarTabelasInvestimentos(db)
  const id = cadastrarAtivo(db, {
    codigo: 'BOVA11',
    nome: 'ETF',
    tipo: 'ETF',
    instituicao: 'Corretora'
  })
  const saldo = (): number =>
    100000 +
    (
      db
        .prepare('SELECT COALESCE(SUM(caixa_centavos),0) AS total FROM movimentos_investimento')
        .get() as { total: number }
    ).total
  const operar = (dados: Partial<Operacao>): void =>
    registrarOperacao(
      db,
      {
        ativoId: id,
        contaId: 'a',
        tipo: 'compra',
        quantidade: 2,
        valorCentavos: 1000,
        taxasCentavos: 0,
        data: '2026-01-01',
        ...dados
      },
      (conta) => (conta === 'a' ? saldo() : undefined),
      '2026-11-25'
    )
  return { db, id, saldo, operar }
}
test('compras fracionadas, preço médio, venda parcial e encerramento com taxas', () => {
  const { db, id, saldo, operar } = ambiente()
  try {
    operar({ quantidade: 1.5, valorCentavos: 1500, taxasCentavos: 15 })
    operar({ quantidade: 0.5, valorCentavos: 1000, taxasCentavos: 5 })
    assert.equal(saldo(), 97480)
    assert.equal(listarPosicoes(db)[0].custoCentavos, 2520)
    atualizarCotacao(db, id, 1500)
    assert.equal(listarPosicoes(db)[0].valorAtualCentavos, 3000)
    operar({ tipo: 'venda', quantidade: 0.5, valorCentavos: 750, taxasCentavos: 10 })
    assert.equal(listarPosicoes(db)[0].custoCentavos, 1890)
    assert.equal(listarPosicoes(db)[0].realizadoCentavos, 110)
    operar({ tipo: 'venda', quantidade: 1.5, valorCentavos: 2000 })
    assert.equal(listarPosicoes(db)[0].quantidade, 0)
    assert.equal(listarPosicoes(db)[0].custoCentavos, 0)
    assert.equal(saldo(), 100220)
  } finally {
    db.close()
  }
})
test('falhas não alteram saldo nem histórico', () => {
  const { db, id, saldo, operar } = ambiente()
  try {
    for (const dados of [
      { valorCentavos: 100001 },
      { tipo: 'venda' as const },
      { quantidade: 0 },
      { quantidade: 0.000000001 },
      { valorCentavos: NaN },
      { data: '2026-02-30' },
      { data: '2999-01-01' },
      { contaId: 'x' },
      { ativoId: 'x' },
      { taxasCentavos: -1 }
    ])
      assert.throws(() => operar(dados))
    assert.equal(saldo(), 100000)
    assert.equal(listarMovimentos(db).length, 0)
    assert.throws(() => atualizarCotacao(db, id, 0))
    assert.throws(() =>
      cadastrarAtivo(db, {
        codigo: 'bova11',
        nome: 'Duplicado',
        tipo: 'ETF',
        instituicao: 'Corretora'
      })
    )
  } finally {
    db.close()
  }
})
test('proventos, ordem cronológica, cotação ausente, migração idempotente e proteção de vínculos', () => {
  const { db, saldo, operar } = ambiente()
  try {
    operar({ data: '2026-05-01' })
    assert.equal(listarPosicoes(db)[0].valorAtualCentavos, null)
    assert.throws(() => operar({ data: '2026-04-01' }))
    operar({
      tipo: 'provento',
      quantidade: 0,
      valorCentavos: 150,
      taxasCentavos: 10,
      data: '2026-05-02'
    })
    assert.equal(saldo(), 99140)
    assert.equal(listarPosicoes(db)[0].proventosCentavos, 140)
    criarTabelasInvestimentos(db)
    assert.equal(listarMovimentos(db).length, 2)
    assert.throws(() => db.exec("DELETE FROM contas WHERE id='a'"))
    assert.equal(db.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok')
  } finally {
    db.close()
  }
})

test('carteira de acompanhamento: cadastro, atualização e nenhuma movimentação bancária', () => {
  const { db, saldo, operar } = ambiente()
  try {
    const id = cadastrarAtivo(db, {
      codigo: 'USD',
      nome: 'Dólar',
      tipo: 'Moeda',
      instituicao: '',
      valorInformadoCentavos: 250000
    })
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 250000)
    atualizarValorAtivo(db, id, 300000)
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 300000)
    assert.throws(() => operar({ ativoId: id }))
    assert.throws(() => atualizarValorAtivo(db, id, -1))
    assert.equal(saldo(), 100000)
    assert.equal(listarMovimentos(db).length, 0)
    criarTabelasInvestimentos(db)
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 300000)
  } finally {
    db.close()
  }
})

test('posição acompanhada por quantidade, cache de cotação e edição não alteram caixa', () => {
  const { db, saldo } = ambiente()
  try {
    const id = cadastrarAtivo(db, {
      codigo: 'PETR4',
      nome: 'Petrobras',
      tipo: 'Ação',
      instituicao: '',
      quantidadeMercado: 10.5
    })
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, null)
    salvarCotacaoMercado(db, id, { preco: 31.25, data: '2026-11-24T18:00:00Z', fonte: 'BRAPI' })
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 32813)
    atualizarQuantidadeMercado(db, id, 12)
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 37500)
    assert.throws(() => atualizarQuantidadeMercado(db, id, -1))
    assert.equal(saldo(), 100000)
    assert.equal(listarMovimentos(db).length, 0)
    criarTabelasInvestimentos(db)
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.fonteCotacao, 'BRAPI')
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 37500)
    assert.throws(() =>
      cadastrarAtivo(db, {
        codigo: '^BVSP',
        nome: 'Índice',
        tipo: 'ETF',
        instituicao: '',
        quantidadeMercado: 10
      })
    )
    assert.throws(() =>
      cadastrarAtivo(db, {
        codigo: 'USD',
        nome: 'Dólar',
        tipo: 'Moeda',
        instituicao: '',
        quantidadeMercado: 10,
        valorInformadoCentavos: 100
      })
    )
  } finally {
    db.close()
  }
})

test('cotação antiga, inválida ou de fonte incorreta não sobrescreve cache', () => {
  const { db, saldo } = ambiente()
  try {
    const id = cadastrarAtivo(db, {
      codigo: 'PETR4',
      nome: 'PETR4',
      tipo: 'Ação',
      instituicao: '',
      quantidadeMercado: 10
    })
    const data = '2026-11-25T12:00:00Z',
      consulta = '2026-11-25T12:05:00Z'
    assert.equal(
      salvarCotacaoMercado(db, id, { preco: 32.15, data, fonte: 'BRAPI' }, consulta),
      true
    )
    assert.equal(
      salvarCotacaoMercado(
        db,
        id,
        { preco: 1, data: '2026-11-24T12:00:00Z', fonte: 'BRAPI' },
        consulta
      ),
      false
    )
    for (const preco of [NaN, Infinity, -1, 0])
      assert.throws(() => salvarCotacaoMercado(db, id, { preco, data, fonte: 'BRAPI' }, consulta))
    assert.throws(() =>
      salvarCotacaoMercado(
        db,
        id,
        { preco: 1, data: '2026-12-01T12:00:00Z', fonte: 'BRAPI' },
        consulta
      )
    )
    assert.throws(() =>
      salvarCotacaoMercado(db, id, { preco: 1, data, fonte: 'BCB PTAX' }, consulta)
    )
    assert.equal(listarPosicoes(db).find((a) => a.id === id)?.valorAtualCentavos, 32150)
    assert.equal(valorMercado(10, NaN), null)
    assert.equal(saldo(), 100000)
  } finally {
    db.close()
  }
})
test('exclusão de posição sem histórico preserva saldos e bloqueia perda de operações', () => {
  const { db, id, saldo, operar } = ambiente()
  try {
    operar({})
    const caixa = saldo()
    assert.throws(() => excluirAtivo(db, id), /Zere/)
    const novo = cadastrarAtivo(db, {
      codigo: 'USD',
      nome: 'Dólar',
      tipo: 'Moeda',
      instituicao: '',
      quantidadeMercado: 0
    })
    excluirAtivo(db, novo)
    assert.equal(
      salvarCotacaoMercado(
        db,
        novo,
        { preco: 5, data: '2026-11-25T12:00:00Z', fonte: 'BCB PTAX' },
        '2026-11-25T12:05:00Z'
      ),
      false
    )
    assert.throws(() => excluirAtivo(db, novo))
    assert.equal(saldo(), caixa)
    assert.equal(listarMovimentos(db).length, 1)
  } finally {
    db.close()
  }
})

test('PETR4 e USD já cadastrados: venda parcial, compra, venda total e arquivamento', () => {
  const { db, saldo, operar } = ambiente()
  try {
    const petr = cadastrarAtivo(db, {
      codigo: 'PETR4',
      nome: 'Petrobras',
      tipo: 'Ação',
      instituicao: '',
      quantidadeMercado: 10
    })
    const usd = cadastrarAtivo(db, {
      codigo: 'USD',
      nome: 'Dólar',
      tipo: 'Moeda',
      instituicao: '',
      quantidadeMercado: 20
    })
    salvarCotacaoMercado(
      db,
      petr,
      { preco: 40, data: '2026-11-24T18:00:00Z', fonte: 'BRAPI' },
      '2026-11-25T12:00:00Z'
    )
    salvarCotacaoMercado(
      db,
      usd,
      { preco: 5.8, data: '2026-11-24T18:00:00Z', fonte: 'BCB PTAX' },
      '2026-11-25T12:00:00Z'
    )
    assert.equal(saldo(), 100000)
    assert.throws(() => excluirAtivo(db, petr), /Zere/)
    operar({
      ativoId: petr,
      tipo: 'venda',
      quantidade: 4,
      valorCentavos: 16000,
      taxasCentavos: 100
    })
    let p = listarPosicoes(db).find((a) => a.id === petr)!
    assert.equal(p.quantidade, 6)
    assert.equal(p.valorAtualCentavos, 24000)
    assert.equal(p.realizadoCentavos, null)
    assert.equal(saldo(), 115900)
    assert.throws(() => operar({ ativoId: petr, tipo: 'venda', quantidade: 7 }))
    assert.throws(() => atualizarQuantidadeMercado(db, petr, 50))
    operar({ ativoId: petr, tipo: 'compra', quantidade: 2, valorCentavos: 8000 })
    operar({ ativoId: usd, tipo: 'venda', quantidade: 20, valorCentavos: 11600 })
    assert.equal(saldo(), 119500)
    assert.equal(listarPosicoes(db).find((a) => a.id === usd)?.quantidade, 0)
    excluirAtivo(db, usd)
    assert.equal(listarPosicoes(db).find((a) => a.id === usd)?.arquivado, true)
    assert.equal(listarMovimentos(db).length, 3)
    assert.throws(() => operar({ ativoId: usd, tipo: 'compra' }), /Reative/)
    reativarAtivo(db, usd)
    operar({ ativoId: usd, tipo: 'compra', quantidade: 1, valorCentavos: 580 })
    assert.equal(listarPosicoes(db).find((a) => a.id === usd)?.quantidade, 1)
    assert.equal(listarPosicoes(db).find((a) => a.id === petr)?.quantidade, 8)
    assert.equal(saldo(), 118920)
    criarTabelasInvestimentos(db)
    p = listarPosicoes(db).find((a) => a.id === petr)!
    assert.equal(p.quantidade, 8)
  } finally {
    db.close()
  }
})
test('posição manual inicial, conversão de valor legado e venda sem perda de histórico', () => {
  const { db, saldo, operar } = ambiente()
  try {
    const legado = cadastrarAtivo(db, {
      codigo: 'LEGADO',
      nome: 'Legado',
      tipo: 'Outro',
      instituicao: '',
      valorInformadoCentavos: 6000
    })
    assert.throws(() => operar({ ativoId: legado }), /Defina a quantidade/)
    atualizarQuantidadeMercado(db, legado, 20)
    assert.equal(listarPosicoes(db).find((a) => a.id === legado)?.valorAtualCentavos, 6000)
    operar({ ativoId: legado, tipo: 'venda', quantidade: 20, valorCentavos: 6000 })
    excluirAtivo(db, legado)
    assert.equal(listarPosicoes(db).find((a) => a.id === legado)?.arquivado, true)
    assert.equal(saldo(), 106000)
    const novo = cadastrarAtivo(db, {
      codigo: 'MANUAL',
      nome: 'Manual',
      tipo: 'Outro',
      instituicao: '',
      quantidadeInicial: 5,
      cotacaoInicialCentavos: 1000
    })
    assert.equal(listarPosicoes(db).find((a) => a.id === novo)?.valorAtualCentavos, 5000)
    operar({ ativoId: novo, tipo: 'venda', quantidade: 2, valorCentavos: 2000 })
    assert.equal(listarPosicoes(db).find((a) => a.id === novo)?.valorAtualCentavos, 3000)
    assert.equal(saldo(), 108000)
    assert.equal(listarMovimentos(db).length, 2)
  } finally {
    db.close()
  }
})

test('evolução usa observações reais, substitui o mesmo dia e preserva dias incompletos', () => {
  const { db, id, saldo, operar } = ambiente()
  try {
    operar({})
    registrarObservacaoCarteira(db, '2026-11-23')
    assert.deepEqual(listarEvolucaoPatrimonio(db), [
      { data: '2026-11-23', valorCentavos: null, conhecidoCentavos: 0, semCotacao: 1 }
    ])
    atualizarCotacao(db, id, 600)
    registrarObservacaoCarteira(db, '2026-11-23')
    atualizarCotacao(db, id, 650)
    registrarObservacaoCarteira(db, '2026-11-23')
    assert.equal(listarEvolucaoPatrimonio(db).length, 1)
    assert.equal(listarEvolucaoPatrimonio(db)[0].valorCentavos, 1300)
    assert.equal(listarHistoricoCotacoes(db, id).length, 1)
    assert.equal(listarHistoricoCotacoes(db, id)[0].preco, 6.5)
    const mercado = cadastrarAtivo(db, {
      codigo: 'PETR4',
      nome: 'Petrobras',
      tipo: 'Ação',
      instituicao: '',
      quantidadeMercado: 2
    })
    registrarObservacaoCarteira(db, '2026-11-24')
    assert.equal(listarEvolucaoPatrimonio(db)[1].valorCentavos, null)
    assert.equal(listarEvolucaoPatrimonio(db)[1].conhecidoCentavos, 1300)
    salvarCotacaoMercado(
      db,
      mercado,
      { preco: 40, data: '2026-11-24T18:00:00Z', fonte: 'BRAPI' },
      '2026-11-24T19:00:00Z'
    )
    registrarObservacaoCarteira(db, '2026-11-25')
    assert.equal(listarEvolucaoPatrimonio(db)[2].valorCentavos, 9300)
    assert.equal(listarHistoricoCotacoes(db, mercado).length, 1)
    assert.equal(listarHistoricoCotacoes(db, mercado)[0].data, '2026-11-24')
    registrarObservacaoCarteira(db, '2026-11-26')
    assert.equal(listarHistoricoCotacoes(db, mercado).length, 1)
    assert.equal(listarEvolucaoPatrimonio(db).length, 4)
    assert.throws(() => registrarObservacaoCarteira(db, '2026-02-30'))
    assert.equal(saldo(), 99000)
    criarTabelasInvestimentos(db)
    assert.equal(listarEvolucaoPatrimonio(db).length, 4)
    assert.equal(listarHistoricoCotacoes(db, mercado)[0].preco, 40)
  } finally {
    db.close()
  }
})
test('carteira vazia não fabrica histórico e exclusão não apaga observações patrimoniais', () => {
  const { db, id } = ambiente()
  try {
    excluirAtivo(db, id)
    registrarObservacaoCarteira(db, '2026-11-23')
    assert.equal(listarEvolucaoPatrimonio(db).length, 0)
    const zero = cadastrarAtivo(db, {
      codigo: 'PETR4',
      nome: 'Petrobras',
      tipo: 'Ação',
      instituicao: '',
      quantidadeMercado: 0
    })
    salvarCotacaoMercado(
      db,
      zero,
      { preco: 40, data: '2026-11-24T18:00:00Z', fonte: 'BRAPI' },
      '2026-11-24T19:00:00Z'
    )
    registrarObservacaoCarteira(db, '2026-11-24')
    excluirAtivo(db, zero)
    assert.equal(listarHistoricoCotacoes(db, zero).length, 0)
    registrarObservacaoCarteira(db, '2026-11-25')
    assert.equal(listarEvolucaoPatrimonio(db).length, 2)
    assert.equal(listarEvolucaoPatrimonio(db)[1].valorCentavos, 0)
  } finally {
    db.close()
  }
})
