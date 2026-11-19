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
  cor: string
  saldoInicialCentavos: number
  saldoAtualCentavos: number
}

interface AjusteSaldoFinanceiro {
  id: string
  contaId: string
  diferencaCentavos: number
  saldoAnteriorCentavos: number
  saldoDesejadoCentavos: number
  motivo: string
  data: string
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
  limiteUtilizadoCentavos: number
  limiteDisponivelCentavos: number
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
  valorPagoCentavos: number
  saldoPendenteCentavos: number
  paga: boolean
  pagamentoId: string | null
  contaPagamentoId: string | null
  dataPagamento: string | null
}

interface PagamentoFaturaFinanceiro {
  id: string
  cartaoId: string
  competencia: string
  contaId: string
  dataPagamento: string
  valorCentavos: number
}

interface DespesaCartaoRealizadaFinanceira {
  id: string
  descricao: string
  valorCentavos: number
  categoria: string
  tipo: 'despesa'
  data: string
  contaId: null
  origem: 'cartao-pago'
}
interface ParcelaRelatorioFinanceira {
  id: string
  descricao: string
  valorCentavos: number
  categoria: string
  tipo: 'despesa'
  data: string
  contaId: null
  origem: 'cartao'
}

interface ParcelaPagamentoFinanceira {
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
interface SalarioRecorrenteFinanceiro {
  id: string
  contaId: string
  descricao: string
  valorCentavos: number
  dia: number
  mesInicio: string
  quantidadeMeses: number
  ativo: number
}
declare global {
  interface Window {
    fincontrol: {
      excluirConta: (id: string) => Promise<boolean>
      listarSalarios: () => Promise<SalarioRecorrenteFinanceiro[]>
      cadastrarSalario: (
        dados: Omit<SalarioRecorrenteFinanceiro, 'id' | 'ativo'>
      ) => Promise<SalarioRecorrenteFinanceiro>
      desativarSalario: (id: string) => Promise<void>
      listarParcelasPagamento: () => Promise<ParcelaPagamentoFinanceira[]>
      arquivarParcela: (id: string, arquivar: boolean) => Promise<void>
      pagarParcelasSelecionadas: (dados: {
        parcelaIds: string[]
        contaId: string
        dataPagamento: string
      }) => Promise<{ valorCentavos: number; parcelasPagas: number }>
      listarCartoes: () => Promise<CartaoFinanceiro[]>
      atualizarCartao: (
        id: string,
        dados: Omit<CartaoFinanceiro, 'id' | 'limiteUtilizadoCentavos' | 'limiteDisponivelCentavos'>
      ) => Promise<CartaoFinanceiro>
      cadastrarCartao: (
        dados: Omit<CartaoFinanceiro, 'id' | 'limiteUtilizadoCentavos' | 'limiteDisponivelCentavos'>
      ) => Promise<CartaoFinanceiro>
      listarComprasCartao: () => Promise<CompraCartaoFinanceira[]>
      cadastrarCompraCartao: (
        dados: Omit<CompraCartaoFinanceira, 'id'>
      ) => Promise<CompraCartaoFinanceira>
      listarFaturasPrevistas: () => Promise<FaturaPrevistaFinanceira[]>
      listarParcelasRelatorio: () => Promise<ParcelaRelatorioFinanceira[]>
      listarDespesasCartaoRealizadas: () => Promise<DespesaCartaoRealizadaFinanceira[]>
      pagarFatura: (
        dados: Omit<PagamentoFaturaFinanceiro, 'id' | 'valorCentavos'>
      ) => Promise<PagamentoFaturaFinanceiro>
      listarTransacoes: () => Promise<TransacaoFinanceira[]>

      salvarTransacao: (dados: Omit<TransacaoFinanceira, 'id'>) => Promise<TransacaoFinanceira>

      removerTransacao: (id: string) => Promise<boolean>

      editarTransacao: (
        id: string,
        dados: Omit<TransacaoFinanceira, 'id'>
      ) => Promise<TransacaoFinanceira>

      listarContas: () => Promise<ContaFinanceira[]>
      editarConta: (
        id: string,
        dados: Pick<ContaFinanceira, 'banco' | 'nome' | 'tipo' | 'cor'>
      ) => Promise<ContaFinanceira>
      ajustarSaldo: (
        dados: Pick<AjusteSaldoFinanceiro, 'contaId' | 'saldoDesejadoCentavos' | 'motivo' | 'data'>
      ) => Promise<AjusteSaldoFinanceiro>
      listarAjustesSaldo: () => Promise<AjusteSaldoFinanceiro[]>

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
