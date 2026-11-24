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
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
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
  const [secao, setSecao] = useState<'pagamentos' | 'compras' | 'gerenciar'>('pagamentos')

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
    const [listaCartoes, listaContas, listaCompras, listaFaturas] = await Promise.all([
      window.fincontrol.listarCartoes(),
      window.fincontrol.listarContas(),
      window.fincontrol.listarComprasCartao(),
      window.fincontrol.listarFaturasPrevistas()
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
    setSecao('gerenciar')
    window.setTimeout(() => document.getElementById('formulario-cartao')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
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
      alert('Informe um limite válido.')
      return
    }
    const dados = {
      nome: nome.trim(),
      banco: banco.trim(),
      contaId: contaId || null,
      limiteCentavos,
      diaFechamento: Number(fechamento),
      diaVencimento: Number(vencimento)
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
      setSecao('pagamentos')
    } catch (falha) {
      console.error(falha)
      alert(falha instanceof Error ? falha.message : 'Não foi possível salvar o cartão.')
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
      setSecao('pagamentos')
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível cadastrar a compra. Verifique o valor e a quantidade de parcelas.')
    } finally { setSalvando(false) }
  }

  const nomeCartao = (id: string): string => {
    const c = cartoes.find((item) => item.id === id)
    return c ? `${c.banco} · ${c.nome}` : 'Cartão não encontrado'
  }
  const totalAberto = faturas.filter((f) => !f.paga)
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
          <small>Pagamentos são registrados na conta escolhida e não geram despesas duplicadas.</small>
        </div>

        {carregando && <p>Carregando dados...</p>}
        {erro && <p role="alert">{erro}</p>}

        <div className="grade-contas">
          {cartoes.map((c) => (
            <article className="cartao-conta" key={c.id} style={{ background: gradienteBanco(c.banco) }}>
              <div className="cartao-conta-topo"><CreditCard size={24} /><strong>{c.banco}</strong></div>
              <span>{c.nome}</span>
              <h3>Disponível: {moeda(c.limiteDisponivelCentavos)}</h3>
              <p>Limite contratado: {moeda(c.limiteCentavos)}</p>
              <p>Utilizado: {moeda(c.limiteUtilizadoCentavos)}</p>
              <p>Fechamento: dia {c.diaFechamento} · Vencimento: dia {c.diaVencimento}</p>
              <small>{c.contaId ? 'Conta: ' + (contas.find((x) => x.id === c.contaId)?.nome ?? 'Vinculada') : 'Sem conta para pagamento definida'}</small>
              <div className="acoes-conta">
                <button type="button" onClick={(): void => iniciarEdicaoCartao(c)}>
                  <Pencil size={15} /> Editar cartão
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <nav className="cartoes-navegacao" aria-label="Áreas dos cartões">
        <button type="button" className={secao === 'pagamentos' ? 'ativo' : ''}
          aria-pressed={secao === 'pagamentos'}
          onClick={(): void => setSecao('pagamentos')}>Pagamentos e faturas</button>
        <button type="button" className={secao === 'compras' ? 'ativo' : ''}
          aria-pressed={secao === 'compras'}
          onClick={(): void => setSecao('compras')}>Compras e parcelas</button>
        <button type="button" className={secao === 'gerenciar' ? 'ativo' : ''}
          aria-pressed={secao === 'gerenciar'}
          onClick={(): void => setSecao('gerenciar')}>Cadastrar ou editar cartão</button>
      </nav>
      {secao === 'pagamentos' && <CentralPagamentos onPagamento={atualizar} />}

      {secao === 'gerenciar' && (
      <section id="formulario-cartao" className="painel">
        <h3>{cartaoEditandoId ? "Editar cartão" : "Cadastrar cartão"}</h3>
        <form className="formulario" onSubmit={(e): void => { void salvarCartao(e) }}>
          <label>Banco ou instituição
            <input value={banco} maxLength={100} onChange={(e): void => setBanco(e.target.value)} required placeholder="Ex: Nubank" />
          </label>
          <label>Nome do cartão
            <input value={nome} maxLength={100} onChange={(e): void => setNome(e.target.value)} required placeholder="Ex: Cartão principal" />
          </label>
          <label>Conta associada (opcional)
            <select value={contaId} onChange={(e): void => setContaId(e.target.value)}>
              <option value="">Nenhuma</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.banco} · {c.nome}</option>)}
            </select>
          </label>
          <label>Limite contratado (R$)
            <input value={limite} inputMode="decimal" onChange={(e): void => setLimite(e.target.value)} required />
          </label>
          <label>Dia de fechamento (1–28)
            <input type="number" min="1" max="28" value={fechamento} onChange={(e): void => setFechamento(e.target.value)} required />
          </label>
          <label>Dia de vencimento (1–28)
            <input type="number" min="1" max="28" value={vencimento} onChange={(e): void => setVencimento(e.target.value)} required />
          </label>
          <button type="submit" className="botao-primario" disabled={salvando || carregando || Boolean(erro)}>
            {cartaoEditandoId ? <Pencil size={17} /> : <Plus size={17} />}
            {salvando ? "Salvando..." : cartaoEditandoId ? "Salvar alterações" : "Cadastrar cartão"}
          </button>
          {cartaoEditandoId && (
            <button type="button" className="botao-cancelar"
              onClick={limparFormularioCartao}>Cancelar edição</button>
          )}
        </form>
      </section>
      )}

      {secao === 'compras' && (<>
      <section className="painel">
        <h3>Registrar compra no cartão</h3>
        <form className="formulario" onSubmit={(e): void => { void salvarCompra(e) }}>
          <label>Cartão utilizado
            <select value={cartaoId} onChange={(e): void => setCartaoId(e.target.value)} required>
              <option value="">Selecione</option>
              {cartoes.map((c) => <option key={c.id} value={c.id}>{c.banco} · {c.nome}</option>)}
            </select>
          </label>
          <label>Descrição
            <input value={descricao} maxLength={200} onChange={(e): void => setDescricao(e.target.value)} required placeholder="Ex: Notebook" />
          </label>
          <label>Categoria
            <select value={categoria} onChange={(e): void => setCategoria(e.target.value)}>
              {['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Valor total (R$)
            <input value={valor} inputMode="decimal" onChange={(e): void => setValor(e.target.value)} required placeholder="3600,00" />
          </label>
          <label>Quantidade de parcelas
            <input type="number" min="1" max="120" value={parcelas} onChange={(e): void => setParcelas(e.target.value)} required />
          </label>
          <label>Data da compra
            <input type="date" value={data} onChange={(e): void => setData(e.target.value)} required />
          </label>
          <button className="botao-primario" type="submit" disabled={salvando || carregando || Boolean(erro) || cartoes.length === 0}>
            <Plus size={17} /> Registrar compra e gerar parcelas
          </button>
        </form>
      </section>

      <section className="painel">
        <h3>Compras registradas</h3>
        {compras.length === 0 && <p className="vazio">Nenhuma compra cadastrada.</p>}
        {compras.map((c) => (
          <div className="transacao" key={c.id}>
            <div className="transacao-info">
              <strong>{c.descricao}</strong>
              <span>{nomeCartao(c.cartaoId)} · {c.categoria} · {c.data.split('-').reverse().join('/')} · {c.numeroParcelas}x</span>
            </div>
            <strong>{moeda(c.valorCentavos)}</strong>
          </div>
        ))}
      </section>
      </>)}
    </div>
  )
}
