import { contextBridge, ipcRenderer } from 'electron'

// Expor somente diagnóstico de versão e isolamento, não IPC genérico.
contextBridge.exposeInMainWorld('electron', {
  process: {
    sandboxed: process.sandboxed === true,
    contextIsolated: process.contextIsolated === true,
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    }
  }
})

const fincontrolAPI = {
  sincronizarCotacoes: (forcar = false): Promise<unknown> => ipcRenderer.invoke('investimentos:sincronizar', forcar),
  configurarChaveCotacoes: (chave: string): Promise<void> => ipcRenderer.invoke('investimentos:chave', chave),
  chaveCotacoesConfigurada: (): Promise<boolean> => ipcRenderer.invoke('investimentos:chave-configurada'),
  reativarAtivoInvestimento: (id: string): Promise<void> => ipcRenderer.invoke('investimentos:reativar', id),
  excluirAtivoInvestimento: (id: string): Promise<void> => ipcRenderer.invoke('investimentos:excluir', id),
  atualizarQuantidadeMercado: (id: string, quantidade: number): Promise<void> => ipcRenderer.invoke('investimentos:quantidade', id, quantidade),
  consultarFundamentos: (id:string): Promise<unknown> => ipcRenderer.invoke('investimentos:fundamentos', id),
  listarHistoricoCotacoes: (id: string): Promise<unknown> => ipcRenderer.invoke('investimentos:historico-cotacoes', id),
  abrirFonteInvestimento: (fonte: string): Promise<void> => ipcRenderer.invoke('investimentos:fonte-oficial', fonte),
  listarInvestimentos: (): Promise<unknown> => ipcRenderer.invoke('investimentos:listar'),
  cadastrarAtivo: (dados: unknown): Promise<string> => ipcRenderer.invoke('investimentos:cadastrar', dados),
  atualizarValorAtivo: (id: string, centavos: number): Promise<void> => ipcRenderer.invoke('investimentos:valor', id, centavos),
  atualizarCotacao: (id: string, centavos: number): Promise<void> => ipcRenderer.invoke('investimentos:cotacao', id, centavos),
  registrarInvestimento: (dados: unknown): Promise<void> => ipcRenderer.invoke('investimentos:operacao', dados),
  exportarBackup: (): Promise<string | null> => ipcRenderer.invoke('backup:exportar'),
  restaurarBackup: (): Promise<boolean> => ipcRenderer.invoke('backup:restaurar'),
  estornarPagamento: (dados: {
    tipo: 'fatura' | 'parcela'
    pagamentoId: string
    motivo: string
  }): Promise<unknown> => ipcRenderer.invoke('pagamentos:estornar', dados),
  listarEstornosPagamentos: (): Promise<unknown> => ipcRenderer.invoke('pagamentos:estornos-listar'),
  onAtualizacaoAutomatica: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('fincontrol:atualizado', listener)
    return (): void => { ipcRenderer.removeListener('fincontrol:atualizado', listener) }
  },
  listarTransacoes: (): Promise<unknown> => ipcRenderer.invoke('transacoes:listar'),

  salvarTransacao: (dados: {
    descricao: string
    valorCentavos: number
    tipo: 'receita' | 'despesa'
    categoria: string
    data: string
    contaId: string | null
  }): Promise<unknown> => ipcRenderer.invoke('transacoes:salvar', dados),

  removerTransacao: (id: string): Promise<boolean> => ipcRenderer.invoke('transacoes:remover', id),

  editarTransacao: (
    id: string,
    dados: {
      descricao: string
      valorCentavos: number
      tipo: 'receita' | 'despesa'
      categoria: string
      data: string
      contaId: string | null
    }
  ): Promise<unknown> => ipcRenderer.invoke('transacoes:editar', id, dados),

  listarContas: (): Promise<unknown> => ipcRenderer.invoke('contas:listar'),
  excluirConta: (id: string): Promise<boolean> => ipcRenderer.invoke('contas:excluir', id),
  listarSalarios: (): Promise<unknown> => ipcRenderer.invoke('salarios:listar'),
  cadastrarSalario: (dados: {
    contaId: string
    descricao: string
    valorCentavos: number
    dia: number
    mesInicio: string
    quantidadeMeses: number
    permitirRetroativo?: boolean
  }): Promise<unknown> => ipcRenderer.invoke('salarios:cadastrar', dados),
  desativarSalario: (id: string): Promise<void> => ipcRenderer.invoke('salarios:desativar', id),
  listarParcelasPagamento: (): Promise<unknown> => ipcRenderer.invoke('parcelas:listar'),
  arquivarParcela: (id: string, arquivar: boolean): Promise<void> => ipcRenderer.invoke('parcelas:arquivar', id, arquivar),
  pagarParcelasSelecionadas: (dados: {
    parcelaIds: string[]
    contaId: string
    dataPagamento: string
  }): Promise<unknown> => ipcRenderer.invoke('parcelas:pagar-selecionadas', dados),
  editarConta: (id: string, dados: {
    banco: string
    nome: string
    tipo: 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'
    cor: string
  }): Promise<unknown> => ipcRenderer.invoke('contas:editar', id, dados),

  ajustarSaldo: (dados: {
    contaId: string
    saldoDesejadoCentavos: number
    motivo: string
    data: string
  }): Promise<unknown> => ipcRenderer.invoke('contas:ajustar-saldo', dados),

  listarAjustesSaldo: (): Promise<unknown> => ipcRenderer.invoke('contas:listar-ajustes'),


  cadastrarConta: (dados: {
    banco: string
    nome: string
    tipo: 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'
    saldoInicialCentavos: number
    cor: string
  }): Promise<unknown> => ipcRenderer.invoke('contas:cadastrar', dados),

  listarCartoes: (): Promise<unknown> => ipcRenderer.invoke('cartoes:listar'),
  excluirCartao: (id: string): Promise<boolean> => ipcRenderer.invoke('cartoes:excluir', id),
  atualizarCartao: (id: string, dados: {
    contaId: string | null
    nome: string
    banco: string
    limiteCentavos: number
    diaFechamento: number
    diaVencimento: number
  }): Promise<unknown> => ipcRenderer.invoke('cartoes:atualizar', id, dados),
  cadastrarCartao: (dados: {
    contaId: string | null
    nome: string
    banco: string
    limiteCentavos: number
    diaFechamento: number
    diaVencimento: number
  }): Promise<unknown> => ipcRenderer.invoke('cartoes:cadastrar', dados),
  listarComprasCartao: (): Promise<unknown> => ipcRenderer.invoke('compras-cartao:listar'),
  cadastrarCompraCartao: (dados: {
    cartaoId: string
    descricao: string
    categoria: string
    data: string
    valorCentavos: number
    numeroParcelas: number
  }): Promise<unknown> => ipcRenderer.invoke('compras-cartao:cadastrar', dados),
  listarFaturasPrevistas: (): Promise<unknown> => ipcRenderer.invoke('faturas-previstas:listar'),
  listarParcelasRelatorio: (): Promise<unknown> => ipcRenderer.invoke('parcelas-relatorios:listar'),
  listarDespesasCartaoRealizadas: (): Promise<unknown> => ipcRenderer.invoke('cartoes:despesas-realizadas'),
  pagarFatura: (dados: {
    cartaoId: string
    competencia: string
    contaId: string
    dataPagamento: string
  }): Promise<unknown> => ipcRenderer.invoke('faturas:pagar', dados),

  listarTransferencias: (): Promise<unknown> => ipcRenderer.invoke('transferencias:listar'),

  criarTransferencia: (dados: {
    origemId: string
    destinoId: string
    valorCentavos: number
    data: string
    descricao: string
  }): Promise<unknown> => ipcRenderer.invoke('transferencias:criar', dados)
}

contextBridge.exposeInMainWorld('fincontrol', fincontrolAPI)
