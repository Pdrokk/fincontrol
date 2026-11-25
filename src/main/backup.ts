import { criarTabelasInvestimentos } from './investimentos'
import { app, dialog } from 'electron'
import { DatabaseSync, backup } from 'node:sqlite'
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { caminhoBanco, fecharBanco, iniciarBanco, obterBanco } from './database'
import { criarTabelaContas } from './contas'
import { criarTabelasCartoes } from './cartoes'
import { criarTabelaSalarios, processarSalariosVencidos } from './salarios'

function iniciarModelo(): void {
  iniciarBanco()
  criarTabelaContas()
  criarTabelasCartoes()
  criarTabelaSalarios()
  criarTabelasInvestimentos(obterBanco())
  obterBanco().exec('PRAGMA foreign_keys = ON')
  processarSalariosVencidos()
}

/** Cópia online consistente do SQLite, não uma cópia cega de arquivo aberto. */
export async function exportarBackup(): Promise<string | null> {
  const hoje = new Date().toISOString().slice(0, 10)
  const escolha = await dialog.showSaveDialog({
    title: 'Exportar backup do FinControl',
    defaultPath: `fincontrol-backup-${hoje}.db`,
    filters: [{ name: 'Banco SQLite', extensions: ['db'] }]
  })
  if (escolha.canceled || !escolha.filePath) return null
  if (resolve(escolha.filePath) === resolve(caminhoBanco())) {
    throw new Error('Selecione um caminho diferente do banco em uso.')
  }
  await backup(obterBanco(), escolha.filePath)
  return basename(escolha.filePath)
}

function validarBackup(caminho: string): void {
  const verificacao = new DatabaseSync(caminho, { readOnly: true })
  try {
    const resultado = verificacao.prepare('PRAGMA integrity_check').get() as
      | { integrity_check: string } | undefined
    if (resultado?.integrity_check !== 'ok') {
      throw new Error('O arquivo não passou na verificação de integridade do SQLite.')
    }
    const nomes = verificacao.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all() as { name: string }[]
    const existentes = new Set(nomes.map((t) => t.name))
    if (!['transacoes', 'contas', 'cartoes', 'parcelas_cartao', 'compras_cartao'].every(
      (nome) => existentes.has(nome)
    )) {
      throw new Error('O arquivo não contém as tabelas obrigatórias do FinControl.')
    }
  } finally {
    verificacao.close()
  }
}

/**
 * Restauração com snapshot de emergência e rollback caso falhe a migração.
 * A janela será recarregada pelo IPC após êxito.
 */
export async function restaurarBackup(): Promise<boolean> {
  const selecao = await dialog.showOpenDialog({
    title: 'Selecionar backup do FinControl',
    properties: ['openFile'],
    filters: [{ name: 'Banco SQLite', extensions: ['db'] }]
  })
  if (selecao.canceled || selecao.filePaths.length !== 1) return false
  const origem = selecao.filePaths[0]
  if (resolve(origem) === resolve(caminhoBanco())) {
    throw new Error('Escolha um backup, não o arquivo de banco atualmente em uso.')
  }
  validarBackup(origem)

  const confirmacao = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancelar', 'Restaurar backup'],
    defaultId: 0,
    cancelId: 0,
    title: 'Confirmar restauração',
    message: 'Restaurar este backup substituirá os dados atuais do FinControl.',
    detail: 'Uma cópia de segurança dos dados atuais será criada automaticamente antes da troca.'
  })
  if (confirmacao.response !== 1) return false

  await aplicarRestauracaoValidada(origem)
  return true
}

/**
 * Núcleo da restauração (sem diálogo): reutilizado no teste integrado
 * do executável, sempre com backup de emergência primeiro.
 */
export async function aplicarRestauracaoValidada(origem: string): Promise<void> {
  if (resolve(origem) === resolve(caminhoBanco())) {
    throw new Error('Não use o próprio banco aberto como arquivo de restauração.')
  }
  validarBackup(origem)
  const atual = caminhoBanco()
  const pastaSeguranca = join(app.getPath('userData'), 'dados', 'backups')
  mkdirSync(pastaSeguranca, { recursive: true })
  const snapshot = join(pastaSeguranca, `antes-restauracao-${Date.now()}.db`)
  await backup(obterBanco(), snapshot)

  const limparJournals = (): void => {
    for (const sufixo of ['-wal', '-shm']) {
      const arquivo = atual + sufixo
      if (existsSync(arquivo)) unlinkSync(arquivo)
    }
  }

  fecharBanco()
  try {
    mkdirSync(dirname(atual), { recursive: true })
    limparJournals()
    copyFileSync(origem, atual)
    iniciarModelo()
    const integridade = obterBanco().prepare('PRAGMA integrity_check').get() as
      | { integrity_check: string } | undefined
    if (integridade?.integrity_check !== 'ok' ||
        obterBanco().prepare('PRAGMA foreign_key_check').all().length !== 0) {
      throw new Error('Falha na verificação do banco restaurado.')
    }
  } catch (erro) {
    fecharBanco()
    limparJournals()
    copyFileSync(snapshot, atual)
    iniciarModelo()
    throw erro
  }
}
