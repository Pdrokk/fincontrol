import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Ponto { data:string; valor:number|null }
interface Props { titulo:string; classe?:string; pontos:Ponto[]; agora:number; descricao:string; carregando?:boolean }
const formatar = (valor:number):string => valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:4})
const dataCurta = (valor:number):string => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(valor)
const dataCompleta = (valor:number):string => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'UTC'}).format(valor)

export default function GraficoHistoricoInvest({titulo,classe='',pontos,agora,descricao,carregando=false}:Props):React.JSX.Element {
  const [periodo,setPeriodo]=useState<30|90|0>(30)
  const hoje=Math.floor(agora/86400000)*86400000
  const dados=pontos.map(p=>({...p,instante:Date.parse(p.data+'T00:00:00Z')})).filter(p=>Number.isFinite(p.instante)&&(periodo===0||p.instante>=hoje-(periodo-1)*86400000))
  const conhecidos=dados.filter(p=>p.valor!==null)
  const inicio=dados[0]?.instante??hoje
  const fim=dados.at(-1)?.instante??hoje
  const dominio:[number,number]=inicio===fim?[inicio-86400000,fim+86400000]:[inicio,fim]
  return <section className={'carteira-grafico '+classe} aria-label={titulo}>
    <div className="carteira-cabecalho"><h4>{titulo}</h4><div className="graficos-abas" role="group" aria-label={'Período de '+titulo}>
      {([30,90,0] as const).map(p=><button key={p} type="button" className={periodo===p?'ativo':''} aria-pressed={periodo===p} onClick={():void=>setPeriodo(p)}>{p===0?'Tudo':p+' dias'}</button>)}
    </div></div>
    {carregando?<p role="status" className="carteira-grafico-vazio">Carregando histórico…</p>:!conhecidos.length?<p className="carteira-grafico-vazio">{dados.length?'Não há valores completos neste período.':'Ainda não há observações neste período. O histórico cresce conforme você utiliza a carteira.'}</p>:<div className="carteira-grafico-area">
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <LineChart data={dados} margin={{top:12,right:14,bottom:4,left:4}} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--border-color)" strokeDasharray="3 3"/>
          <XAxis type="number" dataKey="instante" domain={dominio} tickFormatter={dataCurta} tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false} tickCount={5}/>
          <YAxis width={94} tickFormatter={(v:number):string=>v.toLocaleString('pt-BR',{maximumFractionDigits:2})} tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false} domain={['auto','auto']}/>
          <Tooltip labelFormatter={(v):string=>dataCompleta(Number(v))} formatter={(v):string=>typeof v==='number'?formatar(v):'Indisponível'} contentStyle={{background:'var(--surface)',border:'1px solid var(--border-color)',borderRadius:8,color:'var(--text)'}} labelStyle={{color:'var(--muted)'}} itemStyle={{color:'var(--text)'}}/>
          <Line type="linear" dataKey="valor" name={titulo} stroke="var(--carteira-linha)" strokeWidth={2} dot={{r:3,fill:'var(--carteira-linha)',strokeWidth:0}} activeDot={{r:5}} connectNulls={false} isAnimationActive={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>}
    {conhecidos.length===1&&<p className="invest-detalhe">Uma observação disponível. Novos dias de registro formarão a linha de evolução.</p>}
    <p className="invest-detalhe">{descricao}</p>
    {dados.length>0&&<details className="carteira-dados-grafico"><summary>Consultar dados registrados ({dados.length})</summary><div className="invest-historico"><table><thead><tr><th>Data</th><th>Valor em reais</th></tr></thead><tbody>{dados.map(p=><tr key={p.data}><td>{dataCompleta(p.instante)}</td><td>{p.valor===null?'Indisponível':formatar(p.valor)}</td></tr>)}</tbody></table></div></details>}
  </section>
}
