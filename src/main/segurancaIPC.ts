/** Autoriza apenas o documento registrado da janela e seu frame principal. */
export function origemIPCConfiavel(
  origem: string | undefined,
  documento: string | undefined,
  framePrincipal: boolean
): boolean {
  if (!framePrincipal || !origem || !documento) return false
  try {
    const atual = new URL(origem)
    const esperado = new URL(documento)
    atual.hash = ''
    esperado.hash = ''
    return ['file:', 'http:', 'https:'].includes(esperado.protocol) && atual.href === esperado.href
  } catch {
    return false
  }
}
