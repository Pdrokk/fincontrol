import { useState } from 'react'
import { X } from 'lucide-react'
import type { Operacao, Posicao } from '../../../main/investimentos'
import { preverOperacao, type PreviaOperacao } from '../utils/previaOperacao'
import Feedback from './Feedback'

type Conta = Awaited<ReturnType<typeof window.fincontrol.listarContas>>[number]
interface Props {
  ativo: Posicao
  tipo: Operacao['tipo']
  contas: Conta[]
  ocupado: boolean
  erro: string
  onCancelar: () => void
  onConfirmar: (dados: Operacao) => void
}
const moeda = (n: number): string =>
  (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const qtd = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })
const campo = (f: FormData, nome: string): string => String(f.get(nome) ?? '')
const centavos = (f: FormData, nome: string): number => Math.round(Number(campo(f, nome)) * 100)

export default function FormularioOperacao({
  ativo,
  tipo,
  contas,
  ocupado,
  erro,
  onCancelar,
  onConfirmar
}: Props): React.JSX.Element {
  const [previa, setPrevia] = useState<PreviaOperacao | null>(null)
  const titulo = tipo === 'compra' ? 'Comprar' : tipo === 'venda' ? 'Vender' : 'Registrar provento'
  const hoje = new Date().toLocaleDateString('sv-SE')
  function ler(form: HTMLFormElement): { dados: Operacao; previa: PreviaOperacao } {
    const f = new FormData(form)
    const dados: Operacao = {
      ativoId: ativo.id,
      contaId: campo(f, 'conta'),
      tipo,
      quantidade: tipo === 'provento' ? 0 : Number(campo(f, 'quantidade')),
      valorCentavos: centavos(f, 'valor'),
      taxasCentavos: centavos(f, 'taxas'),
      data: campo(f, 'data')
    }
    const conta = contas.find((c) => c.id === dados.contaId)
    const p = preverOperacao(
      tipo,
      dados.valorCentavos,
      dados.taxasCentavos,
      dados.quantidade,
      ativo.quantidade,
      conta?.saldoAtualCentavos
    )
    return { dados, previa: p }
  }
  return (
    <section
      className="carteira-edicao carteira-operacao"
      aria-labelledby="titulo-operacao"
      aria-busy={ocupado}
    >
      <div className="carteira-cabecalho">
        <h3 id="titulo-operacao">
          {titulo} {ativo.codigo}
        </h3>
        <button
          type="button"
          className="botao-secundario carteira-editar"
          disabled={ocupado}
          aria-label="Cancelar operação"
          onClick={onCancelar}
        >
          <X size={17} />
        </button>
      </div>
      <p className="invest-detalhe">
        Disponível: {qtd(ativo.quantidade)} un.  {'·'}
        {tipo === 'compra' ? 'Debita a conta selecionada.' : 'Credita a conta selecionada.'} Nenhuma
        ordem é enviada à corretora.
      </p>
      <Feedback mensagem={erro} tipo="erro" />
      <form
        className="formulario"
        onInput={(e): void => setPrevia(ler(e.currentTarget).previa)}
        onChange={(e): void => setPrevia(ler(e.currentTarget).previa)}
        onSubmit={(e): void => {
          e.preventDefault()
          if (ocupado) return
          const leitura = ler(e.currentTarget)
          setPrevia(leitura.previa)
          if (!leitura.previa.erro && leitura.dados.contaId) onConfirmar(leitura.dados)
        }}
      >
        <label>
          Conta bancária
          <select name="conta" required>
            <option value="">Selecione</option>
            {contas.map((c) => (
              <option value={c.id} key={c.id}>
                {c.banco} · {c.nome} ({moeda(c.saldoAtualCentavos)})
              </option>
            ))}
          </select>
        </label>
        {tipo !== 'provento' && (
          <label>
            Quantidade
            <input
              name="quantidade"
              type="number"
              required
              step=".00000001"
              min=".00000001"
              max={tipo === 'venda' ? ativo.quantidade : 10000}
            />
          </label>
        )}
        <label>
          Valor bruto total (R$)
          <input name="valor" type="number" required step=".01" min=".01" max="10000000000" />
        </label>
        <label>
          Taxas (R$)
          <input
            name="taxas"
            type="number"
            required
            step=".01"
            min="0"
            max="10000000000"
            defaultValue="0"
          />
        </label>
        <label>
          Data
          <input name="data" type="date" defaultValue={hoje} max={hoje} required />
        </label>
        <div className="carteira-previa" aria-live="polite" aria-atomic="true">
          <strong>Impacto da operação</strong>
          {previa?.caixa != null && (
            <dl>
              <div>
                <dt>{tipo === 'compra' ? 'Total a debitar' : 'Líquido a receber'}</dt>
                <dd className="previa-caixa">{moeda(Math.abs(previa.caixa))}</dd>
              </div>
              <div>
                <dt>Quantidade após a operação</dt>
                <dd>{previa.restante === null ? '—' : qtd(previa.restante)}</dd>
              </div>
            </dl>
          )}
          {previa?.erro ? (
            <p>{previa.erro}</p>
          ) : previa?.caixa == null ? (
            <p>Preencha os valores para conferir o impacto antes de confirmar.</p>
          ) : (
            <p>Prévia local. A operação será validada novamente ao salvar.</p>
          )}
        </div>
        <button className="botao-primario" type="submit" disabled={ocupado || !contas.length}>
          {ocupado ? 'Processando…' : 'Confirmar ' + tipo}
        </button>
      </form>
      {!contas.length && <p>Cadastre uma conta bancária antes de registrar a operação.</p>}
    </section>
  )
}
