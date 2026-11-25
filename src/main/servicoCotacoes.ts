import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { obterBanco } from './database'
import { consultarCotacao } from './cotacoes'
import { listarPosicoes, salvarCotacaoMercado } from './investimentos'

const arquivo = (): string => join(app.getPath('userData'), 'cotacoes-chave.bin')
let chaveSessao = ''
function chave(): string {
  if (chaveSessao) return chaveSessao
  if (process.env.BRAPI_API_KEY) return process.env.BRAPI_API_KEY
  try {
    return safeStorage.isEncryptionAvailable() && existsSync(arquivo()) ? safeStorage.decryptString(readFileSync(arquivo())) : ''
  } catch { return '' }
}
export function chaveConfigurada(): boolean { return Boolean(chave()) }
export function configurarChave(valor: string): void {
  if (typeof valor !== 'string' || valor.length > 512 || /[\r\n]/.test(valor)) throw new Error('Chave inválida.')
  const token = valor.trim()
  if (!token) {
    rmSync(arquivo(), {force:true})
    chaveSessao = ''
    return
  }
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(arquivo(),safeStorage.encryptString(token),{mode:0o600})
  }
  chaveSessao = token
}
interface Resultado { atualizadas: number; falhas: { codigo: string; motivo: string }[] }
let pendente: Promise<Resultado> | null = null
async function atualizar(forcar: boolean): Promise<Resultado> {
  const db = obterBanco()
  const posicoes = listarPosicoes(db).filter(a => a.quantidadeMercado !== null && (forcar || !a.consultaEm || Date.now()-Date.parse(a.consultaEm)>30*60000))
  const resultado: Resultado = {atualizadas:0,falhas:[]}
  const token = chave()
  const cache = new Map<string, Awaited<ReturnType<typeof consultarCotacao>>>()
  for (const a of posicoes) {
    try {
      const identificador = a.tipo + ':' + a.codigo
      let cotacao = cache.get(identificador)
      if (!cotacao) {
        cotacao = await consultarCotacao(a.codigo,a.tipo,token)
        cache.set(identificador,cotacao)
      }
      salvarCotacaoMercado(db,a.id,cotacao)
      resultado.atualizadas++
    } catch (erro) {
      resultado.falhas.push({codigo:a.codigo,motivo:erro instanceof Error && (erro.message.startsWith('A fonte') || erro.message.startsWith('Limite de')) ? erro.message : 'Não foi possível consultar. Último valor preservado.'})
    }
  }
  return resultado
}
export function sincronizarCotacoes(forcar: boolean): Promise<Resultado> {
  if (pendente) return pendente
  pendente = atualizar(forcar).finally(() => { pendente = null })
  return pendente
}
