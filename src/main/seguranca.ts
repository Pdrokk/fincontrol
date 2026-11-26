// O chamador também exige um WebContents registrado.
export function remetenteIPCConfiavel(
  url: string | undefined,
  documento: string | undefined,
  framePrincipal: boolean
): boolean {
  if (!framePrincipal || !url || !documento) return false
  try {
    const atual = new URL(url)
    const esperado = new URL(documento)
    atual.hash = ''
    esperado.hash = ''
    return ['file:', 'http:', 'https:'].includes(esperado.protocol) && atual.href === esperado.href
  } catch {
    return false
  }
}

export function urlExternaPermitida(valor: string): boolean {
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['github.com', 'react.dev', 'electronjs.org'].includes(url.hostname)
  } catch {
    return false
  }
}
