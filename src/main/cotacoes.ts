import type { Cotacao } from './investimentos'

type Requisicao = typeof fetch
function registro(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Resposta inválida do provedor.')
  return v as Record<string, unknown>
}
export function interpretarBrapi(json: unknown, codigo: string): Cotacao {
  const resultados = registro(json).results
  if (!Array.isArray(resultados)) throw new Error('Cotação indisponível.')
  const item = resultados.map(registro).find(a => a.symbol === codigo)
  if (!item || item.currency !== 'BRL' || typeof item.regularMarketPrice !== 'number' || !Number.isFinite(item.regularMarketPrice) || item.regularMarketPrice <= 0 || typeof item.regularMarketTime !== 'string' || !Number.isFinite(Date.parse(item.regularMarketTime))) throw new Error('Cotação em reais indisponível.')
  return {preco:item.regularMarketPrice,data:new Date(item.regularMarketTime).toISOString(),fonte:'BRAPI'}
}
export function interpretarPtax(json: unknown): Cotacao {
  const dados = registro(json).value
  if (!Array.isArray(dados)) throw new Error('PTAX indisponível.')
  const itens = dados.map(registro).filter(a => a.tipoBoletim === 'Fechamento' && typeof a.dataHoraCotacao === 'string' && typeof a.cotacaoVenda === 'number' && a.cotacaoVenda > 0)
  itens.sort((a,b) => String(b.dataHoraCotacao).localeCompare(String(a.dataHoraCotacao)))
  const item = itens[0]
  if (!item) throw new Error('PTAX de fechamento indisponível.')
  const data = String(item.dataHoraCotacao).replace(' ', 'T') + '-03:00'
  if (!Number.isFinite(Date.parse(data))) throw new Error('Data da PTAX inválida.')
  return {preco:Number(item.cotacaoVenda),data:new Date(data).toISOString(),fonte:'BCB PTAX'}
}
function dataBcb(d: Date): string {
  return d.toISOString().slice(0,10).split('-').slice(1).concat(d.toISOString().slice(0,4)).join('-')
}
export async function consultarCotacao(codigo: string, tipo: string, chave = '', requisicao: Requisicao = fetch): Promise<Cotacao> {
  let url: URL
  const headers: Record<string,string> = { Accept:'application/json' }
  if (tipo === 'Moeda' && ['USD','EUR'].includes(codigo)) {
    url = new URL('https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)')
    url.searchParams.set('@moeda', "'"+codigo+"'")
    url.searchParams.set('@dataInicial', "'"+dataBcb(new Date(Date.now()-10*86400000))+"'")
    url.searchParams.set('@dataFinalCotacao', "'"+dataBcb(new Date())+"'")
    url.searchParams.set('$format','json')
  } else if (['Ação','ETF','FII'].includes(tipo) && /^[A-Z]{4}[0-9]{1,2}$/.test(codigo)) {
    url = new URL('https://brapi.dev/api/quote/'+encodeURIComponent(codigo))
    if (chave) headers.Authorization = 'Bearer '+chave
  } else throw new Error('Ativo sem fonte automática.')
  const resposta = await requisicao(url, {headers,signal:AbortSignal.timeout(7000),redirect:'error'})
  if (!resposta.ok) {
    if (resposta.status === 401 || resposta.status === 403) throw new Error('A fonte exige uma chave válida ou plano compatível.')
    if (resposta.status === 429) throw new Error('Limite de consultas atingido. Tente novamente mais tarde.')
    throw new Error('Cotação indisponível no provedor.')
  }
  const dados: unknown = await resposta.json()
  return tipo === 'Moeda' ? interpretarPtax(dados) : interpretarBrapi(dados,codigo)
}
