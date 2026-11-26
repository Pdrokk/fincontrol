/**
 * Regras puras de datas/lançamentos: compartilhadas entre banco e testes.
 * Data ISO local para evitar divergências de fuso entre Date e SQLite.
 */
export function hojeLocalISO(agora: Date = new Date()): string {
  const ano = String(agora.getFullYear())
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function naoEhFuturo(data: string, hoje: string = hojeLocalISO()): boolean {
  return data <= hoje
}

export function validarOperacaoImediata(data: string, hoje: string = hojeLocalISO()): void {
  if (data > hoje) {
    throw new Error(
      'Esta operação movimenta dinheiro imediatamente. Escolha hoje ou uma data anterior.'
    )
  }
}

export function inicioDeSalarioRetroativo(
  mesInicio: string,
  dia: number,
  hoje: string = hojeLocalISO()
): boolean {
  return `${mesInicio}-${String(dia).padStart(2, '0')}` < hoje
}

export function podeExcluirConta(saldoCentavos: number): boolean {
  return saldoCentavos === 0
}

/** Normaliza a categoria antes de aplicar as proteções de salário recorrente. */
export function ehCategoriaSalario(categoria: string): boolean {
  return categoria.trim().toLocaleLowerCase('pt-BR') === 'salário'
}
