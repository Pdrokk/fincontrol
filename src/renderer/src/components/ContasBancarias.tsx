import { useEffect, useState } from 'react'
import { Landmark, Wallet, Plus } from 'lucide-react'

type TipoConta = 'corrente' | 'poupanca' | 'dinheiro' | 'outra'

interface Conta {
  id: string
  banco: string
  nome: string
  tipo: TipoConta
  saldoInicialCentavos: number
}

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(centavos / 100)
}

const nomesTipos: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  dinheiro: 'Dinheiro',
  outra: 'Outra conta'
}

export default function ContasBancarias(): React.JSX.Element {
  const [contas, setContas] = useState<Conta[]>([])
  const [banco, setBanco] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoConta>('corrente')
  const [saldo, setSaldo] = useState('0')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect((): (() => void) => {
    let ativo = true

    window.fincontrol
      .listarContas()
      .then((registros): void => {
        if (ativo) setContas(registros)
      })
      .catch((falha: unknown): void => {
        console.error(falha)
        if (ativo) setErro('Não foi possível carregar as contas.')
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

    const valorDigitado = saldo.trim()
    const valorValido = /^\d+([,.]\d{1,2})?$/.test(valorDigitado)

    if (!valorValido) {
      alert('Informe um saldo válido, com até duas casas decimais.')
      return
    }

    const [reais, centavosTexto = ''] = valorDigitado.replace(',', '.').split('.')

    const saldoInicialCentavos = Number(reais) * 100 + Number(centavosTexto.padEnd(2, '0'))

    if (!Number.isSafeInteger(saldoInicialCentavos)) {
      alert('O saldo informado é muito alto.')
      return
    }

    if (!banco.trim() || !nome.trim()) {
      alert('Preencha o banco e o nome da conta.')
      return
    }

    try {
      setSalvando(true)

      const novaConta = await window.fincontrol.cadastrarConta({
        banco: banco.trim(),
        nome: nome.trim(),
        tipo,
        saldoInicialCentavos
      })

      setContas((anteriores) => [novaConta, ...anteriores])

      setBanco('')
      setNome('')
      setTipo('corrente')
      setSaldo('0')
    } catch (falha) {
      console.error(falha)
      alert('Não foi possível cadastrar a conta.')
    } finally {
      setSalvando(false)
    }
  }

  const saldoInicialTotal = contas.reduce((total, conta) => total + conta.saldoInicialCentavos, 0)

  return (
    <div className="pagina-contas">
      <section className="painel">
        <div className="titulo-contas">
          <div>
            <h3>Minhas contas</h3>
            <p>Gerencie suas instituições financeiras.</p>
          </div>

          <Landmark size={26} />
        </div>

        <div className="resumo-contas">
          <span>Total dos saldos iniciais</span>
          <strong>{formatarMoeda(saldoInicialTotal)}</strong>
          <small>Os saldos serão atualizados por movimentações em uma próxima etapa.</small>
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

              <span>Saldo inicial</span>

              <h3>{formatarMoeda(conta.saldoInicialCentavos)}</h3>

              <p>{conta.nome}</p>
              <small>{nomesTipos[conta.tipo]}</small>
            </article>
          ))}
        </div>

        {!carregando && !erro && contas.length === 0 && (
          <p className="vazio">Nenhuma conta cadastrada até o momento.</p>
        )}
      </section>

      <section className="painel">
        <h3>Cadastrar nova conta</h3>

        <form
          className="formulario"
          onSubmit={(evento): void => {
            void salvarConta(evento)
          }}
        >
          <label>
            Banco ou instituição
            <input
              value={banco}
              maxLength={100}
              onChange={(evento): void => setBanco(evento.target.value)}
              placeholder="Ex: Nubank"
              required
            />
          </label>

          <label>
            Nome da conta
            <input
              value={nome}
              maxLength={100}
              onChange={(evento): void => setNome(evento.target.value)}
              placeholder="Ex: Conta principal"
              required
            />
          </label>

          <label>
            Tipo de conta
            <select
              value={tipo}
              onChange={(evento): void => setTipo(evento.target.value as TipoConta)}
            >
              {Object.entries(nomesTipos).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
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
              onChange={(evento): void => setSaldo(evento.target.value)}
              placeholder="0,00"
              required
            />
          </label>

          <button
            className="botao-primario"
            type="submit"
            disabled={salvando || carregando || Boolean(erro)}
          >
            <Plus size={17} />
            {salvando ? 'Salvando...' : 'Cadastrar conta'}
          </button>
        </form>
      </section>
    </div>
  )
}
