export {}

type TipoFinanceiro = 'receita' | 'despesa'

interface TransacaoFinanceira {
  id: string
  descricao: string
  valorCentavos: number
  tipo: TipoFinanceiro
  categoria: string
  data: string
}

interface ContaFinanceira {
  id: string
  banco: string
  nome: string
  tipo: 'corrente' | 'poupanca' | 'dinheiro' | 'outra'
  saldoInicialCentavos: number
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

      cadastrarConta: (dados: Omit<ContaFinanceira, 'id'>) => Promise<ContaFinanceira>
    }
  }
}
