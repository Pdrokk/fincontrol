import { useEffect, useState } from 'react'
import { Archive, ArrowDownRight, CheckCircle2, CreditCard, RotateCcw } from 'lucide-react'

interface ContaPagamento {
  id: string
  banco: string
  nome: string
  saldoAtualCentavos: number
}
interface CartaoPagamento {
  id: string
  banco: string
  nome: string
  contaId: string | null
}
interface Parcela {
  id: string
  compraId: string
  cartaoId: string
  descricao: string
  competencia: string
  numero: number
  valorCentavos: number
  paga: boolean
  arquivada: boolean
}

interface Props {
  onPagamento?: () => Promise<void>
}

function moeda(valorCentavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(valorCentavos / 100)
}

function dataAtual(): string {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')].join('-')
}

export default function CentralPagamentos({ onPagamento }: Props): React.JSX.Element {
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [contas, setContas] = useState<ContaPagamento[]>([])
  const [cartoes, setCartoes] = useState<CartaoPagamento[]>([])
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [contaId, setContaId] = useState('')
  const [dataPagamento, setDataPagamento] = useState(dataAtual)
  const [aba, setAba] = useState<'pendentes' | 'historico'>('pendentes')
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar(): Promise<void> {
    const [listaParcelas, listaContas, listaCartoes] = await Promise.all([
      window.fincontrol.listarParcelasPagamento(),
      window.fincontrol.listarContas(),
      window.fincontrol.listarCartoes()
    ])
    setParcelas(listaParcelas)
    setContas(listaContas)
    setCartoes(listaCartoes)
    setSelecionadas([])
  }

  useEffect((): (() => void) => {
    let ativo = true
    Promise.all([
      window.fincontrol.listarParcelasPagamento(),
      window.fincontrol.listarContas(),
      window.fincontrol.listarCartoes()
    ]).then(([p, c, b]): void => {
      if (!ativo) return
      setParcelas(p)
      setContas(c)
      setCartoes(b)
    }).catch((falha: unknown): void => {
      console.error(falha)
      if (ativo) setErro('Não foi possível carregar os pagamentos.')
    }).finally((): void => {
      if (ativo) setCarregando(false)
    })
    return (): void => { ativo = false }
  }, [])

  const pendentes = parcelas.filter((p) => !p.paga)
  const pagas = parcelas.filter((p) => p.paga && (mostrarArquivadas || !p.arquivada))
  const totalPendente = pendentes.reduce((total, p) => total + p.valorCentavos, 0)
  const escolhidas = pendentes.filter((p) => selecionadas.includes(p.id))
  const valorEscolhido = escolhidas.reduce((total, p) => total + p.valorCentavos, 0)
  const agrupadas = new Map<string, Parcela[]>()

  for (const parcela of pendentes) {
    const chave = `${parcela.cartaoId}:${parcela.competencia}`
    agrupadas.set(chave, [...(agrupadas.get(chave) ?? []), parcela])
  }

  function nomeCartao(id: string): string {
    const cartao = cartoes.find((c) => c.id === id)
    return cartao ? `${cartao.banco} · ${cartao.nome}` : 'Cartão'
  }

  function marcar(id: string, ativo: boolean): void {
    setSelecionadas((anterior) => ativo
      ? [...new Set([...anterior, id])]
      : anterior.filter((item) => item !== id))
  }

  function marcarGrupo(ids: string[], ativo: boolean): void {
    setSelecionadas((anterior) => ativo
      ? [...new Set([...anterior, ...ids])]
      : anterior.filter((item) => !ids.includes(item)))
  }

  async function pagarSelecionadas(): Promise<void> {
    if (salvando || escolhidas.length === 0 || !contaId) return
    const conta = contas.find((c) => c.id === contaId)
    if (!conta) return
    if (conta.saldoAtualCentavos < valorEscolhido) {
      alert('Saldo insuficiente na conta escolhida.')
      return
    }
    if (!window.confirm(
      `Confirmar pagamento de ${escolhidas.length} parcela(s), total ${moeda(valorEscolhido)}, usando ${conta.nome}?`
    )) return
    try {
      setSalvando(true)
      await window.fincontrol.pagarParcelasSelecionadas({
        parcelaIds: escolhidas.map((p) => p.id),
        contaId,
        dataPagamento
      })
      await carregar()
      if (onPagamento) await onPagamento()
    } catch (falha) {
      console.error(falha)
      alert(falha instanceof Error ? falha.message : 'Não foi possível confirmar o pagamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function alterarArquivo(id: string, arquivar: boolean): Promise<void> {
    if (salvando) return
    try {
      setSalvando(true)
      await window.fincontrol.arquivarParcela(id, arquivar)
      await carregar()
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível atualizar a visibilidade da parcela.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="painel central-pagamentos">
      <div className="central-cabecalho">
        <div>
          <h3>Central de pagamentos</h3>
          <p>Faturas, parcelas e comprovantes em um único lugar.</p>
        </div>
        <CreditCard size={22} strokeWidth={1.7} />
      </div>

      <div className="central-resumo">
        <div><span>Total em aberto</span><strong>{moeda(totalPendente)}</strong></div>
        <div><span>Parcelas pendentes</span><strong>{pendentes.length}</strong></div>
        <div><span>Parcelas pagas</span><strong>{parcelas.filter((p) => p.paga).length}</strong></div>
      </div>

      <div className="central-abas" role="group" aria-label="Filtrar pagamentos">
        <button type="button" aria-pressed={aba === 'pendentes'}
          className={aba === 'pendentes' ? 'selecionada' : ''}
          onClick={(): void => setAba('pendentes')}>Em aberto</button>
        <button type="button" aria-pressed={aba === 'historico'}
          className={aba === 'historico' ? 'selecionada' : ''}
          onClick={(): void => setAba('historico')}>Histórico de pagos</button>
      </div>

      {carregando && <p>Carregando pagamentos...</p>}
      {erro && <p role="alert">{erro}</p>}

      {aba === 'pendentes' && (
        <>
          {pendentes.length === 0 && !carregando && <p className="vazio">Tudo em dia! Nenhuma parcela pendente.</p>}
          <div className="central-grupos">
            {[...agrupadas.entries()].map(([chave, itens]) => {
              const ids = itens.map((p) => p.id)
              const todas = ids.every((id) => selecionadas.includes(id))
              const total = itens.reduce((valor, p) => valor + p.valorCentavos, 0)
              return (
                <div className="central-grupo" key={chave}>
                  <label className="central-grupo-titulo">
                    <input type="checkbox" checked={todas}
                      onChange={(e): void => marcarGrupo(ids, e.target.checked)} />
                    <span>
                      <strong>{nomeCartao(itens[0].cartaoId)}</strong>
                      <small>Fatura {itens[0].competencia} · {itens.length} parcela(s)</small>
                    </span>
                    <strong>{moeda(total)}</strong>
                  </label>
                  {itens.map((parcela) => (
                    <label className="central-parcela" key={parcela.id}>
                      <input type="checkbox" checked={selecionadas.includes(parcela.id)}
                        onChange={(e): void => marcar(parcela.id, e.target.checked)} />
                      <span>{parcela.descricao}</span>
                      <strong>{moeda(parcela.valorCentavos)}</strong>
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="central-pagamento-form">
            <div className="central-pagamento-total">
              <span>{escolhidas.length} parcela(s) selecionada(s)</span>
              <strong>{moeda(valorEscolhido)}</strong>
            </div>
            <div className="central-pagamento-campos">
              <label>Conta pagadora
                <select value={contaId} onChange={(e): void => setContaId(e.target.value)}>
                  <option value="">Selecione uma conta</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.banco} · {conta.nome} — {moeda(conta.saldoAtualCentavos)}
                    </option>
                  ))}
                </select>
              </label>
              <label>Data do pagamento
                <input type="date" value={dataPagamento}
                  onChange={(e): void => setDataPagamento(e.target.value)} />
              </label>
              <button type="button" className="botao-primario"
                disabled={salvando || !contaId || escolhidas.length === 0}
                onClick={(): void => { void pagarSelecionadas() }}>
                <CheckCircle2 size={17} /> {salvando ? 'Processando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </>
      )}

      {aba === 'historico' && (
        <div className="central-historico">
          <label className="central-arquivadas">
            <input type="checkbox" checked={mostrarArquivadas}
              onChange={(e): void => setMostrarArquivadas(e.target.checked)} />
            Mostrar parcelas arquivadas
          </label>
          {pagas.length === 0 && <p className="vazio">Nenhuma parcela paga para exibir.</p>}
          {pagas.map((parcela) => (
            <div className="central-parcela historico" key={parcela.id}>
              <CheckCircle2 size={17} color="#16a34a" />
              <span>{nomeCartao(parcela.cartaoId)} · {parcela.descricao}
                <small>Fatura {parcela.competencia}</small>
              </span>
              <strong>{moeda(parcela.valorCentavos)}</strong>
              <button type="button" className="central-icone"
                disabled={salvando}
                title={parcela.arquivada ? 'Restaurar ao histórico' : 'Ocultar do histórico'}
                aria-label={parcela.arquivada ? 'Restaurar parcela' : 'Arquivar parcela'}
                onClick={(): void => { void alterarArquivo(parcela.id, !parcela.arquivada) }}>
                {parcela.arquivada ? <RotateCcw size={17} /> : <Archive size={17} />}
              </button>
            </div>
          ))}
          <p className="central-nota"><ArrowDownRight size={15} /> Arquivar apenas oculta a parcela desta lista. O pagamento e o histórico financeiro permanecem intactos.</p>
        </div>
      )}
    </section>
  )
}
