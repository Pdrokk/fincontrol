import { useEffect, useState } from 'react'
import { TrendingUp, Plus, ArrowDownLeft, ArrowUpRight, Coins, Landmark, Building2, Wallet, ChartNoAxesCombined, RefreshCw, Pencil, X } from 'lucide-react'
import Feedback from './Feedback'
import type { Operacao, Posicao, Movimento } from '../../../main/investimentos'

type Conta = Awaited<ReturnType<typeof window.fincontrol.listarContas>>[number]
type Modo = 'mercado' | 'simples' | 'movimentos'
const tipos = ['Ação', 'ETF', 'FII', 'Moeda', 'Cripto', 'Renda fixa', 'Outro']
const tiposMercado = ['Ação', 'ETF', 'FII', 'Moeda']
const icones = { 'Ação': TrendingUp, ETF: ChartNoAxesCombined, FII: Building2, Moeda: Coins, Cripto: Coins, 'Renda fixa': Landmark, Outro: Wallet }
const moeda = (n: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)
const preco = (n: number): string => n.toLocaleString('pt-BR', {style:'currency',currency:'BRL',maximumFractionDigits:4})
const qtd = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })
const hoje = (): string => new Date().toLocaleDateString('sv-SE')
const campo = (f: FormData, nome: string): string => String(f.get(nome) ?? '')
const centavos = (f: FormData, nome: string): number => Math.round(Number(campo(f, nome)) * 100)
const hora = (iso: string): string => new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
function resumoCotacoes(r: Awaited<ReturnType<typeof window.fincontrol.sincronizarCotacoes>>): string {
  return r.falhas.length ? r.falhas.map(f=>f.codigo+': '+f.motivo).join(' · ') : r.atualizadas ? r.atualizadas+' posição(ões) atualizada(s).' : ''
}

export default function Investimentos({ onAlteracao }: { onAlteracao: () => void }): React.JSX.Element {
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [modo, setModo] = useState<Modo>('mercado')
  const [tipoCadastro,setTipoCadastro] = useState('Ação')
  const [tipo, setTipo] = useState<Operacao['tipo']>('compra')
  const [formAberto,setFormAberto] = useState(false)
  const [editando,setEditando] = useState<string|null>(null)
  const [configurando,setConfigurando] = useState(false)
  const [chaveAtiva,setChaveAtiva] = useState(false)
  const [sincronizando,setSincronizando] = useState(false)
  const [statusCotacoes,setStatusCotacoes] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar(): Promise<void> {
    const [dados, bancos, chave] = await Promise.all([window.fincontrol.listarInvestimentos(), window.fincontrol.listarContas(),window.fincontrol.chaveCotacoesConfigurada()])
    setPosicoes(dados.posicoes); setMovimentos(dados.movimentos); setContas(bancos); setChaveAtiva(chave)
  }
  useEffect(() => {
    let ativo = true
    void Promise.all([window.fincontrol.listarInvestimentos(), window.fincontrol.listarContas(),window.fincontrol.chaveCotacoesConfigurada()])
      .then(async ([dados, bancos, chave]) => {
        if (!ativo) return
        setPosicoes(dados.posicoes); setMovimentos(dados.movimentos); setContas(bancos); setChaveAtiva(chave); setCarregando(false)
        if (!dados.posicoes.some(a=>a.quantidadeMercado!==null)) return
        setSincronizando(true)
        const r = await window.fincontrol.sincronizarCotacoes(false)
        const novos = await window.fincontrol.listarInvestimentos()
        if (ativo) {setPosicoes(novos.posicoes);setMovimentos(novos.movimentos);setStatusCotacoes(resumoCotacoes(r))}
      })
      .catch((e: unknown) => { if (ativo) setErro(e instanceof Error ? e.message : 'Falha ao carregar investimentos.') })
      .finally(() => { if (ativo) {setCarregando(false);setSincronizando(false)} })
    return (): void => { ativo = false }
  }, [])
  async function executar(acao: () => Promise<unknown>, sucesso: string, form?: HTMLFormElement): Promise<void> {
    if (ocupado) return
    setOcupado(true); setErro(''); setMensagem('')
    try { await acao(); form?.reset(); await carregar(); onAlteracao(); setMensagem(sucesso) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.') }
    finally { setOcupado(false) }
  }
  async function sincronizar(forcar = true): Promise<void> {
    setSincronizando(true);setStatusCotacoes('')
    try {
      const r=await window.fincontrol.sincronizarCotacoes(forcar)
      await carregar()
      setStatusCotacoes(resumoCotacoes(r) || 'Cotações em cache atualizadas recentemente.')
    } catch {setStatusCotacoes('Não foi possível atualizar. Os últimos valores foram preservados.')}
    finally {setSincronizando(false)}
  }
  const valor = posicoes.reduce((n, a) => n + (a.valorAtualCentavos ?? 0), 0)
  const semCotacao = posicoes.filter(a => a.quantidade > 0 && a.valorAtualCentavos === null).length
  const categorias = tipos.map(t => ({tipo:t,valor:posicoes.filter(a=>a.tipo===t).reduce((n,a)=>n+(a.valorAtualCentavos??0),0)})).filter(t=>t.valor>0).sort((a,b)=>b.valor-a.valor)
  const mercado = posicoes.filter(a=>a.quantidadeMercado!==null)
  return <div className="investimentos carteira-v3">
    <Feedback mensagem={erro} tipo="erro" />
    <Feedback mensagem={mensagem} tipo="sucesso" />
    <section className="painel carteira-painel">
      <header className="carteira-cabecalho">
        <div><h3>Minha carteira</h3><span className="invest-detalhe">Acompanhe o valor dos seus ativos em reais.</span></div>
        <div className="carteira-acoes">
          <button className="botao-secundario" type="button" disabled={sincronizando || ocupado || !mercado.length} onClick={():void=>{void sincronizar()}}><RefreshCw size={16}/>{sincronizando?'Atualizando…':'Atualizar cotações'}</button>
          <button className="botao-primario" type="button" aria-expanded={formAberto} onClick={():void=>setFormAberto(v=>!v)}><Plus size={17}/>Adicionar ativo</button>
        </div>
      </header>
      <div className="carteira-balanco">
        <div><span>Patrimônio em investimentos {semCotacao ? '(parcial)' : ''}</span><strong>{carregando || (semCotacao>0 && posicoes.every(a=>a.valorAtualCentavos===null))?'—':moeda(valor)}</strong><small>{posicoes.length} ativo(s) · {semCotacao} sem cotação</small></div>
        {categorias.length>0 && <div className="invest-alocacao"><span>Distribuição por categoria</span>{categorias.map(t=><div key={t.tipo} className="carteira-categoria"><span>{t.tipo}</span><div className="invest-barra" aria-hidden="true"><span style={{width:(t.valor/valor*100)+'%'}}/></div><strong>{(t.valor/valor*100).toFixed(1)}%</strong></div>)}</div>}
      </div>
      <div className="carteira-fonte"><span>BRAPI · BCB PTAX · Dados com atraso; últimos valores disponíveis offline.</span><button className="botao-texto" type="button" onClick={():void=>setConfigurando(v=>!v)} aria-expanded={configurando}>{chaveAtiva?'Gerenciar chave BRAPI':'Configurar fonte de dados'}</button></div>
      {configurando && <form className="carteira-edicao formulario" onSubmit={(e):void=>{e.preventDefault();const f=e.currentTarget;const dados=new FormData(f);void executar(()=>window.fincontrol.configurarChaveCotacoes(campo(dados,'chave')),'Chave configurada neste dispositivo.',f)}}>
        <p>Obtenha uma chave gratuita em brapi.dev/dashboard. PETR4, VALE3, MGLU3 e ITUB4 podem funcionar sem chave. A chave é protegida localmente; não faz parte do backup.</p>
        <label>Chave BRAPI<input type="password" name="chave" autoComplete="off" maxLength={512} required /></label>
        <button type="submit" className="botao-primario" disabled={ocupado}>Salvar chave</button>
        {chaveAtiva && <button type="button" className="botao-secundario" disabled={ocupado} onClick={():void=>{void executar(()=>window.fincontrol.configurarChaveCotacoes(''),'Chave local removida.')}}>Remover chave local</button>}
      </form>}
      <Feedback mensagem={statusCotacoes} tipo="informacao"/>
      <section className="carteira-edicao" hidden={!formAberto}>
        <div className="carteira-cabecalho"><h3>Adicionar ativo</h3><button type="button" className="botao-secundario" aria-label="Fechar cadastro" onClick={():void=>setFormAberto(false)}><X size={17}/></button></div>
        <form className="formulario" onSubmit={(e):void=>{
          e.preventDefault();const form=e.currentTarget;const f=new FormData(form)
          void executar(async()=>{
            await window.fincontrol.cadastrarAtivo({codigo:campo(f,'codigo'),nome:campo(f,'nome')||campo(f,'codigo'),tipo:tipoCadastro,instituicao:campo(f,'instituicao'),valorInformadoCentavos:modo==='simples'?centavos(f,'valorPatrimonial'):null,quantidadeMercado:modo==='mercado'?Number(campo(f,'quantidadeMercado')):null})
            setFormAberto(false)
            if(modo==='mercado') await sincronizar(false)
          },'Ativo adicionado à carteira.',form)
        }}>
          <label>Tipo de acompanhamento<select value={modo} onChange={(e):void=>{setModo(e.target.value as Modo);setTipoCadastro('Ação')}}><option value="mercado">Cotação automática</option><option value="simples">Valor informado</option><option value="movimentos">Compras e vendas detalhadas</option></select></label>
          <label>Categoria<select value={tipoCadastro} onChange={(e):void=>setTipoCadastro(e.target.value)}>{(modo==='mercado'?tiposMercado:tipos).map(t=><option key={t}>{t}</option>)}</select></label>
          <label>Ativo / código<input name="codigo" required maxLength={30} placeholder={modo==='mercado'?(tipoCadastro==='Moeda'?'USD ou EUR':'PETR4, BOVA11, HGLG11'):'Nome ou código'}/></label>
          {modo==='mercado'&&<label>Quantidade que possui<input name="quantidadeMercado" type="number" min=".00000001" max="10000" step=".00000001" required/></label>}
          {modo==='simples'&&<label>Valor atual total (R$)<input name="valorPatrimonial" type="number" min="0" step=".01" max="10000000000" required/></label>}
          <label>Nome (opcional)<input name="nome" maxLength={100}/></label>
          <label>Instituição (opcional)<input name="instituicao" maxLength={100}/></label>
          <button className="botao-primario" type="submit" disabled={ocupado||sincronizando||carregando}><Plus size={17}/>Adicionar à carteira</button>
        </form>
        <p className="invest-detalhe">{modo==='mercado'?'A cotação será consultada automaticamente. Não movimenta contas bancárias.':modo==='simples'?'Informe o valor total de ativos que não possuem cotação automática.':'Use o controle de operações para registrar compras, vendas e proventos vinculados ao caixa.'}</p>
      </section>
      {carregando?<p role="status">Carregando carteira…</p>:!posicoes.length?<div className="carteira-vazia"><Wallet size={28}/><strong>Sua carteira está vazia</strong><p>Adicione um ativo pelo código e a quantidade que possui.</p></div>:<div className="carteira-tabela"><table>
        <thead><tr><th scope="col">Ativo</th><th scope="col">Quantidade</th><th scope="col">Cotação (R$)</th><th scope="col">Valor da posição</th><th scope="col">Ações</th></tr></thead>
        <tbody>{posicoes.map(a=>{
          const Icone=icones[a.tipo as keyof typeof icones]??Wallet
          const manual=a.valorInformadoCentavos!==null
          const automatico=a.quantidadeMercado!==null
          const valorEdicao=automatico?a.quantidadeMercado:manual?(a.valorInformadoCentavos??0)/100:a.cotacaoCentavos===null?'':a.cotacaoCentavos/100
          return <tr className="invest-ativo" key={a.id}>
            <th scope="row"><span className="carteira-ativo-nome"><Icone size={19} aria-hidden="true"/><span><strong>{a.codigo}</strong><small>{a.tipo}{a.instituicao?' · '+a.instituicao:''}</small></span></span></th>
            <td>{manual?'—':qtd(a.quantidade)}</td>
            <td>{automatico?a.precoMercado===null?'—':preco(a.precoMercado):manual?'—':a.cotacaoCentavos===null?'—':moeda(a.cotacaoCentavos)}
              <small>{automatico?a.cotacaoEm? a.fonteCotacao+' · '+hora(a.cotacaoEm):'Aguardando cotação':manual?'Valor informado':'Controle detalhado'}</small>
            </td>
            <td><strong>{a.valorAtualCentavos===null?'Indisponível':moeda(a.valorAtualCentavos)}</strong>{!manual&&!automatico&&a.quantidade>0&&<small>Preço médio: {moeda(a.custoCentavos/a.quantidade)}</small>}</td>
            <td>{editando===a.id?<form className="invest-cotacao carteira-editor" onSubmit={(e):void=>{e.preventDefault();const f=new FormData(e.currentTarget);void executar(async()=>{if(automatico)await window.fincontrol.atualizarQuantidadeMercado(a.id,Number(campo(f,'edicao')));else if(manual)await window.fincontrol.atualizarValorAtivo(a.id,centavos(f,'edicao'));else await window.fincontrol.atualizarCotacao(a.id,centavos(f,'edicao'));setEditando(null)},'Posição atualizada.')}}>
              <input aria-label={automatico?'Quantidade de '+a.codigo:manual?'Valor de '+a.codigo:'Cotação de '+a.codigo} name="edicao" type="number" min={automatico?'.00000001':manual?'0':'.01'} step={automatico?'.00000001':'.01'} defaultValue={valorEdicao ?? ''} required/>
              <button type="submit" className="botao-primario" disabled={ocupado}>Salvar</button><button type="button" className="botao-secundario" onClick={():void=>setEditando(null)} aria-label="Cancelar edição"><X size={16}/></button>
            </form>:<button className="botao-secundario carteira-editar" type="button" onClick={():void=>setEditando(a.id)} aria-label={'Editar '+a.codigo} title={'Editar '+a.codigo}><Pencil size={16}/></button>}</td>
          </tr>
        })}</tbody>
      </table></div>}
    </section>
    <details className="painel invest-avancado">
      <summary>Operações vinculadas a contas</summary>
      <h3>Registrar movimentação</h3>
      <p>Compras debitam a conta; vendas e proventos creditam a conta. Não entram como despesas de consumo.</p>
      <form className="formulario" onSubmit={(e): void => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); void executar(() => window.fincontrol.registrarInvestimento({ ativoId: campo(f,'ativo'), contaId: campo(f,'conta'), tipo, quantidade: tipo === 'provento' ? 0 : Number(campo(f,'quantidade')), valorCentavos: centavos(f,'valor'), taxasCentavos: centavos(f,'taxas'), data: campo(f,'data') }), 'Movimentação registrada.', form) }}>
        <label>Operação<select value={tipo} onChange={(e): void => setTipo(e.target.value as Operacao['tipo'])}><option value="compra">Compra</option><option value="venda">Venda</option><option value="provento">Provento / rendimento</option></select></label>
        <label>Ativo<select name="ativo" required><option value="">Selecione</option>{posicoes.filter(a => a.valorInformadoCentavos === null && a.quantidadeMercado === null).map(a => <option value={a.id} key={a.id}>{a.codigo} · {a.instituicao || a.nome}</option>)}</select></label>
        <label>Conta bancária<select name="conta" required><option value="">Selecione</option>{contas.map(c => <option value={c.id} key={c.id}>{c.banco} · {c.nome} ({moeda(c.saldoAtualCentavos)})</option>)}</select></label>
        {tipo !== 'provento' && <label>Quantidade<input name="quantidade" type="number" required step=".00000001" min=".00000001" max="10000" /></label>}
        <label>Valor bruto total (R$)<input name="valor" type="number" step=".01" min=".01" max="10000000000" required /></label>
        <label>Taxas (R$)<input name="taxas" type="number" step=".01" min="0" max="10000000000" defaultValue="0" required /></label>
        <label>Data<input name="data" type="date" defaultValue={hoje()} max={hoje()} required /></label>
        <button className="botao-primario" type="submit" disabled={ocupado || carregando || !posicoes.some(a => a.valorInformadoCentavos === null && a.quantidadeMercado === null) || !contas.length}>{tipo === 'compra' ? <ArrowDownLeft size={18} /> : tipo === 'venda' ? <ArrowUpRight size={18} /> : <Coins size={18} />} Registrar {tipo}</button>
      </form>
      {!contas.length && <p>Cadastre uma conta em Minhas contas antes de movimentar investimentos.</p>}
      <h3>Histórico de operações</h3>
      {!movimentos.length ? <p>Nenhuma operação registrada.</p> : <div className="invest-historico"><table><thead><tr><th>Data</th><th>Ativo</th><th>Operação</th><th>Quantidade</th><th>Movimento bancário</th></tr></thead><tbody>
        {movimentos.map(m => <tr key={m.id}><td>{m.data.split('-').reverse().join('/')}</td><td>{posicoes.find(a => a.id === m.ativoId)?.codigo ?? 'Ativo'}</td><td>{m.tipo}</td><td>{m.tipo === 'provento' ? '—' : qtd(m.quantidade)}</td><td>{moeda(m.caixaCentavos)}</td></tr>)}
      </tbody></table></div>}
    </details>
  </div>
}
