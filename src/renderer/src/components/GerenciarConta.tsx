import { confirmarFinControl } from '../utils/dialogos'
import { useState } from 'react'
import { Save, SlidersHorizontal, CirclePlus, X } from 'lucide-react'
import { corBanco } from '../utils/coresBancos'
import Feedback from './Feedback'

type TipoConta = 'corrente' | 'poupanca' | 'salario' | 'dinheiro' | 'outra'
interface Conta {
  id: string
  banco: string
  nome: string
  tipo: TipoConta
  cor: string
  saldoInicialCentavos: number
  saldoAtualCentavos: number
}
type Modo = 'editar' | 'entrada' | 'ajuste'
interface Props {
  conta: Conta
  modo: Modo
  onFechar: () => void
  onAtualizar: () => Promise<void>
}
const tipos: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  salario: 'Conta salário',
  dinheiro: 'Dinheiro',
  outra: 'Outra conta'
}
function centavos(texto: string): number | null {
  const s = texto.trim()
  if (!/^\d+([,.]\d{1,2})?$/.test(s)) return null
  const [reais, dec = ''] = s.replace(',', '.').split('.')
  const n = Number(reais) * 100 + Number(dec.padEnd(2, '0'))
  return Number.isSafeInteger(n) ? n : null
}
function moeda(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100)
}
function hoje(): string {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

export default function GerenciarConta({ conta, modo, onFechar, onAtualizar }: Props): React.JSX.Element {
  const [banco, setBanco] = useState(conta.banco)
  const [nome, setNome] = useState(conta.nome)
  const [tipo, setTipo] = useState<TipoConta>(conta.tipo)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [data, setData] = useState(hoje)
  const [categoria, setCategoria] = useState('Outros')
  const [ocupado, setOcupado] = useState(false)
  const [erroOperacao, setErroOperacao] = useState('')

  async function enviar(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (ocupado) return
    try {
      setErroOperacao('')
      setOcupado(true)
      if (modo === 'editar') {
        await window.fincontrol.editarConta(conta.id, {
          banco: banco.trim(), nome: nome.trim(), tipo, cor: corBanco(banco)
        })
      } else if (modo === 'entrada') {
        const valorCentavos = centavos(valor)
        if (!valorCentavos || valorCentavos <= 0) throw new Error('Informe uma entrada maior que zero.')
        if (motivo.trim().length < 3) throw new Error('Informe a origem do dinheiro.')
        await window.fincontrol.salvarTransacao({
          contaId: conta.id,
          descricao: motivo.trim(),
          categoria,
          tipo: 'receita',
          valorCentavos,
          data
        })
      } else {
        const saldoDesejadoCentavos = centavos(valor)
        if (saldoDesejadoCentavos === null) throw new Error('Saldo inválido.')
        if (saldoDesejadoCentavos === conta.saldoAtualCentavos)
          throw new Error('O novo saldo precisa ser diferente do atual.')
        if (!await confirmarFinControl(
          `Ajustar saldo de ${moeda(conta.saldoAtualCentavos)} para ${moeda(saldoDesejadoCentavos)}? Isso NÃO será uma receita ou despesa.`
        )) return
        await window.fincontrol.ajustarSaldo({
          contaId: conta.id,
          saldoDesejadoCentavos,
          motivo: motivo.trim(),
          data
        })
      }
      await onAtualizar()
      onFechar()
    } catch (falha) {
      setErroOperacao(falha instanceof Error ? falha.message : 'Não foi possível realizar a operação.')
      console.error(falha)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="painel gerenciar-conta">
      <div className="titulo-contas">
        <div>
          <h3>{modo === 'editar' ? 'Editar conta' : modo === 'entrada' ? 'Adicionar dinheiro' : 'Corrigir saldo da conta'}</h3>
          <p>{conta.banco} · {conta.nome} — saldo atual {moeda(conta.saldoAtualCentavos)}</p>
        </div>
        <button type="button" className="botao-limpar" onClick={onFechar} aria-label="Fechar edição"><X size={18} /></button>
      </div>

      <Feedback mensagem={erroOperacao} tipo="erro" />
      <form className="formulario" onSubmit={(e): void => { void enviar(e) }}>
        {modo === 'editar' ? (
          <>
            <label>Banco ou instituição
              <input value={banco} maxLength={100} required onChange={(e): void => setBanco(e.target.value)} />
            </label>
            <label>Nome da conta
              <input value={nome} maxLength={100} required onChange={(e): void => setNome(e.target.value)} />
            </label>
            <label>Tipo da conta
              <select value={tipo} onChange={(e): void => setTipo(e.target.value as TipoConta)}>
                {Object.entries(tipos).map(([id, rotulo]) => <option value={id} key={id}>{rotulo}</option>)}
              </select>
            </label>
            <p>O saldo inicial é mantido para preservar o histórico. Use Corrigir saldo para reconciliar o valor atual.</p>
          </>
        ) : (
          <>
            <label>{modo === 'entrada' ? 'Valor da entrada (R$)' : 'Novo saldo desejado (R$)'}
              <input type="text" inputMode="decimal" value={valor} onChange={(e): void => setValor(e.target.value)}
                placeholder={modo === 'entrada' ? '500,00' : (conta.saldoAtualCentavos / 100).toFixed(2).replace('.', ',')} required />
            </label>
            <label>{modo === 'entrada' ? 'Origem do dinheiro' : 'Motivo da correção'}
              <input value={motivo} maxLength={200} minLength={3} required
                onChange={(e): void => setMotivo(e.target.value)}
                placeholder={modo === 'entrada' ? 'Ex: salário recebido, depósito em espécie' : 'Ex: conciliação com extrato bancário'} />
            </label>
            {modo === 'entrada' && (
              <label>Categoria da receita
                <select value={categoria} onChange={(e): void => setCategoria(e.target.value)}>
                  {['Salário', 'Freelance', 'Investimentos', 'Outros'].map((x) =>
                    <option value={x} key={x}>{x}</option>)}
                </select>
              </label>
            )}
            <label>Data
              <input type="date" value={data} onChange={(e): void => setData(e.target.value)} required />
            </label>
            <p>
              {modo === 'entrada'
                ? 'Registra uma receita real na conta. Atualiza saldo e relatórios financeiros.'
                : 'Reconciliação: altera o saldo calculado, mas não cria receita nem despesa nos relatórios.'}
            </p>
          </>
        )}
        <button className="botao-primario" type="submit" disabled={ocupado}>
          {modo === 'editar' ? <Save size={17} /> : modo === 'entrada' ? <CirclePlus size={17} /> : <SlidersHorizontal size={17} />}
          {' '}{ocupado ? 'Salvando...' : modo === 'editar' ? 'Salvar alterações' : modo === 'entrada' ? 'Adicionar à conta' : 'Confirmar correção'}
        </button>
      </form>
    </section>
  )
}
