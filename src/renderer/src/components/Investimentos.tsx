import { useEffect, useState } from 'react'
import { TrendingUp, Plus, ArrowDownLeft, ArrowUpRight, Coins, Landmark, Building2, Wallet, ChartNoAxesCombined } from 'lucide-react'
import Feedback from './Feedback'
import type { Operacao, Posicao, Movimento } from '../../../main/investimentos'

type Conta = Awaited<ReturnType<typeof window.fincontrol.listarContas>>[number]
const tipos = ['Ação', 'ETF', 'FII', 'Moeda', 'Cripto', 'Renda fixa', 'Outro']
const icones = { 'Ação': TrendingUp, ETF: ChartNoAxesCombined, FII: Building2, Moeda: Coins, Cripto: Coins, 'Renda fixa': Landmark, Outro: Wallet }
const moeda = (n: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)
const qtd = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })
const hoje = (): string => new Date().toLocaleDateString('sv-SE')
const campo = (f: FormData, nome: string): string => String(f.get(nome) ?? '')
const centavos = (f: FormData, nome: string): number => Math.round(Number(campo(f, nome)) * 100)

export default function Investimentos({ onAlteracao }: { onAlteracao: () => void }): React.JSX.Element {
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [modo, setModo] = useState<'simples' | 'movimentos'>('simples')
  const [tipo, setTipo] = useState<Operacao['tipo']>('compra')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar(): Promise<void> {
    const [dados, bancos] = await Promise.all([window.fincontrol.listarInvestimentos(), window.fincontrol.listarContas()])
    setPosicoes(dados.posicoes); setMovimentos(dados.movimentos); setContas(bancos)
  }
  useEffect(() => {
    let ativo = true
    void Promise.all([window.fincontrol.listarInvestimentos(), window.fincontrol.listarContas()])
      .then(([dados, bancos]) => { if (ativo) { setPosicoes(dados.posicoes); setMovimentos(dados.movimentos); setContas(bancos) } })
      .catch((e: unknown) => { if (ativo) setErro(e instanceof Error ? e.message : 'Falha ao carregar investimentos.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return (): void => { ativo = false }
  }, [])
  async function executar(acao: () => Promise<unknown>, sucesso: string, form?: HTMLFormElement): Promise<void> {
    if (ocupado) return
    setOcupado(true); setErro(''); setMensagem('')
    try { await acao(); form?.reset(); await carregar(); onAlteracao(); setMensagem(sucesso) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.') }
    finally { setOcupado(false) }
  }
  const custo = posicoes.reduce((n, a) => n + a.custoCentavos, 0)
  const valor = posicoes.reduce((n, a) => n + (a.valorAtualCentavos ?? 0), 0)
  const semCotacao = posicoes.filter(a => a.quantidade > 0 && a.valorAtualCentavos === null).length
  const realizado = posicoes.reduce((n, a) => n + a.realizadoCentavos, 0)
  const proventos = posicoes.reduce((n, a) => n + a.proventosCentavos, 0)
  const valorAcompanhado = posicoes.reduce((n, a) => n + (a.valorInformadoCentavos ?? 0), 0)
  const resultado = valor - valorAcompanhado - custo + realizado + proventos
  return <div className="investimentos">
    <Feedback mensagem={erro} tipo="erro" />
    <Feedback mensagem={mensagem} tipo="sucesso" />
    <section className="painel">
      <h3>Minha carteira</h3>
      <p>Informe quanto seus ativos valem hoje, sem precisar registrar compras. O controle detalhado de operações é opcional.</p>
      <div className="invest-resumo">
        <div><span>Custo das posições detalhadas</span><strong>{moeda(custo)}</strong></div>
        <div><span>Patrimônio em investimentos {semCotacao > 0 ? '(parcial)' : ''}</span><strong>{moeda(valor)}</strong></div>
        <div><span>Resultado realizado</span><strong>{moeda(realizado)}</strong></div>
        <div><span>Proventos líquidos</span><strong>{moeda(proventos)}</strong></div>
        <div><span>Resultado (controle detalhado)</span><strong>{semCotacao ? '—' : moeda(resultado)}</strong></div>
      </div>
      {semCotacao > 0 && <p>Atualize a cotação de {semCotacao} ativo(s) para calcular o resultado completo.</p>}
      {carregando ? <p>Carregando carteira...</p> : posicoes.length === 0 ? <p>Nenhum ativo cadastrado. Comece pelo formulário abaixo.</p> : posicoes.map(a => {
        const Icone = icones[a.tipo as keyof typeof icones] ?? Wallet
        return <article className="invest-ativo" key={a.id}>
          <div><strong className="invest-nome"><Icone size={19} aria-hidden="true" />{a.codigo}</strong><span className="invest-detalhe">{a.nome} · {a.tipo}{a.instituicao ? ' · ' + a.instituicao : ''}</span></div>
          {a.valorInformadoCentavos !== null ? <><div><strong>Acompanhamento</strong><span className="invest-detalhe">Sem movimentação bancária</span></div><div><strong>{moeda(a.valorInformadoCentavos)}</strong><span className="invest-detalhe">Valor informado</span></div><div><span className="invest-detalhe">Atualizar valor total (R$)</span><form className="invest-cotacao" onSubmit={(e): void => { e.preventDefault(); const f = new FormData(e.currentTarget); void executar(() => window.fincontrol.atualizarValorAtivo(a.id, centavos(f, 'valor')), 'Valor atualizado.') }}><input name="valor" aria-label={'Valor de ' + a.codigo} type="number" min="0" step=".01" max="10000000000" defaultValue={a.valorInformadoCentavos / 100} required /><button className="botao-secundario" type="submit" disabled={ocupado}>Salvar</button></form></div></> : <><div><strong>{qtd(a.quantidade)} un.</strong><span className="invest-detalhe">Preço médio: {a.quantidade ? moeda(a.custoCentavos / a.quantidade) : '—'}</span></div>
          <div><strong>{a.valorAtualCentavos === null ? 'Sem cotação' : moeda(a.valorAtualCentavos)}</strong><span className="invest-detalhe">Custo: {moeda(a.custoCentavos)}{a.valorAtualCentavos !== null ? ' · Resultado: ' + moeda(a.valorAtualCentavos - a.custoCentavos) : ''}</span></div>
          <div><span className="invest-detalhe">Cotação por unidade (R$)</span><form className="invest-cotacao" onSubmit={(e): void => { e.preventDefault(); const f = new FormData(e.currentTarget); void executar(() => window.fincontrol.atualizarCotacao(a.id, centavos(f, 'cotacao')), 'Cotação atualizada.') }}>
            <input aria-label={'Cotação de ' + a.codigo} name="cotacao" type="number" min=".01" max="10000000000" step=".01" defaultValue={a.cotacaoCentavos === null ? '' : a.cotacaoCentavos / 100} required />
            <button type="submit" className="botao-secundario" disabled={ocupado} aria-label={'Salvar cotação de ' + a.codigo}>Salvar</button>
          </form></div></>}
        </article>
      })}
      {valor > 0 && <div className="invest-alocacao"><h3>Distribuição por categoria</h3>
        {tipos.map(t => ({ tipo: t, valor: posicoes.filter(a => a.tipo === t).reduce((n, a) => n + (a.valorAtualCentavos ?? 0), 0) })).filter(t => t.valor > 0).map(t => <div key={t.tipo}>
          <span>{t.tipo} · {moeda(t.valor)} ({(t.valor / valor * 100).toFixed(1)}%)</span>
          <div className="invest-barra" aria-hidden="true"><span style={{ width: (t.valor / valor * 100) + '%' }} /></div>
        </div>)}
      </div>}
    </section>
    <section className="painel">
      <h3>Cadastrar ativo</h3>
      <form className="formulario" onSubmit={(e): void => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); void executar(() => window.fincontrol.cadastrarAtivo({ codigo: campo(f,'codigo'), nome: campo(f,'nome') || campo(f,'codigo'), tipo: campo(f,'tipo'), instituicao: campo(f,'instituicao'), valorInformadoCentavos: modo === 'simples' ? centavos(f,'valorPatrimonial') : null }), 'Ativo cadastrado.', form) }}>
        <label>Forma de controle<select value={modo} onChange={(e): void => setModo(e.target.value as 'simples' | 'movimentos')}><option value="simples">Apenas acompanhar valor</option><option value="movimentos">Registrar compras e vendas</option></select></label>
        <label>Ativo / código<input name="codigo" required maxLength={30} placeholder="BOVA11, USD, HGLG11" /></label>
        <label>Nome (opcional)<input name="nome" maxLength={100} placeholder="Nome do ativo" /></label>
        <label>Categoria<select name="tipo">{tipos.map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Corretora / instituição<input name="instituicao" maxLength={100} placeholder="Opcional" /></label>
        {modo === 'simples' && <label>Valor atual total (R$)<input name="valorPatrimonial" type="number" min="0" step=".01" max="10000000000" required placeholder="2500,00" /></label>}
        <button className="botao-primario" type="submit" disabled={ocupado || carregando}><Plus size={18} /> Cadastrar ativo</button>
      </form>
    </section>
    <details className="painel invest-avancado">
      <summary>Controle detalhado de operações (opcional)</summary>
      <h3>Registrar movimentação</h3>
      <p>Compras debitam a conta; vendas e proventos creditam a conta. Não entram como despesas de consumo.</p>
      <form className="formulario" onSubmit={(e): void => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); void executar(() => window.fincontrol.registrarInvestimento({ ativoId: campo(f,'ativo'), contaId: campo(f,'conta'), tipo, quantidade: tipo === 'provento' ? 0 : Number(campo(f,'quantidade')), valorCentavos: centavos(f,'valor'), taxasCentavos: centavos(f,'taxas'), data: campo(f,'data') }), 'Movimentação registrada.', form) }}>
        <label>Operação<select value={tipo} onChange={(e): void => setTipo(e.target.value as Operacao['tipo'])}><option value="compra">Compra</option><option value="venda">Venda</option><option value="provento">Provento / rendimento</option></select></label>
        <label>Ativo<select name="ativo" required><option value="">Selecione</option>{posicoes.filter(a => a.valorInformadoCentavos === null).map(a => <option value={a.id} key={a.id}>{a.codigo} · {a.instituicao || a.nome}</option>)}</select></label>
        <label>Conta bancária<select name="conta" required><option value="">Selecione</option>{contas.map(c => <option value={c.id} key={c.id}>{c.banco} · {c.nome} ({moeda(c.saldoAtualCentavos)})</option>)}</select></label>
        {tipo !== 'provento' && <label>Quantidade<input name="quantidade" type="number" required step=".00000001" min=".00000001" max="10000" /></label>}
        <label>Valor bruto total (R$)<input name="valor" type="number" step=".01" min=".01" max="10000000000" required /></label>
        <label>Taxas (R$)<input name="taxas" type="number" step=".01" min="0" max="10000000000" defaultValue="0" required /></label>
        <label>Data<input name="data" type="date" defaultValue={hoje()} max={hoje()} required /></label>
        <button className="botao-primario" type="submit" disabled={ocupado || carregando || !posicoes.some(a => a.valorInformadoCentavos === null) || !contas.length}>{tipo === 'compra' ? <ArrowDownLeft size={18} /> : tipo === 'venda' ? <ArrowUpRight size={18} /> : <Coins size={18} />} Registrar {tipo}</button>
      </form>
      {!contas.length && <p>Cadastre uma conta em Minhas contas antes de movimentar investimentos.</p>}
      <h3>Histórico de operações</h3>
      {!movimentos.length ? <p>Nenhuma operação registrada.</p> : <div className="invest-historico"><table><thead><tr><th>Data</th><th>Ativo</th><th>Operação</th><th>Quantidade</th><th>Movimento bancário</th></tr></thead><tbody>
        {movimentos.map(m => <tr key={m.id}><td>{m.data.split('-').reverse().join('/')}</td><td>{posicoes.find(a => a.id === m.ativoId)?.codigo ?? 'Ativo'}</td><td>{m.tipo}</td><td>{m.tipo === 'provento' ? '—' : qtd(m.quantidade)}</td><td>{moeda(m.caixaCentavos)}</td></tr>)}
      </tbody></table></div>}
    </details>
  </div>
}
