import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { iniciarBanco, obterBanco } from './database'
import { exportarBackup, restaurarBackup } from './backup'
import { executarSmokeInstalado } from './smoke'
import { executarMigracaoLegadaSmoke } from './migracaoSmoke'
import icon from '../../resources/icon.png?asset'
import { listarTransacoes, salvarTransacao, removerTransacao, editarTransacao } from './database'

import {
  criarTabelaContas,
  listarContas,
  cadastrarConta,
  editarConta,
  ajustarSaldo,
  listarAjustesSaldo,
  excluirConta,
  listarTransferencias,
  transferirEntreContas
} from './contas'

import type { NovaConta, NovaTransferencia, AlteracaoConta, NovoAjusteSaldo } from './contas'
import { criarTabelaSalarios, listarSalarios, cadastrarSalario, desativarSalario, processarSalariosVencidos } from './salarios'
import type { NovoSalarioRecorrente } from './salarios'

import type { NovaTransacao } from './database'
import { criarTabelasCartoes, listarCartoes, cadastrarCartao, atualizarCartao, cadastrarCompra, listarCompras, listarFaturasPrevistas, listarParcelasParaRelatorios, listarDespesasCartaoRealizadas, pagarFatura } from './cartoes'
import type { NovoCartao, NovaCompra, NovoPagamentoFatura, NovoPagamentoParcelas } from './cartoes'
import { listarParcelasPagamento, pagarParcelasSelecionadas, definirArquivoParcela, estornarPagamento, listarEstornosPagamentos } from './cartoes'
import type { NovoEstornoPagamento } from './cartoes'

const modoUISmoke = process.argv.includes('--fincontrol-ui-smoke-test')

/**
 * Exercita a interface React do executável de produção com o browser oculto.
 * Usa um perfil SQLite isolado, criado apenas no modo de teste.
 */
async function verificarInterfaceInstalada(janela: BrowserWindow): Promise<void> {
  const resultado = await janela.webContents.executeJavaScript(`
    (async () => {
      const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let i = 0; i < 30 && !document.querySelector('.sidebar nav'); i++) {
        await dormir(100);
      }
      if (!document.querySelector('.sidebar nav')) {
        throw new Error('Menu principal não foi renderizado.');
      }

      const paginas = [
        'Visão Geral', 'Transações', 'Relatórios', 'Minhas contas',
        'Cartões e faturas', 'Configurações'
      ];
      const verificadas = [];
      for (const nome of paginas) {
        const botao = [...document.querySelectorAll('.sidebar nav button')]
          .find(b => b.getAttribute('title') === nome);
        if (!botao) throw new Error('Menu ausente: ' + nome);
        botao.click();
        await dormir(550);
        const titulo = document.querySelector('.cabecalho h2')?.textContent?.trim();
        if (titulo !== nome) {
          throw new Error('Navegação falhou: ' + nome + ' / título: ' + titulo);
        }
        if (document.body.textContent?.includes('Não foi possível carregar esta tela')) {
          throw new Error('React caiu ao entrar em ' + nome);
        }
        if (nome === 'Relatórios') {
          if (!document.querySelector('.graficos-relatorio')) {
            throw new Error('Gráficos ausentes na página Relatórios.');
          }
          const filtro = document.querySelector('#mesFiltro');
          if (!filtro) throw new Error('Filtro de mês ausente nos Relatórios.');
          filtro.value = '01';
          filtro.dispatchEvent(new Event('change', { bubbles: true }));
          await dormir(250);
          if (!document.querySelector('.filtros-aviso')?.textContent?.includes('Janeiro')) {
            throw new Error('Resumo do período não acompanhou a seleção do mês.');
          }
          if (!document.querySelector('.graficos-explicacao')?.textContent?.includes('mês selecionado')) {
            throw new Error('Gráficos não acompanharam o mês selecionado.');
          }
          filtro.value = 'todos';
          filtro.dispatchEvent(new Event('change', { bubbles: true }));
          await dormir(150);
        }
        if (nome === 'Cartões e faturas') {
          if (!document.querySelector('.central-pagamentos')) {
            throw new Error('Central de Pagamentos ausente.');
          }
          const filtroCartao = document.querySelector('#central-cartao-filtro');
          if (!filtroCartao || filtroCartao.options[0]?.textContent !== 'Todos os cartões') {
            throw new Error('Filtro contextual de cartão ausente ou incorreto.');
          }
          const aba = (texto) => [...document.querySelectorAll('.cartoes-navegacao button')]
            .find((b) => b.textContent?.includes(texto));
          const compras = aba('Compras e parcelas');
          if (!compras) throw new Error('Aba Compras ausente.');
          compras.click();
          await dormir(200);
          if (![...document.querySelectorAll('.pagina-cartoes h3')]
            .some((h) => h.textContent?.includes('Registrar compra no cartão'))) {
            throw new Error('Cadastro de compras não abriu.');
          }
          const gerenciar = aba('Cadastrar ou editar cartão');
          if (!gerenciar) throw new Error('Aba Gerenciar ausente.');
          gerenciar.click();
          await dormir(200);
          if (!document.querySelector('#formulario-cartao')) {
            throw new Error('Cadastro de cartão não abriu.');
          }
          aba('Pagamentos e faturas')?.click();
          await dormir(200);
          if (!document.querySelector('.central-pagamentos')) {
            throw new Error('Voltar a Pagamentos falhou.');
          }
        }
        if (nome === 'Configurações' &&
            !document.body.textContent?.includes('Backup e restauração')) {
          throw new Error('Configurações sem backup/restauração.');
        }
        verificadas.push(nome);
      }

      const aplicativo = document.querySelector('.fincontrol');
      const antes = aplicativo?.getAttribute('data-theme');
      const trilhoAntes = getComputedStyle(document.documentElement)
        .getPropertyValue('--fc-scroll-track').trim();
      const tema = document.querySelector('.botao-tema-lateral');
      if (!tema) throw new Error('Controle de tema ausente.');
      tema.click();
      await dormir(250);
      const depois = aplicativo?.getAttribute('data-theme');
      if (antes === depois) throw new Error('Tema não foi alterado.');
      const trilhoDepois = getComputedStyle(document.documentElement)
        .getPropertyValue('--fc-scroll-track').trim();
      if (!trilhoAntes || !trilhoDepois || trilhoAntes === trilhoDepois) {
        throw new Error('Scrollbar não acompanhou a mudança de tema.');
      }
      const esquema = getComputedStyle(document.documentElement).colorScheme;
      if (esquema !== depois) {
        throw new Error('Tema nativo do Chromium não acompanhou o React.');
      }
      return { paginas: verificadas, tema: 'OK', scrollbar: 'OK' };
    })()
  `)
  console.info('FINCONTROL_UI_SMOKE_OK:', JSON.stringify(resultado))
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!modoUISmoke) mainWindow.show()
  })

  if (modoUISmoke) {
    mainWindow.webContents.once('did-fail-load', (_evento, codigo, descricao) => {
      console.error('FINCONTROL_UI_SMOKE_FAIL: Falha de carregamento', codigo, descricao)
      app.exit(1)
    })
    mainWindow.webContents.once('did-finish-load', () => {
      void verificarInterfaceInstalada(mainWindow).then(
        () => app.exit(0),
        (erro: unknown) => {
          console.error('FINCONTROL_UI_SMOKE_FAIL:', erro)
          app.exit(1)
        }
      )
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url)
      const dominios = new Set(['github.com', 'react.dev', 'electronjs.org'])
      if (url.protocol === 'https:' && dominios.has(url.hostname.toLowerCase())) {
        void shell.openExternal(url.toString()).catch((erro) => {
          console.error('Falha ao abrir URL externa permitida:', erro)
        })
      } else {
        console.warn('URL externa bloqueada pelo FinControl:', details.url)
      }
    } catch {
      console.warn('URL externa inválida bloqueada.')
    }
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // O modo de verificação só utiliza um banco temporário e não abre janelas.
  if (process.argv.includes('--fincontrol-smoke-test')) {
    void executarSmokeInstalado().then(
      async () => {
        try {
          executarMigracaoLegadaSmoke()
          app.quit()
        } catch (erro) {
          console.error('FINCONTROL_MIGRACAO_FAIL:', erro)
          app.exit(1)
        }
      },
      (erro: unknown) => {
        console.error('FINCONTROL_SMOKE_FAIL:', erro)
        app.exit(1)
      }
    )
    return
  }
  if (modoUISmoke) {
    const pasta = mkdtempSync(join(tmpdir(), 'fincontrol-ui-smoke-'))
    app.setPath('userData', pasta)
  }
  iniciarBanco()
  criarTabelaContas()
  criarTabelasCartoes()
  criarTabelaSalarios()
  obterBanco().exec('PRAGMA foreign_keys = ON')
  processarSalariosVencidos()

  // A recorrência também é conferida com o aplicativo aberto. O processo
  // principal nunca insere salário enquanto o programa está fechado.
  const verificadorSalarios = setInterval(() => {
    try {
      processarSalariosVencidos()
      for (const janela of BrowserWindow.getAllWindows()) {
        janela.webContents.send('fincontrol:atualizado')
      }
    } catch (erro) {
      console.error('Erro ao processar salários recorrentes:', erro)
    }
  }, 60_000)
  app.once('before-quit', () => clearInterval(verificadorSalarios))

  ipcMain.handle('cartoes:listar', () => listarCartoes())
  ipcMain.handle('cartoes:cadastrar', (_evento, dados: NovoCartao) => cadastrarCartao(dados))
  ipcMain.handle('cartoes:atualizar', (_evento, id: string, dados: NovoCartao) => atualizarCartao(id, dados))
  ipcMain.handle('compras-cartao:listar', () => listarCompras())
  ipcMain.handle('compras-cartao:cadastrar', (_evento, dados: NovaCompra) => cadastrarCompra(dados))
  ipcMain.handle('faturas-previstas:listar', () => listarFaturasPrevistas())
  ipcMain.handle('parcelas-relatorios:listar', () => listarParcelasParaRelatorios())
  ipcMain.handle('cartoes:despesas-realizadas', () => listarDespesasCartaoRealizadas())
  ipcMain.handle('faturas:pagar', (_evento, dados: NovoPagamentoFatura) => pagarFatura(dados))
  ipcMain.handle('parcelas:listar', () => listarParcelasPagamento())
  ipcMain.handle('parcelas:arquivar', (_evento, id: string, arquivar: boolean) => definirArquivoParcela(id, arquivar))
  ipcMain.handle('pagamentos:estornar', (_evento, dados: NovoEstornoPagamento) => estornarPagamento(dados))
  ipcMain.handle('pagamentos:estornos-listar', () => listarEstornosPagamentos())
  ipcMain.handle('backup:exportar', () => exportarBackup())
  ipcMain.handle('backup:restaurar', async (evento) => {
    const restaurado = await restaurarBackup()
    if (restaurado) setTimeout(() => evento.sender.reload(), 350)
    return restaurado
  })
  ipcMain.handle('parcelas:pagar-selecionadas', (_evento, dados: NovoPagamentoParcelas) =>
    pagarParcelasSelecionadas(dados))
  ipcMain.handle('salarios:listar', () => listarSalarios())
  ipcMain.handle('salarios:cadastrar', (_evento, dados: NovoSalarioRecorrente) =>
    cadastrarSalario(dados))
  ipcMain.handle('salarios:desativar', (_evento, id: string) => desativarSalario(id))

  ipcMain.handle('contas:listar', () => {
    processarSalariosVencidos()
    return listarContas()
  })

  ipcMain.handle('contas:cadastrar', (_evento, dados: NovaConta) => {
    return cadastrarConta(dados)
  })

  ipcMain.handle('contas:excluir', (_evento, id: string) => {
    excluirConta(id)
    return true
  })
  ipcMain.handle('contas:editar', (_evento, id: string, dados: AlteracaoConta) =>
    editarConta(id, dados))
  ipcMain.handle('contas:ajustar-saldo', (_evento, dados: NovoAjusteSaldo) =>
    ajustarSaldo(dados))
  ipcMain.handle('contas:listar-ajustes', () => listarAjustesSaldo())

  ipcMain.handle('transferencias:listar', () => listarTransferencias())

  ipcMain.handle('transferencias:criar', (_evento, dados: NovaTransferencia) => {
    return transferirEntreContas(dados)
  })

  ipcMain.handle('transacoes:listar', () => {
    processarSalariosVencidos()
    return listarTransacoes()
  })

  ipcMain.handle('transacoes:salvar', (_evento, dados: NovaTransacao) => {
    return salvarTransacao(dados)
  })

  ipcMain.handle('transacoes:remover', (_evento, id: string) => {
    removerTransacao(id)
    return true
  })

  ipcMain.handle('transacoes:editar', (_evento, id: string, dados: NovaTransacao) => {
    return editarTransacao(id, dados)
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.fincontrol.desktop')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
