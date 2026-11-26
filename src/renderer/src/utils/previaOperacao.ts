export type TipoOperacao = 'compra' | 'venda' | 'provento'
export interface PreviaOperacao { caixa: number | null; restante: number | null; erro: string }
const limite = 1_000_000_000_000
export function preverOperacao(tipo: TipoOperacao, bruto: number, taxas: number, quantidade: number, atual: number, saldo?: number): PreviaOperacao {
  const invalida = (erro: string): PreviaOperacao => ({ caixa: null, restante: null, erro })
  if (!Number.isSafeInteger(bruto) || bruto < 1 || bruto > limite || !Number.isSafeInteger(taxas) || taxas < 0 || taxas > limite) return invalida('Informe um valor bruto positivo e taxas válidas.')
  const caixa = tipo === 'compra' ? -bruto - taxas : bruto - taxas
  if (Math.abs(caixa) > limite || (tipo !== 'compra' && caixa <= 0)) return invalida('O valor líquido deve ser positivo e estar dentro do limite suportado.')
  const unidades = Math.round(quantidade * 1e8)
  const existentes = Math.round(atual * 1e8)
  if (!Number.isSafeInteger(unidades) || unidades < (tipo === 'provento' ? 0 : 1) || unidades > limite || Math.abs(unidades / 1e8 - quantidade) > 1e-12 || (tipo === 'provento' && unidades !== 0)) return invalida('Informe uma quantidade válida, com até oito casas decimais.')
  if (tipo === 'venda' && unidades > existentes) return invalida('Quantidade superior à posição disponível.')
  const restante = tipo === 'compra' ? existentes + unidades : tipo === 'venda' ? existentes - unidades : existentes
  if (!Number.isSafeInteger(restante) || restante < 0 || restante > limite) return invalida('A quantidade resultante excede o limite suportado.')
  return { caixa, restante: restante / 1e8, erro: tipo === 'compra' && saldo !== undefined && saldo < -caixa ? 'Saldo insuficiente na conta selecionada.' : '' }
}
