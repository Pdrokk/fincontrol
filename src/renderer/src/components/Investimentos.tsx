import { confirmarFinControl } from '../utils/dialogos'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TrendingUp,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Landmark,
  Building2,
  Wallet,
  ChartNoAxesCombined,
  RefreshCw,
  Pencil,
  X,
  Trash2,
  CheckCircle2,
  Search
} from 'lucide-react'
import Feedback from './Feedback'
import ComposicaoCarteira from './ComposicaoCarteira'
import FichaAtivo from './FichaAtivo'
import HistoricoOperacoes from './HistoricoOperacoes'
import { indexarAtivos } from '../utils/historicoInvest'
import FormularioOperacao from './FormularioOperacao'
import type { Operacao, Posicao, Movimento } from '../../../main/investimentos'

type Conta = Awaited<ReturnType<typeof window.fincontrol.listarContas>>[number]
type Modo = 'mercado' | 'manual'
type AcaoCarteira = { id: string; tipo: Operacao['tipo'] }
const tipos = ['Ação', 'ETF', 'FII', 'Moeda', 'Cripto', 'Renda fixa', 'Outro']
const tiposMercado = ['Ação', 'ETF', 'FII', 'Moeda']
const icones = {
  Ação: TrendingUp,
  ETF: ChartNoAxesCombined,
  FII: Building2,
  Moeda: Coins,
  Cripto: Coins,
  'Renda fixa': Landmark,
  Outro: Wallet
}
const moeda = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)
const preco = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })
const qtd = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })
const campo = (f: FormData, nome: string): string => String(f.get(nome) ?? '')
const centavos = (f: FormData, nome: string): number => Math.round(Number(campo(f, nome)) * 100)
const hora = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
type AvisoCotacao = { texto: string; persistente: boolean }
function resumoCotacoes(
  r: Awaited<ReturnType<typeof window.fincontrol.sincronizarCotacoes>>
): AvisoCotacao | null {
  const sucesso =
    r.atualizadas === 1
      ? '1 posição atualizada.'
      : r.atualizadas > 1
        ? r.atualizadas + ' posições atualizadas.'
        : ''
  if (r.falhas.length)
    return {
      texto: [sucesso, ...r.falhas.map((f) => f.codigo + ': ' + f.motivo)]
        .filter(Boolean)
        .join(' · '),
      persistente: true
    }
  return sucesso ? { texto: sucesso, persistente: false } : null
}

export default function Investimentos({
  onAlteracao
}: {
  onAlteracao: () => void
}): React.JSX.Element {
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [contas, setContas] = useState<Conta[]>([])
  const [modo, setModo] = useState<Modo>('mercado')
  const [tipoCadastro, setTipoCadastro] = useState('Ação')
  const [operacao, setOperacao] = useState<AcaoCarteira | null>(null)
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [configurando, setConfigurando] = useState(false)
  const [chaveAtiva, setChaveAtiva] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [statusCotacoes, setStatusCotacoes] = useState<AvisoCotacao | null>(null)
  const [mostrarZeradas, setMostrarZeradas] = useState(false)
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const trava = useRef(false)
  const travaSincronizacao = useRef(false)
  const [recarregarNecessario, setRecarregarNecessario] = useState(false)
  const bloqueioRecarga = useRef(false)
  const [falhaCarga, setFalhaCarga] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(Date.now()), 60_000)
    return (): void => window.clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!mensagem) return
    const timeout = window.setTimeout(() => setMensagem(''), 4500)
    return (): void => window.clearTimeout(timeout)
  }, [mensagem])
  useEffect(() => {
    if (!statusCotacoes || statusCotacoes.persistente) return
    const timeout = window.setTimeout(() => setStatusCotacoes(null), 4500)
    return (): void => window.clearTimeout(timeout)
  }, [statusCotacoes])

  useEffect(() => {
    if (!operacao) return
    const painel = document.querySelector('.carteira-operacao')
    painel?.scrollIntoView({ block: 'nearest' })
    painel?.querySelector<HTMLSelectElement>('select[name="conta"]')?.focus({ preventScroll: true })
  }, [operacao])

  async function carregar(): Promise<void> {
    const [dados, bancos, chave] = await Promise.all([
      window.fincontrol.listarInvestimentos(),
      window.fincontrol.listarContas(),
      window.fincontrol.chaveCotacoesConfigurada()
    ])
    setPosicoes(dados.posicoes)
    setMovimentos(dados.movimentos)
    setContas(bancos)
    setChaveAtiva(chave)
  }
  useEffect(() => {
    let ativo = true
    void Promise.all([
      window.fincontrol.listarInvestimentos(),
      window.fincontrol.listarContas(),
      window.fincontrol.chaveCotacoesConfigurada()
    ])
      .then(async ([dados, bancos, chave]) => {
        if (!ativo) return
        setPosicoes(dados.posicoes)
        setMovimentos(dados.movimentos)
        setContas(bancos)
        setChaveAtiva(chave)
        setCarregando(false)
        if (!dados.posicoes.some((a) => !a.arquivado && a.quantidadeMercado !== null)) return
        travaSincronizacao.current = true
        setSincronizando(true)
        const r = await window.fincontrol.sincronizarCotacoes(false)
        const novos = await window.fincontrol.listarInvestimentos()
        if (ativo) {
          setPosicoes(novos.posicoes)
          setMovimentos(novos.movimentos)
          setStatusCotacoes(resumoCotacoes(r))
        }
      })
      .catch(() => {
        if (ativo) {
          setFalhaCarga(true)
          bloqueioRecarga.current = true
          setRecarregarNecessario(true)
        }
      })
      .finally(() => {
        if (ativo) {
          travaSincronizacao.current = false
          setCarregando(false)
          setSincronizando(false)
        }
      })
    return (): void => {
      ativo = false
    }
  }, [])
  async function executar(
    acao: () => Promise<unknown>,
    sucesso: string,
    form?: HTMLFormElement
  ): Promise<void> {
    if (
      trava.current ||
      travaSincronizacao.current ||
      bloqueioRecarga.current ||
      ocupado ||
      sincronizando ||
      carregando
    )
      return
    trava.current = true
    setOcupado(true)
    setErro('')
    setMensagem('')
    try {
      await acao()
      form?.reset()
      onAlteracao()
      setMensagem(sucesso)
      try {
        await carregar()
      } catch {
        bloqueioRecarga.current = true
        setRecarregarNecessario(true)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.')
    } finally {
      trava.current = false
      setOcupado(false)
    }
  }
  async function tentarRecarregar(): Promise<void> {
    if (trava.current || travaSincronizacao.current || sincronizando) return
    trava.current = true
    setOcupado(true)
    try {
      await carregar()
      bloqueioRecarga.current = false
      setRecarregarNecessario(false)
      setFalhaCarga(false)
      setErro('')
    } catch {
      setRecarregarNecessario(true)
    } finally {
      trava.current = false
      setOcupado(false)
    }
  }
  async function sincronizar(forcar = true): Promise<void> {
    if (travaSincronizacao.current || bloqueioRecarga.current || (forcar && trava.current)) return
    travaSincronizacao.current = true
    setSincronizando(true)
    setStatusCotacoes(null)
    try {
      const r = await window.fincontrol.sincronizarCotacoes(forcar)
      await carregar()
      setStatusCotacoes(
        resumoCotacoes(r) ?? {
          texto: 'Nenhuma nova cotação recebida. Valores anteriores mantidos.',
          persistente: false
        }
      )
    } catch {
      setStatusCotacoes({
        texto: 'Não foi possível atualizar. Os últimos valores foram preservados.',
        persistente: true
      })
    } finally {
      travaSincronizacao.current = false
      setSincronizando(false)
    }
  }
  const valor = posicoes.reduce((n, a) => n + (a.valorAtualCentavos ?? 0), 0)
  const semCotacao = posicoes.filter(
    (a) => a.quantidade > 0 && a.valorAtualCentavos === null
  ).length
  const ativas = useMemo(() => posicoes.filter((a) => !a.arquivado), [posicoes])
  const indiceAtivos = useMemo(() => indexarAtivos(posicoes), [posicoes])
  const arquivadas = posicoes.filter((a) => a.arquivado)
  const zeradas = ativas.filter(
    (a) => a.valorAtualCentavos === 0 && (a.valorInformadoCentavos !== null || a.quantidade === 0)
  )
  const idsZeradas = new Set(zeradas.map((a) => a.id))
  const baseVisivel = [
    ...(mostrarZeradas ? ativas : ativas.filter((a) => !idsZeradas.has(a.id))),
    ...(mostrarArquivadas ? arquivadas : [])
  ]
  const normalizar = (texto: string): string =>
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  const consulta = normalizar(busca)
  const visiveis = baseVisivel.filter(
    (a) =>
      (!categoriaFiltro || a.tipo === categoriaFiltro) &&
      (!consulta || normalizar([a.codigo, a.nome, a.instituicao].join(' ')).includes(consulta))
  )
  const mercado = ativas.filter((a) => a.quantidadeMercado !== null)
  const ativosComHistorico = useMemo(() => new Set(movimentos.map((m) => m.ativoId)), [movimentos])
  const cotacoesAntigas = mercado.filter(
    (a) => a.cotacaoEm && agora - Date.parse(a.cotacaoEm) > 72 * 3600000
  ).length
  const ficha = fichaId ? indiceAtivos.get(fichaId) : undefined
  const movimentosFicha = useMemo(
    () => (fichaId ? movimentos.filter((m) => m.ativoId === fichaId) : []),
    [movimentos, fichaId]
  )
  const ativoOperacao = ativas.find((a) => a.id === operacao?.id)
  return (
    <div className="investimentos carteira-v3">
      {!operacao && <Feedback mensagem={erro} tipo="erro" />}
      {recarregarNecessario && (
        <div className="carteira-aviso carteira-recarga" role="status">
          <p>
            {falhaCarga
              ? 'Não foi possível carregar a carteira. Nenhum saldo será considerado atualizado.'
              : 'Os dados não puderam ser recarregados após a operação. Não repita o registro; recarregue a carteira antes de continuar.'}
          </p>
          <button
            type="button"
            className="botao-secundario"
            disabled={ocupado || sincronizando}
            onClick={(): void => {
              void tentarRecarregar()
            }}
          >
            Recarregar carteira
          </button>
        </div>
      )}
      <div className="carteira-notificacoes" role="status" aria-live="polite" aria-atomic="true">
        {mensagem && (
          <div className="carteira-toast">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{mensagem}</span>
          </div>
        )}
        {statusCotacoes && !statusCotacoes.persistente && (
          <div className="carteira-toast carteira-toast--informacao">
            <RefreshCw size={16} aria-hidden="true" />
            <span>{statusCotacoes.texto}</span>
          </div>
        )}
      </div>
      <section className="painel carteira-painel">
        <header className="carteira-cabecalho">
          <div>
            <h3>Minha carteira</h3>
            <span className="invest-detalhe">Acompanhe o valor dos seus ativos em reais.</span>
          </div>
          <div className="carteira-acoes">
            <button
              className="botao-secundario"
              type="button"
              disabled={
                carregando || sincronizando || ocupado || recarregarNecessario || !mercado.length
              }
              onClick={(): void => {
                void sincronizar()
              }}
            >
              <RefreshCw size={16} />
              {sincronizando ? 'Atualizando…' : 'Atualizar cotações'}
            </button>
            <button
              className="botao-primario"
              type="button"
              aria-expanded={formAberto}
              onClick={(): void => setFormAberto((v) => !v)}
            >
              <Plus size={17} />
              Adicionar ativo
            </button>
          </div>
        </header>
        <div className="carteira-balanco">
          <div>
            <span>Patrimônio em investimentos {semCotacao ? '(parcial)' : ''}</span>
            <strong>
              {carregando ||
              recarregarNecessario ||
              (semCotacao > 0 && posicoes.every((a) => a.valorAtualCentavos === null))
                ? '—'
                : moeda(valor)}
            </strong>
            <small>
              {ativas.length - zeradas.length}{' '}
              {ativas.length - zeradas.length === 1 ? 'posição ativa' : 'posições ativas'} · {' '}
              {semCotacao} sem cotação
              {cotacoesAntigas ? ' · ' + cotacoesAntigas + ' com cotação antiga' : ''}
            </small>
          </div>
          {!carregando && !recarregarNecessario && <ComposicaoCarteira posicoes={ativas} />}
        </div>
        <div className="carteira-fonte">
          <span>BRAPI · BCB PTAX · Dados com atraso; últimos valores disponíveis offline.</span>
          <button
            className="botao-texto"
            type="button"
            onClick={(): void => setConfigurando((v) => !v)}
            aria-expanded={configurando}
          >
            {chaveAtiva ? 'Gerenciar chave BRAPI' : 'Configurar fonte de dados'}
          </button>
        </div>
        {configurando && (
          <form
            className="carteira-edicao formulario"
            onSubmit={(e): void => {
              e.preventDefault()
              const f = e.currentTarget
              const dados = new FormData(f)
              void executar(
                () => window.fincontrol.configurarChaveCotacoes(campo(dados, 'chave')),
                'Chave configurada neste dispositivo.',
                f
              )
            }}
          >
            <p>
              Obtenha uma chave gratuita em brapi.dev/dashboard. PETR4, VALE3, MGLU3 e ITUB4 podem
              funcionar sem chave. A chave é protegida localmente; não faz parte do backup.
            </p>
            <label>
              Chave BRAPI
              <input type="password" name="chave" autoComplete="off" maxLength={512} required />
            </label>
            <button
              type="submit"
              className="botao-primario"
              disabled={ocupado || sincronizando || recarregarNecessario}
            >
              Salvar chave
            </button>
            {chaveAtiva && (
              <button
                type="button"
                className="botao-secundario"
                disabled={ocupado || sincronizando || recarregarNecessario}
                onClick={(): void => {
                  void executar(
                    () => window.fincontrol.configurarChaveCotacoes(''),
                    'Chave local removida.'
                  )
                }}
              >
                Remover chave local
              </button>
            )}
          </form>
        )}
        {statusCotacoes?.persistente && (
          <div className="carteira-aviso">
            <Feedback mensagem={statusCotacoes.texto} tipo="informacao" />
            <button
              className="botao-secundario carteira-editar"
              type="button"
              aria-label="Dispensar aviso de cotação"
              onClick={(): void => setStatusCotacoes(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <section className="carteira-edicao" hidden={!formAberto}>
          <div className="carteira-cabecalho">
            <h3>Adicionar ativo</h3>
            <button
              type="button"
              className="botao-secundario"
              aria-label="Fechar cadastro"
              onClick={(): void => setFormAberto(false)}
            >
              <X size={17} />
            </button>
          </div>
          <form
            className="formulario"
            onSubmit={(e): void => {
              e.preventDefault()
              const form = e.currentTarget
              const f = new FormData(form)
              void executar(
                async () => {
                  await window.fincontrol.cadastrarAtivo({
                    codigo: campo(f, 'codigo'),
                    nome: campo(f, 'nome') || campo(f, 'codigo'),
                    tipo: tipoCadastro,
                    instituicao: campo(f, 'instituicao'),
                    quantidadeMercado:
                      modo === 'mercado' ? Number(campo(f, 'quantidadeInicial')) : null,
                    quantidadeInicial:
                      modo === 'manual' ? Number(campo(f, 'quantidadeInicial')) : 0,
                    cotacaoInicialCentavos:
                      modo === 'manual' && campo(f, 'cotacaoInicial')
                        ? centavos(f, 'cotacaoInicial')
                        : null
                  })
                  setFormAberto(false)
                  setMostrarZeradas(true)
                  if (modo === 'mercado') await sincronizar(false)
                },
                'Ativo adicionado à carteira.',
                form
              )
            }}
          >
            <label>
              Categoria
              <select
                value={tipoCadastro}
                onChange={(e): void => {
                  const t = e.target.value
                  setTipoCadastro(t)
                  setModo(tiposMercado.includes(t) ? 'mercado' : 'manual')
                }}
              >
                {tipos.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Cotação
              <select value={modo} onChange={(e): void => setModo(e.target.value as Modo)}>
                {tiposMercado.includes(tipoCadastro) && <option value="mercado">Automática</option>}
                <option value="manual">Manual</option>
              </select>
            </label>
            <label>
              Ativo / código
              <input
                name="codigo"
                required
                maxLength={30}
                placeholder={
                  modo === 'mercado'
                    ? tipoCadastro === 'Moeda'
                      ? 'USD ou EUR'
                      : 'PETR4, BOVA11, HGLG11'
                    : 'Nome ou código'
                }
              />
            </label>
            <label>
              Quantidade que possui
              <input
                name="quantidadeInicial"
                type="number"
                min="0"
                max="10000"
                step=".00000001"
                defaultValue="0"
                required
              />
            </label>
            {modo === 'manual' && (
              <label>
                Cotação por unidade (R$)
                <input
                  name="cotacaoInicial"
                  type="number"
                  min=".01"
                  step=".01"
                  max="10000000000"
                  placeholder="Opcional"
                />
              </label>
            )}
            <label>
              Nome (opcional)
              <input name="nome" maxLength={100} />
            </label>
            <label>
              Instituição (opcional)
              <input name="instituicao" maxLength={100} />
            </label>
            <button
              className="botao-primario"
              type="submit"
              disabled={ocupado || sincronizando || carregando || recarregarNecessario}
            >
              <Plus size={17} />
              Adicionar à carteira
            </button>
          </form>
          <p className="invest-detalhe">
            O cadastro registra uma posição que você já possui, sem movimentar contas. Para uma nova
            compra ou venda, use as ações na linha do ativo.
          </p>
        </section>
        {!carregando && posicoes.length > 0 && (
          <div className="carteira-filtro">
            <h4>
              Posições <span>{visiveis.length}</span>
            </h4>
            {zeradas.length > 0 && (
              <label className="carteira-filtro-zeradas">
                <input
                  type="checkbox"
                  checked={mostrarZeradas}
                  onChange={(e): void => setMostrarZeradas(e.target.checked)}
                />{' '}
                Mostrar posições zeradas ({zeradas.length})
              </label>
            )}
            {arquivadas.length > 0 && (
              <label className="carteira-filtro-zeradas">
                <input
                  type="checkbox"
                  checked={mostrarArquivadas}
                  onChange={(e): void => setMostrarArquivadas(e.target.checked)}
                />{' '}
                Arquivadas ({arquivadas.length})
              </label>
            )}
          </div>
        )}
        {!carregando && posicoes.length > 0 && (
          <div className="carteira-busca">
            <label className="carteira-busca-campo">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar ativos"
                placeholder="Buscar por código, nome ou instituição"
                value={busca}
                onChange={(e): void => setBusca(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por categoria"
              value={categoriaFiltro}
              onChange={(e): void => setCategoriaFiltro(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {(busca || categoriaFiltro) && (
              <button
                type="button"
                className="botao-secundario"
                onClick={(): void => {
                  setBusca('')
                  setCategoriaFiltro('')
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
        {carregando ? (
          <p role="status">Carregando carteira…</p>
        ) : falhaCarga ? (
          <p className="vazio">Recarregue a carteira para consultar as posições.</p>
        ) : !posicoes.length ? (
          <div className="carteira-vazia">
            <Wallet size={28} />
            <strong>Sua carteira está vazia</strong>
            <p>Adicione um ativo pelo código e a quantidade que possui.</p>
          </div>
        ) : !visiveis.length ? (
          <div className="carteira-vazia">
            <Wallet size={28} />
            <strong>
              {busca || categoriaFiltro ? 'Nenhum ativo encontrado' : 'Nenhuma posição ativa'}
            </strong>
            <p>
              {busca || categoriaFiltro
                ? 'Altere ou limpe os filtros para consultar sua carteira.'
                : 'Marque a opção acima para consultar as posições zeradas ou adicione outro ativo.'}
            </p>
          </div>
        ) : (
          <div
            className="carteira-tabela"
            role="region"
            aria-label="Posições da carteira"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Ativo</th>
                  <th scope="col">Quantidade</th>
                  <th scope="col">Cotação (R$)</th>
                  <th scope="col">Valor da posição</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((a) => {
                  const Icone = icones[a.tipo as keyof typeof icones] ?? Wallet
                  const manual = a.valorInformadoCentavos !== null
                  const automatico = a.quantidadeMercado !== null
                  const temHistorico = ativosComHistorico.has(a.id)
                  const podeExcluir = a.quantidade === 0 && (a.valorInformadoCentavos ?? 0) === 0
                  const editarQuantidade = automatico || manual
                  const valorEdicao = manual
                    ? ''
                    : automatico
                      ? a.quantidade
                      : a.cotacaoCentavos === null
                        ? ''
                        : a.cotacaoCentavos / 100
                  return (
                    <tr className="invest-ativo" key={a.id}>
                      <th scope="row">
                        <span className="carteira-ativo-nome">
                          <span className="carteira-icone-ativo" data-categoria={a.tipo}>
                            <Icone size={19} aria-hidden="true" />
                          </span>
                          <span>
                            <button
                              type="button"
                              className="carteira-link-ativo"
                              aria-label={
                                (fichaId === a.id ? 'Fechar ficha de ' : 'Abrir ficha de ') +
                                a.codigo
                              }
                              aria-expanded={fichaId === a.id}
                              onClick={(): void => setFichaId((v) => (v === a.id ? null : a.id))}
                            >
                              {a.codigo}
                            </button>
                            <small>
                              {a.tipo}
                              {a.instituicao ? ' · ' + a.instituicao : ''}
                              {a.arquivado ? ' · Arquivado' : ''}
                            </small>
                          </span>
                        </span>
                      </th>
                      <td>{manual ? 'A definir' : qtd(a.quantidade)}</td>
                      <td>
                        {automatico
                          ? a.precoMercado === null
                            ? '—'
                            : preco(a.precoMercado)
                          : manual
                            ? '—'
                            : a.cotacaoCentavos === null
                              ? '—'
                              : moeda(a.cotacaoCentavos)}
                        <small>
                          {automatico
                            ? a.cotacaoEm
                              ? a.fonteCotacao +
                                ' · ' +
                                hora(a.cotacaoEm) +
                                (agora - Date.parse(a.cotacaoEm) > 72 * 3600000 ? ' · Antiga' : '')
                              : 'Aguardando cotação'
                            : manual
                              ? 'Valor total anterior'
                              : 'Cotação manual'}
                        </small>
                      </td>
                      <td>
                        <strong>
                          {a.valorAtualCentavos === null
                            ? 'Indisponível'
                            : moeda(a.valorAtualCentavos)}
                        </strong>
                        {!manual && a.quantidade > 0 && (
                          <small>
                            {a.custoConhecido
                              ? 'Preço médio: ' + moeda(a.custoCentavos / a.quantidade)
                              : 'Custo inicial não informado'}
                          </small>
                        )}
                      </td>
                      <td>
                        {a.arquivado ? (
                          <button
                            className="botao-secundario"
                            type="button"
                            disabled={ocupado || sincronizando || recarregarNecessario}
                            onClick={(): void => {
                              void executar(async () => {
                                await window.fincontrol.reativarAtivoInvestimento(a.id)
                                setMostrarZeradas(true)
                              }, 'Ativo reativado.')
                            }}
                            aria-label={'Reativar ' + a.codigo}
                          >
                            Reativar
                          </button>
                        ) : editando === a.id ? (
                          <form
                            className="invest-cotacao carteira-editor"
                            onSubmit={(e): void => {
                              e.preventDefault()
                              const f = new FormData(e.currentTarget)
                              void executar(async () => {
                                if (editarQuantidade)
                                  await window.fincontrol.atualizarQuantidadeMercado(
                                    a.id,
                                    Number(campo(f, 'edicao'))
                                  )
                                else
                                  await window.fincontrol.atualizarCotacao(
                                    a.id,
                                    centavos(f, 'edicao')
                                  )
                                setEditando(null)
                              }, 'Posição atualizada.')
                            }}
                          >
                            <input
                              aria-label={
                                editarQuantidade
                                  ? 'Quantidade de ' + a.codigo
                                  : 'Cotação de ' + a.codigo
                              }
                              name="edicao"
                              type="number"
                              min={editarQuantidade ? '.00000001' : '.01'}
                              step={editarQuantidade ? '.00000001' : '.01'}
                              defaultValue={valorEdicao ?? ''}
                              required
                            />
                            <button
                              type="submit"
                              className="botao-primario"
                              disabled={ocupado || sincronizando || recarregarNecessario}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="botao-secundario"
                              onClick={(): void => setEditando(null)}
                              aria-label="Cancelar edição"
                            >
                              <X size={16} />
                            </button>
                          </form>
                        ) : (
                          <div className="carteira-acoes-linha">
                            {!manual && (
                              <>
                                <button
                                  className="botao-secundario"
                                  type="button"
                                  disabled={ocupado || sincronizando || recarregarNecessario}
                                  aria-label={'Comprar ' + a.codigo}
                                  onClick={(): void => {
                                    setOperacao({ id: a.id, tipo: 'compra' })
                                    setEditando(null)
                                  }}
                                >
                                  <ArrowDownLeft size={16} />
                                  Comprar
                                </button>
                                {a.quantidade > 0 && (
                                  <button
                                    className="botao-secundario"
                                    type="button"
                                    disabled={ocupado || sincronizando || recarregarNecessario}
                                    aria-label={'Vender ' + a.codigo}
                                    onClick={(): void => {
                                      setOperacao({ id: a.id, tipo: 'venda' })
                                      setEditando(null)
                                    }}
                                  >
                                    <ArrowUpRight size={16} />
                                    Vender
                                  </button>
                                )}
                                {a.quantidade > 0 && (
                                  <button
                                    className="botao-secundario carteira-editar"
                                    type="button"
                                    disabled={ocupado || sincronizando || recarregarNecessario}
                                    aria-label={'Registrar provento ' + a.codigo}
                                    title="Registrar provento"
                                    onClick={(): void => {
                                      setOperacao({ id: a.id, tipo: 'provento' })
                                      setEditando(null)
                                    }}
                                  >
                                    <Coins size={16} />
                                  </button>
                                )}
                              </>
                            )}
                            {(!automatico || !temHistorico) && (
                              <button
                                className="botao-secundario carteira-editar"
                                type="button"
                                disabled={ocupado || sincronizando || recarregarNecessario}
                                onClick={(): void => {
                                  setEditando(a.id)
                                  setOperacao(null)
                                }}
                                aria-label={
                                  manual
                                    ? 'Definir quantidade de ' + a.codigo
                                    : 'Editar ' + a.codigo
                                }
                                title={
                                  manual
                                    ? 'Definir quantidade da posição anterior; cotação unitária será calculada'
                                    : 'Editar posição inicial ou cotação manual'
                                }
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {podeExcluir && (
                              <button
                                className="botao-secundario carteira-editar carteira-remover"
                                type="button"
                                disabled={ocupado || sincronizando || recarregarNecessario}
                                aria-label={'Remover ' + a.codigo}
                                title={'Remover ' + a.codigo}
                                onClick={(): void => {
                                  void (async () => {
                                    if (
                                      await confirmarFinControl(
                                        'A posição ' +
                                          a.codigo +
                                          ' será removida da carteira. O histórico e os saldos serão preservados.',
                                        'Remover ativo',
                                        'Remover',
                                        true
                                      )
                                    )
                                      await executar(async () => {
                                        await window.fincontrol.excluirAtivoInvestimento(a.id)
                                        if (operacao?.id === a.id) setOperacao(null)
                                      }, 'Ativo removido.')
                                  })()
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {ficha && (
          <FichaAtivo
            key={ficha.id}
            ativo={ficha}
            movimentos={movimentosFicha}
            agora={agora}
            onFechar={(): void => setFichaId(null)}
          />
        )}
        {operacao && ativoOperacao && (
          <FormularioOperacao
            key={operacao.id + operacao.tipo}
            ativo={ativoOperacao}
            tipo={operacao.tipo}
            contas={contas}
            ocupado={ocupado || sincronizando || recarregarNecessario}
            erro={erro}
            onCancelar={(): void => {
              setErro('')
              setOperacao(null)
            }}
            onConfirmar={(dados): void => {
              void executar(async () => {
                await window.fincontrol.registrarInvestimento(dados)
                setMostrarZeradas(true)
                setOperacao(null)
              }, 'Operação registrada.')
            }}
          />
        )}
      </section>
      <details
        className="painel invest-avancado"
        onToggle={(e): void => setHistoricoAberto(e.currentTarget.open)}
      >
        <summary>Histórico de operações ({movimentos.length})</summary>
        {historicoAberto && <HistoricoOperacoes movimentos={movimentos} ativos={indiceAtivos} />}
      </details>
    </div>
  )
}
