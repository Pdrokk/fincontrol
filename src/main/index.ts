import { sincronizarCotacoes, configurarChave, chaveConfigurada, obterFundamentos } from './servicoCotacoes'
import { hojeLocalISO } from './regrasFinanceiras'
import { criarTabelasInvestimentos, cadastrarAtivo, listarPosicoes, listarMovimentos, atualizarCotacao, atualizarValorAtivo, atualizarQuantidadeMercado, excluirAtivo, reativarAtivo, registrarOperacao, registrarObservacaoCarteira, listarEvolucaoPatrimonio, listarHistoricoCotacoes, type NovoAtivo, type Operacao } from './investimentos'
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
import { criarTabelasCartoes, listarCartoes, cadastrarCartao, atualizarCartao, excluirCartao, cadastrarCompra, listarCompras, listarFaturasPrevistas, listarParcelasParaRelatorios, listarDespesasCartaoRealizadas, pagarFatura } from './cartoes'
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
        'Cartões e faturas', 'Investimentos', 'Configurações'
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
        if (nome === 'Transações') {
          const ordenacao = document.querySelector('#historico-ordenacao');
          const tamanho = document.querySelector('#historico-tamanho');
          const resumo = document.querySelector('.historico-resumo');
          if (!ordenacao || !tamanho || !resumo) {
            throw new Error('Controles de histórico ou resumo de resultados ausentes.');
          }
          if (ordenacao.options.length !== 4 || tamanho.options.length !== 3) {
            throw new Error('Ordenação ou tamanho da página não apresentam todas as opções.');
          }
          tamanho.value = '30';
          tamanho.dispatchEvent(new Event('change', { bubbles: true }));
          await dormir(150);
          if (document.querySelector('#historico-tamanho')?.value !== '30') {
            throw new Error('Alterar o tamanho da página falhou.');
          }
          ordenacao.value = 'maior';
          ordenacao.dispatchEvent(new Event('change', { bubbles: true }));
          await dormir(150);
          if (document.querySelector('#historico-ordenacao')?.value !== 'maior') {
            throw new Error('Ordenação por maior valor não foi aplicada.');
          }
          const pesquisa = document.querySelector('#busca');
          if (!pesquisa) throw new Error('Busca do histórico ausente.');
          const valorTransacao = [...document.querySelectorAll('.formulario input')]
            .find((input) => input.placeholder === '0,00');
          if (valorTransacao?.type !== 'text' || valorTransacao?.inputMode !== 'decimal') {
            throw new Error('Campo de valor precisa aceitar vírgula decimal brasileira.');
          }
        }
        if (nome === 'Relatórios') {
          if (!document.querySelector('.graficos-relatorio')) {
            throw new Error('Gráficos ausentes na página Relatórios.');
          }
          const detalhes = document.querySelector('.graficos-dados');
          const resumoDados = detalhes?.querySelector('summary');
          const tabelas = detalhes?.querySelectorAll('table');
          if (!resumoDados || !tabelas?.length ||
              ![...tabelas].some((t) => t.querySelector('th[scope="col"]'))) {
            throw new Error('Alternativa acessível dos gráficos em tabela ausente.');
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
        if (nome === 'Investimentos') {
          if (!document.querySelector('.investimentos') || !document.querySelector('input[name="codigo"]') ||
              !document.querySelector('input[name="quantidadeInicial"]')) throw new Error('Interface de investimentos incompleta.');
        }
        if (nome === 'Configurações') {
          if (!document.body.textContent?.includes('Backup e restauração')) {
            throw new Error('Configurações sem backup/restauração.');
          }
          if (!document.body.textContent?.includes('Versão 1.6.0')) {
            throw new Error('Versão exibida em Configurações desatualizada.');
          }
        }
        verificadas.push(nome);
      }

      const aplicativo = document.querySelector('.fincontrol');
      const contraste = (frente, fundo) => {
        const luminancia = (hex) => {
          const numeros = hex.trim().replace('#', '').match(/.{2}/g);
          if (!numeros || numeros.length !== 3) throw new Error('Token de cor inválido: ' + hex);
          const rgb = numeros.map((v) => {
            const c = parseInt(v, 16) / 255;
            return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        };
        const x = luminancia(frente), y = luminancia(fundo);
        return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
      };
      const verificarContraste = () => {
        const estilo = getComputedStyle(aplicativo);
        const mut = estilo.getPropertyValue('--muted').trim();
        const bg = estilo.getPropertyValue('--bg').trim();
        if (contraste(mut, bg) < 4.5) {
          throw new Error('Texto secundário com contraste inferior a 4,5:1 no tema ' +
            aplicativo.getAttribute('data-theme'));
        }
      };
      verificarContraste();
      const antes = aplicativo?.getAttribute('data-theme');
      const trilhoAntes = getComputedStyle(document.documentElement)
        .getPropertyValue('--fc-scroll-track').trim();
      const tema = document.querySelector('.botao-tema-lateral');
      if (!tema) throw new Error('Controle de tema ausente.');
      tema.click();
      await dormir(250);
      const depois = aplicativo?.getAttribute('data-theme');
      if (antes === depois) throw new Error('Tema não foi alterado.');
      verificarContraste();
      const trilhoDepois = getComputedStyle(document.documentElement)
        .getPropertyValue('--fc-scroll-track').trim();
      if (!trilhoAntes || !trilhoDepois || trilhoAntes === trilhoDepois) {
        throw new Error('Scrollbar não acompanhou a mudança de tema.');
      }
      const esquema = getComputedStyle(document.documentElement).colorScheme;
      if (esquema !== depois) {
        throw new Error('Tema nativo do Chromium não acompanhou o React.');
      }
      // Exercita paginação com dados de teste exclusivos deste perfil descartável.
      const contaTeste = await window.fincontrol.cadastrarConta({
        banco: 'Banco de Teste', nome: 'Conta de testes UI', tipo: 'corrente',
        cor: '#2563eb', saldoInicialCentavos: 1000000
      });
      if (!contaTeste?.id) throw new Error('Conta de teste não foi criada.');
      const hojeTeste = new Date();
      const dataTeste = [
        hojeTeste.getFullYear(),
        String(hojeTeste.getMonth() + 1).padStart(2, '0'),
        String(hojeTeste.getDate()).padStart(2, '0')
      ].join('-');
      for (let n = 1; n <= 34; n++) {
        await window.fincontrol.salvarTransacao({
          descricao: 'Regressão UI ' + n,
          valorCentavos: n * 100,
          tipo: 'despesa',
          categoria: 'Outros',
          data: dataTeste,
          contaId: contaTeste.id
        });
      }
      await window.fincontrol.salvarTransacao({
        descricao: 'Categoria legada importada',
        valorCentavos: 1599,
        tipo: 'despesa',
        categoria: 'Manutenção do veículo',
        data: dataTeste,
        contaId: contaTeste.id
      });
      const botaoPagina = (nome) => [...document.querySelectorAll('.sidebar nav button')]
        .find((b) => b.getAttribute('title') === nome);
      const ativoTeste = await window.fincontrol.cadastrarAtivo({codigo:'BOVA11',nome:'ETF teste UI',tipo:'ETF',instituicao:'Teste'});
      const saldoInvestAntes = (await window.fincontrol.listarContas()).find(c => c.id === contaTeste.id).saldoAtualCentavos;
      await window.fincontrol.registrarInvestimento({ativoId:ativoTeste,contaId:contaTeste.id,tipo:'compra',quantidade:2,valorCentavos:1000,taxasCentavos:20,data:dataTeste});
      await window.fincontrol.atualizarCotacao(ativoTeste,600);
      const carteira = await window.fincontrol.listarInvestimentos();
      if (carteira.posicoes.find(a => a.id === ativoTeste)?.valorAtualCentavos !== 1200) throw new Error('Cotação de investimento incorreta.');
      if ((await window.fincontrol.listarContas()).find(c => c.id === contaTeste.id).saldoAtualCentavos !== saldoInvestAntes - 1020) throw new Error('Saldo de investimento incorreto.');
      botaoPagina('Investimentos')?.click();
      await dormir(550);
      if (!document.querySelector('.invest-ativo')?.textContent?.includes('BOVA11')) throw new Error('Ativo não aparece na carteira.');
      if (!document.querySelector('.invest-alocacao')) throw new Error('Alocação não aparece.');
      if (!document.querySelector('.carteira-grafico-patrimonio') || carteira.evolucao.at(-1)?.valorCentavos !== 1200) throw new Error('Evolução patrimonial não representa a posição.');
      const abrirFicha = document.querySelector('button[aria-label="Abrir ficha de BOVA11"]');
      if (!abrirFicha) throw new Error('Ficha individual indisponível.');
      abrirFicha.click();
      await dormir(450);
      const ficha = document.querySelector('.carteira-ficha');
      if (!ficha || !ficha.textContent.includes('Histórico de cotações') || !ficha.textContent.includes('Resultado não realizado')) throw new Error('Ficha do ativo incompleta.');
      if (ficha.querySelector('.carteira-fundamentos')) throw new Error('ETF não deve apresentar indicadores de empresa.');
      const historicoCotacao = await window.fincontrol.listarHistoricoCotacoes(ativoTeste);
      if (historicoCotacao.length !== 1 || historicoCotacao[0].preco !== 6) throw new Error('Histórico de cotação manual incorreto.');
      ficha.querySelector('button[aria-label="Fechar ficha do ativo"]').click();
      await dormir(150);
      if (document.querySelector('.carteira-ficha')) throw new Error('Ficha não foi fechada.');
      botaoPagina('Minhas contas')?.click();
      await dormir(450);
      if (!document.querySelector('.icone-banco')) throw new Error('Identificador de banco ausente.');
      const idZerado = await window.fincontrol.cadastrarAtivo({codigo:'ZERO11',nome:'Posição zerada teste',tipo:'ETF',instituicao:'Teste'});
      const idPatrimonio = await window.fincontrol.cadastrarAtivo({codigo:'USD',nome:'Dólar',tipo:'Moeda',instituicao:'',valorInformadoCentavos:5000});
      const saldoPatrimonioAntes = (await window.fincontrol.listarContas()).find(c => c.id === contaTeste.id).saldoAtualCentavos;
      await window.fincontrol.atualizarValorAtivo(idPatrimonio,6000);
      if ((await window.fincontrol.listarInvestimentos()).posicoes.find(a => a.id === idPatrimonio)?.valorAtualCentavos !== 6000) throw new Error('Valor patrimonial incorreto.');
      if ((await window.fincontrol.listarContas()).find(c => c.id === contaTeste.id).saldoAtualCentavos !== saldoPatrimonioAntes) throw new Error('Acompanhamento não deve movimentar saldo.');
      botaoPagina('Investimentos')?.click();
      await dormir(400);
      const filtroZeradas = document.querySelector('.carteira-filtro-zeradas input');
      const linhaZerada = () => [...document.querySelectorAll('.invest-ativo')].find(a=>a.textContent.includes('ZERO11'));
      if (!filtroZeradas || linhaZerada()) throw new Error('Posição zerada não foi ocultada.');
      filtroZeradas.click();
      await dormir(150);
      if (!linhaZerada()) throw new Error('Filtro não exibiu posição zerada.');
      filtroZeradas.click();
      await dormir(150);
      if (linhaZerada()) throw new Error('Filtro não ocultou posição zerada.');
      if (!(await window.fincontrol.listarInvestimentos()).posicoes.some(a=>a.id===idZerado)) throw new Error('Filtro apagou posição.');
      const segmentos = [...document.querySelectorAll('.carteira-barra-unica > span')];
      const coresCategorias = segmentos.map(a=>getComputedStyle(a).backgroundColor);
      const barra = document.querySelector('.carteira-barra-unica');
      if (document.querySelectorAll('.carteira-barra-unica').length !== 1 || !barra || Math.abs(segmentos.reduce((s,a)=>s+a.getBoundingClientRect().width,0)-barra.getBoundingClientRect().width)>2) throw new Error('Distribuição não ocupa uma única barra proporcional.');
      if (document.querySelectorAll('.carteira-legenda li').length !== segmentos.length) throw new Error('Legenda não corresponde à distribuição.');
      if (coresCategorias.length < 2 || new Set(coresCategorias).size < 2) throw new Error('Categorias da carteira não têm cores distintas.');
      const legendaAntes=document.querySelector('.carteira-legenda').textContent;
      const filtroCategoria=document.querySelector('select[aria-label="Filtrar por categoria"]');
      filtroCategoria.value='Moeda';
      filtroCategoria.dispatchEvent(new Event('change',{bubbles:true}));
      await dormir(150);
      if ([...document.querySelectorAll('.invest-ativo')].some(a=>a.textContent.includes('BOVA11'))) throw new Error('Filtro de categoria não funciona.');
      if (document.querySelector('.carteira-legenda').textContent!==legendaAntes) throw new Error('Filtro alterou distribuição total.');
      filtroCategoria.value='';
      filtroCategoria.dispatchEvent(new Event('change',{bubbles:true}));
      await dormir(150);
      const buscar=document.querySelector('input[aria-label="Buscar ativos"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(buscar,'Dolar');
      buscar.dispatchEvent(new Event('input',{bubbles:true}));
      await dormir(150);
      if ([...document.querySelectorAll('.invest-ativo')].some(a=>a.textContent.includes('BOVA11')) || ![...document.querySelectorAll('.invest-ativo')].some(a=>a.textContent.includes('USD'))) throw new Error('Busca por nome sem acento não funciona.');
      [...document.querySelectorAll('.carteira-busca button')].find(b=>b.textContent.includes('Limpar filtros')).click();
      await dormir(150);
      if (document.querySelector('button[aria-label="Remover USD"]')) throw new Error('Posição ativa pode ser removida.');
      const definir = document.querySelector('button[aria-label="Definir quantidade de USD"]');
      if (!definir) throw new Error('Conversão de posição antiga indisponível.');
      definir.click();
      await dormir(100);
      const quantidadeLegada = document.querySelector('input[aria-label="Quantidade de USD"]');
      quantidadeLegada.value='20';
      quantidadeLegada.form.requestSubmit();
      await dormir(350);
      const vender = document.querySelector('button[aria-label="Vender USD"]');
      if (!vender) throw new Error('Venda não aparece na carteira unificada.');
      vender.click();
      await dormir(150);
      const formularioVenda = document.querySelector('.carteira-operacao form');
      if (!formularioVenda || document.querySelector('select[name="ativo"]')) throw new Error('Operação não está vinculada à linha do ativo.');
      formularioVenda.querySelector('select[name="conta"]').value=contaTeste.id;
      formularioVenda.querySelector('input[name="quantidade"]').value='20';
      formularioVenda.querySelector('input[name="valor"]').value='60';
      formularioVenda.requestSubmit();
      await dormir(450);
      const posicaoVendida=(await window.fincontrol.listarInvestimentos()).posicoes.find(a=>a.id===idPatrimonio);
      if (posicaoVendida?.quantidade!==0) throw new Error('Venda total não zerou a posição.');
      if ((await window.fincontrol.listarContas()).find(c=>c.id===contaTeste.id).saldoAtualCentavos!==saldoPatrimonioAntes+6000) throw new Error('Venda não creditou a conta.');
      const removerAtivo = document.querySelector('button[aria-label="Remover USD"]');
      if (!removerAtivo) throw new Error('Remoção de posição sem histórico ausente.');
      removerAtivo.click();
      await dormir(150);
      if (!document.querySelector('.fc-dialogo[open]')) throw new Error('Confirmação de remoção ausente.');
      document.querySelector('.fc-dialogo .fc-cancelar').click();
      await dormir(100);
      if (!(await window.fincontrol.listarInvestimentos()).posicoes.some(a=>a.id===idPatrimonio)) throw new Error('Cancelamento removeu ativo.');
      removerAtivo.click();
      await dormir(150);
      document.querySelector('.fc-dialogo .fc-confirmar').click();
      await dormir(450);
      if (!(await window.fincontrol.listarInvestimentos()).posicoes.find(a=>a.id===idPatrimonio)?.arquivado) throw new Error('Ativo não foi arquivado.');
      if (!(await window.fincontrol.listarInvestimentos()).movimentos.some(m=>m.ativoId===idPatrimonio && m.tipo==='venda')) throw new Error('Histórico da venda foi perdido.');
      if (!document.querySelector('.carteira-toast')?.textContent.includes('Ativo removido.')) throw new Error('Notificação de sucesso ausente.');
      if ((await window.fincontrol.listarContas()).find(c => c.id === contaTeste.id).saldoAtualCentavos !== saldoPatrimonioAntes+6000) throw new Error('Remoção alterou o caixa.');
      botaoPagina('Visão Geral')?.click();
      await dormir(350);
      botaoPagina('Transações')?.click();
      await dormir(850);
      const tamanhoTeste = document.querySelector('#historico-tamanho');
      if (!tamanhoTeste) throw new Error('Paginação desapareceu após recarregar dados.');
      const categoriasFiltro = document.querySelector('#categoriaFiltro');
      if (!categoriasFiltro || ![...categoriasFiltro.options]
        .some((opcao) => opcao.value === 'Manutenção do veículo')) {
        throw new Error('Categoria importada não aparece no filtro do histórico.');
      }
      categoriasFiltro.value = 'Manutenção do veículo';
      categoriasFiltro.dispatchEvent(new Event('change', { bubbles: true }));
      await dormir(220);
      const transacaoLegada = [...document.querySelectorAll('.lista .transacao')]
        .find((item) => item.textContent?.includes('Categoria legada importada'));
      if (!transacaoLegada) throw new Error('Filtro por categoria legada não retorna a transação.');
      const editarLegada = [...transacaoLegada.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Editar'));
      editarLegada?.click();
      await dormir(180);
      const categoriaEdicao = [...document.querySelectorAll('.formulario select')]
        .find((select) => [...select.options].some((op) => op.value === 'Manutenção do veículo'));
      if (!categoriaEdicao || categoriaEdicao.value !== 'Manutenção do veículo') {
        throw new Error('Edição não preserva categoria histórica da transação.');
      }
      const cancelar = [...document.querySelectorAll('.formulario button')]
        .find((b) => b.textContent?.includes('Cancelar edição'));
      cancelar?.click();
      categoriasFiltro.value = 'todas';
      categoriasFiltro.dispatchEvent(new Event('change', { bubbles: true }));
      await dormir(200);
      tamanhoTeste.value = '15';
      tamanhoTeste.dispatchEvent(new Event('change', { bubbles: true }));
      await dormir(300);
      if (document.querySelectorAll('.lista .transacao').length !== 15) {
        throw new Error('Histórico não respeita o limite de 15 transações por página.');
      }
      const proxima = [...document.querySelectorAll('.historico-paginacao button')]
        .find((b) => b.textContent?.includes('Próxima'));
      if (!proxima || proxima.disabled) throw new Error('Próxima página inacessível.');
      if (proxima.getBoundingClientRect().height < 44) {
        throw new Error('Botão de paginação tem área de toque inferior a 44px.');
      }
      proxima.click();
      await dormir(250);
      if (!document.querySelector('.historico-paginacao')?.textContent?.includes('Página 2')) {
        throw new Error('Histórico não avançou para a segunda página.');
      }
      const transacaoExibida = document.querySelector('.lista .transacao');
      const editarAcessivel = transacaoExibida?.querySelector('.botao-editar');
      const excluirAcessivel = transacaoExibida?.querySelector('.botao-excluir');
      const descricaoAcessivel = transacaoExibida?.querySelector('.transacao-info strong')?.textContent;
      if (!descricaoAcessivel ||
          !editarAcessivel?.getAttribute('aria-label')?.includes(descricaoAcessivel) ||
          !excluirAcessivel?.getAttribute('aria-label')?.includes(descricaoAcessivel)) {
        throw new Error('Ações do histórico não identificam a transação específica.');
      }
      excluirAcessivel.click();
      await dormir(150);
      const confirmacao = document.querySelector('.fc-dialogo[open]');
      if (!confirmacao || confirmacao.querySelector('h2')?.textContent !== 'Excluir transação') {
        throw new Error('Diálogo de confirmação temático ausente.');
      }
      confirmacao.querySelector('.fc-cancelar').click();
      await dormir(100);
      if (document.querySelector('.fc-dialogo[open]')) throw new Error('Cancelar não fechou o diálogo.');
      if (!document.querySelector('.lista .transacao')) throw new Error('Cancelar alterou o histórico.');
      return { paginas: verificadas, tema: 'OK', scrollbar: 'OK', paginacao: 'OK', acoes: 'OK' };
    })()
  `)
  console.info('FINCONTROL_UI_SMOKE_OK:', JSON.stringify(resultado))
  await verificarResponsividadeInstalada(janela)
}

/**
 * Confere as larguras úteis do Electron com o mesmo banco temporário do
 * smoke funcional. Inclui estados claro/escuro e todas as páginas principais.
 */
async function verificarResponsividadeInstalada(janela: BrowserWindow): Promise<void> {
  const larguras = [640, 768, 900, 1280, 1920, 2560]
  for (const largura of larguras) {
    janela.setContentSize(largura, 760)
    await new Promise<void>((resolve) => setTimeout(resolve, 220))
    const resultado = await janela.webContents.executeJavaScript(`
      (async () => {
        const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const paginas = [
          'Visão Geral', 'Transações', 'Relatórios',
          'Minhas contas', 'Cartões e faturas', 'Investimentos', 'Configurações'
        ];
        const larguras = [];
        const temas = ['light', 'dark'];
        for (const temaEsperado of temas) {
          const aplicativo = document.querySelector('.fincontrol');
          if (aplicativo.getAttribute('data-theme') !== temaEsperado) {
            document.querySelector('.botao-tema-lateral').click();
            await dormir(100);
          }
          if (aplicativo.getAttribute('data-theme') !== temaEsperado) {
            throw new Error('Troca de tema falhou na adaptação.');
          }
          for (const nome of paginas) {
            const botao = [...document.querySelectorAll('.sidebar nav button')]
              .find((b) => b.getAttribute('title') === nome);
            if (!botao) throw new Error('Menu indisponível: ' + nome);
            botao.click();
            await dormir(190);
            const titulo = document.querySelector('.cabecalho h2');
            if (titulo?.textContent?.trim() !== nome) {
              throw new Error('Título ausente ao redimensionar: ' + nome);
            }
            const viewport = document.documentElement.clientWidth;
            const larguraDocumento = document.documentElement.scrollWidth;
            if (larguraDocumento > viewport + 2) {
              throw new Error('Rolagem horizontal inesperada: ' +
                nome + ', tema ' + temaEsperado + ', viewport=' + viewport +
                ', documento=' + larguraDocumento);
            }
            const menu = document.querySelector('.sidebar');
            const conteudo = document.querySelector('.content');
            const sidebar = menu?.getBoundingClientRect();
            const principal = conteudo?.getBoundingClientRect();
            if (!sidebar || !principal || principal.width < 320 ||
                sidebar.left < -2 || sidebar.right > viewport + 2 ||
                principal.left < sidebar.right - 2 ||
                principal.right > viewport + 2) {
              throw new Error('Colunas de navegação ou conteúdo cortadas em ' + nome +
                ' / ' + temaEsperado + ' / ' + viewport);
            }
            const nav = [...document.querySelectorAll('.sidebar nav button')];
            if (nav.some((item) => {
              const rect = item.getBoundingClientRect();
              return rect.width < 40 || rect.right > viewport + 2;
            })) {
              throw new Error('Atalho da navegação cortado em ' + nome);
            }
            if (viewport >= 1920 && principal.width > 1761) {
              throw new Error('Painel esticou além do limite ultrawide.');
            }
            if (nome === 'Relatórios') {
              const graficos = document.querySelector('.graficos-financeiros');
              if (!graficos || graficos.getBoundingClientRect().width > principal.width + 2) {
                throw new Error('Gráficos excederam a área útil.');
              }
              const abaAtiva = document.querySelector('.graficos-abas button.ativo');
              const corAtiva = abaAtiva ? getComputedStyle(abaAtiva).color : '';
              const esperada = temaEsperado === 'light' ? 'rgb(29, 78, 216)' : 'rgb(191, 219, 254)';
              if (corAtiva !== esperada) {
                throw new Error('Contraste do seletor de gráficos incorreto: ' +
                  temaEsperado + ', cor=' + corAtiva);
              }
            }
            if (nome === 'Investimentos') {
              const secundario = document.querySelector('.carteira-acoes .botao-secundario');
              const editar = document.querySelector('.carteira-tabela .carteira-editar');
              const esperado = temaEsperado === 'dark' ? 'rgb(39, 52, 73)' : 'rgb(255, 255, 255)';
              const textoEsperado = temaEsperado === 'dark' ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)';
              for (const b of [secundario, editar].filter(Boolean)) {
                const estilo = getComputedStyle(b);
                if (estilo.backgroundColor !== esperado || estilo.color !== textoEsperado ||
                    estilo.borderRadius !== '9px' || b.getBoundingClientRect().height < 44) {
                  throw new Error('Botão secundário fora do tema: ' + temaEsperado + ' / ' + estilo.backgroundColor);
                }
              }
              if (!secundario) throw new Error('Botão de atualização ausente.');
            }
            if (nome === 'Cartões e faturas') {
              const botoesHistorico = [...document.querySelectorAll('.central-historico .central-icone')];
              if (botoesHistorico.some((b) => {
                return b.getBoundingClientRect().width < 44 ||
                  !b.getAttribute('aria-label')?.includes('parcela:');
              })) {
                throw new Error('Ações da Central não apresentam alvo ou rótulo acessível.');
              }
            }
            larguras.push(nome + '/' + temaEsperado);
          }
        }
        return { viewport: document.documentElement.clientWidth, telas: larguras.length };
      })()
    `)
    if (Math.abs(resultado.viewport - largura) > 20) {
      throw new Error('Viewport divergente no teste responsivo: esperado=' +
        largura + ', obtido=' + resultado.viewport)
    }
    console.info('FINCONTROL_RESPONSIVO_OK:', JSON.stringify(resultado))
  }
  janela.setContentSize(900, 670)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 640,
    minHeight: 540,
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
  criarTabelasInvestimentos(obterBanco())
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

  ipcMain.handle('investimentos:sincronizar', (_evento, forcar: boolean) => sincronizarCotacoes(forcar === true))
  ipcMain.handle('investimentos:chave', (_evento, chave: string) => configurarChave(chave))
  ipcMain.handle('investimentos:chave-configurada', () => chaveConfigurada())
  ipcMain.handle('investimentos:reativar', (_evento, id: string) => reativarAtivo(obterBanco(), id))
  ipcMain.handle('investimentos:excluir', (_evento, id: string) => excluirAtivo(obterBanco(), id))
  ipcMain.handle('investimentos:quantidade', (_evento, id: string, quantidade: number) => atualizarQuantidadeMercado(obterBanco(), id, quantidade))
  ipcMain.handle('investimentos:listar', () => {
    const db=obterBanco()
    const posicoes=listarPosicoes(db)
    registrarObservacaoCarteira(db,hojeLocalISO(),posicoes)
    return { posicoes, movimentos:listarMovimentos(db), evolucao:listarEvolucaoPatrimonio(db) }
  })
  ipcMain.handle('investimentos:fundamentos', (_evento,id:string) => obterFundamentos(id))
  ipcMain.handle('investimentos:historico-cotacoes', (_evento,id:string) => listarHistoricoCotacoes(obterBanco(),id))
  ipcMain.handle('investimentos:fonte-oficial', async (_evento,fonte: string) => {
    const fontes: Record<string,string> = {
      cvm:'https://sistemas.cvm.gov.br/central-index.asp',
      sec:'https://www.sec.gov/search-filings',
      bcb:'https://ptax.bcb.gov.br/ptax_internet/consultaBoletim.do?method=consultarBoletim'
    }
    if (typeof fonte!=='string'||!Object.hasOwn(fontes,fonte)) throw new Error('Fonte oficial inválida.')
    await shell.openExternal(fontes[fonte])
  })
  ipcMain.handle('investimentos:cadastrar', (_evento, dados: NovoAtivo) => cadastrarAtivo(obterBanco(), dados))
  ipcMain.handle('investimentos:valor', (_evento, id: string, centavos: number) => atualizarValorAtivo(obterBanco(), id, centavos))
  ipcMain.handle('investimentos:cotacao', (_evento, id: string, centavos: number) => atualizarCotacao(obterBanco(), id, centavos))
  ipcMain.handle('investimentos:operacao', (_evento, dados: Operacao) => registrarOperacao(obterBanco(), dados, id => listarContas().find(c => c.id === id)?.saldoAtualCentavos, hojeLocalISO()))
  ipcMain.handle('cartoes:listar', () => listarCartoes())
  ipcMain.handle('cartoes:cadastrar', (_evento, dados: NovoCartao) => cadastrarCartao(dados))
  ipcMain.handle('cartoes:atualizar', (_evento, id: string, dados: NovoCartao) => atualizarCartao(id, dados))
  ipcMain.handle('cartoes:excluir', (_evento, id: string) => { excluirCartao(id); return true })
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
