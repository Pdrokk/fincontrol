import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Fundamentos } from '../../../main/fundamentos'
import type { Posicao } from '../../../main/investimentos'
import Feedback from './Feedback'

const formato=(n:number|null,tipo:'numero'|'percentual'|'moeda'='numero'):string=>{
  if(n===null)return 'Indisponível'
  return n.toLocaleString('pt-BR',tipo==='percentual'?{style:'percent',maximumFractionDigits:2}:tipo==='moeda'?{style:'currency',currency:'BRL'}:{maximumFractionDigits:2})
}
export default function IndicadoresAtivo({ativo}:{ativo:Posicao}):React.JSX.Element {
  const [dados,setDados]=useState<Fundamentos|null>(null)
  const [ocupado,setOcupado]=useState(false)
  const [erro,setErro]=useState('')
  async function consultar():Promise<void>{
    if(ocupado)return
    setOcupado(true);setErro('')
    try{setDados(await window.fincontrol.consultarFundamentos(ativo.id))}
    catch(e){setErro(e instanceof Error?e.message:'Não foi possível consultar os indicadores.')}
    finally{setOcupado(false)}
  }
  return <section className="carteira-fundamentos" aria-label="Indicadores fundamentalistas">
    <div className="carteira-cabecalho"><h4>Indicadores fundamentalistas</h4><button className="botao-secundario" type="button" disabled={ocupado} onClick={():void=>{void consultar()}}><RefreshCw size={16}/>{ocupado?'Consultando…':dados?'Atualizar indicadores':'Consultar indicadores'}</button></div>
    <Feedback mensagem={erro} tipo="erro"/>
    {!dados?<p className="invest-detalhe">Consulte os dados de mercado da BRAPI. A disponibilidade depende do ativo e do plano de acesso. Não altera sua carteira.</p>:<>
      <p className="invest-detalhe">{[dados.nome,dados.setor,dados.segmento].filter(Boolean).join(' · ')}</p>
      <dl className="carteira-ficha-dados">
        {dados.tipo==='Ação'&&<div><dt>P/L</dt><dd>{formato(dados.pl)}</dd></div>}
        <div><dt>P/VP</dt><dd>{formato(dados.pvp)}</dd></div>
        <div><dt>Dividend yield (12m)</dt><dd>{formato(dados.dy,'percentual')}</dd></div>
        {dados.tipo==='Ação'&&<><div><dt>ROE</dt><dd>{formato(dados.roe,'percentual')}</dd></div><div><dt>Margem líquida</dt><dd>{formato(dados.margem,'percentual')}</dd></div><div><dt>Lucro por ação</dt><dd>{formato(dados.lpa,'moeda')}</dd></div></>}
        <div><dt>Valor patrimonial por unidade</dt><dd>{formato(dados.vpa,'moeda')}</dd></div>
        {dados.tipo==='FII'&&<div><dt>Cotistas</dt><dd>{formato(dados.cotistas)}</dd></div>}
      </dl>
      <p className="invest-detalhe">Fonte: BRAPI · Consultado em {new Date(dados.consultadoEm).toLocaleString('pt-BR')}{dados.referencia?' · Referência informada: '+dados.referencia.split('-').reverse().join('/'):''}. Indicadores podem ter períodos de referência diferentes. Não são recomendações de investimento.{erro?' Última consulta bem-sucedida mantida nesta ficha.':''}</p>
    </>}
  </section>
}
