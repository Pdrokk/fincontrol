import { useEffect, useState } from 'react'
import GraficosFinanceiros from './components/GraficosFinanceiros'
import DashboardResumo from './components/DashboardResumo'
import './assets/main.css'
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Tags,
  Settings,
  Wallet,
  Landmark,
  CreditCard,
  Sun,
  Moon
} from 'lucide-react'

import ContasBancarias from './components/ContasBancarias'
import CartoesCredito from './components/CartoesCredito'

type Tipo = 'receita' | 'despesa'

type Pagina = 'dashboard' | 'transacoes' | 'relatorios' | 'contas' | 'cartoes' | 'configuracoes'

interface Transacao {
  id: string
  descricao: string
  valorCentavos: number
  tipo: Tipo
  categoria: string
  data: string
  contaId: string | null
}

interface FaturaResumo {
  cartaoId: string
  competencia: string
  vencimento: string
  totalCentavos: number
  quantidadeParcelas: number
  saldoPendenteCentavos: number
  paga: boolean
  pagamentoId: string | null
  contaPagamentoId: string | null
  dataPagamento: string | null
}

interface ParcelaCartaoRelatorio {
  id: string
  descricao: string
  valorCentavos: number
  tipo: 'despesa'
  categoria: string
  data: string
  contaId: null
  origem: 'cartao'
}

interface ContaResumo {
  id: string
  banco: string
  nome: string
  saldoAtualCentavos: number
}

const categorias: Record<Tipo, string[]> = {
  receita: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
  despesa: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros']
}

const nomesPaginas: Record<Pagina, string> = {
  dashboard: 'Visão Geral',
  transacoes: 'Transações',
  relatorios: 'Relatórios',
  contas: 'Minhas contas',
  cartoes: 'Cartões e faturas',
  configuracoes: 'Configurações'
}

const iconesPaginas = {
  dashboard: LayoutDashboard,
  transacoes: ArrowLeftRight,
  relatorios: ChartNoAxesCombined,
  contas: Landmark,
  cartoes: CreditCard,
  configuracoes: Settings
}

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(centavos / 100)
}

function App(): React.JSX.Element {
  const [pagina, setPagina] = useState<Pagina>('dashboard')
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [contas, setContas] = useState<ContaResumo[]>([])
  const [contaId, setContaId] = useState('')
  const [faturasPrevistas, setFaturasPrevistas] = useState<FaturaResumo[]>([])
  const [parcelasCartao, setParcelasCartao] = useState<ParcelaCartaoRelatorio[]>([])
  const [parcelasPendentesIds, setParcelasPendentesIds] = useState<string[]>([])
  const [despesasCartaoPagas, setDespesasCartaoPagas] = useState<Transacao[]>([])
  const [revisaoFinanceira, setRevisaoFinanceira] = useState(0)

  const [mesFiltro, setMesFiltro] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'))
  const [anoFiltro, setAnoFiltro] = useState(() => String(new Date().getFullYear()))
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [busca, setBusca] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erroBanco, setErroBanco] = useState('')
  const [backupOcupado, setBackupOcupado] = useState(false)

  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('fincontrol-tema') === 'dark' ? 'dark' : 'light'
  })

  async function exportarBackupUI(): Promise<void> {
    if (backupOcupado) return
    try {
      setBackupOcupado(true)
      const arquivo = await window.fincontrol.exportarBackup()
      if (arquivo) alert(`Backup criado: ${arquivo}`)
    } catch (falha) {
      alert(falha instanceof Error ? falha.message : 'Falha ao exportar backup.')
    } finally {
      setBackupOcupado(false)
    }
  }

  async function restaurarBackupUI(): Promise<void> {
    if (backupOcupado) return
    try {
      setBackupOcupado(true)
      await window.fincontrol.restaurarBackup()
      // O processo principal recarrega esta janela após uma restauração bem-sucedida.
    } catch (falha) {
      alert(falha instanceof Error ? falha.message : 'Falha ao restaurar backup.')
    } finally {
      setBackupOcupado(false)
    }
  }

  function alternarTema(): void {
    setTema((anterior) => {
      const novoTema = anterior === 'light' ? 'dark' : 'light'

      localStorage.setItem('fincontrol-tema', novoTema)

      return novoTema
    })
  }

  useEffect((): (() => void) => {
    let ativo = true

    window.fincontrol
      .listarTransacoes()
      .then((registros): void => {
        if (ativo) {
          setTransacoes(registros)
        }
      })
      .catch((erro: unknown): void => {
        console.error('Erro ao carregar SQLite:', erro)

        if (ativo) {
          setErroBanco('Não foi possível carregar as transações.')
        }
      })
      .finally((): void => {
        if (ativo) {
          setCarregando(false)
        }
      })

    return (): void => {
      ativo = false
    }
  }, [pagina, revisaoFinanceira])

  useEffect((): (() => void) => {
    let ativo = true
    window.fincontrol
      .listarContas()
      .then((registros): void => {
        if (ativo) setContas(registros)
      })
      .catch((erro: unknown): void => {
        console.error('Erro ao carregar contas:', erro)
      })
    return (): void => {
      ativo = false
    }
  }, [pagina, transacoes, revisaoFinanceira])

  useEffect((): (() => void) => {
    let ativo = true
    Promise.all([
      window.fincontrol.listarFaturasPrevistas(),
      window.fincontrol.listarParcelasRelatorio(),
      window.fincontrol.listarParcelasPagamento(),
      window.fincontrol.listarDespesasCartaoRealizadas()
    ]).then(([listaFaturas, listaParcelas, listaPagamentos, listaRealizadas]): void => {
      if (ativo) {
        setFaturasPrevistas(listaFaturas)
        setParcelasCartao(listaParcelas)
        setParcelasPendentesIds(listaPagamentos.filter((p) => !p.paga).map((p) => p.id))
        setDespesasCartaoPagas(listaRealizadas)
      }
    }).catch((erro: unknown): void => {
      console.error('Erro ao carregar faturas e parcelas:', erro)
    })
    return (): void => { ativo = false }
  }, [pagina, revisaoFinanceira])

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<Tipo>('despesa')
  const [categoria, setCategoria] = useState('Alimentação')

  const [data, setData] = useState((): string => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
  })

  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ]

  // Fluxo efetivo: transações bancárias + parcelas que já foram pagas.
  // Parcelas ainda em aberto ficam apenas na previsão, sem reduzir os resultados reais.
  const hoje = (() => {
    const d = new Date()
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')].join('-')
  })()
  const transacoesRealizadas: Transacao[] = [...transacoes, ...despesasCartaoPagas]
    .filter((t) => t.data <= hoje)
  const pendentes = new Set(parcelasPendentesIds)
  const transacoesPrevistas: Transacao[] = parcelasCartao.filter((t) => pendentes.has(t.id))
  const transacoesContabeis = transacoesRealizadas
  const anosDisponiveis = Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...transacoesContabeis.map((t) => t.data.slice(0, 4)),
      ...transacoesPrevistas.map((t) => t.data.slice(0, 4))
    ])
  ).sort((a, b) => b.localeCompare(a))

  function pertencePeriodo(t: Transacao): boolean {
    const ano = t.data.slice(0, 4)
    const mes = t.data.slice(5, 7)
    return (anoFiltro === 'todos' || ano === anoFiltro) &&
      (mesFiltro === 'todos' || mes === mesFiltro)
  }

  const transacoesPeriodo = transacoesContabeis.filter(pertencePeriodo)
  const transacoesBancariasPeriodo = transacoes.filter(pertencePeriodo)
  const totalReceitas = transacoesPeriodo
    .filter((t) => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valorCentavos, 0)

  const totalDespesas = transacoesPeriodo
    .filter((t) => t.tipo === 'despesa')
    .reduce((soma, t) => soma + t.valorCentavos, 0)

  const transacoesFiltradas = transacoesBancariasPeriodo.filter((t) => {
    const correspondeTipo = tipoFiltro === 'todos' || t.tipo === tipoFiltro

    const correspondeCategoria = categoriaFiltro === 'todas' || t.categoria === categoriaFiltro

    const correspondeBusca = t.descricao
      .toLocaleLowerCase('pt-BR')
      .includes(busca.trim().toLocaleLowerCase('pt-BR'))

    return correspondeTipo && correspondeCategoria && correspondeBusca
  })

  const transacoesOrdenadas = [...transacoesFiltradas].sort((a, b) => b.data.localeCompare(a.data))

  // Categorias reais vêm das transações, não somente das opções fixas da UI.
  const totaisCategorias = new Map<string, number>()
  for (const t of transacoesPeriodo) {
    if (t.tipo === 'despesa') {
      totaisCategorias.set(t.categoria, (totaisCategorias.get(t.categoria) ?? 0) + t.valorCentavos)
    }
  }
  const despesasPorCategoria = [...totaisCategorias.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)

  useEffect(() => {
    let ativo = true
    const cancelar = window.fincontrol.onAtualizacaoAutomatica(() => {
      Promise.all([
        window.fincontrol.listarTransacoes(),
        window.fincontrol.listarContas(),
        window.fincontrol.listarFaturasPrevistas(),
        window.fincontrol.listarParcelasRelatorio(),
        window.fincontrol.listarParcelasPagamento(),
        window.fincontrol.listarDespesasCartaoRealizadas()
      ]).then(([ts, cs, fs, ps, pagamentos, realizadas]) => {
        if (!ativo) return
        setTransacoes(ts)
        setContas(cs)
        setFaturasPrevistas(fs)
        setParcelasCartao(ps)
        setParcelasPendentesIds(pagamentos.filter((p) => !p.paga).map((p) => p.id))
        setDespesasCartaoPagas(realizadas)
      }).catch((erro: unknown) => {
        console.error('Falha ao atualizar dados automaticamente:', erro)
      })
    })
    return () => { ativo = false; cancelar() }
  }, [])

  function iniciarEdicao(transacao: Transacao): void {
    setEditandoId(transacao.id)
    setDescricao(transacao.descricao)
    setValor((transacao.valorCentavos / 100).toFixed(2))
    setTipo(transacao.tipo)
    setCategoria(transacao.categoria)
    setData(transacao.data)
    setContaId(transacao.contaId ?? '')
    setPagina('transacoes')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao(): void {
    setEditandoId(null)
    setDescricao('')
    setValor('')
    setTipo('despesa')
    setCategoria('Alimentação')
    setContaId('')
  }

  function alterarTipo(novoTipo: Tipo): void {
    setTipo(novoTipo)
    setCategoria(categorias[novoTipo][0])
  }

  async function adicionarTransacao(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()

    if (salvando || carregando || erroBanco) {
      return
    }

    const numero = Number(valor.replace(',', '.'))
    const centavos = Math.round(numero * 100)

    if (
      !descricao.trim() ||
      !Number.isFinite(numero) ||
      !Number.isSafeInteger(centavos) ||
      centavos <= 0 ||
      !data || (!editandoId && !contaId && contas.length === 0)
    ) {
      alert('Preencha os campos corretamente.')
      return
    }

    const dados = {
      descricao: descricao.trim(),
      valorCentavos: centavos,
      tipo,
      categoria,
      data,
      contaId: contaId || (!editandoId ? (contas[0]?.id ?? null) : null)
    }

    try {
      setSalvando(true)

      if (editandoId !== null) {
        const atualizada = await window.fincontrol.editarTransacao(editandoId, dados)

        setTransacoes((anteriores) =>
          anteriores.map((transacao) => (transacao.id === editandoId ? atualizada : transacao))
        )
      } else {
        const novaTransacao = await window.fincontrol.salvarTransacao(dados)

        setTransacoes((anteriores) => [...anteriores, novaTransacao])
      }

      cancelarEdicao()
      setPagina('transacoes')
    } catch (erro) {
      console.error('Erro ao salvar transação:', erro)
      alert('Não foi possível salvar a transação.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirTransacao(id: string): Promise<void> {
    if (!window.confirm('Deseja excluir esta transação?')) {
      return
    }

    try {
      await window.fincontrol.removerTransacao(id)

      setTransacoes((anteriores) => anteriores.filter((transacao) => transacao.id !== id))
    } catch (erro) {
      console.error('Erro ao excluir:', erro)
      alert('Não foi possível excluir a transação.')
    }
  }

  function listaTransacoes(lista: Transacao[]): React.JSX.Element {
    if (lista.length === 0) {
      return <p className="vazio">Nenhuma transação cadastrada.</p>
    }

    return (
      <div className="lista">
        {lista.map((t) => (
          <div className="transacao" key={t.id}>
            <div className="transacao-info">
              <strong>{t.descricao}</strong>

              <span>
                {t.categoria} • {t.data.split('-').reverse().join('/')} •{' '}
                {t.contaId
                  ? (contas.find((conta) => conta.id === t.contaId)?.nome ?? 'Conta vinculada')
                  : 'Sem conta'}
              </span>
            </div>

            <strong className={t.tipo}>
              {t.tipo === 'receita' ? '+' : '-'}
              {formatarMoeda(t.valorCentavos)}
            </strong>

            <button className="botao-editar" type="button" onClick={(): void => iniciarEdicao(t)}>
              Editar
            </button>

            <button
              className="botao-excluir"
              type="button"
              onClick={(): void => {
                void excluirTransacao(t.id)
              }}
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="fincontrol" data-theme={tema}>
      <aside className="sidebar">
        <div className="sidebar-logo" title="FinControl">
          <Wallet size={27} strokeWidth={2.2} />
        </div>

        <nav aria-label="Menu principal">
          {(Object.keys(nomesPaginas) as Pagina[]).map((item) => {
            const Icone = iconesPaginas[item]

            return (
              <button
                key={item}
                type="button"
                title={nomesPaginas[item]}
                aria-label={nomesPaginas[item]}
                aria-current={pagina === item ? 'page' : undefined}
                className={pagina === item ? 'ativo' : ''}
                onClick={(): void => setPagina(item)}
              >
                <Icone size={22} strokeWidth={1.9} />
                <span className="menu-texto">{nomesPaginas[item]}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-rodape">
          <button
            type="button"
            className="botao-tema-lateral"
            onClick={alternarTema}
            title={tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            aria-label={tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          >
            {tema === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </aside>

      <main className="content">
        {carregando && <p role="status">Carregando dados financeiros...</p>}
        {erroBanco && (
          <p role="alert" style={{ color: '#dc2626' }}>
            {erroBanco}
          </p>
        )}
        <header className="cabecalho">
          <div>
            <h2>{nomesPaginas[pagina]}</h2>
            <p>Organize seu dinheiro com praticidade.</p>
          </div>

          <button
            className="botao-primario"
            type="button"
            onClick={(): void => {
              cancelarEdicao()
              setPagina('transacoes')
            }}
          >
            + Nova transação
          </button>
        </header>

        {pagina === 'contas' && <ContasBancarias />}
        {pagina === 'cartoes' && (
          <CartoesCredito onAlteracao={(): void => setRevisaoFinanceira((anterior) => anterior + 1)} />
        )}

        {(pagina === 'dashboard' || pagina === 'transacoes' || pagina === 'relatorios') && (
          <section className="filtros-periodo">
            <div className="filtro-campo">
              <label htmlFor="mesFiltro">Mês</label>

              <select
                id="mesFiltro"
                value={mesFiltro}
                onChange={(e): void => setMesFiltro(e.target.value)}
              >
                <option value="todos">Todos os meses</option>

                {meses.map((nome, index) => (
                  <option key={nome} value={String(index + 1).padStart(2, '0')}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtro-campo">
              <label htmlFor="anoFiltro">Ano</label>

              <select
                id="anoFiltro"
                value={anoFiltro}
                onChange={(e): void => setAnoFiltro(e.target.value)}
              >
                <option value="todos">Todos os anos</option>

                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="botao-limpar"
              onClick={(): void => {
                setMesFiltro('todos')
                setAnoFiltro('todos')
              }}
            >
              Limpar período
            </button>
            {(pagina === 'dashboard' || pagina === 'relatorios') && (
              <p className="filtros-aviso">
                Os indicadores seguem o mês e ano selecionados. Os gráficos mostram até seis meses
                por página, dentro do ano escolhido.
              </p>
            )}
          </section>
        )}

        {pagina === 'dashboard' && (
          <DashboardResumo
            saldoContasCentavos={contas.reduce((total, conta) => total + conta.saldoAtualCentavos, 0)}
            receitasCentavos={totalReceitas}
            despesasCentavos={totalDespesas}
            transacoes={transacoesRealizadas}
            previsoes={transacoesPrevistas}
            filtroMes="todos"
            filtroAno={anoFiltro}
            transacoesRecentes={[...transacoesBancariasPeriodo]
              .sort((a, b) => b.data.localeCompare(a.data))
              .slice(0, 5)}
            faturas={faturasPrevistas}
            onPagamentos={(): void => setPagina('cartoes')}
            onTransacoes={(): void => setPagina('transacoes')}
          />
        )}

        {pagina === 'transacoes' && (
          <>
            <section className="painel">
              <h3>{editandoId ? 'Editar movimentação' : 'Adicionar movimentação'}</h3>

              <div className="filtros-avancados">
                <div className="filtro-campo">
                  <label htmlFor="busca">Pesquisar</label>
                  <input
                    id="busca"
                    type="text"
                    placeholder="Buscar descrição..."
                    value={busca}
                    onChange={(e): void => setBusca(e.target.value)}
                  />
                </div>

                <div className="filtro-campo">
                  <label htmlFor="tipoFiltro">Tipo</label>
                  <select
                    id="tipoFiltro"
                    value={tipoFiltro}
                    onChange={(e): void => {
                      setTipoFiltro(e.target.value)
                      setCategoriaFiltro('todas')
                    }}
                  >
                    <option value="todos">Todos</option>
                    <option value="receita">Receitas</option>
                    <option value="despesa">Despesas</option>
                  </select>
                </div>

                <div className="filtro-campo">
                  <label htmlFor="categoriaFiltro">Categoria</label>

                  <select
                    id="categoriaFiltro"
                    value={categoriaFiltro}
                    onChange={(e): void => setCategoriaFiltro(e.target.value)}
                  >
                    <option value="todas">Todas as categorias</option>

                    {Array.from(
                      new Set([
                        ...(tipoFiltro === 'despesa' ? [] : categorias.receita),
                        ...(tipoFiltro === 'receita' ? [] : categorias.despesa)
                      ])
                    ).map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="botao-limpar"
                  onClick={(): void => {
                    setBusca('')
                    setTipoFiltro('todos')
                    setCategoriaFiltro('todas')
                  }}
                >
                  Limpar busca
                </button>
              </div>

              <form
                onSubmit={(e): void => {
                  void adicionarTransacao(e)
                }}
                className="formulario"
              >
                <label>
                  Descrição
                  <input
                    value={descricao}
                    onChange={(e): void => setDescricao(e.target.value)}
                    placeholder="Ex: Supermercado"
                    required
                  />
                </label>

                <label>
                  Valor (R$)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={valor}
                    onChange={(e): void => setValor(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </label>

                <label>
                  Tipo
                  <select value={tipo} onChange={(e): void => alterarTipo(e.target.value as Tipo)}>
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </label>

                <label>
                  Categoria
                  <select value={categoria} onChange={(e): void => setCategoria(e.target.value)}>
                    {categorias[tipo].map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Conta bancária
                  <select value={contaId || (!editandoId ? (contas[0]?.id ?? '') : '')}
                      onChange={(e): void => setContaId(e.target.value)} required={!editandoId}>
                    {editandoId && <option value="">Sem conta vinculada (histórico)</option>}
                    {contas.length === 0 && <option value="">Cadastre uma conta primeiro</option>}
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.banco} · {conta.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Data
                  <input
                    type="date"
                    value={data}
                    onChange={(e): void => setData(e.target.value)}
                    required
                  />
                </label>

                <button
                  className="botao-primario"
                  type="submit"
                  disabled={salvando || carregando || Boolean(erroBanco) || (!editandoId && contas.length === 0)}
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Salvar transação'}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    className="botao-cancelar"
                    onClick={cancelarEdicao}
                    disabled={salvando}
                  >
                    Cancelar edição
                  </button>
                )}
              </form>
            </section>

            <section className="painel">
              <h3>Histórico de transações</h3>

              {listaTransacoes(transacoesOrdenadas)}
            </section>
          </>
        )}

        {pagina === 'relatorios' && (
          <>
            <GraficosFinanceiros transacoes={transacoesRealizadas} previsoes={transacoesPrevistas} filtroMes="todos" filtroAno={anoFiltro} />

            <section className="painel">
              <h3>Resumo financeiro realizado do período</h3>

              <p>Receitas: {formatarMoeda(totalReceitas)}</p>

              <p>Despesas: {formatarMoeda(totalDespesas)}</p>

              <p>Resultado (receitas − despesas): {formatarMoeda(totalReceitas - totalDespesas)}</p>

              <h3 className="subtitulo">Despesas por categoria</h3>

              {despesasPorCategoria.length === 0 ? (
                <p className="vazio">Nenhuma despesa registrada.</p>
              ) : (
                despesasPorCategoria.map((item) => (
                  <div className="categoria-linha" key={item.nome}>
                    <div className="categoria-texto">
                      <span>{item.nome}</span>

                      <strong>{formatarMoeda(item.total)}</strong>
                    </div>

                    <div className="barra-fundo">
                      <div
                        className="barra-progresso"
                        style={{
                          width: `${(item.total / totalDespesas) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {pagina === 'configuracoes' && (
          <div className="pagina-configuracoes">
            <section className="painel">
              <div className="configuracoes-titulo">
                <Tags size={20} />
                <div>
                  <h3>Categorias financeiras</h3>
                  <p>Consulte as categorias disponíveis para receitas e despesas.</p>
                </div>
              </div>
              <h4 className="subtitulo">Receitas</h4>
              <div className="etiquetas">
                {categorias.receita.map((nome) => (
                  <span className="etiqueta" key={nome}>{nome}</span>
                ))}
              </div>
              <h4 className="subtitulo">Despesas</h4>
              <div className="etiquetas">
                {categorias.despesa.map((nome) => (
                  <span className="etiqueta" key={nome}>{nome}</span>
                ))}
              </div>
            </section>
            <section className="painel">
              <h3>Backup e restauração</h3>
              <p>Exporte uma cópia SQLite dos seus dados para outro local ou restaure um backup validado.</p>
              <p>Ao restaurar, os dados atuais serão substituídos. O FinControl cria um backup de emergência antes dessa troca.</p>
              <div className="configuracoes-backup">
                <button type="button" className="botao-primario" disabled={backupOcupado}
                  onClick={(): void => { void exportarBackupUI() }}>
                  {backupOcupado ? 'Processando...' : 'Exportar backup'}
                </button>
                <button type="button" className="botao-secundario" disabled={backupOcupado}
                  onClick={(): void => { void restaurarBackupUI() }}>
                  Restaurar backup
                </button>
              </div>
            </section>
            <section className="painel">
              <h3>Sobre o aplicativo</h3>
              <p>FinControl — Controle Financeiro Pessoal</p>
              <p>Versão em desenvolvimento — preparação para FinControl 1.0</p>
              <p>Moeda: Real brasileiro (BRL)</p>
              <p>Armazenamento: banco SQLite local.</p>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
