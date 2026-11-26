import { confirmarFinControl } from '../utils/dialogos'
import { useEffect, useState } from 'react'
import { CalendarClock, Plus, Ban } from 'lucide-react'
import Feedback from './Feedback'

interface Conta {
  id: string
  banco: string
  nome: string
}
interface Salario {
  id: string
  contaId: string
  descricao: string
  valorCentavos: number
  dia: number
  mesInicio: string
  quantidadeMeses: number
  ativo: number
}
interface Props {
  contas: Conta[]
  onAtualizar: () => Promise<void>
}
function moeda(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100)
}
function paraCentavos(texto: string): number | null {
  const s = texto.trim()
  if (!/^\d+([,.]\d{1,2})?$/.test(s)) return null
  const [r, c = ''] = s.replace(',', '.').split('.')
  const v = Number(r) * 100 + Number(c.padEnd(2, '0'))
  return Number.isSafeInteger(v) ? v : null
}
function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function SalarioRecorrente({ contas, onAtualizar }: Props): React.JSX.Element {
  const [salarios, setSalarios] = useState<Salario[]>([])
  const [contaId, setContaId] = useState('')
  const [descricao, setDescricao] = useState('Salário mensal')
  const [valor, setValor] = useState('')
  const [dia, setDia] = useState('5')
  const [mesInicio, setMesInicio] = useState(mesAtual)
  const [quantidadeMeses, setQuantidadeMeses] = useState('12')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroOperacao, setErroOperacao] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [parando, setParando] = useState(false)

  async function recarregarSalarios(): Promise<void> {
    setSalarios(await window.fincontrol.listarSalarios())
  }

  useEffect((): (() => void) => {
    let ativo = true
    window.fincontrol
      .listarSalarios()
      .then((lista): void => {
        if (ativo) setSalarios(lista)
      })
      .catch((falha: unknown): void => {
        console.error(falha)
        if (ativo) setErro('Não foi possível carregar os salários cadastrados.')
      })
    return (): void => {
      ativo = false
    }
  }, [])

  async function cadastrar(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (salvando) return
    setErroOperacao('')
    setMensagem('')
    const valorCentavos = paraCentavos(valor)
    if (!valorCentavos || valorCentavos <= 0) {
      setErroOperacao('Informe um salário maior que zero, usando até duas casas decimais.')
      return
    }
    const inicio = `${mesInicio}-${String(dia).padStart(2, '0')}`
    const hoje = (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })()
    const permitirRetroativo = inicio < hoje
    if (
      permitirRetroativo &&
      !(await confirmarFinControl(
        'O início escolhido é anterior a hoje. Isso lançará imediatamente os salários vencidos e aumentará o saldo. Confirma os recebimentos retroativos?'
      ))
    )
      return
    try {
      setSalvando(true)
      await window.fincontrol.cadastrarSalario({
        contaId,
        descricao: descricao.trim(),
        valorCentavos,
        dia: Number(dia),
        mesInicio,
        quantidadeMeses: Number(quantidadeMeses),
        permitirRetroativo
      })
      await recarregarSalarios()
      await onAtualizar()
      setValor('')
      setMensagem(
        permitirRetroativo
          ? 'Salário programado. Recebimentos retroativos confirmados foram lançados.'
          : 'Salário programado. Os próximos recebimentos serão registrados na data correspondente.'
      )
    } catch (falha) {
      console.error(falha)
      setErroOperacao(
        falha instanceof Error ? falha.message : 'Não foi possível registrar o salário.'
      )
    } finally {
      setSalvando(false)
    }
  }

  async function parar(id: string): Promise<void> {
    if (
      !(await confirmarFinControl(
        'Desativar novos pagamentos automáticos deste salário? Receitas anteriores serão mantidas.'
      ))
    )
      return
    if (parando) return
    try {
      setParando(true)
      setErroOperacao('')
      setMensagem('')
      await window.fincontrol.desativarSalario(id)
      await recarregarSalarios()
      setMensagem('Recorrência desativada. Os recebimentos anteriores foram preservados.')
    } catch (falha) {
      console.error(falha)
      setErroOperacao(
        falha instanceof Error ? falha.message : 'Não foi possível desativar o salário.'
      )
    } finally {
      setParando(false)
    }
  }

  return (
    <section className="painel">
      <div className="titulo-contas">
        <div>
          <h3>Salário recorrente</h3>
          <p>Cadastre uma vez e escolha por quantos meses a receita se repete.</p>
        </div>
        <CalendarClock size={25} />
      </div>
      <p>
        O valor entra como receita na conta escolhida na data programada. Se o aplicativo estiver
        fechado, os lançamentos vencidos são registrados quando ele abrir novamente. Não credita
        meses futuros antecipadamente.
      </p>
      <Feedback mensagem={erro} tipo="erro" />
      <Feedback mensagem={erroOperacao} tipo="erro" />
      <Feedback mensagem={mensagem} tipo="sucesso" />
      <form
        className="formulario"
        onSubmit={(e): void => {
          void cadastrar(e)
        }}
      >
        <label>
          Conta que recebe o salário
          <select value={contaId} required onChange={(e): void => setContaId(e.target.value)}>
            <option value="">Selecione uma conta</option>
            {contas.map((c) => (
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
            minLength={3}
            required
            onChange={(e): void => setDescricao(e.target.value)}
          />
        </label>
        <label>
          Salário líquido (R$)
          <input
            value={valor}
            inputMode="decimal"
            placeholder="2500,00"
            required
            onChange={(e): void => setValor(e.target.value)}
          />
        </label>
        <label>
          Dia mensal de recebimento (1 a 28)
          <input
            type="number"
            min="1"
            max="28"
            required
            value={dia}
            onChange={(e): void => setDia(e.target.value)}
          />
        </label>
        <label>
          Mês inicial
          <input
            type="month"
            required
            value={mesInicio}
            onChange={(e): void => setMesInicio(e.target.value)}
          />
        </label>
        <label>
          Repetir por quantos meses? (1 a 120)
          <input
            type="number"
            min="1"
            max="120"
            required
            value={quantidadeMeses}
            onChange={(e): void => setQuantidadeMeses(e.target.value)}
          />
        </label>
        <button type="submit" className="botao-primario" disabled={salvando || contas.length === 0}>
          <Plus size={17} /> {salvando ? 'Programando...' : 'Programar salário'}
        </button>
      </form>
      <h3 className="subtitulo">Salários programados</h3>
      {salarios.length === 0 && <p className="vazio">Nenhum salário programado.</p>}
      {salarios.map((s) => (
        <div className="transacao" key={s.id}>
          <div className="transacao-info">
            <strong>
              {s.descricao} · {moeda(s.valorCentavos)}
            </strong>
            <span>
              {contas.find((c) => c.id === s.contaId)?.nome ?? 'Conta'} · dia {s.dia} · início{' '}
              {s.mesInicio} · {s.quantidadeMeses} mês(es)
            </span>
            <span>{s.ativo ? 'Ativo' : 'Desativado'}</span>
          </div>
          {s.ativo === 1 && (
            <button
              type="button"
              className="botao-excluir"
              disabled={parando}
              onClick={(): void => {
                void parar(s.id)
              }}
            >
              <Ban size={15} /> Parar
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
