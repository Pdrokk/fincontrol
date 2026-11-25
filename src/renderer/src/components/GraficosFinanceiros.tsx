import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TransacaoGrafico {
  id: string
  descricao: string
  valorCentavos: number
  tipo: 'receita' | 'despesa'
  categoria: string
  data: string
}

interface Props {
  transacoes: TransacaoGrafico[]
  previsoes?: TransacaoGrafico[]
  compacto?: boolean
  filtroMes?: string
  filtroAno?: string
}

const cores = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b']
const mesesPagina = 6
const moeda = (reais: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais)

const rotuloMes = (mes: string): string => {
  const ano = mes.slice(0, 4)
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${mes}-01T12:00:00Z`))
  return `${nome}/${ano.slice(2)}`
}

export default function GraficosFinanceiros({
  transacoes, previsoes = [], compacto = false, filtroMes = 'todos', filtroAno = 'todos'
}: Props): React.JSX.Element {
  const [modo, setModo] = useState<'realizado' | 'previsto'>('realizado')
  const [pagina, setPagina] = useState<number | null>(null)
  const registros = (modo === 'realizado' ? transacoes : previsoes).filter((t) =>
    (filtroAno === 'todos' || t.data.slice(0, 4) === filtroAno) &&
    (filtroMes === 'todos' || t.data.slice(5, 7) === filtroMes)
  )

  const mapa = new Map<string, { receitas: number; despesas: number }>()
  for (const item of registros) {
    const mes = item.data.slice(0, 7)
    const atual = mapa.get(mes) ?? { receitas: 0, despesas: 0 }
    if (item.tipo === 'receita') atual.receitas += item.valorCentavos
    else atual.despesas += item.valorCentavos
    mapa.set(mes, atual)
  }

  // Completa meses intermediários: assim o eixo não salta diretamente de janeiro a novembro.
  const chaves = [...mapa.keys()].sort()
  const meses: string[] = []
  if (chaves.length) {
    let [ano, mes] = chaves[0].split('-').map(Number)
    const ultima = chaves[chaves.length - 1]
    while (`${ano}-${String(mes).padStart(2, '0')}` <= ultima && meses.length < 1200) {
      meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
      mes += 1
      if (mes > 12) { mes = 1; ano += 1 }
    }
  }

  const itensPorPagina = filtroMes !== 'todos' ? 1 : filtroAno !== 'todos' ? 12 : mesesPagina
  const totalPaginas = Math.max(1, Math.ceil(meses.length / itensPorPagina))
  const paginaAtual = Math.max(0, Math.min(pagina ?? totalPaginas - 1, totalPaginas - 1))
  const visiveis = meses.slice(paginaAtual * itensPorPagina, (paginaAtual + 1) * itensPorPagina)

  // Resultado da janela, nunca rotulado como saldo bancário real.
  let resultadoAcumulado = 0
  const dados = visiveis.map((mes) => {
    const reg = mapa.get(mes) ?? { receitas: 0, despesas: 0 }
    resultadoAcumulado += modo === 'previsto' ? reg.despesas : reg.receitas - reg.despesas
    return {
      mes: rotuloMes(mes),
      receitas: reg.receitas / 100,
      despesas: reg.despesas / 100,
      resultado: resultadoAcumulado / 100
    }
  })

  const categorias = new Map<string, number>()
  const mesesVisiveis = new Set(visiveis)
  for (const item of registros) {
    if (item.tipo !== 'despesa' || !mesesVisiveis.has(item.data.slice(0, 7))) continue
    categorias.set(item.categoria, (categorias.get(item.categoria) ?? 0) + item.valorCentavos)
  }

  const dadosCategorias = [...categorias.entries()].sort((a, b) => b[1] - a[1])
    .map(([nome, centavos], index) => ({
      nome, valor: centavos / 100, fill: cores[index % cores.length]
    }))

  return (
    <div className="graficos-relatorio">
      <div className="graficos-toolbar">
        <div className="graficos-abas" role="group" aria-label="Visão dos gráficos">
          <button type="button" aria-pressed={modo === 'realizado'}
            className={modo === 'realizado' ? 'ativo' : ''}
            onClick={(): void => { setModo('realizado'); setPagina(null) }}>Realizado</button>
          <button type="button" aria-pressed={modo === 'previsto'}
            className={modo === 'previsto' ? 'ativo' : ''}
            onClick={(): void => { setModo('previsto'); setPagina(null) }}>Previsto</button>
        </div>
        <div className="graficos-paginacao">
          <button type="button" aria-label="Período anterior" title="Período anterior"
            disabled={paginaAtual === 0}
            onClick={(): void => setPagina(paginaAtual - 1)}><ChevronLeft size={17} /></button>
          <span>{visiveis.length ? `${rotuloMes(visiveis[0])} – ${rotuloMes(visiveis[visiveis.length - 1])}` : 'Sem dados'}</span>
          <button type="button" aria-label="Próximo período" title="Próximo período"
            disabled={paginaAtual >= totalPaginas - 1}
            onClick={(): void => setPagina(paginaAtual + 1)}><ChevronRight size={17} /></button>
        </div>
      </div>
      <p className="graficos-explicacao">
        {filtroMes !== 'todos'
          ? 'Os gráficos mostram o mês selecionado. '
          : filtroAno !== 'todos'
            ? 'Os gráficos mostram os meses com movimentações no ano escolhido. '
            : 'Use as setas para navegar pelo histórico de seis em seis meses. '}
        {modo === 'realizado'
          ? 'Somente receitas registradas e despesas efetivamente pagas. Parcelas futuras não entram neste resultado.'
          : 'Somente parcelas de cartão em aberto, por mês de competência. Não reduz o saldo bancário atual.'}
      </p>
      <div className="graficos-financeiros">
        <section className="grafico-card">
          <h3>{modo === 'realizado' ? 'Receitas x despesas realizadas' : 'Despesas previstas'}</h3>
          <p>{filtroMes !== 'todos' ? 'Mês selecionado' : filtroAno !== 'todos' ? 'Ano selecionado' : 'Janela de até seis meses'}</p>
          {dados.length ? (
            <div className="grafico-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis width={65} tickFormatter={(v: number): string => `R$ ${v}`} />
                  <Tooltip formatter={(value): string => moeda(Number(value))} />
                  <Legend />
                  {modo === 'realizado' && (
                    <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[5, 5, 0, 0]} />
                  )}
                  <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="grafico-vazio">Não há lançamentos nesta visão.</p>}
        </section>
        <section className="grafico-card">
          <h3>Despesas por categoria</h3>
          <p>Referente aos meses exibidos acima</p>
          {dadosCategorias.length ? (
            <>
              <div className="grafico-area">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosCategorias} dataKey="valor" nameKey="nome"
                      innerRadius="52%" outerRadius="78%" paddingAngle={2} />
                    <Tooltip formatter={(value): string => moeda(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="legenda-categorias">
                {dadosCategorias.map((item) => (
                  <div className="legenda-item" key={item.nome}>
                    <span className="legenda-cor" style={{ backgroundColor: item.fill }} />
                    <span>{item.nome}</span>
                    <strong>{moeda(item.valor)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="grafico-vazio">Sem despesas nesta janela.</p>}
        </section>

        {!compacto && (
          <section className="grafico-card grafico-largo">
            <h3>{modo === 'realizado' ? 'Resultado acumulado da janela' : 'Compromissos acumulados da janela'}</h3>
            <p>{modo === 'realizado'
              ? 'Receitas menos despesas realizadas, iniciando em zero nesta página; não é o saldo das contas.'
              : 'Soma de parcelas pendentes nesta página, sem considerar receitas futuras.'}</p>
            {dados.length ? (
              <div className="grafico-area">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dados}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" />
                    <YAxis width={75} tickFormatter={(v: number): string => `R$ ${v}`} />
                    <Tooltip formatter={(value): string => moeda(Number(value))} />
                    <Line type="monotone" dataKey="resultado"
                      name={modo === 'realizado' ? 'Resultado' : 'Parcelas pendentes acumuladas'}
                      stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="grafico-vazio">Sem dados nesta janela.</p>}
          </section>
        )}
      </div>
    </div>
  )
}
