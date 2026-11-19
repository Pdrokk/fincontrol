import { ArrowRight, CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import GraficosFinanceiros from './GraficosFinanceiros'

type Transacao = {
  id: string
  descricao: string
  valorCentavos: number
  tipo: 'receita' | 'despesa'
  categoria: string
  data: string
}
type Fatura = {
  cartaoId: string
  competencia: string
  vencimento: string
  saldoPendenteCentavos: number
  paga: boolean
}

interface Props {
  saldoContasCentavos: number
  receitasCentavos: number
  despesasCentavos: number
  transacoes: Transacao[]
  previsoes: Transacao[]
  filtroMes: string
  filtroAno: string
  transacoesRecentes: Transacao[]
  faturas: Fatura[]
  onPagamentos: () => void
  onTransacoes: () => void
}

const moeda = (centavos: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)

const dataBR = (data: string): string => data.split('-').reverse().join('/')

export default function DashboardResumo({
  saldoContasCentavos, receitasCentavos, despesasCentavos, transacoes, previsoes,
  filtroMes, filtroAno, transacoesRecentes, faturas, onPagamentos, onTransacoes
}: Props): React.JSX.Element {
  const emAberto = faturas.filter((f) => !f.paga && f.saldoPendenteCentavos > 0)
  const proximas = [...emAberto].sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 3)
  const totalFaturas = emAberto.reduce((valor, fatura) => valor + fatura.saldoPendenteCentavos, 0)

  return (
    <div className="dashboard-minimal">
      <section className="dashboard-kpis" aria-label="Indicadores financeiros">
        <article className="dashboard-kpi">
          <div className="dashboard-kpi-top"><span>Saldo nas contas</span><Wallet size={18}/></div>
          <strong>{moeda(saldoContasCentavos)}</strong>
          <small>Dinheiro disponível nos bancos</small>
        </article>
        <article className="dashboard-kpi">
          <div className="dashboard-kpi-top"><span>Receitas do período</span><TrendingUp size={18}/></div>
          <strong>{moeda(receitasCentavos)}</strong>
          <small>Entradas registradas</small>
        </article>
        <article className="dashboard-kpi">
          <div className="dashboard-kpi-top"><span>Despesas do período</span><TrendingDown size={18}/></div>
          <strong>{moeda(despesasCentavos)}</strong>
          <small>Inclui parcelas efetivamente pagas</small>
        </article>
        <article className="dashboard-kpi">
          <div className="dashboard-kpi-top"><span>Faturas em aberto</span><CreditCard size={18}/></div>
          <strong>{moeda(totalFaturas)}</strong>
          <small>Obrigações pendentes, inclusive futuras</small>
        </article>
      </section>

      <div className="dashboard-secao-titulo">
        <div>
          <h3>Visão financeira</h3>
          <p>Realizado e previsto em visões separadas, por janelas de seis meses.</p>
        </div>
      </div>
      <GraficosFinanceiros transacoes={transacoes} previsoes={previsoes} filtroMes={filtroMes} filtroAno={filtroAno} compacto />

      <div className="dashboard-duas-colunas">
        <section className="painel dashboard-lista">
          <div className="dashboard-secao-titulo">
            <div><h3>Próximos pagamentos</h3><p>Faturas em aberto por vencimento</p></div>
            <button type="button" className="botao-texto" onClick={onPagamentos}>Ver todos <ArrowRight size={15}/></button>
          </div>
          {proximas.length === 0 && <p className="vazio">Nenhuma fatura em aberto.</p>}
          {proximas.map((f) => (
            <div className="dashboard-item" key={f.cartaoId + f.competencia}>
              <div><strong>Fatura {f.competencia}</strong><small>Vence {dataBR(f.vencimento)}</small></div>
              <strong>{moeda(f.saldoPendenteCentavos)}</strong>
            </div>
          ))}
        </section>

        <section className="painel dashboard-lista">
          <div className="dashboard-secao-titulo">
            <div><h3>Últimas movimentações</h3><p>Receitas e despesas bancárias</p></div>
            <button type="button" className="botao-texto" onClick={onTransacoes}>Ver todas <ArrowRight size={15}/></button>
          </div>
          {transacoesRecentes.length === 0 && <p className="vazio">Ainda não há movimentações neste período.</p>}
          {transacoesRecentes.map((t) => (
            <div className="dashboard-item" key={t.id}>
              <div><strong>{t.descricao}</strong><small>{dataBR(t.data)} · {t.categoria}</small></div>
              <strong className={t.tipo}>{t.tipo === 'receita' ? '+' : '−'}{moeda(t.valorCentavos)}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
