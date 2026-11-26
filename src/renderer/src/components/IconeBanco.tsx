import { Landmark } from 'lucide-react'
import { normalizarBanco, paletaBanco } from '../utils/coresBancos'

export default function IconeBanco({ banco }: { banco: string }): React.JSX.Element {
  const nome = normalizarBanco(banco)
  const marcas: [string, string][] = [
    ['nubank', 'nu'],
    ['inter', 'in'],
    ['itau', 'itaú'],
    ['santander', 'S'],
    ['bradesco', 'B'],
    ['caixa', 'X'],
    ['banco do brasil', 'BB'],
    ['picpay', 'P'],
    ['c6', 'C6'],
    ['mercado pago', 'MP'],
    ['sicredi', 'Si'],
    ['sicoob', 'SC'],
    ['neon', 'N'],
    ['pagbank', 'PB'],
    ['btg', 'BTG'],
    ['xp', 'XP']
  ]
  const sigla =
    nome === 'nu'
      ? 'nu'
      : nome === 'bb'
        ? 'BB'
        : marcas.find(([chave]) => nome.includes(chave))?.[1]
  return (
    <span
      className="icone-banco"
      aria-hidden="true"
      style={{ background: paletaBanco(banco).secundario }}
    >
      {sigla ?? <Landmark size={18} />}
    </span>
  )
}
