import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

const fincontrolAPI = {
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

  cadastrarConta: (dados: {
    banco: string
    nome: string
    tipo: 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'
    saldoInicialCentavos: number
  }): Promise<unknown> => ipcRenderer.invoke('contas:cadastrar', dados),

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
