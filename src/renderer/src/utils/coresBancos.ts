/**
 * Paletas aproximadas inspiradas nas cores públicas das instituições.
 * Não representa branding oficial, apenas identificação visual.
 */
interface PaletaBanco {
  principal: string
  secundario: string
}

export function normalizarBanco(nome: string): string {
  return nome.toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function paletaBanco(nome: string): PaletaBanco {
  const banco = normalizarBanco(nome)
  if (banco.includes('nubank') || banco === 'nu') return { principal: '#6c28a7', secundario: '#451c7c' }
  if (banco.includes('santander')) return { principal: '#d92d32', secundario: '#9c1c28' }
  if (banco.includes('itau')) return { principal: '#1749aa', secundario: '#ed781b' }
  if (banco.includes('inter')) return { principal: '#e77916', secundario: '#aa490d' }
  if (banco.includes('caixa')) return { principal: '#2167ad', secundario: '#ed8b22' }
  if (banco.includes('bradesco')) return { principal: '#c71d34', secundario: '#861629' }
  if (banco.includes('banco do brasil') || banco === 'bb') return { principal: '#184e9c', secundario: '#d1a900' }
  if (banco.includes('picpay')) return { principal: '#167b4f', secundario: '#10563d' }
  if (banco.includes('mercado pago')) return { principal: '#1674ab', secundario: '#104a7a' }
  if (banco.includes('sicredi')) return { principal: '#176b4b', secundario: '#0c483a' }
  if (banco.includes('sicoob')) return { principal: '#176565', secundario: '#144246' }
  if (banco.includes('c6')) return { principal: '#363d4a', secundario: '#171e29' }
  if (banco.includes('neon')) return { principal: '#0f749e', secundario: '#16466a' }
  if (banco.includes('pagbank') || banco.includes('pagseguro')) return { principal: '#328456', secundario: '#1b6046' }
  if (banco.includes('btg')) return { principal: '#224a89', secundario: '#182f55' }
  if (banco.includes('xp')) return { principal: '#343f53', secundario: '#172033' }
  return { principal: '#334e71', secundario: '#172b49' }
}

export function corBanco(nome: string): string {
  return paletaBanco(nome).principal
}

export function gradienteBanco(nome: string): string {
  const { principal, secundario } = paletaBanco(nome)
  return `linear-gradient(130deg, ${principal}, ${secundario})`
}
