import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { obterBanco } from './database'
import { consultarCotacao } from './cotacoes'
import { listarPosicoes, salvarCotacaoMercado } from './investimentos'

const arquivo = (): string => join(app.getPath('userData'), 'cotacoes-chave.bin')
let chaveSessao: string | null = null
function chave(): string {
  if (chaveSessao !== null) return chaveSessao
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
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Armazenamento seguro indisponível neste dispositivo. A chave não foi salva.')
  writeFileSync(arquivo(),safeStorage.encryptString(token),{mode:0o600})
  chaveSessao = token
}
interface Resultado { atualizadas: number; falhas: { codigo: string; motivo: string }[] }
let pendente: Promise<Resultado> | null = null
async function atualizar(forcar: boolean): Promise<Resultado> {
  const db = obterBanco()
  const posicoes = listarPosicoes(db).filter(a => !a.arquivado && a.quantidadeMercado !== null && (forcar || !a.consultaEm || Date.now()-Date.parse(a.consultaEm)>30*60000))
  const resultado: Resultado = {atualizadas:0,falhas:[]}
  const token = chave()
  const grupos = new Map<string, typeof posicoes>()
  for (const a of posicoes) {
    const identificador = a.tipo + ':' + a.codigo
    const grupo = grupos.get(identificador) ?? []
    grupo.push(a)
    grupos.set(identificador,grupo)
  }
  const fila = [...grupos.values()]
  async function processar(): Promise<void> {
    while (fila.length) {
      const grupo = fila.shift()
      if (!grupo?.length) continue
      if (obterBanco() !== db) return
      const a = grupo[0]
      try {
        const cotacao = await consultarCotacao(a.codigo,a.tipo,token)
        if (obterBanco() !== db) return
        for (const p of grupo) {
          if (salvarCotacaoMercado(db,p.id,cotacao)) resultado.atualizadas++
        }
      } catch (erro) {
        const motivo = erro instanceof Error && (erro.message.startsWith('A fonte') || erro.message.startsWith('Limite de')) ? erro.message : 'Não foi possível consultar. Último valor preservado.'
        resultado.falhas.push({codigo:a.codigo,motivo})
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(3,fila.length)},()=>processar()))
  return resultado
}
export function sincronizarCotacoes(forcar: boolean): Promise<Resultado> {
  if (pendente) return pendente
  pendente = atualizar(forcar).finally(() => { pendente = null })
  return pendente
}
