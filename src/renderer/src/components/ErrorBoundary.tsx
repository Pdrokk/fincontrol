import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { erro: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false }

  static getDerivedStateFromError(): State {
    return { erro: true }
  }

  componentDidCatch(erro: Error, informacoes: ErrorInfo): void {
    console.error('Erro na interface do FinControl:', erro, informacoes.componentStack)
  }

  render(): ReactNode {
    if (!this.state.erro) return this.props.children
    return (
      <main className="tela-recuperacao" role="alert">
        <div className="painel">
          <h1>Não foi possível carregar esta tela</h1>
          <p>Seus dados financeiros continuam armazenados localmente. Você pode tentar abrir o aplicativo novamente.</p>
          <button type="button" onClick={(): void => window.location.reload()}>
            Recarregar FinControl
          </button>
        </div>
      </main>
    )
  }
}
