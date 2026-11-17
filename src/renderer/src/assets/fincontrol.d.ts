export {}

type TipoFinanceiro = 'receita' | 'despesa'

interface TransacaoFinanceira {
  id: string
  descricao: string
  valorCentavos: number
  tipo: TipoFinanceiro
  categoria: string
  data: string
  contaId: string | null
}

interface ContaFinanceira {
  id: string
  banco: string
  nome: string
  tipo: 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'
  saldoInicialCentavos: number
  saldoAtualCentavos: number
}

interface TransferenciaFinanceira {
  id: string
  origemId: string
  destinoId: string
  valorCentavos: number
  data: string
  descricao: string
}

interface CartaoFinanceiro {
  id: string
  contaId: string | null
  nome: string
  banco: string
  limiteCentavos: number
  diaFechamento: number
  diaVencimento: number
}
interface CompraCartaoFinanceira {
  id: string
  cartaoId: string
  descricao: string
  categoria: string
  data: string
  valorCentavos: number
  numeroParcelas: number
}
interface FaturaPrevistaFinanceira {
  cartaoId: string
  competencia: string
  vencimento: string
  totalCentavos: number
  quantidadeParcelas: number
}

declare global {
  interface Window {
    fincontrol: {
      listarCartoes: () => Promise<CartaoFinanceiro[]>
      cadastrarCartao: (dados: Omit<CartaoFinanceiro, 'id'>) => Promise<CartaoFinanceiro>
      listarComprasCartao: () => Promise<CompraCartaoFinanceira[]>
      cadastrarCompraCartao: (dados: Omit<CompraCartaoFinanceira, 'id'>) => Promise<CompraCartaoFinanceira>
      listarFaturasPrevistas: () => Promise<FaturaPrevistaFinanceira[]>
      listarTransacoes: () => Promise<TransacaoFinanceira[]>

      salvarTransacao: (dados: Omit<TransacaoFinanceira, 'id'>) => Promise<TransacaoFinanceira>

      removerTransacao: (id: string) => Promise<boolean>

      editarTransacao: (
        id: string,
        dados: Omit<TransacaoFinanceira, 'id'>
      ) => Promise<TransacaoFinanceira>

      listarContas: () => Promise<ContaFinanceira[]>

      cadastrarConta: (
        dados: Omit<ContaFinanceira, 'id' | 'saldoAtualCentavos'>
      ) => Promise<ContaFinanceira>

      listarTransferencias: () => Promise<TransferenciaFinanceira[]>

      criarTransferencia: (
        dados: Omit<TransferenciaFinanceira, 'id'>
      ) => Promise<TransferenciaFinanceira>
    }
  }
}
