import { criarTabelasInvestimentos, cadastrarAtivo, listarPosicoes, registrarOperacao, atualizarCotacao, salvarCotacaoMercado, atualizarQuantidadeMercado } from './investimentos'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { DatabaseSync, backup } from 'node:sqlite'
import { iniciarBanco, obterBanco, fecharBanco, salvarTransacao, editarTransacao, listarTransacoes } from './database'
import {
  cadastrarConta, listarContas, editarConta, ajustarSaldo, transferirEntreContas,
  excluirConta
} from './contas'
import {
  cadastrarCartao, atualizarCartao, excluirCartao, cadastrarCompra, listarCartoes,
  listarParcelasPagamento, listarFaturasPrevistas, pagarParcelasSelecionadas,
  listarDespesasCartaoRealizadas, estornarPagamento, pagarFatura,
  definirArquivoParcela, listarEstornosPagamentos
} from './cartoes'
import { criarTabelaContas } from './contas'
import { criarTabelasCartoes } from './cartoes'
import { cadastrarSalario, criarTabelaSalarios, processarSalariosVencidos } from './salarios'
import { hojeLocalISO } from './regrasFinanceiras'
import { aplicarRestauracaoValidada } from './backup'

const dinheiro = (id: string): number => {
  const conta = listarContas().find((c) => c.id === id)
  assert.ok(conta, 'Conta deve existir')
  return conta.saldoAtualCentavos
}

function recusar(fn: () => unknown, motivo: string): void {
  assert.throws(fn, /./, motivo)
}

/**
 * Smoke de integração executado pelo próprio Electron empacotado.
 * Usa um diretório temporário e jamais abre ou modifica o banco pessoal.
 */
export async function executarSmokeInstalado(): Promise<void> {
  const pasta = mkdtempSync(join(tmpdir(), 'fincontrol-v1-smoke-'))
  app.setPath('userData', pasta)
  let bancoBackup: DatabaseSync | null = null
  try {
    iniciarBanco()
    criarTabelaContas()
    criarTabelasCartoes()
    criarTabelaSalarios()
    criarTabelasInvestimentos(obterBanco())
    obterBanco().exec('PRAGMA foreign_keys = ON')
    const hoje = hojeLocalISO()

    const a = cadastrarConta({
      banco: 'Nubank', nome: 'Principal', cor: '#6c28a7',
      tipo: 'corrente', saldoInicialCentavos: 200_000
    })
    const b = cadastrarConta({
      banco: 'Inter', nome: 'Reserva', cor: '#e77916',
      tipo: 'poupanca', saldoInicialCentavos: 0
    })
    assert.equal(dinheiro(a.id), 200_000)
    editarConta(a.id, { banco: 'Nubank', nome: 'Dia a dia', cor: '#6c28a7', tipo: 'corrente' })
    assert.equal(listarContas().find(c => c.id === a.id)?.nome, 'Dia a dia')
    transferirEntreContas({
      origemId: a.id, destinoId: b.id, valorCentavos: 10_000,
      data: hoje, descricao: 'Transferência de teste'
    })
    assert.equal(dinheiro(a.id), 190_000)
    assert.equal(dinheiro(b.id), 10_000)
    recusar(() => transferirEntreContas({
      origemId: a.id, destinoId: b.id, valorCentavos: 1000,
      data: '2999-01-01', descricao: 'Futura'
    }), 'Transferência futura não deve ser efetuada')

    const receita = salvarTransacao({
      contaId: a.id, descricao: 'Receita de teste',
      tipo: 'receita', valorCentavos: 30_000, categoria: 'Outros', data: hoje
    })
    assert.ok(listarTransacoes().some(t => t.id === receita.id))
    assert.equal(dinheiro(a.id), 220_000)

    recusar(() => excluirConta(a.id), 'Não pode apagar banco com saldo ou vínculos')
    const vazia = cadastrarConta({
      banco: 'Banco Teste', nome: 'Excluir', cor: '#334155',
      tipo: 'outra', saldoInicialCentavos: 0
    })
    excluirConta(vazia.id)
    assert.ok(!listarContas().some(c => c.id === vazia.id))

    assert.throws(() => excluirCartao('cartao-inexistente'), /Cartão não encontrado/)
    const cartaoSemHistorico = cadastrarCartao({
      contaId: a.id, banco: 'Banco Teste', nome: 'Cartão temporário',
      limiteCentavos: 10_000, diaFechamento: 25, diaVencimento: 10
    })
    assert.ok(listarCartoes().some(c => c.id === cartaoSemHistorico.id))
    excluirCartao(cartaoSemHistorico.id)
    assert.ok(!listarCartoes().some(c => c.id === cartaoSemHistorico.id))
    assert.throws(() => excluirCartao(cartaoSemHistorico.id), /Cartão não encontrado/)

    const cartao = cadastrarCartao({
      contaId: a.id, banco: 'Nubank', nome: 'Crédito',
      limiteCentavos: 100_000, diaFechamento: 25, diaVencimento: 10
    })
    atualizarCartao(cartao.id, {
      contaId: a.id, banco: 'Nubank', nome: 'Crédito principal',
      limiteCentavos: 100_000, diaFechamento: 25, diaVencimento: 10
    })
    cadastrarCompra({
      cartaoId: cartao.id, descricao: 'Notebook', categoria: 'Eletrônicos',
      data: hoje, valorCentavos: 60_000, numeroParcelas: 3
    })
    assert.throws(() => excluirCartao(cartao.id), /Quite todas/)
    assert.ok(listarCartoes().some(c => c.id === cartao.id))
    assert.equal(listarCartoes().find(c => c.id === cartao.id)?.limiteDisponivelCentavos, 40_000)
    const parcelas = listarParcelasPagamento().filter(p => p.cartaoId === cartao.id)
    assert.equal(parcelas.length, 3)
    assert.equal(parcelas.reduce((n, p) => n + p.valorCentavos, 0), 60_000)
    recusar(() => pagarParcelasSelecionadas({
      contaId: a.id, parcelaIds: [parcelas[0].id],
      dataPagamento: '2999-01-01'
    }), 'Pagamento futuro não deve alterar o saldo')

    const antes = dinheiro(a.id)
    pagarParcelasSelecionadas({
      contaId: a.id, parcelaIds: parcelas.slice(0, 2).map(p => p.id),
      dataPagamento: hoje
    })
    assert.equal(dinheiro(a.id), antes - 40_000)
    assert.equal(listarCartoes().find(c => c.id === cartao.id)?.limiteDisponivelCentavos, 80_000)
    assert.equal(listarDespesasCartaoRealizadas().filter(p => parcelas.some(q => q.id === p.id)).length, 2)
    recusar(() => pagarParcelasSelecionadas({
      contaId: a.id, parcelaIds: [parcelas[0].id], dataPagamento: hoje
    }), 'Não permitir pagamento duplicado')

    const paga = listarParcelasPagamento().find(p => p.id === parcelas[0].id)
    const pagamentoParcelaId = paga?.pagamentoId
    assert.ok(pagamentoParcelaId)
    definirArquivoParcela(parcelas[0].id, true)
    assert.equal(listarParcelasPagamento().find(p => p.id === parcelas[0].id)?.arquivada, true)
    const estorno = estornarPagamento({
      tipo: 'parcela', pagamentoId: pagamentoParcelaId, motivo: 'Teste de estorno'
    })
    assert.equal(estorno.valorCentavos, 20_000)
    assert.equal(dinheiro(a.id), antes - 20_000)
    assert.equal(listarParcelasPagamento().find(p => p.id === parcelas[0].id)?.paga, false)
    assert.equal(listarParcelasPagamento().find(p => p.id === parcelas[0].id)?.arquivada, false)
    assert.equal(listarEstornosPagamentos().length, 1)
    recusar(() => estornarPagamento({
      tipo: 'parcela', pagamentoId: pagamentoParcelaId, motivo: 'Estorno duplicado'
    }), 'Estorno deve ser único')

    pagarParcelasSelecionadas({
      contaId: a.id, parcelaIds: [parcelas[0].id, parcelas[2].id], dataPagamento: hoje
    })
    assert.equal(dinheiro(a.id), antes - 60_000)
    assert.equal(listarCartoes().find(c => c.id === cartao.id)?.limiteDisponivelCentavos, 100_000)
    assert.ok(listarFaturasPrevistas().filter(f => f.cartaoId === cartao.id).every(f => f.paga))
    const historicoParcela = obterBanco().prepare(`
      SELECT id, estornado FROM pagamentos_parcelas WHERE parcela_id = ?
    `).all(parcelas[0].id) as { id: string; estornado: number }[]
    assert.equal(historicoParcela.length, 2, 'Re-pagamento deve preservar a primeira baixa')
    assert.ok(historicoParcela.some((p) => p.id === pagamentoParcelaId && p.estornado === 1))
    assert.equal(historicoParcela.filter((p) => p.estornado === 0).length, 1)
    assert.equal(listarEstornosPagamentos()[0].pagamentoId, pagamentoParcelaId)
    criarTabelasCartoes() // Migração idempotente não pode apagar a trilha de auditoria.
    assert.equal((obterBanco().prepare(
      'SELECT COUNT(*) AS n FROM pagamentos_parcelas WHERE parcela_id = ?'
    ).get(parcelas[0].id) as { n: number }).n, 2)

    // A fatura integral também precisa permitir pagar novamente após um estorno.
    const segundo = cadastrarCartao({
      contaId: a.id, banco: 'Inter', nome: 'Fatura integral',
      limiteCentavos: 40_000, diaFechamento: 20, diaVencimento: 5
    })
    cadastrarCompra({
      cartaoId: segundo.id, descricao: 'Compra à vista', categoria: 'Alimentação',
      data: hoje, valorCentavos: 10_000, numeroParcelas: 1
    })
    const competencia = listarParcelasPagamento().find(p => p.cartaoId === segundo.id)?.competencia
    assert.ok(competencia)
    const pagamento = pagarFatura({
      contaId: a.id, cartaoId: segundo.id, competencia, dataPagamento: hoje
    })
    assert.equal(pagamento.valorCentavos, 10_000)
    estornarPagamento({ tipo: 'fatura', pagamentoId: pagamento.id, motivo: 'Teste reversão' })
    assert.ok(listarFaturasPrevistas().some(f => f.cartaoId === segundo.id && !f.paga))
    const segundaQuitacao = pagarFatura({
      contaId: a.id, cartaoId: segundo.id, competencia, dataPagamento: hoje
    })
    assert.ok(listarFaturasPrevistas().some(f => f.cartaoId === segundo.id && f.paga))
    assert.notEqual(segundaQuitacao.id, pagamento.id)
    const historicoFatura = obterBanco().prepare(`
      SELECT id, estornado FROM pagamentos_fatura
      WHERE cartao_id = ? AND competencia = ?
    `).all(segundo.id, competencia) as { id: string; estornado: number }[]
    assert.equal(historicoFatura.length, 2, 'Estorno integral não pode apagar o pagamento antigo')
    assert.ok(historicoFatura.some((p) => p.id === pagamento.id && p.estornado === 1))
    assert.equal(historicoFatura.filter((p) => p.estornado === 0).length, 1)

    // Regressão: fatura parcialmente paga, relatório realizado e limite de crédito.
    const cartaoParcial = cadastrarCartao({
      contaId: a.id, banco: 'Banco Teste', nome: 'Pagamento parcial',
      limiteCentavos: 45_000, diaFechamento: 25, diaVencimento: 10
    })
    cadastrarCompra({
      cartaoId: cartaoParcial.id, descricao: 'Três mensalidades',
      categoria: 'Educação', data: hoje, valorCentavos: 45_000, numeroParcelas: 3
    })
    const parcelasParciais = listarParcelasPagamento()
      .filter(p => p.cartaoId === cartaoParcial.id)
    assert.equal(parcelasParciais.length, 3)
    assert.equal(listarCartoes().find(c => c.id === cartaoParcial.id)?.limiteDisponivelCentavos, 0)
    const saldoAntesParcial = dinheiro(a.id)
    const resultadoParcial = pagarParcelasSelecionadas({
      contaId: a.id, parcelaIds: [parcelasParciais[0].id], dataPagamento: hoje
    })
    assert.equal(resultadoParcial.parcelasPagas, 1)
    assert.equal(resultadoParcial.valorCentavos, 15_000)
    assert.equal(dinheiro(a.id), saldoAntesParcial - 15_000)
    assert.equal(listarCartoes().find(c => c.id === cartaoParcial.id)?.limiteDisponivelCentavos, 15_000)
    const faturasParciais = listarFaturasPrevistas().filter(f => f.cartaoId === cartaoParcial.id)
    assert.equal(faturasParciais.reduce((n, f) => n + f.totalCentavos, 0), 45_000)
    assert.equal(faturasParciais.reduce((n, f) => n + f.valorPagoCentavos, 0), 15_000)
    assert.equal(faturasParciais.reduce((n, f) => n + f.saldoPendenteCentavos, 0), 30_000)
    assert.equal(faturasParciais.filter(f => f.paga).length, 1)
    const realizadosParcial = listarDespesasCartaoRealizadas()
      .filter(p => parcelasParciais.some(q => q.id === p.id))
    assert.equal(realizadosParcial.length, 1, 'Relatório realizado não deve contar parcelas futuras')
    assert.equal(realizadosParcial.reduce((n, p) => n + p.valorCentavos, 0), 15_000)
    recusar(() => pagarFatura({
      contaId: a.id, cartaoId: cartaoParcial.id,
      competencia: parcelasParciais[0].competencia, dataPagamento: hoje
    }), 'Fatura já parcialmente quitada não pode ser paga em duplicidade')

    // A segunda compra usa o limite liberado; estornar a primeira parcela
    // ultrapassaria o limite e precisa falhar atomicamente.
    cadastrarCompra({
      cartaoId: cartaoParcial.id, descricao: 'Compra após liberação de limite',
      categoria: 'Outros', data: hoje, valorCentavos: 15_000, numeroParcelas: 1
    })
    assert.equal(listarCartoes().find(c => c.id === cartaoParcial.id)?.limiteDisponivelCentavos, 0)
    const pagamentoParcial = listarParcelasPagamento()
      .find(p => p.id === parcelasParciais[0].id)?.pagamentoId
    assert.ok(pagamentoParcial)
    recusar(() => estornarPagamento({
      tipo: 'parcela', pagamentoId: pagamentoParcial,
      motivo: 'Estorno sem limite suficiente'
    }), 'Estorno não pode tornar o limite disponível negativo')
    assert.equal(dinheiro(a.id), saldoAntesParcial - 15_000)
    assert.equal(listarParcelasPagamento().find(p => p.id === parcelasParciais[0].id)?.paga, true)
    assert.equal(listarCartoes().find(c => c.id === cartaoParcial.id)?.limiteDisponivelCentavos, 0)
    assert.equal(listarDespesasCartaoRealizadas()
      .filter(p => parcelasParciais.some(q => q.id === p.id)).length, 1)
    const pendentesParciais = listarParcelasPagamento()
      .filter(p => p.cartaoId === cartaoParcial.id && !p.paga)
    assert.equal(pendentesParciais.length, 3)
    recusar(() => pagarParcelasSelecionadas({
      contaId: a.id, parcelaIds: [parcelasParciais[0].id, parcelasParciais[1].id],
      dataPagamento: hoje
    }), 'Pagamento em lote com parcela já quitada deve reverter tudo')
    assert.equal(dinheiro(a.id), saldoAntesParcial - 15_000)
    assert.equal(listarParcelasPagamento().find(p => p.id === parcelasParciais[1].id)?.paga, false)

    const saldoAnterior = dinheiro(b.id)
    ajustarSaldo({
      contaId: b.id, saldoDesejadoCentavos: saldoAnterior + 123,
      data: hoje, motivo: 'Conciliação automática'
    })
    assert.equal(dinheiro(b.id), saldoAnterior + 123)

    const mes = hoje.slice(0, 7)
    const dia = Math.min(Number(hoje.slice(8, 10)), 28)
    cadastrarSalario({
      contaId: b.id, descricao: 'Salário teste',
      valorCentavos: 8_500, dia, mesInicio: mes,
      quantidadeMeses: 3, permitirRetroativo: true
    })
    processarSalariosVencidos()
    processarSalariosVencidos()
    const quantidade = obterBanco().prepare(
      'SELECT COUNT(*) AS n FROM salarios_lancamentos'
    ).get() as { n: number }
    assert.equal(quantidade.n, 1, 'Salário recorrente não pode duplicar no mesmo mês')
    assert.equal(dinheiro(b.id), saldoAnterior + 123 + 8_500)
    recusar(() => editarTransacao(receita.id, {
      contaId: b.id, descricao: 'Tentativa de duplicar salário',
      valorCentavos: 8_500, tipo: 'receita',
      categoria: 'Salário', data: hoje
    }), 'Edição também deve bloquear salário recorrente duplicado')

    const integridade = obterBanco().prepare('PRAGMA integrity_check').get() as
      | { integrity_check: string } | undefined
    assert.equal(integridade?.integrity_check, 'ok')
    const chaves = obterBanco().prepare('PRAGMA foreign_key_check').all()
    assert.equal(chaves.length, 0, 'Não deve haver referências SQLite órfãs')

    const quitado = cadastrarCartao({ contaId: a.id, banco: 'Teste', nome: 'Quitado', limiteCentavos: 5000, diaFechamento: 25, diaVencimento: 10 })
    cadastrarCompra({ cartaoId: quitado.id, descricao: 'Teste quitado', categoria: 'Outros', data: hoje, valorCentavos: 100, numeroParcelas: 1 })
    const pQuitada = listarParcelasPagamento().find(p => p.cartaoId === quitado.id)!
    const saldoQuitado = dinheiro(a.id)
    pagarParcelasSelecionadas({ contaId: a.id, parcelaIds: [pQuitada.id], dataPagamento: hoje })
    excluirCartao(quitado.id)
    assert.equal(listarCartoes().find(c => c.id === quitado.id)?.arquivado, true)
    assert.equal(dinheiro(a.id), saldoQuitado - 100)
    assert.equal(listarFaturasPrevistas().find(f => f.cartaoId === quitado.id)?.paga, true)
    assert.throws(() => cadastrarCompra({ cartaoId: quitado.id, descricao:'Bloqueada', categoria:'Outros', data:hoje, valorCentavos:100, numeroParcelas:1 }))
    const pagamentoQuitado = listarParcelasPagamento().find(p => p.id === pQuitada.id)!
    estornarPagamento({ tipo:'parcela', pagamentoId:pagamentoQuitado.pagamentoId!, motivo:'Teste de reabertura' })
    assert.equal(listarCartoes().find(c => c.id === quitado.id)?.arquivado, false)
    assert.equal(dinheiro(a.id), saldoQuitado)
    const ativo = cadastrarAtivo(obterBanco(), { codigo: 'BOVA11', nome: 'ETF teste', tipo: 'ETF', instituicao: 'Teste' })
    const saldoInvest = dinheiro(a.id)
    registrarOperacao(obterBanco(), { ativoId: ativo, contaId: a.id, tipo: 'compra', quantidade: 2, valorCentavos: 1000, taxasCentavos: 20, data: hoje }, dinheiro, hoje)
    assert.equal(dinheiro(a.id), saldoInvest - 1020)
    atualizarCotacao(obterBanco(), ativo, 600)
    assert.equal(listarPosicoes(obterBanco())[0].valorAtualCentavos, 1200)
    const mercado = cadastrarAtivo(obterBanco(),{codigo:'PETR4',nome:'Teste mercado',tipo:'Ação',instituicao:'Teste',quantidadeMercado:10})
    salvarCotacaoMercado(obterBanco(),mercado,{preco:32.15,data:new Date(Date.now()-60000).toISOString(),fonte:'BRAPI'})
    const arquivo = join(pasta, `backup-smoke-${randomUUID()}.db`)
    await backup(obterBanco(), arquivo)
    bancoBackup = new DatabaseSync(arquivo, { readOnly: true })
    const integridadeBackup = bancoBackup.prepare('PRAGMA integrity_check').get() as
      | { integrity_check: string } | undefined
    assert.equal(integridadeBackup?.integrity_check, 'ok')
    const contagemBackup = bancoBackup.prepare('SELECT COUNT(*) AS n FROM contas').get() as { n: number }
    assert.equal(contagemBackup.n, 2)
    bancoBackup.close()
    bancoBackup = null

    // Restauração real do banco de teste: alterações posteriores ao backup
    // devem desaparecer, e o estado antigo deve ser recuperado.
    const extra = salvarTransacao({
      contaId: b.id, descricao: 'Movimento após o backup',
      tipo: 'receita', valorCentavos: 4_321,
      categoria: 'Outros', data: hoje
    })
    assert.ok(listarTransacoes().some(t => t.id === extra.id))
    atualizarQuantidadeMercado(obterBanco(),mercado,20)
    await aplicarRestauracaoValidada(arquivo)
    assert.equal(listarPosicoes(obterBanco()).find(p=>p.id===mercado)?.quantidadeMercado,10)
    assert.equal(listarPosicoes(obterBanco()).find(p=>p.id===mercado)?.valorAtualCentavos,32150)
    assert.equal(listarPosicoes(obterBanco())[0].custoCentavos, 1020)
    assert.equal(dinheiro(a.id), saldoInvest - 1020)
    assert.ok(!listarTransacoes().some(t => t.id === extra.id),
      'Restauração deve recuperar o estado anterior ao backup')
    assert.equal(dinheiro(b.id), saldoAnterior + 123 + 8_500)

    const invalido = join(pasta, 'arquivo-invalido.db')
    writeFileSync(invalido, 'não é um banco SQLite')
    await assert.rejects(aplicarRestauracaoValidada(invalido),
      'Arquivo inválido não pode sobrescrever o banco atual')
    assert.equal(dinheiro(b.id), saldoAnterior + 123 + 8_500)

    console.info('FINCONTROL_SMOKE_OK: banco, contas, transações, cartões, pagamentos, estornos, salários, backup/restauração')
  } finally {
    bancoBackup?.close()
    fecharBanco()
    rmSync(pasta, { recursive: true, force: true })
  }
}
