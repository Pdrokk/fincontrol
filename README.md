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

## Instalação — Windows

1. Baixe o arquivo `FinControl-1.0.0-setup.exe` no artefato da execução aprovada do [GitHub Actions — Instalador Windows](https://github.com/Pdrokk/fincontrol/actions/workflows/windows-installer.yml).
2. Extraia o arquivo ZIP do artefato e confira o `SHA256SUMS.txt`, se desejar verificar a integridade.
3. Execute o instalador, escolha a pasta e siga o assistente.
4. Abra o FinControl pelo atalho criado no menu Iniciar ou na Área de Trabalho.

**Assinatura digital:** a versão acadêmica não possui certificado de assinatura de código. O Windows pode exibir um aviso do SmartScreen sobre editor desconhecido. Verifique a procedência no repositório antes de executar; não desative proteções do sistema.

### Onde meus dados ficam?

O banco é salvo no diretório de dados do aplicativo, em `dados/fincontrol.db`. Não fica na pasta do instalador. Reinstalar o aplicativo normalmente não deve apagar dados antigos; ainda assim, faça um backup antes de atualizar ou restaurar dados.

No aplicativo, acesse **Configurações → Exportar backup** para guardar uma cópia SQLite. Use **Restaurar backup** apenas depois de confirmar o arquivo e lembrar que a operação substitui os dados atuais.

**Atenção:** não compartilhe seu `fincontrol.db`, backups ou extratos em repositórios públicos.

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

O `npm.cmd test` executa testes de regras financeiras e consultas SQLite em memória. A workflow Windows também inicia o aplicativo empacotado em modo isolado (`--fincontrol-smoke-test`) para validar contas, pagamentos, estornos, salários, backup/restauração, integridade SQLite e migração de banco legado.

## Organização do projeto

- `src/main/`: processo principal Electron, SQLite, contas, cartões, salários e backup
- `src/preload/`: API IPC exposta com isolamento de contexto
- `src/renderer/`: interface React, gráficos, navegação e estilos
- `tests/`: testes automatizados sem dados pessoais
- `.github/workflows/`: CI de código e compilação do instalador no Windows
- `docs/`: roteiros de homologação e material de desenvolvimento

## Restrições e observações

- O aplicativo é um projeto acadêmico, não um sistema bancário certificado.
- Não há atualização automática assinada nem integração com instituições financeiras.
- As cores das instituições são aproximações visuais, não material oficial.
- Dados financeiros devem ser reconciliados com os extratos quando utilizados como referência.
- Para suporte e histórico de desenvolvimento: [repositório GitHub](https://github.com/Pdrokk/fincontrol).

## Licenciamento

Projeto acadêmico. Nenhuma licença de redistribuição de terceiros é concedida por este README.
