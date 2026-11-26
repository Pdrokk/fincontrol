import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import type { Posicao, Movimento, ObservacaoCotacao } from '../../../main/investimentos'
import GraficoHistoricoInvest from './GraficoHistoricoInvest'
import Feedback from './Feedback'
import IndicadoresAtivo from './IndicadoresAtivo'
import HistoricoOperacoes from './HistoricoOperacoes'

interface Props { ativo:Posicao; movimentos:Movimento[]; agora:number; onFechar:()=>void }
const moeda=(n:number|null):string=>n===null?'Indisponível':(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const qtd=(n:number):string=>n.toLocaleString('pt-BR',{maximumFractionDigits:8})
const preco=(n:number|null):string=>n===null?'Indisponível':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:4})

export default function FichaAtivo({ativo,movimentos,agora,onFechar}:Props):React.JSX.Element {
  const [dados,setDados]=useState<ObservacaoCotacao[]|null>(null)
  const [erro,setErro]=useState('')
  const secao=useRef<HTMLElement>(null)
  const id=ativo.id
  const cotacaoEm=ativo.cotacaoEm
  const cotacaoManual=ativo.cotacaoCentavos
  useEffect(()=>{
    secao.current?.scrollIntoView({block:'nearest'})
    secao.current?.focus({preventScroll:true})
  },[])
  useEffect(()=>{
    let vivo=true
    void window.fincontrol.listarHistoricoCotacoes(id).then(r=>{if(vivo)setDados(r)}).catch(()=>{if(vivo){setErro('Não foi possível carregar o histórico de cotações.');setDados([])}})
    return ():void=>{vivo=false}
  },[id,cotacaoEm,cotacaoManual])
  const legado=ativo.valorInformadoCentavos!==null
  const cotacao=ativo.quantidadeMercado!==null?ativo.precoMercado:ativo.cotacaoCentavos===null?null:ativo.cotacaoCentavos/100
  const custo=ativo.custoConhecido&&!legado?ativo.custoCentavos:null
  const resultado=custo!==null&&ativo.valorAtualCentavos!==null?ativo.valorAtualCentavos-custo:null
  const variacao=resultado!==null&&custo!==null&&custo>0?resultado/custo*100:null
  const fontes: {id:'cvm'|'sec'|'bcb';rotulo:string}[]=ativo.tipo==='Moeda'?[{id:'bcb',rotulo:'Banco Central · PTAX'}]:['Ação','ETF','FII','Renda fixa'].includes(ativo.tipo)?[{id:'cvm',rotulo:'CVM · Consultar registros e documentos'},{id:'sec',rotulo:'SEC · Pesquisar emissores dos EUA'}]:[]
  return <section ref={secao} tabIndex={-1} className="carteira-ficha carteira-edicao" aria-label={'Ficha de '+ativo.codigo}>
    <div className="carteira-cabecalho"><div><h3>{ativo.codigo} <span className="invest-detalhe">· {ativo.nome}</span></h3><p className="invest-detalhe">{ativo.tipo}{ativo.instituicao?' · '+ativo.instituicao:''}{ativo.arquivado?' · Arquivado':''}</p></div><button className="botao-secundario carteira-editar" type="button" aria-label="Fechar ficha do ativo" onClick={onFechar}><X size={17}/></button></div>
    <dl className="carteira-ficha-dados">
      <div><dt>Cotação unitária</dt><dd>{legado?'—':preco(cotacao)}</dd></div>
      <div><dt>Quantidade</dt><dd>{legado?'A definir':qtd(ativo.quantidade)}</dd></div>
      <div><dt>Valor da posição</dt><dd>{moeda(ativo.valorAtualCentavos)}</dd></div>
      <div><dt>Custo da posição</dt><dd>{custo===null?'Não informado':moeda(custo)}</dd></div>
      <div><dt>Preço médio</dt><dd>{custo!==null&&ativo.quantidade>0?preco(custo/100/ativo.quantidade):'—'}</dd></div>
      <div><dt>Resultado não realizado</dt><dd>{resultado===null?'Não calculável':moeda(resultado)}{variacao!==null&&<small> ({variacao.toLocaleString('pt-BR',{maximumFractionDigits:2})}%)</small>}</dd></div>
      <div><dt>Resultado realizado</dt><dd>{ativo.realizadoCentavos===null||legado?'Não calculável':moeda(ativo.realizadoCentavos)}</dd></div>
      <div><dt>Proventos líquidos</dt><dd>{moeda(ativo.proventosCentavos)}</dd></div>
    </dl>
    <p className="invest-detalhe">{ativo.fonteCotacao&&ativo.cotacaoEm?'Fonte: '+ativo.fonteCotacao+' · '+new Date(ativo.cotacaoEm).toLocaleString('pt-BR'):legado?'Valor informado anteriormente. Defina a quantidade para registrar operações.':'Cotação manual ou ainda indisponível.'}{!ativo.custoConhecido?' O custo inicial não foi informado; não é possível calcular a rentabilidade completa.':''}</p>
    <Feedback mensagem={erro} tipo="erro"/>
    <GraficoHistoricoInvest titulo="Histórico de cotações" pontos={(dados??[]).map(p=>({data:p.data,valor:p.preco}))} agora={agora} carregando={dados===null} descricao="Última cotação observada em cada data; sem preenchimento artificial de dias ausentes. Valores manuais são registros locais."/>
    {(ativo.tipo==='Ação'||ativo.tipo==='FII')&&<IndicadoresAtivo key={ativo.id} ativo={ativo}/>}
    <h4>Operações deste ativo ({movimentos.length})</h4>
    <HistoricoOperacoes movimentos={movimentos}/>
    {fontes.length>0&&<div className="carteira-fontes-oficiais"><h4>Consultar fontes oficiais</h4><p className="invest-detalhe">Abre a consulta pública no navegador. A identificação do emissor e a cobertura precisam ser verificadas; não há importação automática de documentos.</p><div className="carteira-acoes">{fontes.map(f=><button className="botao-secundario" key={f.id} type="button" onClick={():void=>{void window.fincontrol.abrirFonteInvestimento(f.id).catch(()=>setErro('Não foi possível abrir a fonte oficial.'))}}>{f.rotulo}<ExternalLink size={15}/></button>)}</div></div>}
  </section>
}
