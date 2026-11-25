import assert from 'node:assert/strict'
import test from 'node:test'
import { consultarCotacao, interpretarBrapi, interpretarPtax } from '../src/main/cotacoes.ts'

const resultado={symbol:'PETR4',currency:'BRL',regularMarketPrice:32.18,regularMarketTime:'2026-11-24T18:00:00Z'}
test('BRAPI exige símbolo, moeda e preço válido',()=>{
  assert.equal(interpretarBrapi({results:[resultado]},'PETR4').preco,32.18)
  assert.throws(()=>interpretarBrapi({results:[{...resultado,currency:'USD'}]},'PETR4'))
  assert.throws(()=>interpretarBrapi({results:[resultado]},'VALE3'))
  assert.throws(()=>interpretarBrapi({results:[{...resultado,regularMarketPrice:0}]},'PETR4'))
  assert.throws(()=>interpretarBrapi({results:[{...resultado,regularMarketTime:'inválida'}]},'PETR4'))
})
test('PTAX escolhe fechamento mais recente, não boletim intermediário',()=>{
  const value=[
    {tipoBoletim:'Fechamento',dataHoraCotacao:'2026-11-20 13:00:00.000',cotacaoVenda:5.1111},
    {tipoBoletim:'Fechamento',dataHoraCotacao:'2026-11-24 13:00:00.000',cotacaoVenda:5.2222},
    {tipoBoletim:'Intermediário',dataHoraCotacao:'2026-11-25 11:00:00.000',cotacaoVenda:5.5}
  ]
  assert.equal(interpretarPtax({value}).preco,5.2222)
  assert.throws(()=>interpretarPtax({value:[]}))
})
test('requisição limitada ao host conhecido e token no cabeçalho',async()=>{
  const fake: typeof fetch=async(input,init)=>{
    assert.equal(String(input),'https://brapi.dev/api/quote/PETR4')
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer token-teste')
    assert.equal(init?.redirect,'error')
    return new Response(JSON.stringify({results:[resultado]}),{status:200})
  }
  assert.equal((await consultarCotacao('PETR4','Ação','token-teste',fake)).preco,32.18)
  await assert.rejects(consultarCotacao('https://evil.invalid','Ação','token-teste',fake))
})
test('HTTP 401 e 429 geram erros claros, sem retornar preço zero',async()=>{
  for (const status of [401,429]) {
    const fake: typeof fetch=async()=>new Response('',{status})
    await assert.rejects(consultarCotacao('PETR4','Ação','',fake))
  }
})
