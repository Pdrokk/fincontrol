import { useState } from 'react'
import type { Movimento } from '../../../main/investimentos'
import { paginarHistorico, TAMANHO_PAGINA_INVEST } from '../utils/historicoInvest'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const quantidade = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 })

interface Props {
  movimentos: Movimento[]
  ativos?: ReadonlyMap<string, { codigo: string }>
}
export default function HistoricoOperacoes({ movimentos, ativos }: Props): React.JSX.Element {
  const [solicitada, setSolicitada] = useState(0)
  const { itens, pagina, totalPaginas } = paginarHistorico(movimentos, solicitada)
  if (!movimentos.length) return <p className="invest-detalhe">Nenhuma operação registrada.</p>
  return <div className="historico-invest-paginado">
    <div className={'invest-historico'+(!ativos?' carteira-ficha-historico':'')}><table aria-label={ativos?'Histórico da carteira':'Histórico deste ativo'}>
      <thead><tr><th scope="col">Data</th>{ativos&&<th scope="col">Ativo</th>}<th scope="col">Operação</th><th scope="col">Quantidade</th><th scope="col">Movimento bancário</th></tr></thead>
      <tbody>{itens.map(m=><tr key={m.id}><td>{m.data.split('-').reverse().join('/')}</td>{ativos&&<td>{ativos.get(m.ativoId)?.codigo??'Ativo'}</td>}<td>{m.tipo==='compra'?'Compra':m.tipo==='venda'?'Venda':'Provento'}</td><td>{m.tipo==='provento'?'—':quantidade.format(m.quantidade)}</td><td>{moeda.format(m.caixaCentavos/100)}</td></tr>)}</tbody>
    </table></div>
    {totalPaginas>1&&<nav className="historico-paginacao" aria-label="Paginação das operações de investimento">
      <button type="button" disabled={pagina===0} onClick={():void=>setSolicitada(pagina-1)}>Anterior</button>
      <span role="status">{pagina*TAMANHO_PAGINA_INVEST+1}–{Math.min((pagina+1)*TAMANHO_PAGINA_INVEST,movimentos.length)} de {movimentos.length}</span>
      <button type="button" disabled={pagina===totalPaginas-1} onClick={():void=>setSolicitada(pagina+1)}>Próxima</button>
    </nav>}
  </div>
}
