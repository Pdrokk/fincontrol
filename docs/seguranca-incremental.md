# Segurança — retomada incremental

Base develop `31be7b5dc41ff6d2453a6017023d22df60b55708`, após PR 53. A PR 50 permanece isolada. Sua segunda execução de qualidade passou, mas [Windows 45738483480](https://github.com/Pdrokk/fincontrol/actions/runs/45738483480) falhou no smoke de interface: "Atalho Nova conta não direcionou ao formulário." Não há comprovação de qual proteção ou condição de timing causou a falha.

## Etapa A — reduzir a superfície do preload

- Revisão estática dos 29 arquivos TS/TSX/HTML do renderer encontrou apenas Versions.tsx usando window.electron, para consultar versões. O contrato financeiro window.fincontrol permanece integralmente inalterado.
- Substituir a API genérica do toolkit por versões de diagnóstico somente; remover o objeto api vazio e a alternativa de exposição sem isolamento, além do canal ping de demonstração.
- Manter a configuração atual da BrowserWindow, sandbox, navegação, IPC financeiro, permissões, dependências, regras financeiras e layout. Não incorporar a PR 50.
- Smoke Windows passa a verificar ausência de API IPC genérica, presença do contrato financeiro e versões, mantendo o teste de foco original e demais asserções.

## Próximos passos

Aprovar a etapa A por CI e homologação manual antes de avançar. Depois, em PRs separadas: proteção de remetentes IPC, navegação/permissões, sandbox com diagnóstico específico da regressão de foco, e revisão de dependências e backup. A auditoria anterior encontrou 12 ocorrências moderadas relacionadas a minimatch em ferramentas de build/lint; avaliar atualizações compatíveis, sem downgrade forçado. Banco e backups sem criptografia integral documentada e executável sem assinatura continuam como limitações.

Estado: etapa A proposta, testes pendentes. Não constitui certificação de segurança.
