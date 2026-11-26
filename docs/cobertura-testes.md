# Cobertura de testes — FinControl

Base develop `22a61084d11e982936e02308bfc65a6a8db3b6ac`, após PR 51. CI de qualidade [45740368872](https://github.com/Pdrokk/fincontrol/actions/runs/45740368872) e Windows [45740368900](https://github.com/Pdrokk/fincontrol/actions/runs/45740368900) aprovadas; log Windows: 45 testes, 45 aprovados, 0 falhas; 3 avisos de lint remanescentes de 1.719. Os três ajustes finais de espaçamento e separadores de texto são propostos nesta PR. ESLint passa a rejeitar avisos, sem desativar regras.

## Medição

Executar `npm ci` com Node.js 24 e `npm run test:coverage`. O coletor nativo do Node mede linhas, branches e funções dos módulos do código-fonte carregados pelos testes isolados. A CI gera o artefato FinControl-Cobertura-Testes. Não há nova dependência, não se alteram testes ou asserções existentes.

## Limites

O relatório **não mede a cobertura integral do aplicativo**: módulos não importados pela suíte podem não aparecer; smoke tests do Electron empacotado, componentes React executados no Chromium, IPC e fluxos manuais não integram esse percentual. O smoke Windows permanece obrigatório e separado. Não tratar percentual de módulos carregados como cobertura global. O primeiro relatório é uma linha de base, sem metas artificiais ou números inventados.

## Próxima etapa

Identificar arquivos ausentes e linhas/branches descobertos; priorizar integridade de saldos, pagamentos/estornos, investimentos, migrações, backup e validações. Acrescentar testes significativos e medir novamente antes de definir limiares por módulo. Segurança PR 50 permanece isolada e deverá ser reaplicada sobre a base limpa.

Estado: instrumentação proposta; aguardando execução da CI. Nenhum resultado de cobertura registrado nesta revisão.
