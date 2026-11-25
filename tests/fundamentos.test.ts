import assert from 'node:assert/strict'
import test from 'node:test'
import { interpretarFundamentos, consultarFundamentos } from '../src/main/fundamentos.ts'

const instante='2026-11-25T12:00:00Z'
const acao={symbol:'PETR4',currency:'BRL',longName:'Petrobras',priceEarnings:5,defaultKeyStatistics:{trailingPE:6,priceToBook:1.2,dividendYield:.0721,mostRecentQuarter:'2026-06-30',trailingEps:8,bookValue:30},financialData:{returnOnEquity:.2,profitMargins:-.03},summaryProfile:{sector:'Energia',industry:'Petróleo'}}
test('fundamentos de ação: frações, negativos e referência preservados',()=>{
  const d=interpretarFundamentos({results:[acao]},'PETR4','Ação',instante)
  assert.equal(d.pl,6);assert.equal(d.dy,.0721);assert.equal(d.margem,-.03);assert.equal(d.referencia,'2026-06-30');assert.equal(d.cotistas,null)
})
test('FII usa indicadores próprios e não inventa P/L ou ROE',()=>{
  const d=interpretarFundamentos({fiis:[{symbol:'HGLG11',priceToNav:1.02,dividendYield12m:.09,navPerShare:150,totalInvestors:1234,asOfDate:'2026-10-01 00:00:00+00'}]},'HGLG11','FII',instante)
  assert.equal(d.pvp,1.02);assert.equal(d.dy,.09);assert.equal(d.pl,null);assert.equal(d.roe,null);assert.equal(d.cotistas,1234)
})
test('valores ausentes e tipos inválidos não viram zero',()=>{
  const d=interpretarFundamentos({results:[{symbol:'PETR4',currency:'BRL',priceEarnings:0,defaultKeyStatistics:{dividendYield:'0.06',priceToBook:Infinity,mostRecentQuarter:'2026-02-30'}}]},'PETR4','Ação',instante)
  assert.equal(d.pl,0);assert.equal(d.dy,null);assert.equal(d.pvp,null);assert.equal(d.referencia,null)
  assert.throws(()=>interpretarFundamentos({results:[{...acao,currency:'USD'}]},'PETR4','Ação',instante))
  assert.throws(()=>interpretarFundamentos({results:[acao]},'VALE3','Ação',instante))
  assert.throws(()=>interpretarFundamentos({results:[{symbol:'PETR4',currency:'BRL'}]},'PETR4','Ação',instante))
})
test('requisição usa apenas host aprovado, token no cabeçalho e módulos explícitos',async()=>{
  const fake:typeof fetch=async(input,init)=>{
    const url=new URL(String(input))
    assert.equal(url.origin,'https://brapi.dev');assert.equal(url.pathname,'/api/quote/PETR4')
    assert.equal(url.searchParams.get('modules'),'defaultKeyStatistics,financialData,summaryProfile')
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer segredo')
    assert.equal(init?.redirect,'error')
    return new Response(JSON.stringify({results:[acao]}),{status:200})
  }
  assert.equal((await consultarFundamentos('PETR4','Ação','segredo',fake)).pl,6)
  await assert.rejects(consultarFundamentos('../PETR4','Ação','segredo',fake))
})
test('FII usa endpoint próprio e erros HTTP/rede são tratados',async()=>{
  const fake:typeof fetch=async(input)=>{
    const url=new URL(String(input));assert.equal(url.pathname,'/api/v2/fii/indicators');assert.equal(url.searchParams.get('symbols'),'HGLG11')
    return new Response(JSON.stringify({fiis:[{symbol:'HGLG11',priceToNav:1}]}),{status:200})
  }
  assert.equal((await consultarFundamentos('HGLG11','FII','',fake)).pvp,1)
  for(const status of [401,403,429,500]) await assert.rejects(consultarFundamentos('PETR4','Ação','',async()=>new Response('',{status})))
  await assert.rejects(consultarFundamentos('PETR4','Ação','',async()=>{throw new Error('offline')}),/internet/)
})
