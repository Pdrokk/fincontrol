import type { Posicao } from '../../../main/investimentos'
import { comporCarteira } from '../utils/composicaoCarteira'

const moeda = (v: number): string => (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (v: number): string => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

export default function ComposicaoCarteira({ posicoes }: { posicoes: Posicao[] }): React.JSX.Element {
  const { segmentos } = comporCarteira(posicoes)
  const parcial = posicoes.some(p => !p.arquivado && p.valorAtualCentavos === null)
  return <section className="invest-alocacao carteira-composicao" aria-label="Composição da carteira por ativo">
    <h4>Composição da carteira</h4>
    {!segmentos.length ? <p className="invest-detalhe">Nenhuma posição com valor disponível.</p> : <div className="carteira-rosca-conteudo">
      <svg className="carteira-rosca" viewBox="0 0 120 120" role="img" aria-label="Distribuição proporcional ao valor dos ativos; consulte a legenda">
        <circle cx="60" cy="60" r="44" fill="none" stroke="var(--border-color)" strokeWidth="19"/>
        {segmentos.map((s,i)=><circle key={s.id} className={'carteira-fatia carteira-cor-'+(s.id==='outros'?6:i)} data-ativo={s.nome} cx="60" cy="60" r="44" fill="none" stroke="var(--fatia-cor)" strokeWidth="19" pathLength="100" strokeDasharray={s.percentual+' '+Math.max(0,100-s.percentual)} strokeDashoffset={-s.inicio} transform="rotate(-90 60 60)">
          <title>{s.nome+' · '+moeda(s.valor)+' · '+percentual(s.percentual)}</title>
        </circle>)}
      </svg>
      <ul className="carteira-rosca-legenda" aria-label="Valor e participação por ativo">
        {segmentos.map((s,i)=><li key={s.id} className={'carteira-cor-'+(s.id==='outros'?6:i)} data-valor={s.valor} data-percentual={s.percentual}>
          <i aria-hidden="true"/><span className="carteira-rosca-nome" title={s.nome}>{s.nome}</span><span>{moeda(s.valor)}</span><strong>{percentual(s.percentual)}</strong>
        </li>)}
      </ul>
    </div>}
    {parcial&&<p className="invest-detalhe">Composição apenas dos valores conhecidos.</p>}
  </section>
}
