---
name: FinControl
description: Controle financeiro pessoal desktop, com operação local e leitura clara.
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  focus: "#60a5fa"
  success: "#16a34a"
  error: "#dc2626"
  light-bg: "#f1f5f9"
  light-surface: "#ffffff"
  light-text: "#0f172a"
  light-muted: "#59677a"
  light-border: "#e2e8f0"
  light-sidebar: "#0f172a"
  light-input: "#ffffff"
  dark-bg: "#0b1220"
  dark-surface: "#1e293b"
  dark-text: "#f8fafc"
  dark-muted: "#94a3b8"
  dark-border: "#334155"
  dark-sidebar: "#080f1c"
  dark-input: "#273449"
  nav-active: "rgba(96, 165, 250, 0.13)"
  nav-active-text: "#bfdbfe"
typography:
  headline:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "clamp(21px, 2.4vw, 26px)"
    fontWeight: 650
    letterSpacing: "-0.5px"
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "13px"
  metric:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "clamp(20px, 1.8vw, 28px)"
    letterSpacing: "-0.6px"
rounded:
  field: "8px"
  secondary: "9px"
  primary: "10px"
  panel: "14px"
  dialog: "15px"
spacing:
  tight: "4px"
  inline: "8px"
  grid: "12px"
  section: "16px"
  panel: "20px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.primary}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary-light:
    backgroundColor: "{colors.light-input}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.secondary}"
    padding: "10px 14px"
  button-secondary-dark:
    backgroundColor: "{colors.dark-input}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.secondary}"
    padding: "10px 14px"
  panel-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.panel}"
  panel-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.panel}"
---

# Design System: FinControl

## Overview

**Creative North Star: "Painel financeiro de trabalho"**

Interface desktop de operação: leitura rápida de valores, ações específicas por tela e detalhes sob demanda. O conteúdo financeiro tem prioridade sobre decoração. A direção descritiva abaixo registra o sistema existente da v1.6.4; não é uma proposta de redesign.

**Key Characteristics:**
- Tema claro e escuro com superfícies neutras e ação azul.
- Menu lateral compacto, rótulos acessíveis e áreas de trabalho previsíveis.
- Valores monetários legíveis, histórico paginado e composição da carteira em rosca.

## Colors

O azul de ação (primary) identifica o comando principal, com variante hover mais escura. O azul claro (focus) identifica foco. Verde e vermelho têm funções semânticas de sucesso e erro. As cores de instituições são aproximações de identidade, não material oficial; as fatias da rosca são diferenciadas por cor e legenda.

A paleta neutra é mapeada em `src/renderer/src/assets/main.css`: `--bg`, `--surface`, `--text`, `--muted`, `--border-color`, `--sidebar-bg` e `--input-bg`. A raiz `.fincontrol[data-theme='dark']` redefine os mesmos papéis. Os valores normativos extraídos estão no frontmatter.

**The Semantic Color Rule.** Cor nunca é a única indicação de status, ativo ou resultado financeiro.

## Typography

Segoe UI com Arial e sans-serif de fallback. Cabeçalhos responsivos, valores de KPI maiores, rótulos secundários menores. Valores extensos devem quebrar linha quando necessário. Use numerais tabulares em tabelas financeiras; preserve sinais, moeda e precisão de quantidade. O tamanho de 12px aparece em informações auxiliares do dashboard; não aplique a campos principais.

## Layout

- Área de trabalho com largura máxima de 1760px; padding `clamp(18px, 2.5vw, 32px)`.
- Menu lateral fixado ao topo durante rolagem: 76px, 66px até 950px e 60px até 720px; ícones com nomes acessíveis.
- Cabeçalho com margem inferior de 24px. Ação global Nova transação apenas na Visão Geral; demais ações ficam no respectivo módulo.
- KPI: quatro colunas, duas até 1100px; intervalo de 12px. Gráficos empilham conforme o espaço.
- Formulários de duas colunas tornam-se uma coluna em janelas estreitas. Filtros de busca pertencem ao histórico, não ao cadastro.
- Carteira: valor e composição em duas colunas, uma até 900px. Rosca e legenda empilham até 1200px; no máximo seis fatias. Históricos de operações têm 25 linhas por página e o histórico geral monta somente quando aberto.
- Resoluções de teste solicitadas: 640, 768, 900, 1280, 1920 e 2560px; conferir também textos longos e ambos os temas.

## Elevation & Depth

Painéis e gráficos usam superfícies tonais, borda de 1px e, no estilo atual de painéis, ausência de sombra. O menu ativo ainda possui sombra `0 4px 12px #2563eb33` herdada de regra anterior. Diálogos usam uma camada de fundo escurecida para indicar interrupção e foco.

## Shapes

Campos com cantos de 8px; botão secundário de 9px, principal de 10px, painéis de 14px e diálogo de 15px. Evite aumentar raios por padrão. Ações secundárias de carteira têm altura mínima de 44px e ícones de edição em área de 44px.

## Components

### Buttons

Principal azul para cadastro/confirmar; secundário com fundo do campo, borda temática e texto do tema. Hover secundário troca fundo para o fundo geral e borda para o azul de foco. Estado desabilitado reduz opacidade; foco visível utiliza contorno de 2px e afastamento de 2px.

### Cards / Containers

Painéis e KPIs compartilham superfície, borda neutra e cantos de 14px. KPIs têm padding de 20px e gap interno de 10px. A informação orienta a densidade; não adicione cartões apenas para decorar.

### Inputs / Fields

Rótulos persistentes, fundo e texto do tema, borda neutra. Valores de transação aceitam entrada decimal brasileira. Formulários financeiros mantêm validação no processo principal e avisos explícitos.

### Navigation

Ícones Lucide, botão de tema no rodapé do menu, estado ativo e aria-current. Preserve a ordem da navegação e os títulos das sete páginas. Não dependa do ícone sem rótulo acessível.

### Feedback and charts

Feedback textual acessível para sucesso/erro/informação. Ações destrutivas usam diálogo temático. Gráficos de realizado e previsto são separados; valores podem ser consultados em tabela. A rosca usa valor da posição conhecido, não quantidade, com legenda em valor e percentual. A ficha contém histórico de cotação e fundamentos sob demanda.

## Do's and Don'ts

- **Do** Use os tokens de tema existentes para superfícies, textos, bordas e campos.
- **Do** Mantenha valores e percentuais acompanhados de rótulos; use BRL e pt-BR.
- **Do** Agrupe filtros com os resultados e mantenha as ações financeiras no contexto correto.
- **Do** Preserve foco visível, alternativa textual dos gráficos e estados de erro.
- **Don't** Não adicione gráficos de investimentos à Visão Geral nem duplique a rosca.
- **Don't** Não represente cotação ausente como zero ou patrimônio como rentabilidade.
- **Don't** Não substitua as regras financeiras por cálculos exclusivos do renderer.
- **Don't** Não introduza uma terceira paleta ou novos componentes sem necessidade comprovada.
