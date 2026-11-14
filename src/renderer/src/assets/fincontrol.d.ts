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
    }
  }
}
