# FinControl — instruções para Codex

Aplicativo desktop Electron + React + TypeScript, SQLite local, Windows x64 portable. Responder e escrever UI em português brasileiro. Preservar tema claro/escuro, identidade visual existente, navegação por teclado e dados locais.

## Regras de revisão
- P0/P1: perda de histórico, saldo duplicado, compra/venda incorreta, migração destrutiva, quebra de backup ou execução no Windows.
- Investimentos de acompanhamento não movimentam conta; apenas operações explícitas do controle detalhado alteram caixa.
- Dados de cotação são indicativos: validar símbolo, moeda, valor e timestamp; preservar cache em erro; nunca representar valor desconhecido como zero.
- Chaves de API nunca em código, logs, backups ou renderer persistente. Usar processo main e armazenamento seguro local.
- Respeitar contratos IPC, validar entradas no main e manter testes de regressão.
- Antes de aprovar: npm run typecheck, npm run lint, npm test, npm run build e smoke Windows do workflow. Não alegar que testes rodaram quando não rodaram.
- UI: informação prioritária primeiro, tabelas compactas com números alinhados, ações contextuais, formulários sob demanda. Evitar cartões decorativos, métricas redundantes e placeholders sem função.
- Não fazer merge automaticamente sem aprovação de homologação. Usar branch e PR.
