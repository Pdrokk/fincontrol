import { useEffect, useState } from 'react'
import { Archive, ArrowDownRight, CheckCircle2, CreditCard, RotateCcw, Undo2 } from 'lucide-react'

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
  pagamentoId: string | null
  pagamentoTipo: 'fatura' | 'parcela' | null
}
interface Estorno {
  id: string
  tipo: 'fatura' | 'parcela'
  valorCentavos: number
  motivo: string
  estornadoEm: string
}

interface Props {
  onPagamento?: () => Promise<void>
  cartaoInicialId?: string
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

export default function CentralPagamentos({ onPagamento, cartaoInicialId = '' }: Props): React.JSX.Element {
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [contas, setContas] = useState<ContaPagamento[]>([])
  const [cartoes, setCartoes] = useState<CartaoPagamento[]>([])
  const [estornos, setEstornos] = useState<Estorno[]>([])
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [contaId, setContaId] = useState('')
  const [dataPagamento, setDataPagamento] = useState(dataAtual)
  const [aba, setAba] = useState<'pendentes' | 'historico'>('pendentes')
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [filtroCartaoId, setFiltroCartaoId] = useState(cartaoInicialId)

  async function carregar(): Promise<void> {
    const [listaParcelas, listaContas, listaCartoes, listaEstornos] = await Promise.all([
      window.fincontrol.listarParcelasPagamento(),
      window.fincontrol.listarContas(),
      window.fincontrol.listarCartoes(),
      window.fincontrol.listarEstornosPagamentos()
    ])
    setParcelas(listaParcelas)
    setContas(listaContas)
    setCartoes(listaCartoes)
    setEstornos(listaEstornos)
    setSelecionadas([])
  }

  useEffect((): (() => void) => {
    let ativo = true
    Promise.all([
      window.fincontrol.listarParcelasPagamento(),
      window.fincontrol.listarContas(),
      window.fincontrol.listarCartoes(),
      window.fincontrol.listarEstornosPagamentos()
    ]).then(([p, c, b, e]): void => {
      if (!ativo) return
      setParcelas(p)
      setContas(c)
      setCartoes(b)
      setEstornos(e)
    }).catch((falha: unknown): void => {
      console.error(falha)
      if (ativo) setErro('Não foi possível carregar os pagamentos.')
    }).finally((): void => {
      if (ativo) setCarregando(false)
    })
    return (): void => { ativo = false }
  }, [])

  const pendentes = parcelas.filter((p) => !p.paga && (!filtroCartaoId || p.cartaoId === filtroCartaoId))
  const pagas = parcelas.filter((p) => p.paga &&
    (!filtroCartaoId || p.cartaoId === filtroCartaoId) &&
    (mostrarArquivadas || !p.arquivada))
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

  function filtrarCartao(id: string): void {
    setFiltroCartaoId(id)
    setSelecionadas([])
    setErro('')
    setMensagem('')
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
    setErro('')
    setMensagem('')
    const conta = contas.find((c) => c.id === contaId)
    if (!conta) return
    if (conta.saldoAtualCentavos < valorEscolhido) {
      setErro('Saldo insuficiente na conta escolhida. Selecione outra conta ou menos parcelas.')
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
      setMensagem('Pagamento registrado com sucesso. Saldos e limite atualizados.')
      if (onPagamento) await onPagamento()
    } catch (falha) {
      console.error(falha)
      setErro(falha instanceof Error ? falha.message : 'Não foi possível confirmar o pagamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function estornarParcela(parcela: Parcela): Promise<void> {
    if (salvando || !parcela.pagamentoId || !parcela.pagamentoTipo) return
    setErro('')
    setMensagem('')
    const valor = parcela.pagamentoTipo === 'fatura'
      ? parcelas.filter((p) => p.pagamentoId === parcela.pagamentoId)
          .reduce((total, p) => total + p.valorCentavos, 0)
      : parcela.valorCentavos
    const motivo = window.prompt('Motivo do estorno (mínimo 5 caracteres):')
    if (motivo === null) return
    if (motivo.trim().length < 5) {
      setErro('Informe um motivo com pelo menos 5 caracteres para registrar o estorno.')
      return
    }
    if (!window.confirm(
      `Estornar ${moeda(valor)}? O valor voltará à conta pagadora e o limite disponível do cartão será reduzido. ${parcela.pagamentoTipo === 'fatura' ? 'Isso estornará toda a fatura.' : 'Isso estornará esta parcela.'}`
    )) return
    try {
      setSalvando(true)
      await window.fincontrol.estornarPagamento({
        pagamentoId: parcela.pagamentoId,
        tipo: parcela.pagamentoTipo,
        motivo: motivo.trim()
      })
      await carregar()
      setMensagem('Estorno registrado. O saldo retornou à conta e o limite foi recalculado.')
      if (onPagamento) await onPagamento()
    } catch (falha) {
      console.error(falha)
      setErro(falha instanceof Error ? falha.message : 'Não foi possível estornar.')
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
      setErro('Não foi possível atualizar a visibilidade da parcela. Tente novamente.')
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
        <div><span>Parcelas pagas</span><strong>{parcelas.filter((p) => p.paga && (!filtroCartaoId || p.cartaoId === filtroCartaoId)).length}</strong></div>
      </div>

      <div className="central-filtro-cartao">
        <label htmlFor="central-cartao-filtro">Visualizar cartão</label>
        <select id="central-cartao-filtro" value={filtroCartaoId}
          onChange={(e): void => filtrarCartao(e.target.value)}>
          <option value="">Todos os cartões</option>
          {cartoes.map((cartao) => (
            <option key={cartao.id} value={cartao.id}>{cartao.banco} · {cartao.nome}</option>
          ))}
        </select>
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
      {erro && <p className="cartoes-mensagem cartoes-mensagem-erro" role="alert">{erro}</p>}
      {mensagem && <p className="cartoes-mensagem cartoes-mensagem-sucesso" role="status">{mensagem}</p>}

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
            {contaId && contas.find((c) => c.id === contaId && c.saldoAtualCentavos < valorEscolhido) && (
              <p className="central-saldo-aviso" role="alert">
                Saldo insuficiente nesta conta. Escolha outra conta ou reduza as parcelas selecionadas.
              </p>
            )}
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
                <input type="date" max={dataAtual()} value={dataPagamento}
                  onChange={(e): void => setDataPagamento(e.target.value)} />
              </label>
              <button type="button" className="botao-primario"
                disabled={salvando || !contaId || escolhidas.length === 0 || Boolean(contas.find((c) => c.id === contaId && c.saldoAtualCentavos < valorEscolhido))}
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
                disabled={salvando || !parcela.pagamentoId}
                title={parcela.arquivada ? 'Restaurar ao histórico' : 'Ocultar do histórico'}
                aria-label={parcela.arquivada ? 'Restaurar parcela' : 'Arquivar parcela'}
                onClick={(): void => { void alterarArquivo(parcela.id, !parcela.arquivada) }}>
                {parcela.arquivada ? <RotateCcw size={17} /> : <Archive size={17} />}
              </button>
              {parcela.pagamentoId && (
                <button type="button" className="central-icone" title="Estornar pagamento"
                  aria-label="Estornar pagamento" disabled={salvando}
                  onClick={(): void => { void estornarParcela(parcela) }}>
                  <Undo2 size={17} />
                </button>
              )}
            </div>
          ))}
          <p className="central-nota"><ArrowDownRight size={15} /> Arquivar oculta uma parcela sem apagar seu histórico. Estornar reverte o saldo e o limite, preservando a justificativa.</p>
          {estornos.length > 0 && (
            <div className="central-estornos">
              <h4>Estornos registrados</h4>
              {estornos.map((e) => (
                <div className="dashboard-item" key={e.id}>
                  <div><strong>{e.tipo === 'fatura' ? 'Fatura estornada' : 'Parcela estornada'}</strong>
                    <small>{e.motivo} · {e.estornadoEm.slice(0, 10).split('-').reverse().join('/')}</small>
                  </div>
                  <strong>{moeda(e.valorCentavos)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
