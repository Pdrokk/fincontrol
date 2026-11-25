import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import GraficosFinanceiros from './components/GraficosFinanceiros'
import DashboardResumo from './components/DashboardResumo'
import Feedback from './components/Feedback'
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
  const [ordenacaoHistorico, setOrdenacaoHistorico] = useState<'recentes' | 'antigas' | 'maior' | 'menor'>('recentes')
  const [paginaHistorico, setPaginaHistorico] = useState(0)
  const [itensPorPagina, setItensPorPagina] = useState(15)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erroBanco, setErroBanco] = useState('')
  const [backupOcupado, setBackupOcupado] = useState(false)
  const [mensagemOperacao, setMensagemOperacao] = useState('')
  const [erroOperacao, setErroOperacao] = useState('')
  const [mensagemBackup, setMensagemBackup] = useState('')
  const [erroBackup, setErroBackup] = useState('')

  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('fincontrol-tema') === 'dark' ? 'dark' : 'light'
  })

  async function exportarBackupUI(): Promise<void> {
    if (backupOcupado) return
    try {
      setErroBackup('')
      setMensagemBackup('')
      setBackupOcupado(true)
      const arquivo = await window.fincontrol.exportarBackup()
      if (arquivo) setMensagemBackup(`Backup criado em: ${arquivo}`)
    } catch (falha) {
      setErroBackup(falha instanceof Error ? falha.message : 'Falha ao exportar backup.')
    } finally {
      setBackupOcupado(false)
    }
  }

  async function restaurarBackupUI(): Promise<void> {
    if (backupOcupado) return
    try {
      setErroBackup('')
      setMensagemBackup('')
      setBackupOcupado(true)
      await window.fincontrol.restaurarBackup()
      // O processo principal recarrega esta janela após uma restauração bem-sucedida.
    } catch (falha) {
      setErroBackup(falha instanceof Error ? falha.message : 'Falha ao restaurar backup.')
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
          setErroBanco('')
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
  const transacoesRealizadas = useMemo(
    () => [...transacoes, ...despesasCartaoPagas].filter((t) => t.data <= hoje),
    [transacoes, despesasCartaoPagas, hoje]
  )
  const transacoesPrevistas = useMemo(() => {
    const pendentes = new Set(parcelasPendentesIds)
    return parcelasCartao.filter((t) => pendentes.has(t.id))
  }, [parcelasCartao, parcelasPendentesIds])
  const transacoesContabeis = transacoesRealizadas
  const anosDisponiveis = useMemo(() => Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...transacoesContabeis.map((t) => t.data.slice(0, 4)),
      ...transacoesPrevistas.map((t) => t.data.slice(0, 4))
    ])
  ).sort((a, b) => b.localeCompare(a)), [transacoesContabeis, transacoesPrevistas])

  const periodoDescricao = mesFiltro !== 'todos'
    ? `${meses[Number(mesFiltro) - 1]} · ${anoFiltro === 'todos' ? 'todos os anos' : anoFiltro}`
    : anoFiltro === 'todos' ? 'Todo o histórico' : `Ano de ${anoFiltro}`

  const transacoesPeriodo = useMemo(() => transacoesContabeis.filter((t) => (
    (anoFiltro === 'todos' || t.data.slice(0, 4) === anoFiltro) &&
    (mesFiltro === 'todos' || t.data.slice(5, 7) === mesFiltro)
  )), [transacoesContabeis, anoFiltro, mesFiltro])
  const transacoesBancariasPeriodo = useMemo(() => transacoes.filter((t) => (
    (anoFiltro === 'todos' || t.data.slice(0, 4) === anoFiltro) &&
    (mesFiltro === 'todos' || t.data.slice(5, 7) === mesFiltro)
  )), [transacoes, anoFiltro, mesFiltro])
  const { totalReceitas, totalDespesas } = useMemo(() => {
    let receitas = 0
    let despesas = 0
    for (const t of transacoesPeriodo) {
      if (t.tipo === 'receita') receitas += t.valorCentavos
      else despesas += t.valorCentavos
    }
    return { totalReceitas: receitas, totalDespesas: despesas }
  }, [transacoesPeriodo])

  const contasPorId = useMemo(() => new Map(contas.map((conta) => [conta.id, conta])), [contas])
  const buscaAdiada = useDeferredValue(busca)
  const buscaNormalizada = buscaAdiada.trim().toLocaleLowerCase('pt-BR')
  const indicePesquisa = useMemo(() => new Map(transacoes.map((t) => {
    const conta = contasPorId.get(t.contaId ?? '')
    return [t.id, [t.descricao, t.categoria, conta?.nome, conta?.banco]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')]
  })), [transacoes, contasPorId])
  const transacoesFiltradas = useMemo(() => transacoesBancariasPeriodo.filter((t) => (
    (tipoFiltro === 'todos' || t.tipo === tipoFiltro) &&
    (categoriaFiltro === 'todas' || t.categoria === categoriaFiltro) &&
    (!buscaNormalizada || (indicePesquisa.get(t.id) ?? '').includes(buscaNormalizada))
  )), [transacoesBancariasPeriodo, tipoFiltro, categoriaFiltro, buscaNormalizada, indicePesquisa])

  // Categorias históricas e importadas também devem aparecer no filtro e na edição.
  const categoriasVisiveis = useMemo(() => Array.from(new Set([
    ...(tipoFiltro === 'despesa' ? [] : categorias.receita),
    ...(tipoFiltro === 'receita' ? [] : categorias.despesa),
    ...transacoes.filter((t) => tipoFiltro === 'todos' || t.tipo === tipoFiltro)
      .map((t) => t.categoria)
  ])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [transacoes, tipoFiltro])

  const categoriasDoFormulario = useMemo(() => Array.from(new Set([
    ...categorias[tipo],
    ...transacoes.filter((t) => t.tipo === tipo).map((t) => t.categoria),
    ...(categoria && !categorias[tipo].includes(categoria) ? [categoria] : [])
  ])), [transacoes, tipo, categoria])

  const transacoesOrdenadas = useMemo(() => [...transacoesFiltradas].sort((a, b) => {
    if (ordenacaoHistorico === 'maior' || ordenacaoHistorico === 'menor') {
      const diferenca = ordenacaoHistorico === 'maior'
        ? b.valorCentavos - a.valorCentavos
        : a.valorCentavos - b.valorCentavos
      if (diferenca !== 0) return diferenca
    }
    const data = ordenacaoHistorico === 'antigas'
      ? a.data.localeCompare(b.data)
      : b.data.localeCompare(a.data)
    return data || a.id.localeCompare(b.id)
  }), [transacoesFiltradas, ordenacaoHistorico])
  const totalPaginasHistorico = Math.max(1, Math.ceil(transacoesOrdenadas.length / itensPorPagina))
  const paginaHistoricoAtual = Math.min(paginaHistorico, totalPaginasHistorico - 1)
  const inicioHistorico = paginaHistoricoAtual * itensPorPagina
  const transacoesPagina = transacoesOrdenadas.slice(inicioHistorico, inicioHistorico + itensPorPagina)
  const transacoesRecentes = useMemo(() => [...transacoesBancariasPeriodo]
    .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5), [transacoesBancariasPeriodo])

  // Categorias reais vêm das transações, não somente das opções fixas da UI.
  const despesasPorCategoria = useMemo(() => {
    const totais = new Map<string, number>()
    for (const t of transacoesPeriodo) {
      if (t.tipo === 'despesa') {
        totais.set(t.categoria, (totais.get(t.categoria) ?? 0) + t.valorCentavos)
      }
    }
    return [...totais.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
  }, [transacoesPeriodo])

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

    setErroOperacao('')
    setMensagemOperacao('')
    const valorNormalizado = valor.trim()
    const valorValido = /^\d+([,.]\d{1,2})?$/.test(valorNormalizado)
    const numero = Number(valorNormalizado.replace(',', '.'))
    const centavos = valorValido ? Math.round(numero * 100) : 0

    if (
      !descricao.trim() ||
      !valorValido ||
      !Number.isFinite(numero) ||
      !Number.isSafeInteger(centavos) ||
      centavos <= 0 ||
      !data || (!editandoId && !contaId && contas.length === 0)
    ) {
      setErroOperacao('Confira a descrição, a conta, a data e o valor. Use até duas casas decimais (ex.: 125,50).')
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
      setMensagemOperacao(editandoId ? 'Transação atualizada com sucesso.' : 'Transação registrada com sucesso.')
      setPagina('transacoes')
    } catch (erro) {
      console.error('Erro ao salvar transação:', erro)
      setErroOperacao('Não foi possível salvar a transação. Confira os dados e tente novamente.')
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
      setErroOperacao('')
      setMensagemOperacao('Transação excluída com sucesso.')
    } catch (erro) {
      console.error('Erro ao excluir:', erro)
      setErroOperacao('Não foi possível excluir a transação. Tente novamente.')
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
                  ? (contasPorId.get(t.contaId)?.nome ?? 'Conta vinculada')
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
              <p className="filtros-aviso" role="status">
                <strong>Período selecionado: {periodoDescricao}.</strong>{' '}
                {anoFiltro === 'todos' && mesFiltro === 'todos'
                  ? 'Os totais abrangem todo o histórico; use as setas dos gráficos para explorar as janelas de seis meses.'
                  : 'Indicadores e gráficos seguem o mesmo filtro. No modo Previsto, são exibidas apenas parcelas em aberto.'}
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
            filtroMes={mesFiltro}
            filtroAno={anoFiltro}
            transacoesRecentes={transacoesRecentes}
            faturas={faturasPrevistas}
            onPagamentos={(): void => setPagina('cartoes')}
            onTransacoes={(): void => setPagina('transacoes')}
          />
        )}

        {pagina === 'transacoes' && (
          <>
            <section className="painel">
              <h3>{editandoId ? 'Editar movimentação' : 'Adicionar movimentação'}</h3>
              <Feedback mensagem={erroOperacao} tipo="erro" />
              <Feedback mensagem={mensagemOperacao} tipo="sucesso" />

              <div className="filtros-avancados">
                <div className="filtro-campo">
                  <label htmlFor="busca">Pesquisar</label>
                  <input
                    id="busca"
                    type="text"
                    placeholder="Descrição, categoria ou conta..."
                    value={busca}
                    onChange={(e): void => { setBusca(e.target.value); setPaginaHistorico(0) }}
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
                      setPaginaHistorico(0)
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
                    onChange={(e): void => { setCategoriaFiltro(e.target.value); setPaginaHistorico(0) }}
                  >
                    <option value="todas">Todas as categorias</option>

                    {categoriasVisiveis.map((nome) => (
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
                    setPaginaHistorico(0)
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
                    maxLength={200}
                    onChange={(e): void => setDescricao(e.target.value)}
                    placeholder="Ex: Supermercado"
                    required
                  />
                </label>

                <label>
                  Valor (R$)
                  <input
                    type="text"
                    inputMode="decimal"
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
                    {categoriasDoFormulario.map((nome) => (
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
              <div className="historico-cabecalho">
                <div>
                  <h3>Histórico de transações</h3>
                  <p className="historico-resumo" role="status">
                    {transacoesOrdenadas.length === 0
                      ? 'Nenhum resultado para os filtros atuais.'
                      : `Mostrando ${inicioHistorico + 1}–${Math.min(inicioHistorico + itensPorPagina, transacoesOrdenadas.length)} de ${transacoesOrdenadas.length} transações`}
                  </p>
                </div>
                <div className="historico-controles">
                  <label htmlFor="historico-ordenacao">Ordenar por
                    <select id="historico-ordenacao" value={ordenacaoHistorico}
                      onChange={(e): void => {
                        setOrdenacaoHistorico(e.target.value as typeof ordenacaoHistorico)
                        setPaginaHistorico(0)
                      }}>
                      <option value="recentes">Mais recentes</option>
                      <option value="antigas">Mais antigas</option>
                      <option value="maior">Maior valor</option>
                      <option value="menor">Menor valor</option>
                    </select>
                  </label>
                  <label htmlFor="historico-tamanho">Por página
                    <select id="historico-tamanho" value={itensPorPagina}
                      onChange={(e): void => { setItensPorPagina(Number(e.target.value)); setPaginaHistorico(0) }}>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
              </div>
              {transacoesOrdenadas.length === 0
                ? <div className="historico-sem-resultados">
                    <p className="vazio">
                      {transacoes.length === 0
                        ? 'Nenhuma transação cadastrada. Registre sua primeira movimentação acima.'
                        : 'Nenhuma transação corresponde aos filtros selecionados.'}
                    </p>
                    {transacoes.length > 0 && (
                      <button type="button" className="botao-limpar" onClick={(): void => {
                        setBusca(''); setTipoFiltro('todos'); setCategoriaFiltro('todas')
                        setMesFiltro('todos'); setAnoFiltro('todos'); setPaginaHistorico(0)
                      }}>Limpar todos os filtros</button>
                    )}
                  </div>
                : listaTransacoes(transacoesPagina)}
              {totalPaginasHistorico > 1 && (
                <nav className="historico-paginacao" aria-label="Paginação do histórico">
                  <button type="button" disabled={paginaHistoricoAtual === 0}
                    onClick={(): void => setPaginaHistorico((p) => Math.max(0, p - 1))}>
                    Anterior
                  </button>
                  <span>Página {paginaHistoricoAtual + 1} de {totalPaginasHistorico}</span>
                  <button type="button" disabled={paginaHistoricoAtual === totalPaginasHistorico - 1}
                    onClick={(): void => setPaginaHistorico((p) => Math.min(totalPaginasHistorico - 1, p + 1))}>
                    Próxima
                  </button>
                </nav>
              )}
            </section>
          </>
        )}

        {pagina === 'relatorios' && (
          <>
            <GraficosFinanceiros transacoes={transacoesRealizadas} previsoes={transacoesPrevistas} filtroMes={mesFiltro} filtroAno={anoFiltro} />

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
              <Feedback mensagem={erroBackup} tipo="erro" />
              <Feedback mensagem={mensagemBackup} tipo="sucesso" />
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
              <p>Versão 1.0 · aplicativo desktop offline</p>
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
