/**
 * Auditoria visual isolada: captura telas reais do Electron + React em PNG,
 * com dados exclusivamente fictícios. Nunca abre o SQLite do usuário.
 */
import { BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cadastrarConta } from './contas'
import { salvarTransacao } from './database'
import { cadastrarCartao, cadastrarCompra, listarParcelasPagamento, pagarParcelasSelecionadas } from './cartoes'
import { hojeLocalISO } from './regrasFinanceiras'

function deslocarMeses(data: string, deslocamento: number): string {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + deslocamento)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-15`
}

export function criarDadosVisuaisFicticios(): void {
  const hoje = hojeLocalISO()
  const a = cadastrarConta({
    banco: 'Nubank', nome: 'Conta principal', tipo: 'corrente',
    saldoInicialCentavos: 1274000, cor: '#7837db'
  })
  const b = cadastrarConta({
    banco: 'Inter', nome: 'Reserva', tipo: 'poupanca',
    saldoInicialCentavos: 385000, cor: '#ff7a00'
  })
  const c = cadastrarConta({
    banco: 'Santander', nome: 'Conta salário', tipo: 'salario',
    saldoInicialCentavos: 65000, cor: '#e63338'
  })

  const lancamentos: Array<{
    descricao: string; tipo: 'receita' | 'despesa'; valor: number;
    categoria: string; contaId: string; meses: number
  }> = [
    { descricao: 'Salário mensal', tipo: 'receita', valor: 680000, categoria: 'Salário', contaId: c.id, meses: -3 },
    { descricao: 'Salário mensal', tipo: 'receita', valor: 680000, categoria: 'Salário', contaId: c.id, meses: -2 },
    { descricao: 'Salário mensal', tipo: 'receita', valor: 680000, categoria: 'Salário', contaId: c.id, meses: -1 },
    { descricao: 'Salário mensal', tipo: 'receita', valor: 680000, categoria: 'Salário', contaId: c.id, meses: 0 },
    { descricao: 'Projeto freelance', tipo: 'receita', valor: 135000, categoria: 'Freelance', contaId: a.id, meses: -1 },
    { descricao: 'Aluguel', tipo: 'despesa', valor: 185000, categoria: 'Moradia', contaId: a.id, meses: 0 },
    { descricao: 'Supermercado', tipo: 'despesa', valor: 73590, categoria: 'Alimentação', contaId: a.id, meses: 0 },
    { descricao: 'Combustível', tipo: 'despesa', valor: 25800, categoria: 'Transporte', contaId: a.id, meses: 0 },
    { descricao: 'Academia', tipo: 'despesa', valor: 10990, categoria: 'Saúde', contaId: a.id, meses: 0 },
    { descricao: 'Cinema', tipo: 'despesa', valor: 6800, categoria: 'Lazer', contaId: b.id, meses: 0 },
    { descricao: 'Mercado', tipo: 'despesa', valor: 63320, categoria: 'Alimentação', contaId: a.id, meses: -1 },
    { descricao: 'Aluguel', tipo: 'despesa', valor: 185000, categoria: 'Moradia', contaId: a.id, meses: -1 },
    { descricao: 'Livros', tipo: 'despesa', valor: 15000, categoria: 'Educação', contaId: a.id, meses: -2 },
    { descricao: 'Consulta', tipo: 'despesa', valor: 32000, categoria: 'Saúde', contaId: b.id, meses: -3 }
  ]
  for (const t of lancamentos) {
    salvarTransacao({
      contaId: t.contaId, descricao: t.descricao, tipo: t.tipo,
      categoria: t.categoria, valorCentavos: t.valor, data: deslocarMeses(hoje, t.meses)
    })
  }
  const nu = cadastrarCartao({
    banco: 'Nubank', nome: 'Nubank Platinum', contaId: a.id,
    limiteCentavos: 1800000, diaFechamento: 25, diaVencimento: 10
  })
  const inter = cadastrarCartao({
    banco: 'Inter', nome: 'Inter Gold', contaId: b.id,
    limiteCentavos: 600000, diaFechamento: 20, diaVencimento: 5
  })
  cadastrarCompra({
    cartaoId: nu.id, descricao: 'Notebook', categoria: 'Eletrônicos',
    valorCentavos: 420000, numeroParcelas: 6, data: deslocarMeses(hoje, -1)
  })
  cadastrarCompra({
    cartaoId: nu.id, descricao: 'Fone sem fio', categoria: 'Eletrônicos',
    valorCentavos: 36000, numeroParcelas: 3, data: deslocarMeses(hoje, 0)
  })
  cadastrarCompra({
    cartaoId: inter.id, descricao: 'Viagem', categoria: 'Lazer',
    valorCentavos: 144000, numeroParcelas: 6, data: deslocarMeses(hoje, -2)
  })
  const antiga = listarParcelasPagamento()
    .filter(p => p.cartaoId === inter.id && p.competencia < hoje.slice(0, 7))
    .slice(0, 1)
  if (antiga.length) {
    pagarParcelasSelecionadas({
      parcelaIds: antiga.map(p => p.id), contaId: b.id, dataPagamento: hoje
    })
  }
}

interface Captura {
  id: string
  pagina: string
  tema: 'dark' | 'light'
  largura: number
  altura: number
  interacao?: 'previsto' | 'historico' | 'contas-edicao' | 'contas-transferir'
    | 'cartoes-edicao' | 'cartoes-compra' | 'transacoes-busca'
  foco?: string
}

const capturas: Captura[] = [
  { id: '01-dashboard-dark', pagina: 'Visão Geral', tema: 'dark', largura: 1440, altura: 900 },
  { id: '02-transacoes-dark', pagina: 'Transações', tema: 'dark', largura: 1440, altura: 900 },
  { id: '03-transacoes-busca', pagina: 'Transações', tema: 'dark', largura: 1440, altura: 900, interacao: 'transacoes-busca' },
  { id: '04-relatorios-realizado-dark', pagina: 'Relatórios', tema: 'dark', largura: 1440, altura: 900 },
  { id: '05-relatorios-previsto-dark', pagina: 'Relatórios', tema: 'dark', largura: 1440, altura: 900, interacao: 'previsto' },
  { id: '06-contas-dark', pagina: 'Minhas contas', tema: 'dark', largura: 1440, altura: 900 },
  { id: '07-contas-edicao', pagina: 'Minhas contas', tema: 'dark', largura: 1440, altura: 900, interacao: 'contas-edicao' },
  { id: '08-contas-transferencia', pagina: 'Minhas contas', tema: 'dark', largura: 1440, altura: 900, interacao: 'contas-transferir' },
  { id: '09-cartoes-dark', pagina: 'Cartões e faturas', tema: 'dark', largura: 1440, altura: 900 },
  { id: '10-cartoes-central-pendentes', pagina: 'Cartões e faturas', tema: 'dark', largura: 1440, altura: 900, foco: '.central-pagamentos' },
  { id: '11-cartoes-central-historico', pagina: 'Cartões e faturas', tema: 'dark', largura: 1440, altura: 900, interacao: 'historico', foco: '.central-pagamentos' },
  { id: '12-cartoes-edicao', pagina: 'Cartões e faturas', tema: 'dark', largura: 1440, altura: 900, interacao: 'cartoes-edicao', foco: '#formulario-cartao' },
  { id: '13-cartoes-nova-compra', pagina: 'Cartões e faturas', tema: 'dark', largura: 1440, altura: 900, interacao: 'cartoes-compra' },
  { id: '14-dashboard-light', pagina: 'Visão Geral', tema: 'light', largura: 1440, altura: 900 },
  { id: '15-relatorios-light', pagina: 'Relatórios', tema: 'light', largura: 1440, altura: 900 },
  { id: '16-cartoes-light', pagina: 'Cartões e faturas', tema: 'light', largura: 1440, altura: 900, foco: '.central-pagamentos' },
  { id: '17-dashboard-900px', pagina: 'Visão Geral', tema: 'dark', largura: 900, altura: 700 },
  { id: '18-cartoes-900px', pagina: 'Cartões e faturas', tema: 'dark', largura: 900, altura: 700, foco: '.central-pagamentos' }
]

function adiar(ms: number): Promise<void> {
  return new Promise((ok) => setTimeout(ok, ms))
}

export async function capturarTelasReais(janela: BrowserWindow): Promise<void> {
  const destino = resolve(process.env.FINCONTROL_SCREENSHOT_DIR || 'audit/screenshots')
  mkdirSync(destino, { recursive: true })
  const diagnosticos: unknown[] = []

  // did-finish-load pode ocorrer antes de React montar o menu.
  let menuPronto = false
  for (let tentativas = 0; tentativas < 50; tentativas++) {
    menuPronto = await janela.webContents.executeJavaScript(
      "Boolean(document.querySelector('.sidebar nav button'))"
    ) as boolean
    if (menuPronto) break
    await adiar(150)
  }
  if (!menuPronto) throw new Error('React não renderizou o menu após o carregamento.')

  for (const c of capturas) {
    writeFileSync(resolve(destino, 'etapa.txt'), c.id + ': antes da navegação')
    janela.setContentSize(c.largura, c.altura)
    const estado = await janela.webContents.executeJavaScript(`
      (() => {
        const nome = ${JSON.stringify(c.pagina)};
        const tema = ${JSON.stringify(c.tema)};
        const nav = [...document.querySelectorAll('.sidebar nav button')]
          .find(x => x.getAttribute('title') === nome);
        if (!nav) throw new Error('Menu não encontrado: ' + nome);
        nav.click();
        const atual = document.querySelector('.fincontrol')?.getAttribute('data-theme');
        if (atual !== tema) document.querySelector('.botao-tema-lateral')?.click();
        return { nome, tema };
      })()
    `)
    writeFileSync(resolve(destino, 'etapa.txt'), c.id + ': após navegar')
    await adiar(650)
    await janela.webContents.executeJavaScript(`
      (() => {
        const acao = ${JSON.stringify(c.interacao || '')};
        if (acao === 'previsto') {
          const b = [...document.querySelectorAll('.graficos-abas button')]
            .find((x) => x.textContent?.trim() === 'Previsto');
          if (!b) throw new Error('Aba Previsto não encontrada.');
          b.click();
        }
        if (acao === 'historico') {
          const b = [...document.querySelectorAll('.central-abas button')]
            .find((x) => x.textContent?.includes('Histórico'));
          if (!b) throw new Error('Histórico de pagamentos não encontrado.');
          b.click();
        }
        if (acao === 'contas-edicao') {
          const b = document.querySelector('.pagina-contas .acoes-conta button');
          if (!b) throw new Error('Editar conta não encontrado.');
          b.click();
        }
        if (acao === 'cartoes-edicao') {
          const b = document.querySelector('.pagina-cartoes .acoes-conta button');
          if (!b) throw new Error('Editar cartão não encontrado.');
          b.click();
        }
        if (acao === 'transacoes-busca') {
          const el = document.querySelector('#busca');
          if (!el) throw new Error('Pesquisa de transações não encontrada.');
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          setter?.call(el, 'Supermercado');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `)
    writeFileSync(resolve(destino, 'etapa.txt'), c.id + ': após interação')
    await adiar(400)
    await janela.webContents.executeJavaScript(`
      (() => {
        const acao = ${JSON.stringify(c.interacao || '')};
        let foco = ${JSON.stringify(c.foco || '')};
        if (acao === 'contas-edicao') foco = '.gerenciar-conta';
        if (acao === 'contas-transferir') {
          foco = [...document.querySelectorAll('.pagina-contas section')]
            .find(x => x.querySelector('h3')?.textContent?.trim() === 'Transferir entre contas');
        } else if (acao === 'cartoes-compra') {
          foco = [...document.querySelectorAll('.pagina-cartoes section')]
            .find(x => x.querySelector('h3')?.textContent?.trim() === 'Registrar compra no cartão');
        }
        const el = typeof foco === 'string' ? (foco ? document.querySelector(foco) : null) : foco;
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
        else window.scrollTo({ top: 0, behavior: 'instant' });
      })()
    `)
    await adiar(320)
    const metricas = await janela.webContents.executeJavaScript(`
      (() => {
        const corpo = document.body;
        const html = document.documentElement;
        const titulo = document.querySelector('.cabecalho h2')?.textContent || '';
        const root = document.querySelector('.fincontrol');
        const problematicos = [...document.querySelectorAll('button, input, select, a')]
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 &&
              (rect.right > innerWidth + 2 || rect.left < -2);
          })
          .slice(0, 12)
          .map(el => ({ tipo: el.tagName, titulo: el.getAttribute('title') || el.textContent?.trim()?.slice(0, 50) || '' }));
        return {
          titulo,
          tema: root?.getAttribute('data-theme'),
          viewport: { largura: innerWidth, altura: innerHeight },
          documento: { largura: html.scrollWidth, altura: html.scrollHeight },
          overflowHorizontal: html.scrollWidth > innerWidth + 2 || corpo.scrollWidth > innerWidth + 2,
          problematicos,
          interfaceFalhou: corpo.textContent?.includes('Não foi possível carregar esta tela'),
          scrollTrack: getComputedStyle(document.documentElement).getPropertyValue('--fc-scroll-track').trim(),
          esquema: getComputedStyle(document.documentElement).colorScheme,
          scrollbarWidth: getComputedStyle(document.documentElement).scrollbarWidth
        };
      })()
    `)
    writeFileSync(resolve(destino, 'etapa.txt'), c.id + ': antes de capturar PNG')
    const screenshot = await janela.webContents.capturePage()
    const bytes = screenshot.toPNG()
    if (bytes.byteLength < 20000) throw new Error('Imagem potencialmente vazia: ' + c.id)
    writeFileSync(resolve(destino, c.id + '.png'), bytes)
    diagnosticos.push({ ...c, ...estado, ...metricas, imagemBytes: bytes.byteLength })
    console.info('VISUAL_AUDIT_CAPTURE_OK:', c.id, bytes.byteLength)
  }
  writeFileSync(resolve(destino, 'metricas.json'), JSON.stringify(diagnosticos, null, 2))
  console.info('VISUAL_AUDIT_OK:', capturas.length, destino)
}
