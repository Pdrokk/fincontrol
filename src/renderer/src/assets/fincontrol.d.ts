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

declare global {
  interface Window {
    fincontrol: {
      listarTransacoes: () => Promise<TransacaoFinanceira[]>

      salvarTransacao: (dados: Omit<TransacaoFinanceira, 'id'>) => Promise<TransacaoFinanceira>

      removerTransacao: (id: string) => Promise<boolean>

      editarTransacao: (
        id: string,
        dados: Omit<TransacaoFinanceira, 'id'>
      ) => Promise<TransacaoFinanceira>

      listarContas: () => Promise<ContaFinanceira[]>

      cadastrarConta: (dados: Omit<ContaFinanceira, 'id' | 'saldoAtualCentavos'>) => Promise<ContaFinanceira>

      listarTransferencias: () => Promise<TransferenciaFinanceira[]>

      criarTransferencia: (dados: Omit<TransferenciaFinanceira, 'id'>) => Promise<TransferenciaFinanceira>
    }
  }
}
