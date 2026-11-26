function abrir(
  mensagem: string,
  titulo: string,
  acao: string,
  perigo: boolean,
  pedirTexto: boolean
): Promise<string | null> {
  return new Promise((resolve) => {
    const raiz = document.querySelector('.fincontrol')
    if (!raiz || raiz.querySelector('.fc-dialogo[open]')) {
      resolve(null)
      return
    }
    const anterior = document.activeElement
    const dialogo = document.createElement('dialog')
    dialogo.className = 'fc-dialogo'
    dialogo.setAttribute('aria-labelledby', 'fc-dialogo-titulo')
    dialogo.setAttribute('aria-describedby', 'fc-dialogo-descricao')
    const h = document.createElement('h2')
    h.id = 'fc-dialogo-titulo'
    h.textContent = titulo
    const p = document.createElement('p')
    p.id = 'fc-dialogo-descricao'
    p.textContent = mensagem
    const form = document.createElement('form')
    const input = document.createElement('input')
    if (pedirTexto) {
      input.type = 'text'
      input.required = true
      input.minLength = 5
      input.maxLength = 200
      input.setAttribute('aria-label', 'Motivo do estorno')
      input.placeholder = 'Informe o motivo'
      form.append(input)
    }
    const acoes = document.createElement('div')
    acoes.className = 'fc-dialogo-acoes'
    const cancelar = document.createElement('button')
    cancelar.type = 'button'
    cancelar.className = 'fc-cancelar'
    cancelar.textContent = 'Cancelar'
    const confirmar = document.createElement('button')
    confirmar.type = 'submit'
    confirmar.className = perigo ? 'fc-confirmar fc-perigo' : 'fc-confirmar'
    confirmar.textContent = acao
    acoes.append(cancelar, confirmar)
    form.append(acoes)
    dialogo.append(h, p, form)
    let resolvido = false
    function fechar(valor: string | null): void {
      if (resolvido) return
      resolvido = true
      if (dialogo.open) dialogo.close()
      dialogo.remove()
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus()
      resolve(valor)
    }
    cancelar.addEventListener('click', () => fechar(null))
    dialogo.addEventListener('cancel', (e) => {
      e.preventDefault()
      fechar(null)
    })
    dialogo.addEventListener('close', () => fechar(null))
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (pedirTexto && input.value.trim().length < 5) {
        input.setCustomValidity('Informe pelo menos cinco caracteres.')
        input.reportValidity()
        return
      }
      fechar(pedirTexto ? input.value.trim() : '')
    })
    input.addEventListener('input', () => input.setCustomValidity(''))
    raiz.append(dialogo)
    dialogo.showModal()
    if (pedirTexto) input.focus()
    else cancelar.focus()
  })
}

export async function confirmarFinControl(
  mensagem: string,
  titulo = 'Confirmar operação',
  acao = 'Confirmar',
  perigo = false
): Promise<boolean> {
  return (await abrir(mensagem, titulo, acao, perigo, false)) !== null
}

export function solicitarFinControl(mensagem: string, titulo: string): Promise<string | null> {
  return abrir(mensagem, titulo, 'Continuar', false, true)
}
