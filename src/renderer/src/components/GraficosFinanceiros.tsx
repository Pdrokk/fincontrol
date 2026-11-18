import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

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
  compacto?: boolean
}

const cores = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b']

function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

export default function GraficosFinanceiros({
  transacoes,
  compacto = false
}: Props): React.JSX.Element {
  // Agrupamento mensal usando valores em centavos.
  const agrupamento = new Map<string, { receitas: number; despesas: number }>()

  for (const transacao of transacoes) {
    const mes = transacao.data.slice(0, 7)

    const registro = agrupamento.get(mes) ?? {
      receitas: 0,
      despesas: 0
    }

    if (transacao.tipo === 'receita') {
      registro.receitas += transacao.valorCentavos
    } else {
      registro.despesas += transacao.valorCentavos
    }

    agrupamento.set(mes, registro)
  }

  const mesesOrdenados = [...agrupamento.keys()].sort()

  const dadosMensais = mesesOrdenados.reduce<
    {
      mes: string
      receitas: number
      despesas: number
      saldo: number
      chave: string
    }[]
  >((acumulador, mes) => {
    const registro = agrupamento.get(mes)

    if (!registro) {
      return acumulador
    }

    const saldoAnterior = acumulador.length > 0 ? acumulador[acumulador.length - 1].saldo : 0

    const receitas = registro.receitas / 100
    const despesas = registro.despesas / 100

    const [ano, numeroMes] = mes.split('-')

    const nomeMes = new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      timeZone: 'UTC'
    }).format(new Date(`${mes}-01T12:00:00Z`))

    return [
      ...acumulador,
      {
        mes: `${nomeMes}/${ano.slice(2)}`,
        receitas,
        despesas,
        saldo: saldoAnterior + receitas - despesas,
        chave: `${ano}-${numeroMes}`
      }
    ]
  }, [])

  // Agrupamento das despesas por categoria.
  const categorias = new Map<string, number>()

  for (const transacao of transacoes) {
    if (transacao.tipo !== 'despesa') continue

    const atual = categorias.get(transacao.categoria) ?? 0

    categorias.set(transacao.categoria, atual + transacao.valorCentavos)
  }

  const dadosCategorias = [...categorias.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nome, centavos], index) => ({
      nome,
      valor: centavos / 100,
      fill: cores[index % cores.length]
    }))

  const temTransacoes = transacoes.length > 0
  const temDespesas = dadosCategorias.length > 0

  return (
    <div className="graficos-financeiros">
      <section className="grafico-card">
        <h3>Receitas x Despesas</h3>
        <p>Comparação dos valores por mês</p>

        {temTransacoes ? (
          <div className="grafico-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                <XAxis dataKey="mes" />

                <YAxis width={65} tickFormatter={(v: number): string => `R$ ${v}`} />

                <Tooltip formatter={(value): string => moeda(Number(value))} />

                <Legend />

                <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[5, 5, 0, 0]} />

                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="grafico-vazio">Cadastre transações para visualizar o gráfico.</p>
        )}
      </section>

      <section className="grafico-card">
        <h3>Despesas por categoria</h3>
        <p>Distribuição dos gastos no período</p>

        {temDespesas ? (
          <>
            <div className="grafico-area">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosCategorias}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={2}
                  />

                  <Tooltip formatter={(value): string => moeda(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="legenda-categorias">
              {dadosCategorias.map((categoria) => (
                <div className="legenda-item" key={categoria.nome}>
                  <span
                    className="legenda-cor"
                    style={{
                      backgroundColor: categoria.fill
                    }}
                  />

                  <span>{categoria.nome}</span>

                  <strong>{moeda(categoria.valor)}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="grafico-vazio">Nenhuma despesa encontrada neste período.</p>
        )}
      </section>

      {!compacto && (
        <section className="grafico-card grafico-largo">
          <h3>Evolução do saldo</h3>
          <p>Saldo acumulado das transações no período selecionado</p>

          {temTransacoes ? (
            <div className="grafico-area">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis dataKey="mes" />

                  <YAxis width={75} tickFormatter={(v: number): string => `R$ ${v}`} />

                  <Tooltip formatter={(value): string => moeda(Number(value))} />

                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo acumulado"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="grafico-vazio">Ainda não existem transações para o período.</p>
          )}
        </section>
      )}
    </div>
  )
}
