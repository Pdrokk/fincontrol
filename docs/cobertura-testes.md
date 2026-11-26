# Cobertura de testes — FinControl

Base develop `22a61084d11e982936e02308bfc65a6a8db3b6ac`, após PR 51. CI de qualidade [45740368872](https://github.com/Pdrokk/fincontrol/actions/runs/45740368872) e Windows [45740368900](https://github.com/Pdrokk/fincontrol/actions/runs/45740368900) aprovadas; log Windows: 45 testes, 45 aprovados, 0 falhas; 3 avisos de lint remanescentes de 1.719. Os três ajustes finais de espaçamento e separadores de texto são propostos nesta PR. ESLint passa a rejeitar avisos, sem desativar regras.

## Medição

Executar `npm ci` com Node.js 24 e `npm run test:coverage`. O coletor nativo do Node mede linhas, branches e funções dos módulos do código-fonte carregados pelos testes isolados. A CI gera o artefato FinControl-Cobertura-Testes. Não há nova dependência, não se alteram testes ou asserções existentes.

## Limites

O relatório **não mede a cobertura integral do aplicativo**: módulos não importados pela suíte podem não aparecer; smoke tests do Electron empacotado, componentes React executados no Chromium, IPC e fluxos manuais não integram esse percentual. O smoke Windows permanece obrigatório e separado. Não tratar percentual de módulos carregados como cobertura global. O primeiro relatório é uma linha de base, sem metas artificiais ou números inventados.

## Próxima etapa

Identificar arquivos ausentes e linhas/branches descobertos; priorizar integridade de saldos, pagamentos/estornos, investimentos, migrações, backup e validações. Acrescentar testes significativos e medir novamente antes de definir limiares por módulo. Segurança PR 50 permanece isolada e deverá ser reaplicada sobre a base limpa.

## Linha de base medida — PR 52

Merge na develop: `812f25522db1f8b4bae30cff9f328e9145cd109b`. [Qualidade e cobertura](https://github.com/Pdrokk/fincontrol/actions/runs/45741552108) e [Windows](https://github.com/Pdrokk/fincontrol/actions/runs/45741552102): sucesso. ESLint com `--max-warnings=0` aprovado; 45 testes, 45 aprovados, zero falhas.

| Módulo medido | Linhas (%) | Branches (%) | Funções (%) |
|---|---:|---:|---:|
| consultasFinanceiras.ts | 100 | 100 | 100 |
| cotacoes.ts | 97,83 | 88,64 | 100 |
| fundamentos.ts | 100 | 98,72 | 100 |
| investimentos.ts | 98,46 | 87,19 | 100 |
| regrasFinanceiras.ts | 100 | 100 | 100 |
| composicaoCarteira.ts | 100 | 94,12 | 100 |
| historicoInvest.ts | 100 | 100 | 100 |
| previaOperacao.ts | 100 | 100 | 100 |
| Total dos módulos carregados | 98,91 | 91,67 | 100 |

## Regressões adicionais propostas

Quatro cenários em testes existentes: HTTP 503; reativação por recadastro zerado com histórico preservado; edição de quantidade inicial manual sem impacto no caixa; rollback integral da observação patrimonial após falha de escrita SQLite, incluindo nova tentativa. Os testes usam mocks ou banco em memória. Nenhuma regra financeira alterada, nenhuma asserção anterior removida. A cobertura dos 49 testes previstos ainda precisa ser medida pela CI. Não é cobertura global; contas, cartões, backup e UI continuam dependentes da validação de integração e manual.

## Resultado confirmado — PR 53

Merge na develop: `31be7b5dc41ff6d2453a6017023d22df60b55708`. [Qualidade e cobertura](https://github.com/Pdrokk/fincontrol/actions/runs/45854167906) e [Windows](https://github.com/Pdrokk/fincontrol/actions/runs/45854168300) aprovados. 49 testes aprovados, zero falhas, lint sem avisos.

| Indicador dos oito módulos carregados | Resultado |
|---|---:|
| Linhas | 100% |
| Branches | 93,48% |
| Funções | 100% |

Cotações: 100% de linhas, 91,11% de branches. Investimentos: 100% de linhas, 90,24% de branches. A medição continua limitada aos módulos importados pela suíte isolada.

Estado: ampliação aprovada; segurança retomada separadamente.
