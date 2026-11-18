import { useEffect, useState } from 'react'
import { CreditCard, Plus, Pencil } from 'lucide-react'
import { gradienteBanco } from '../utils/coresBancos'
import CentralPagamentos from './CentralPagamentos'

interface Cartao {
  id: string
  contaId: string | null
  nome: string
  banco: string
  limiteCentavos: number
  limiteUtilizadoCentavos: number
  limiteDisponivelCentavos: number
  diaFechamento: number
  diaVencimento: number
}
interface Conta {
  id: string
  nome: string
  banco: string
  saldoAtualCentavos: number
}
interface Compra {
  id: string
  cartaoId: string
  descricao: string
  categoria: string
  data: string
  valorCentavos: number
  numeroParcelas: number
}
interface Fatura {
  cartaoId: string
  competencia: string
  vencimento: string
  totalCentavos: number
  quantidadeParcelas: number
  valorPagoCentavos: number
  saldoPendenteCentavos: number
  paga: boolean
  pagamentoId: string | null
  contaPagamentoId: string | null
  dataPagamento: string | null
}


function moeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100
  )
}

function paraCentavos(texto: string): number | null {
  const s = texto.trim()
  if (!/^\d+([,.]\d{1,2})?$/.test(s)) return null
  const [reais, centavos = ''] = s.replace(',', '.').split('.')
  const valor = Number(reais) * 100 + Number(centavos.padEnd(2, '0'))
  return Number.isSafeInteger(valor) ? valor : null
}

function dataLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CartoesCredito(): React.JSX.Element {
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [banco, setBanco] = useState('')
  const [nome, setNome] = useState('')
  const [contaId, setContaId] = useState('')
  const [limite, setLimite] = useState('0')
  const [fechamento, setFechamento] = useState('25')
  const [vencimento, setVencimento] = useState('5')
  const [cartaoEditandoId, setCartaoEditandoId] = useState<string | null>(null)

  const [cartaoId, setCartaoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Outros')
  const [valor, setValor] = useState('')
  const [parcelas, setParcelas] = useState('1')
  const [data, setData] = useState(dataLocal)

  async function atualizar(): Promise<void> {
    const [listaCartoes, listaContas, listaCompras, listaFaturas, listaParcelas] =
      await Promise.all([
        window.fincontrol.listarCartoes(),
        window.fincontrol.listarContas(),
        window.fincontrol.listarComprasCartao(),
        window.fincontrol.listarFaturasPrevistas(),
        window.fincontrol.listarParcelasPagamento()
      ])
    setCartoes(listaCartoes)
    setContas(listaContas)
    setCompras(listaCompras)
    setFaturas(listaFaturas)
  }

  useEffect((): (() => void) => {
    let ativo = true
    Promise.all([
      window.fincontrol.listarCartoes(),
      window.fincontrol.listarContas(),
      window.fincontrol.listarComprasCartao(),
      window.fincontrol.listarFaturasPrevistas()
    ]).then(([c, b, comprasCarregadas, faturasCarregadas]): void => {
      if (ativo) {
        setCartoes(c)
        setContas(b)
        setCompras(comprasCarregadas)
        setFaturas(faturasCarregadas)
      }
    }).catch((falha: unknown): void => {
      console.error(falha)
      if (ativo) setErro('Não foi possível carregar cartões ou faturas.')
    }).finally((): void => { if (ativo) setCarregando(false) })
    return (): void => { ativo = false }
  }, [])

  function iniciarEdicaoCartao(cartao: Cartao): void {
    setCartaoEditandoId(cartao.id)
    setBanco(cartao.banco)
    setNome(cartao.nome)
    setContaId(cartao.contaId || '')
    setLimite((cartao.limiteCentavos / 100).toFixed(2).replace('.', ','))
    setFechamento(String(cartao.diaFechamento))
    setVencimento(String(cartao.diaVencimento))
    document.getElementById('formulario-cartao')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function limparFormularioCartao(): void {
    setCartaoEditandoId(null)
    setBanco('')
    setNome('')
    setContaId('')
    setLimite('0')
    setFechamento('25')
    setVencimento('5')
  }

  async function salvarCartao(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (salvando || carregando || erro) return
    const limiteCentavos = paraCentavos(limite)
    if (limiteCentavos === null) {
      alert('Limite inválido.')
      return
    }
    try {
      setSalvando(true)
      if (cartaoEditandoId) {
        await window.fincontrol.atualizarCartao(cartaoEditandoId, dados)
      } else {
        await window.fincontrol.cadastrarCartao(dados)
      }
      await atualizar()
      limparFormularioCartao()
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível cadastrar o cartão.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarCompra(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (salvando || carregando || erro) return
    const valorCentavos = paraCentavos(valor)
    if (valorCentavos === null || valorCentavos <= 0) {
      alert('Informe um valor de compra válido.')
      return
    }
    try {
      setSalvando(true)
      await window.fincontrol.cadastrarCompraCartao({
        cartaoId,
        descricao: descricao.trim(),
        categoria: categoria.trim(),
        data,
        valorCentavos,
        numeroParcelas: Number(parcelas)
      })
      await atualizar()
      setDescricao('')
      setValor('')
      setParcelas('1')
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível cadastrar a compra. Verifique o valor e a quantidade de parcelas.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarPagamento(fatura: Fatura): Promise<void> {
    if (salvando || fatura.paga) return
    const chave = fatura.cartaoId + ':' + fatura.competencia
    const cartao = cartoes.find((c) => c.id === fatura.cartaoId)
    const contaIdPagamento = contaPagamento[chave] || cartao?.contaId || ''
    if (!contaIdPagamento) {
      alert('Selecione uma conta bancária para pagar a fatura.')
      return
    }
    if (
      !window.confirm(
        `Confirmar pagamento integral de ${moeda(fatura.totalCentavos)} com vencimento em ${fatura.vencimento}?`
      )
    )
      return
    try {
      setSalvando(true)
      await window.fincontrol.pagarFatura({
        cartaoId: fatura.cartaoId,
        competencia: fatura.competencia,
        contaId: contaIdPagamento,
        dataPagamento: dataLocal()
      })
      await atualizar()
      alert('Fatura paga! O saldo da conta e o limite foram atualizados.')
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível pagar a fatura. Confirme o saldo e se ela já foi paga.')
    } finally {
      setSalvando(false)
    }
  }

  async function pagarLote(): Promise<void> {
    if (salvando || selecionadas.length === 0 || !contaLote) return
    const total = parcelasPagamento
      .filter((p) => selecionadas.includes(p.id))
      .reduce((soma, p) => soma + p.valorCentavos, 0)
    if (
      !window.confirm(
        `Pagar ${selecionadas.length} parcela(s), total ${moeda(total)}, usando a conta selecionada?`
      )
    )
      return
    try {
      setSalvando(true)
      await window.fincontrol.pagarParcelasSelecionadas({
        parcelaIds: selecionadas,
        contaId: contaLote,
        dataPagamento: dataLocal()
      })
      await atualizar()
      alert('Parcelas pagas. O saldo bancário e o limite do cartão foram atualizados.')
    } catch (falha) {
      console.error(falha)
      alert(falha instanceof Error ? falha.message : 'Erro ao pagar parcelas.')
    } finally {
      setSalvando(false)
    }
  }

  function marcarParcela(id: string, marcada: boolean): void {
    setSelecionadas((prev) => (marcada ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const nomeCartao = (id: string): string => {
    const c = cartoes.find((item) => item.id === id)
    return c ? `${c.banco} · ${c.nome}` : 'Cartão não encontrado'
  }
  const totalAberto = faturas
    .filter((f) => !f.paga)
    .reduce((soma, fatura) => soma + fatura.saldoPendenteCentavos, 0)

  return (
    <div className="pagina-cartoes">
      <section className="painel">
        <div className="titulo-contas">
          <div>
            <h3>Meus cartões de crédito</h3>
            <p>Cartões cadastrados manualmente, sem conexão bancária.</p>
          </div>
          <CreditCard size={26} />
        </div>

        <div className="resumo-contas">
          <span>Total de faturas em aberto</span>
          <strong>{moeda(totalAberto)}</strong>
          <small>
            Pagamentos são registrados na conta escolhida e não geram despesas duplicadas.
          </small>
        </div>

        {carregando && <p>Carregando dados...</p>}
        {erro && <p role="alert">{erro}</p>}

        <div className="grade-contas">
          {cartoes.map((c) => (
            <article className="cartao-conta" key={c.id}>
              <div className="cartao-conta-topo">
                <CreditCard size={24} />
                <strong>{c.banco}</strong>
              </div>
              <span>{c.nome}</span>
              <h3>Disponível: {moeda(c.limiteDisponivelCentavos)}</h3>
              <p>Limite contratado: {moeda(c.limiteCentavos)}</p>
              <p>Utilizado: {moeda(c.limiteUtilizadoCentavos)}</p>
              <p>
                Fechamento: dia {c.diaFechamento} · Vencimento: dia {c.diaVencimento}
              </p>
              <small>
                {c.contaId
                  ? 'Conta: ' + (contas.find((x) => x.id === c.contaId)?.nome ?? 'Vinculada')
                  : 'Sem conta para pagamento definida'}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="painel">
        <h3>Cadastrar cartão</h3>
        <form
          className="formulario"
          onSubmit={(e): void => {
            void salvarCartao(e)
          }}
        >
          <label>
            Banco ou instituição
            <input
              value={banco}
              maxLength={100}
              onChange={(e): void => setBanco(e.target.value)}
              required
              placeholder="Ex: Nubank"
            />
          </label>
          <label>
            Nome do cartão
            <input
              value={nome}
              maxLength={100}
              onChange={(e): void => setNome(e.target.value)}
              required
              placeholder="Ex: Cartão principal"
            />
          </label>
          <label>
            Conta associada (opcional)
            <select value={contaId} onChange={(e): void => setContaId(e.target.value)}>
              <option value="">Nenhuma</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Limite contratado (R$)
            <input
              value={limite}
              inputMode="decimal"
              onChange={(e): void => setLimite(e.target.value)}
              required
            />
          </label>
          <label>
            Dia de fechamento (1–28)
            <input
              type="number"
              min="1"
              max="28"
              value={fechamento}
              onChange={(e): void => setFechamento(e.target.value)}
              required
            />
          </label>
          <label>
            Dia de vencimento (1–28)
            <input
              type="number"
              min="1"
              max="28"
              value={vencimento}
              onChange={(e): void => setVencimento(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="botao-primario"
            disabled={salvando || carregando || Boolean(erro)}
          >
            <Plus size={17} /> Cadastrar cartão
          </button>
          {cartaoEditandoId && (
            <button type="button" className="botao-cancelar"
              onClick={limparFormularioCartao}>Cancelar edição</button>
          )}
        </form>
      </section>

      <section className="painel">
        <h3>Registrar compra no cartão</h3>
        <form
          className="formulario"
          onSubmit={(e): void => {
            void salvarCompra(e)
          }}
        >
          <label>
            Cartão utilizado
            <select value={cartaoId} onChange={(e): void => setCartaoId(e.target.value)} required>
              <option value="">Selecione</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrição
            <input
              value={descricao}
              maxLength={200}
              onChange={(e): void => setDescricao(e.target.value)}
              required
              placeholder="Ex: Notebook"
            />
          </label>
          <label>
            Categoria
            <select value={categoria} onChange={(e): void => setCategoria(e.target.value)}>
              {['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'].map(
                (c) => (
                  <option key={c}>{c}</option>
                )
              )}
            </select>
          </label>
          <label>
            Valor total (R$)
            <input
              value={valor}
              inputMode="decimal"
              onChange={(e): void => setValor(e.target.value)}
              required
              placeholder="3600,00"
            />
          </label>
          <label>
            Quantidade de parcelas
            <input
              type="number"
              min="1"
              max="120"
              value={parcelas}
              onChange={(e): void => setParcelas(e.target.value)}
              required
            />
          </label>
          <label>
            Data da compra
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
            disabled={salvando || carregando || Boolean(erro) || cartoes.length === 0}
          >
            <Plus size={17} /> Registrar compra e gerar parcelas
          </button>
        </form>
      </section>

      <section className="painel">
        <div className="titulo-contas">
          <div>
            <h3>Faturas previstas</h3>
            <p>Valores calculados automaticamente a partir das parcelas.</p>
          </div>
          <CalendarDays size={23} />
        </div>
        {faturas.length === 0 && <p className="vazio">Nenhuma fatura prevista.</p>}
        {faturas.map((f) => {
          const chave = `${f.cartaoId}:${f.competencia}`
          const cartao = cartoes.find((c) => c.id === f.cartaoId)
          const contaSelecionada = contaPagamento[chave] || cartao?.contaId || ''
          return (
            <div className="transacao fatura-linha" key={chave}>
              <div className="transacao-info">
                <strong>
                  {nomeCartao(f.cartaoId)} · {f.competencia}
                </strong>
                <span>
                  Vencimento: {f.vencimento.split('-').reverse().join('/')} · {f.quantidadeParcelas}{' '}
                  parcela(s)
                </span>
                <span>
                  {f.paga ? 'Paga' : f.valorPagoCentavos ? 'Parcialmente paga' : 'Em aberto'}
                </span>
                <span>
                  Pago: {moeda(f.valorPagoCentavos)} · Pendente: {moeda(f.saldoPendenteCentavos)}
                </span>
              </div>
              <strong>{moeda(f.totalCentavos)}</strong>
              {!f.paga && f.valorPagoCentavos === 0 && (
                <div className="pagamento-acoes">
                  <label>
                    Conta para pagamento
                    <select
                      value={contaSelecionada}
                      aria-label={`Conta para fatura ${f.competencia}`}
                      onChange={(e): void =>
                        setContaPagamento((prev) => ({
                          ...prev,
                          [chave]: e.target.value
                        }))
                      }
                    >
                      <option value="">Selecionar conta</option>
                      {contas.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.banco} · {c.nome} ({moeda(c.saldoAtualCentavos)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="botao-primario"
                    disabled={salvando || !contaSelecionada}
                    onClick={(): void => {
                      void confirmarPagamento(f)
                    }}
                  >
                    {salvando ? 'Processando...' : 'Pagar fatura'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <p className="vazio">
          Você pode pagar uma fatura integralmente ou selecionar várias parcelas abaixo. Pagamentos
          não criam despesas duplicadas nos relatórios.
        </p>
      </section>

      <section className="painel">
        <h3>Selecionar parcelas para pagar</h3>
        <p>
          Marque uma ou várias parcelas ainda não pagas, inclusive de faturas diferentes. Um
          pagamento abate o saldo da conta uma só vez.
        </p>
        <div className="parcelas-selecionaveis">
          {parcelasPagamento
            .filter((p) => !p.paga)
            .map((p) => (
              <label className="parcela-opcao" key={p.id}>
                <input
                  type="checkbox"
                  checked={selecionadas.includes(p.id)}
                  onChange={(e): void => marcarParcela(p.id, e.target.checked)}
                />
                <span>
                  {nomeCartao(p.cartaoId)} · {p.descricao} · Fatura {p.competencia}
                </span>
                <strong>{moeda(p.valorCentavos)}</strong>
              </label>
            ))}
        </div>
        {parcelasPagamento.every((p) => p.paga) && (
          <p className="vazio">Não há parcelas em aberto.</p>
        )}
        <div className="pagamento-acoes">
          <label>
            Conta que pagará as parcelas
            <select value={contaLote} onChange={(e): void => setContaLote(e.target.value)}>
              <option value="">Selecione a conta</option>
              {contas.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.banco} · {c.nome} ({moeda(c.saldoAtualCentavos)})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="botao-primario"
            disabled={salvando || selecionadas.length === 0 || !contaLote}
            onClick={(): void => {
              void pagarLote()
            }}
          >
            Pagar {selecionadas.length} parcela(s) —{' '}
            {moeda(
              parcelasPagamento
                .filter((p) => selecionadas.includes(p.id))
                .reduce((soma, p) => soma + p.valorCentavos, 0)
            )}
          </button>
        </div>
      </section>

      <section className="painel">
        <h3>Compras registradas</h3>
        {compras.length === 0 && <p className="vazio">Nenhuma compra cadastrada.</p>}
        {compras.map((c) => (
          <div className="transacao" key={c.id}>
            <div className="transacao-info">
              <strong>{c.descricao}</strong>
              <span>
                {nomeCartao(c.cartaoId)} · {c.categoria} · {c.data.split('-').reverse().join('/')} ·{' '}
                {c.numeroParcelas}x
              </span>
            </div>
            <strong>{moeda(c.valorCentavos)}</strong>
          </div>
        ))}
      </section>
    </div>
  )
}
