# FinControl 1.0

Aplicativo desktop **offline** de controle financeiro pessoal para Windows, desenvolvido como projeto de TCC utilizando Electron, React, TypeScript e SQLite.

## Funcionalidades

- Contas bancárias com identificação de instituição, saldos, transferências e ajustes auditáveis
- Receitas e despesas com filtros por mês, ano e categoria
- Cartões de crédito, compras parceladas e limite disponível
- Central de Pagamentos para uma fatura completa ou várias parcelas selecionadas
- Estorno de pagamento com justificativa e histórico
- Salário recorrente com início e duração programados
- Gráficos de movimentos realizados e parcelas previstas
- Tema claro/escuro e cores de cartões de acordo com a instituição financeira
- Backup SQLite e restauração com verificação de integridade e cópia de emergência

**O FinControl não se conecta a bancos reais e não movimenta dinheiro de verdade.** Os valores são registros de controle pessoal.

## Abrir o FinControl — Windows, sem instalação

O FinControl 1.0 está disponível como **um único executável portátil**. Não existe assistente de instalação: abra o arquivo e use o app.

1. Acesse [GitHub Actions — FinControl portátil](https://github.com/Pdrokk/fincontrol/actions/workflows/windows-installer.yml) e abra a execução aprovada mais recente da branch `portable/fincontrol-v1.0.0`.
2. Em **Artifacts**, baixe `FinControl-1.0.0-Portatil-Windows-x64`. O GitHub entrega os artefatos em um ZIP.
3. Extraia o ZIP e execute `FinControl-1.0.0-portable.exe` com duplo clique. Não são necessários VS Code, npm nem Node.js.
4. O arquivo pode ficar na Área de Trabalho ou em outra pasta. O primeiro início pode ser um pouco mais demorado porque o executável portátil extrai arquivos temporários.

**Assinatura digital:** esta versão acadêmica não tem certificado de assinatura. O Windows pode apresentar um aviso de editor desconhecido. Confira o arquivo e sua procedência no GitHub; não desative proteções do sistema.

### Onde ficam meus dados?

O aplicativo usa o diretório de dados do usuário do Windows, em `dados/fincontrol.db`, da mesma forma que a versão com instalador. **O banco não fica dentro do executável** e não é apagado quando você substitui o `.exe` por uma versão nova.

A versão sem instalação **não** coloca todos os dados ao lado do `.exe`; portanto, ao levar somente o arquivo executável para outro computador, seus dados não vão junto. Para isso, use **Configurações → Exportar backup** e depois **Restaurar backup** no outro computador.

Faça um backup antes da troca de versão. Não compartilhe bancos e backups financeiros em repositórios públicos.

## Requisitos

- Windows 10/11 de 64 bits
- Espaço livre suficiente para o aplicativo e o banco SQLite
- Não é necessária conexão com a internet para o uso normal

## Desenvolvimento

Use Node.js 24 e o terminal PowerShell no VS Code.

```powershell
npm.cmd ci
npm.cmd run dev
```

### Testes e compilação

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:win -- --x64
```

O `npm.cmd test` executa testes de regras financeiras e consultas SQLite em memória. A workflow Windows também inicia o executável portátil em modo isolado (`--fincontrol-smoke-test`) para validar contas, pagamentos, estornos, salários, backup/restauração, integridade SQLite e migração de banco legado.

## Organização do projeto

- `src/main/`: processo principal Electron, SQLite, contas, cartões, salários e backup
- `src/preload/`: API IPC exposta com isolamento de contexto
- `src/renderer/`: interface React, gráficos, navegação e estilos
- `tests/`: testes automatizados sem dados pessoais
- `.github/workflows/`: CI de código e compilação do executável portátil no Windows
- `docs/`: roteiros de homologação e material de desenvolvimento

## Restrições e observações

- O aplicativo é um projeto acadêmico, não um sistema bancário certificado.
- Não há atualização automática assinada nem integração com instituições financeiras.
- As cores das instituições são aproximações visuais, não material oficial.
- Dados financeiros devem ser reconciliados com os extratos quando utilizados como referência.
- Para suporte e histórico de desenvolvimento: [repositório GitHub](https://github.com/Pdrokk/fincontrol).

## Licenciamento

Projeto acadêmico. Nenhuma licença de redistribuição de terceiros é concedida por este README.
