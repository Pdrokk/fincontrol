# Segurança — retomada incremental

Base develop `31be7b5dc41ff6d2453a6017023d22df60b55708`, após PR 53. A PR 50 permanece isolada. Sua segunda execução de qualidade passou, mas [Windows 45738483480](https://github.com/Pdrokk/fincontrol/actions/runs/45738483480) falhou no smoke de interface: "Atalho Nova conta não direcionou ao formulário." Não há comprovação de qual proteção ou condição de timing causou a falha.

## Etapa A — reduzir a superfície do preload

- Revisão estática dos 29 arquivos TS/TSX/HTML do renderer encontrou apenas Versions.tsx usando window.electron, para consultar versões. O contrato financeiro window.fincontrol permanece integralmente inalterado.
- Substituir a API genérica do toolkit por versões de diagnóstico somente; remover o objeto api vazio e a alternativa de exposição sem isolamento, além do canal ping de demonstração.
- Manter a configuração atual da BrowserWindow, sandbox, navegação, IPC financeiro, permissões, dependências, regras financeiras e layout. Não incorporar a PR 50.
- Smoke Windows passa a verificar ausência de API IPC genérica, presença do contrato financeiro e versões, mantendo o teste de foco original e demais asserções.

## Próximos passos

Aprovar a etapa A por CI e homologação manual antes de avançar. Depois, em PRs separadas: proteção de remetentes IPC, navegação/permissões, sandbox com diagnóstico específico da regressão de foco, e revisão de dependências e backup. A auditoria anterior encontrou 12 ocorrências moderadas relacionadas a minimatch em ferramentas de build/lint; avaliar atualizações compatíveis, sem downgrade forçado. Banco e backups sem criptografia integral documentada e executável sem assinatura continuam como limitações.

## Resultado da etapa A — PR 54

Merge na develop: `66701197d9b6a908541b21562662d96ee86d4c8a`. [Qualidade](https://github.com/Pdrokk/fincontrol/actions/runs/45857466367) e [Windows](https://github.com/Pdrokk/fincontrol/actions/runs/45857466333) aprovados no head da PR. 49 testes, zero falhas, lint sem avisos; smoke financeiro e UI em sete páginas, 84 combinações responsivas.

## Etapa B — autorização dos remetentes IPC

Todos os 46 handlers passam por uma função única que exige WebContents registrado pelo aplicativo, frame principal e URL do documento esperado (arquivo local na produção ou URL configurada no desenvolvimento). Rejeita janelas não registradas, subframes, URLs ausentes, documentos distintos e esquemas não suportados. Fragmentos internos não alteram a identidade do documento. Nenhuma mudança na API de preload, regras financeiras, sandbox ou permissões.

Quatro testes isolados verificam a política de origem. O smoke Windows mantém todas as asserções anteriores e, após os testes de foco/responsividade, usa uma janela oculta não registrada para verificar a rejeição real de IPC e confirma uma consulta autorizada. A janela de teste existe apenas no modo smoke, com banco temporário.

Esta proteção não impede um renderer autorizado comprometido de invocar suas próprias operações legítimas. Validação de argumentos no main, sandbox e navegação permanecem relevantes.

Estado: etapa A integrada; etapa B proposta, CI e homologação pendentes. Não constitui certificação de segurança.
