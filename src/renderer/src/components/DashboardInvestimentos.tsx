import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { ObservacaoPatrimonio } from '../../../main/investimentos'
import GraficoHistoricoInvest from './GraficoHistoricoInvest'
import Feedback from './Feedback'

interface Props { revisaoFinanceira:number; onInvestimentos:()=>void }
interface Dados { evolucao:ObservacaoPatrimonio[]; conhecido:number; semCotacao:number }
const moeda=(centavos:number):string=>centavos.toLocaleString('pt-BR',{style:'decimal',minimumFractionDigits:2,maximumFractionDigits:2})
export default function DashboardInvestimentos({revisaoFinanceira,onInvestimentos}:Props):React.JSX.Element {
  const [estado,setEstado]=useState<{revisao:number;dados:Dados|null;erro:string}|null>(null)
  const [agora,setAgora]=useState(()=>Date.now())
  useEffect(()=>{
    const timer=window.setInterval(()=>setAgora(Date.now()),60000)
    return ():void=>window.clearInterval(timer)
  },[])
  useEffect(()=>{
    let ativo=true
    void window.fincontrol.listarInvestimentos().then(r=>{
      if(!ativo)return
      const posicoes=r.posicoes.filter(p=>!p.arquivado)
      setEstado({revisao:revisaoFinanceira,dados:{evolucao:r.evolucao,conhecido:posicoes.reduce((total,p)=>total+(p.valorAtualCentavos??0),0),semCotacao:posicoes.filter(p=>p.valorAtualCentavos===null).length},erro:''})
    }).catch(()=>{
      if(ativo)setEstado({revisao:revisaoFinanceira,dados:null,erro:'Não foi possível consultar o patrimônio investido.'})
    })
    return ():void=>{ativo=false}
  },[revisaoFinanceira])
  const atual=estado?.revisao===revisaoFinanceira?estado:null
  const dados=atual?.dados
  return <section className="painel dashboard-investimentos" aria-label="Investimentos na visão geral">
    <div className="dashboard-secao-titulo">
      <div><h3>Investimentos</h3><p>Patrimônio investido, separado do saldo bancário.</p></div>
      <button className="botao-texto" type="button" aria-label="Abrir carteira de investimentos" onClick={onInvestimentos}>Ver carteira <ArrowRight size={15}/></button>
    </div>
    <strong className="dashboard-investimentos-valor">{!dados?'—':dados.semCotacao&&dados.conhecido===0?'Indisponível':'R$ '+moeda(dados.conhecido/100)+(dados.semCotacao?' (parcial)':'')}</strong>
    {dados&&dados.semCotacao>0&&<p className="invest-detalhe">{dados.semCotacao} {dados.semCotacao===1?'posição sem valor disponível':'posições sem valor disponível'}.</p>}
    <Feedback mensagem={atual?.erro??''} tipo="erro"/>
    {!atual?.erro&&<GraficoHistoricoInvest titulo="Evolução do patrimônio investido" classe="carteira-grafico-patrimonio" pontos={(dados?.evolucao??[]).map(p=>({data:p.data,valor:p.valorCentavos===null?null:p.valorCentavos/100}))} agora={agora} carregando={!atual} descricao="Período independente dos filtros de receitas e despesas. Último valor observado por dia de uso, com as cotações disponíveis; inclui aportes e retiradas, não representa rentabilidade."/>}
  </section>
}
