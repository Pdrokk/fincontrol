import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { criarTabelasInvestimentos, cadastrarAtivo, listarPosicoes, listarMovimentos, atualizarCotacao, atualizarValorAtivo, registrarOperacao, salvarCotacaoMercado, atualizarQuantidadeMercado, excluirAtivo, valorMercado, type Operacao } from '../src/main/investimentos.ts'

function ambiente(): { db: DatabaseSync; id: string; saldo: () => number; operar: (dados: Partial<Operacao>) => void } {
  const db = new DatabaseSync(':memory:')
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE contas(id TEXT PRIMARY KEY); INSERT INTO contas VALUES ('a')")
  criarTabelasInvestimentos(db)
  const id = cadastrarAtivo(db, { codigo: 'BOVA11', nome: 'ETF', tipo: 'ETF', instituicao: 'Corretora' })
  const saldo = (): number => 100000 + (db.prepare('SELECT COALESCE(SUM(caixa_centavos),0) AS total FROM movimentos_investimento').get() as {total:number}).total
  const operar = (dados: Partial<Operacao>): void => registrarOperacao(db, { ativoId:id, contaId:'a', tipo:'compra', quantidade:2, valorCentavos:1000, taxasCentavos:0, data:'2026-01-01', ...dados }, conta => conta === 'a' ? saldo() : undefined, '2026-11-25')
  return { db,id,saldo,operar }
}
test('compras fracionadas, preço médio, venda parcial e encerramento com taxas', () => {
  const {db,id,saldo,operar}=ambiente()
  try {
    operar({quantidade:1.5,valorCentavos:1500,taxasCentavos:15})
    operar({quantidade:0.5,valorCentavos:1000,taxasCentavos:5})
    assert.equal(saldo(),97480)
    assert.equal(listarPosicoes(db)[0].custoCentavos,2520)
    atualizarCotacao(db,id,1500)
    assert.equal(listarPosicoes(db)[0].valorAtualCentavos,3000)
    operar({tipo:'venda',quantidade:0.5,valorCentavos:750,taxasCentavos:10})
    assert.equal(listarPosicoes(db)[0].custoCentavos,1890)
    assert.equal(listarPosicoes(db)[0].realizadoCentavos,110)
    operar({tipo:'venda',quantidade:1.5,valorCentavos:2000})
    assert.equal(listarPosicoes(db)[0].quantidade,0)
    assert.equal(listarPosicoes(db)[0].custoCentavos,0)
    assert.equal(saldo(),100220)
  } finally {db.close()}
})
test('falhas não alteram saldo nem histórico', () => {
  const {db,id,saldo,operar}=ambiente()
  try {
    for(const dados of [{valorCentavos:100001},{tipo:'venda' as const},{quantidade:0},{quantidade:0.000000001},{valorCentavos:NaN},{data:'2026-02-30'},{data:'2999-01-01'},{contaId:'x'},{ativoId:'x'},{taxasCentavos:-1}]) assert.throws(()=>operar(dados))
    assert.equal(saldo(),100000)
    assert.equal(listarMovimentos(db).length,0)
    assert.throws(()=>atualizarCotacao(db,id,0))
    assert.throws(()=>cadastrarAtivo(db,{codigo:'bova11',nome:'Duplicado',tipo:'ETF',instituicao:'Corretora'}))
  } finally {db.close()}
})
test('proventos, ordem cronológica, cotação ausente, migração idempotente e proteção de vínculos', () => {
  const {db,saldo,operar}=ambiente()
  try {
    operar({data:'2026-05-01'})
    assert.equal(listarPosicoes(db)[0].valorAtualCentavos,null)
    assert.throws(()=>operar({data:'2026-04-01'}))
    operar({tipo:'provento',quantidade:0,valorCentavos:150,taxasCentavos:10,data:'2026-05-02'})
    assert.equal(saldo(),99140)
    assert.equal(listarPosicoes(db)[0].proventosCentavos,140)
    criarTabelasInvestimentos(db)
    assert.equal(listarMovimentos(db).length,2)
    assert.throws(()=>db.exec("DELETE FROM contas WHERE id='a'"))
    assert.equal(db.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok')
  } finally {db.close()}
})

test('carteira de acompanhamento: cadastro, atualização e nenhuma movimentação bancária', () => {
  const {db,saldo,operar}=ambiente()
  try {
    const id=cadastrarAtivo(db,{codigo:'USD',nome:'Dólar',tipo:'Moeda',instituicao:'',valorInformadoCentavos:250000})
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,250000)
    atualizarValorAtivo(db,id,300000)
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,300000)
    assert.throws(()=>operar({ativoId:id}))
    assert.throws(()=>atualizarValorAtivo(db,id,-1))
    assert.equal(saldo(),100000)
    assert.equal(listarMovimentos(db).length,0)
    criarTabelasInvestimentos(db)
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,300000)
  } finally {db.close()}
})

test('posição acompanhada por quantidade, cache de cotação e edição não alteram caixa', () => {
  const {db,saldo,operar}=ambiente()
  try {
    const id=cadastrarAtivo(db,{codigo:'PETR4',nome:'Petrobras',tipo:'Ação',instituicao:'',quantidadeMercado:10.5})
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,null)
    salvarCotacaoMercado(db,id,{preco:31.25,data:'2026-11-24T18:00:00Z',fonte:'BRAPI'})
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,32813)
    atualizarQuantidadeMercado(db,id,12)
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,37500)
    assert.throws(()=>atualizarQuantidadeMercado(db,id,-1))
    assert.throws(()=>operar({ativoId:id}))
    assert.equal(saldo(),100000)
    assert.equal(listarMovimentos(db).length,0)
    criarTabelasInvestimentos(db)
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.fonteCotacao,'BRAPI')
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,37500)
    assert.throws(()=>cadastrarAtivo(db,{codigo:'^BVSP',nome:'Índice',tipo:'ETF',instituicao:'',quantidadeMercado:10}))
    assert.throws(()=>cadastrarAtivo(db,{codigo:'USD',nome:'Dólar',tipo:'Moeda',instituicao:'',quantidadeMercado:10,valorInformadoCentavos:100}))
  } finally { db.close() }
})

test('cotação antiga, inválida ou de fonte incorreta não sobrescreve cache',()=>{
  const {db,saldo}=ambiente()
  try {
    const id=cadastrarAtivo(db,{codigo:'PETR4',nome:'PETR4',tipo:'Ação',instituicao:'',quantidadeMercado:10})
    const data='2026-11-25T12:00:00Z', consulta='2026-11-25T12:05:00Z'
    assert.equal(salvarCotacaoMercado(db,id,{preco:32.15,data,fonte:'BRAPI'},consulta),true)
    assert.equal(salvarCotacaoMercado(db,id,{preco:1,data:'2026-11-24T12:00:00Z',fonte:'BRAPI'},consulta),false)
    for(const preco of [NaN,Infinity,-1,0]) assert.throws(()=>salvarCotacaoMercado(db,id,{preco,data,fonte:'BRAPI'},consulta))
    assert.throws(()=>salvarCotacaoMercado(db,id,{preco:1,data:'2026-12-01T12:00:00Z',fonte:'BRAPI'},consulta))
    assert.throws(()=>salvarCotacaoMercado(db,id,{preco:1,data,fonte:'BCB PTAX'},consulta))
    assert.equal(listarPosicoes(db).find(a=>a.id===id)?.valorAtualCentavos,32150)
    assert.equal(valorMercado(10,NaN),null)
    assert.equal(saldo(),100000)
  } finally {db.close()}
})
test('exclusão de posição sem histórico preserva saldos e bloqueia perda de operações',()=>{
  const {db,id,saldo,operar}=ambiente()
  try {
    operar({})
    const caixa=saldo()
    assert.throws(()=>excluirAtivo(db,id),/histórico/)
    const novo=cadastrarAtivo(db,{codigo:'USD',nome:'Dólar',tipo:'Moeda',instituicao:'',quantidadeMercado:50})
    excluirAtivo(db,novo)
    assert.equal(salvarCotacaoMercado(db,novo,{preco:5,data:'2026-11-25T12:00:00Z',fonte:'BCB PTAX'},'2026-11-25T12:05:00Z'),false)
    assert.throws(()=>excluirAtivo(db,novo))
    assert.equal(saldo(),caixa)
    assert.equal(listarMovimentos(db).length,1)
  } finally {db.close()}
})
