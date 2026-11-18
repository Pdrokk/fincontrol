import { Moon, Sun } from 'lucide-react'

interface Props {
  tema: 'light' | 'dark'
  onAlternar: () => void
}

export default function ThemeToggle({ tema, onAlternar }: Props): React.JSX.Element {
  const escuro = tema === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={escuro}
      aria-label={escuro ? 'Desativar modo escuro' : 'Ativar modo escuro'}
      title={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="theme-toggle"
      onClick={onAlternar}
    >
      <Sun size={17} aria-hidden="true" />
      <span className="theme-toggle-indicador" aria-hidden="true" />
      <Moon size={17} aria-hidden="true" />
    </button>
  )
}
