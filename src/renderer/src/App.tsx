import { useState } from 'react'
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

  const totalReceitas = transacoes
    .filter((t) => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valorCentavos, 0)

  const totalDespesas = transacoes
    .filter((t) => t.tipo === 'despesa')
    .reduce((soma, t) => soma + t.valorCentavos, 0)

  const saldo = totalReceitas - totalDespesas

  const transacoesOrdenadas = [...transacoes].sort((a, b) => b.data.localeCompare(a.data))

  const despesasPorCategoria = categorias.despesa
    .map((nome) => ({
      nome,
      total: transacoes
        .filter((t) => t.tipo === 'despesa' && t.categoria === nome)
        .reduce((soma, t) => soma + t.valorCentavos, 0)
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)

  function alterarTipo(novoTipo: Tipo): void {
    setTipo(novoTipo)
    setCategoria(categorias[novoTipo][0])
  }

  function adicionarTransacao(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()

    const numero = Number(valor.replace(',', '.'))
    const centavos = Math.round(numero * 100)

    if (
      !descricao.trim() ||
      !Number.isFinite(numero) ||
      !Number.isSafeInteger(centavos) ||
      centavos <= 0 ||
      !data
    ) {
      alert('Preencha os campos com um valor válido.')
      return
    }

    const novaTransacao: Transacao = {
      id: crypto.randomUUID(),
      descricao: descricao.trim(),
      valorCentavos: centavos,
      tipo,
      categoria,
      data
    }

    setTransacoes((anteriores) => [...anteriores, novaTransacao])

    setDescricao('')
    setValor('')
    setPagina('transacoes')
  }

  function excluirTransacao(id: string): void {
    if (!window.confirm('Deseja excluir esta transação?')) {
      return
    }

    setTransacoes((anteriores) => anteriores.filter((transacao) => transacao.id !== id))
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

            <button
              className="botao-excluir"
              type="button"
              onClick={(): void => excluirTransacao(t.id)}
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
        <header className="cabecalho">
          <div>
            <h2>{nomesPaginas[pagina]}</h2>
            <p>Organize seu dinheiro com praticidade.</p>
          </div>

          <button
            className="botao-primario"
            type="button"
            onClick={(): void => setPagina('transacoes')}
          >
            + Nova transação
          </button>
        </header>

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

            <section className="painel">
              <h3>Últimas Transações</h3>

              {listaTransacoes(transacoesOrdenadas.slice(0, 5))}
            </section>
          </>
        )}

        {pagina === 'transacoes' && (
          <>
            <section className="painel">
              <h3>Adicionar movimentação</h3>

              <form onSubmit={adicionarTransacao} className="formulario">
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

                <button className="botao-primario" type="submit">
                  Salvar transação
                </button>
              </form>
            </section>

            <section className="painel">
              <h3>Histórico de transações</h3>

              {listaTransacoes(transacoesOrdenadas)}
            </section>
          </>
        )}

        {pagina === 'relatorios' && (
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
