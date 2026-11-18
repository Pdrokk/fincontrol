import { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  Landmark,
  Plus,
  Wallet,
  Pencil,
  CirclePlus,
  SlidersHorizontal
} from 'lucide-react'
import GerenciarConta from './GerenciarConta'

type TipoConta = 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'
interface Conta {
  id: string
  banco: string
  nome: string
  tipo: TipoConta
  saldoInicialCentavos: number
  saldoAtualCentavos: number
}
interface Transferencia {
  id: string
  origemId: string
  destinoId: string
  valorCentavos: number
  data: string
  descricao: string
}

const nomesTipos: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  salario: 'Conta salário',
  dinheiro: 'Dinheiro',
  outra: 'Outra conta'
}

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100
  )
}

function parseCentavos(texto: string): number | null {
  const limpo = texto.trim()
  if (!/^\d+([,.]\d{1,2})?$/.test(limpo)) return null
  const [inteiro, decimais = ''] = limpo.replace(',', '.').split('.')
  const valor = Number(inteiro) * 100 + Number(decimais.padEnd(2, '0'))
  return Number.isSafeInteger(valor) ? valor : null
}

function dataLocal(): string {
  const hoje = new Date()
  return [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, '0'),
    String(hoje.getDate()).padStart(2, '0')
  ].join('-')
}

export default function ContasBancarias(): React.JSX.Element {
  const [contas, setContas] = useState<Conta[]>([])
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [banco, setBanco] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoConta>('corrente')
  const [saldo, setSaldo] = useState('0')
  const [origemId, setOrigemId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [valorTransferencia, setValorTransferencia] = useState('')
  const [descricao, setDescricao] = useState('Transferência entre contas')
  const [data, setData] = useState(dataLocal)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [contaSelecionadaId, setContaSelecionadaId] = useState('')
  const [modoGerenciar, setModoGerenciar] = useState<'editar' | 'entrada' | 'ajuste'>('editar')

  async function recarregar(): Promise<void> {
    const [novasContas, novasTransferencias] = await Promise.all([
      window.fincontrol.listarContas(),
      window.fincontrol.listarTransferencias()
    ])
    setContas(novasContas)
    setTransferencias(novasTransferencias)
  }

  useEffect((): (() => void) => {
    let ativo = true
    Promise.all([window.fincontrol.listarContas(), window.fincontrol.listarTransferencias()])
      .then(([novasContas, novasTransferencias]): void => {
        if (ativo) {
          setContas(novasContas)
          setTransferencias(novasTransferencias)
        }
      })
      .catch((falha: unknown): void => {
        console.error(falha)
        if (ativo) setErro('Não foi possível carregar os dados bancários.')
      })
      .finally((): void => {
        if (ativo) setCarregando(false)
      })
    return (): void => {
      ativo = false
    }
  }, [])

  async function salvarConta(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (salvando || carregando || erro) return
    const saldoInicialCentavos = parseCentavos(saldo)
    if (saldoInicialCentavos === null) {
      alert('Informe um saldo válido, com até duas casas decimais.')
      return
    }
    try {
      setSalvando(true)
      await window.fincontrol.cadastrarConta({
        banco: banco.trim(),
        nome: nome.trim(),
        tipo,
        saldoInicialCentavos
      })
      await recarregar()
      setBanco('')
      setNome('')
      setSaldo('0')
      setTipo('corrente')
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível cadastrar a conta.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarTransferencia(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (salvando || carregando || erro) return
    const valorCentavos = parseCentavos(valorTransferencia)
    if (!valorCentavos || valorCentavos <= 0 || origemId === destinoId) {
      alert('Escolha contas diferentes e um valor maior que zero.')
      return
    }
    try {
      setSalvando(true)
      await window.fincontrol.criarTransferencia({
        origemId,
        destinoId,
        valorCentavos,
        data,
        descricao: descricao.trim()
      })
      await recarregar()
      setValorTransferencia('')
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível transferir. Verifique os saldos e as contas selecionadas.')
    } finally {
      setSalvando(false)
    }
  }

  const contaSelecionada = contas.find((c) => c.id === contaSelecionadaId)
  function abrirGerenciar(id: string, modo: 'editar' | 'entrada' | 'ajuste'): void {
    setContaSelecionadaId(id)
    setModoGerenciar(modo)
  }

  const total = contas.reduce((soma, conta) => soma + conta.saldoAtualCentavos, 0)
  const nomeConta = (id: string): string => {
    const conta = contas.find((item) => item.id === id)
    return conta ? `${conta.banco} · ${conta.nome}` : 'Conta desconhecida'
  }

  return (
    <div className="pagina-contas">
      <section className="painel">
        <div className="titulo-contas">
          <div>
            <h3>Minhas contas</h3>
            <p>Gerencie seus bancos e saldos financeiros.</p>
          </div>
          <Landmark size={26} />
        </div>
        <div className="resumo-contas">
          <span>Saldo total disponível nas contas</span>
          <strong>{formatarMoeda(total)}</strong>
          <small>
            Saldo inicial + receitas − despesas + transferências − faturas pagas + correções de
            saldo
          </small>
        </div>
        {carregando && <p>Carregando contas...</p>}
        {erro && <p role="alert">{erro}</p>}
        <div className="grade-contas">
          {contas.map((conta) => (
            <article className="cartao-conta" key={conta.id}>
              <div className="cartao-conta-topo">
                <Wallet size={24} />
                <strong>{conta.banco}</strong>
              </div>
              <span>Saldo atual</span>
              <h3>{formatarMoeda(conta.saldoAtualCentavos)}</h3>
              <p>{conta.nome}</p>
              <small>
                {nomesTipos[conta.tipo]} · Inicial: {formatarMoeda(conta.saldoInicialCentavos)}
              </small>
              <div className="acoes-conta">
                <button type="button" onClick={(): void => abrirGerenciar(conta.id, 'editar')}>
                  <Pencil size={15} /> Editar
                </button>
                <button type="button" onClick={(): void => abrirGerenciar(conta.id, 'entrada')}>
                  <CirclePlus size={15} /> Adicionar dinheiro
                </button>
                <button type="button" onClick={(): void => abrirGerenciar(conta.id, 'ajuste')}>
                  <SlidersHorizontal size={15} /> Corrigir saldo
                </button>
              </div>
            </article>
          ))}
        </div>
        {!carregando && !erro && contas.length === 0 && (
          <p className="vazio">Nenhuma conta cadastrada até o momento.</p>
        )}
      </section>

      {contaSelecionada && (
        <GerenciarConta
          key={contaSelecionada.id + ':' + modoGerenciar}
          conta={contaSelecionada}
          modo={modoGerenciar}
          onFechar={(): void => setContaSelecionadaId('')}
          onAtualizar={recarregar}
        />
      )}

      <section className="painel">
        <h3>Cadastrar nova conta</h3>
        <form
          className="formulario"
          onSubmit={(e): void => {
            void salvarConta(e)
          }}
        >
          <label>
            Banco ou instituição
            <input
              value={banco}
              maxLength={100}
              onChange={(e): void => setBanco(e.target.value)}
              placeholder="Ex: Nubank"
              required
            />
          </label>
          <label>
            Nome da conta
            <input
              value={nome}
              maxLength={100}
              onChange={(e): void => setNome(e.target.value)}
              placeholder="Ex: Conta principal"
              required
            />
          </label>
          <label>
            Tipo de conta
            <select value={tipo} onChange={(e): void => setTipo(e.target.value as TipoConta)}>
              {Object.entries(nomesTipos).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Saldo inicial (R$)
            <input
              type="text"
              inputMode="decimal"
              value={saldo}
              onChange={(e): void => setSaldo(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="botao-primario"
            disabled={salvando || carregando || Boolean(erro)}
          >
            <Plus size={17} /> {salvando ? 'Salvando...' : 'Cadastrar conta'}
          </button>
        </form>
      </section>

      <section className="painel">
        <h3>Transferir entre contas</h3>
        <p>Transferências não são receitas nem despesas.</p>
        <form
          className="formulario"
          onSubmit={(e): void => {
            void salvarTransferencia(e)
          }}
        >
          <label>
            Conta de origem
            <select value={origemId} onChange={(e): void => setOrigemId(e.target.value)} required>
              <option value="">Selecione a conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Conta de destino
            <select value={destinoId} onChange={(e): void => setDestinoId(e.target.value)} required>
              <option value="">Selecione a conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Valor (R$)
            <input
              value={valorTransferencia}
              onChange={(e): void => setValorTransferencia(e.target.value)}
              placeholder="100,00"
              inputMode="decimal"
              required
            />
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
          <label>
            Descrição
            <input
              maxLength={200}
              value={descricao}
              onChange={(e): void => setDescricao(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="botao-primario"
            disabled={salvando || carregando || Boolean(erro) || contas.length < 2}
          >
            <ArrowLeftRight size={17} /> {salvando ? 'Transferindo...' : 'Confirmar transferência'}
          </button>
        </form>
        <h3 className="subtitulo">Transferências recentes</h3>
        {transferencias.length === 0 && <p className="vazio">Nenhuma transferência cadastrada.</p>}
        {transferencias.slice(0, 10).map((item) => (
          <div className="transacao" key={item.id}>
            <div className="transacao-info">
              <strong>{item.descricao}</strong>
              <span>
                {nomeConta(item.origemId)} → {nomeConta(item.destinoId)} ·{' '}
                {item.data.split('-').reverse().join('/')}
              </span>
            </div>
            <strong>{formatarMoeda(item.valorCentavos)}</strong>
          </div>
        ))}
      </section>
    </div>
  )
}
