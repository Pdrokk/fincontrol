import { useEffect, useState } from 'react'
import GraficosFinanceiros from './components/GraficosFinanceiros'
import './assets/main.css'

type Tipo = 'receita' | 'despesa'

type Pagina = 'dashboard' | 'transacoes' | 'relatorios' | 'categorias' | 'configuracoes'

interface Transacao {
  id: string
  descricao: string
  valorCentavos: number
  tipo: Tipo
  categoria: string
  data: string
}

const categorias: Record<Tipo, string[]> = {
  receita: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
  despesa: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros']
}

const nomesPaginas: Record<Pagina, string> = {
  dashboard: 'Visão Geral',
  transacoes: 'Transações',
  relatorios: 'Relatórios',
  categorias: 'Categorias',
  configuracoes: 'Configurações'
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

  const [mesFiltro, setMesFiltro] = useState('todos')
  const [anoFiltro, setAnoFiltro] = useState('todos')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [busca, setBusca] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erroBanco, setErroBanco] = useState('')

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
  }, [])

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

  const anosDisponiveis = Array.from(new Set(transacoes.map((t) => t.data.slice(0, 4)))).sort(
    (a, b) => b.localeCompare(a)
  )

  const transacoesPeriodo = transacoes.filter((t) => {
    const ano = t.data.slice(0, 4)
    const mes = t.data.slice(5, 7)

    const correspondeAno = anoFiltro === 'todos' || ano === anoFiltro

    const correspondeMes = mesFiltro === 'todos' || mes === mesFiltro

    return correspondeAno && correspondeMes
  })

  const totalReceitas = transacoesPeriodo
    .filter((t) => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valorCentavos, 0)

  const totalDespesas = transacoesPeriodo
    .filter((t) => t.tipo === 'despesa')
    .reduce((soma, t) => soma + t.valorCentavos, 0)

  const saldo = totalReceitas - totalDespesas

  const transacoesFiltradas = transacoesPeriodo.filter((t) => {
    const correspondeTipo = tipoFiltro === 'todos' || t.tipo === tipoFiltro

    const correspondeCategoria = categoriaFiltro === 'todas' || t.categoria === categoriaFiltro

    const correspondeBusca = t.descricao
      .toLocaleLowerCase('pt-BR')
      .includes(busca.trim().toLocaleLowerCase('pt-BR'))

    return correspondeTipo && correspondeCategoria && correspondeBusca
  })

  const transacoesOrdenadas = [...transacoesFiltradas].sort((a, b) => b.data.localeCompare(a.data))

  const despesasPorCategoria = categorias.despesa
    .map((nome) => ({
      nome,
      total: transacoesPeriodo
        .filter((t) => t.tipo === 'despesa' && t.categoria === nome)
        .reduce((soma, t) => soma + t.valorCentavos, 0)
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)

  function iniciarEdicao(transacao: Transacao): void {
    setEditandoId(transacao.id)
    setDescricao(transacao.descricao)
    setValor((transacao.valorCentavos / 100).toFixed(2))
    setTipo(transacao.tipo)
    setCategoria(transacao.categoria)
    setData(transacao.data)
    setPagina('transacoes')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao(): void {
    setEditandoId(null)
    setDescricao('')
    setValor('')
    setTipo('despesa')
    setCategoria('Alimentação')
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
      !data
    ) {
      alert('Preencha os campos corretamente.')
      return
    }

    const dados = {
      descricao: descricao.trim(),
      valorCentavos: centavos,
      tipo,
      categoria,
      data
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
                {t.categoria} • {t.data.split('-').reverse().join('/')}
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
    <div className="fincontrol">
      <aside className="sidebar">
        <h1>FinControl</h1>

        <p className="sidebar-subtitulo">Controle Financeiro</p>

        <nav>
          {(Object.keys(nomesPaginas) as Pagina[]).map((item) => (
            <button
              key={item}
              type="button"
              className={pagina === item ? 'ativo' : ''}
              onClick={(): void => setPagina(item)}
            >
              {nomesPaginas[item]}
            </button>
          ))}
        </nav>

        <p className="sidebar-rodape">FinControl • TCC</p>
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
          </section>
        )}

        {pagina === 'dashboard' && (
          <>
            <section className="cards">
              <div className="card">
                <h3>Saldo Total</h3>
                <strong>{formatarMoeda(saldo)}</strong>
              </div>

              <div className="card">
                <h3>Receitas</h3>
                <strong className="receita">{formatarMoeda(totalReceitas)}</strong>
              </div>

              <div className="card">
                <h3>Despesas</h3>
                <strong className="despesa">{formatarMoeda(totalDespesas)}</strong>
              </div>
            </section>

            <GraficosFinanceiros transacoes={transacoesPeriodo} />

            <section className="painel">
              <h3>Últimas Transações</h3>

              {listaTransacoes(
                [...transacoesPeriodo].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)
              )}
            </section>
          </>
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
                  disabled={salvando || carregando || Boolean(erroBanco)}
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
            <GraficosFinanceiros transacoes={transacoesPeriodo} />

            <section className="painel">
              <h3>Resumo financeiro</h3>

              <p>Receitas: {formatarMoeda(totalReceitas)}</p>

              <p>Despesas: {formatarMoeda(totalDespesas)}</p>

              <p>Saldo: {formatarMoeda(saldo)}</p>

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

        {pagina === 'categorias' && (
          <section className="painel">
            <h3>Categorias disponíveis</h3>

            <h4 className="subtitulo">Receitas</h4>

            <div className="etiquetas">
              {categorias.receita.map((nome) => (
                <span className="etiqueta" key={nome}>
                  {nome}
                </span>
              ))}
            </div>

            <h4 className="subtitulo">Despesas</h4>

            <div className="etiquetas">
              {categorias.despesa.map((nome) => (
                <span className="etiqueta" key={nome}>
                  {nome}
                </span>
              ))}
            </div>
          </section>
        )}

        {pagina === 'configuracoes' && (
          <section className="painel">
            <h3>Sobre o aplicativo</h3>

            <p>FinControl — Controle Financeiro Pessoal</p>

            <p>Versão de desenvolvimento: 0.1.0</p>

            <p>Moeda: Real brasileiro (BRL)</p>

            <p>Armazenamento permanente: ainda não configurado.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
