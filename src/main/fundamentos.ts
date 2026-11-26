export interface Fundamentos {
  codigo: string
  tipo: 'Ação' | 'FII'
  nome: string | null
  setor: string | null
  segmento: string | null
  referencia: string | null
  consultadoEm: string
  pl: number | null
  pvp: number | null
  dy: number | null
  roe: number | null
  margem: number | null
  lpa: number | null
  vpa: number | null
  cotistas: number | null
}
type Registro = Record<string, unknown>
function objeto(v: unknown): Registro {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Registro) : {}
}
function numero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null
}
function data(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const dia = v.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) &&
    Number.isFinite(Date.parse(dia)) &&
    new Date(dia).toISOString().slice(0, 10) === dia
    ? dia
    : null
}
export function interpretarFundamentos(
  json: unknown,
  codigo: string,
  tipo: Fundamentos['tipo'],
  consultadoEm: string
): Fundamentos {
  const itens = objeto(json)[tipo === 'FII' ? 'fiis' : 'results']
  const item = Array.isArray(itens) ? itens.map(objeto).find((a) => a.symbol === codigo) : undefined
  if (!item || (tipo === 'Ação' && item.currency !== 'BRL'))
    throw new Error('Dados do ativo não encontrados em reais.')
  const stats = objeto(item.defaultKeyStatistics)
  const fin = objeto(item.financialData)
  const perfil = objeto(item.summaryProfile)
  const fii = tipo === 'FII'
  const dados: Fundamentos = {
    codigo,
    tipo,
    consultadoEm,
    nome: texto(fii ? item.name : item.longName),
    setor: texto(fii ? item.segmentType : perfil.sector),
    segmento: texto(fii ? item.segmentoAtuacao : perfil.industry),
    referencia: data(fii ? item.asOfDate : stats.mostRecentQuarter),
    pl: fii ? null : (numero(stats.trailingPE) ?? numero(item.priceEarnings)),
    pvp: numero(fii ? item.priceToNav : stats.priceToBook),
    dy: numero(fii ? item.dividendYield12m : stats.dividendYield),
    roe: fii ? null : numero(fin.returnOnEquity),
    margem: fii ? null : numero(fin.profitMargins),
    lpa: fii ? null : (numero(stats.trailingEps) ?? numero(item.earningsPerShare)),
    vpa: numero(fii ? item.navPerShare : stats.bookValue),
    cotistas: fii ? numero(item.totalInvestors) : null
  }
  if (
    [
      dados.pl,
      dados.pvp,
      dados.dy,
      dados.roe,
      dados.margem,
      dados.lpa,
      dados.vpa,
      dados.cotistas
    ].every((v) => v === null)
  )
    throw new Error('O provedor não retornou indicadores para este ativo.')
  return dados
}
export async function consultarFundamentos(
  codigo: string,
  tipo: Fundamentos['tipo'],
  token = '',
  requisicao: typeof fetch = fetch
): Promise<Fundamentos> {
  if (!/^[A-Z]{4}[0-9]{1,2}$/.test(codigo) || !['Ação', 'FII'].includes(tipo))
    throw new Error('Ativo sem cobertura fundamentalista.')
  const url = new URL(
    tipo === 'FII'
      ? 'https://brapi.dev/api/v2/fii/indicators'
      : 'https://brapi.dev/api/quote/' + codigo
  )
  if (tipo === 'FII') url.searchParams.set('symbols', codigo)
  else url.searchParams.set('modules', 'defaultKeyStatistics,financialData,summaryProfile')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  let resposta: Response
  try {
    resposta = await requisicao(url, {
      headers,
      signal: AbortSignal.timeout(7000),
      redirect: 'error'
    })
  } catch {
    throw new Error('Não foi possível conectar à BRAPI. Confira a internet.')
  }
  if ([401, 403].includes(resposta.status))
    throw new Error('A BRAPI exige uma chave ou plano compatível com os fundamentos.')
  if (resposta.status === 429) throw new Error('Limite de consultas da BRAPI atingido.')
  if (!resposta.ok) throw new Error('Indicadores indisponíveis na BRAPI.')
  return interpretarFundamentos(await resposta.json(), codigo, tipo, new Date().toISOString())
}
