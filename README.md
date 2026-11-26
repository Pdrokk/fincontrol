# FinControl — Controle Financeiro Pessoal

**Versão homologada:** 1.6.4 · Windows x64 · Projeto acadêmico de TCC.

Aplicativo desktop de controle financeiro pessoal com dados locais em SQLite. Desenvolvido com Electron, React, TypeScript e Recharts. Funciona offline para registros financeiros; consultas de mercado são opcionais e exigem internet.

## Abrir sem instalação

1. Abra a [execução Windows aprovada da v1.6.4](https://github.com/Pdrokk/fincontrol/actions/runs/45733822820).
2. Baixe o [artefato portátil homologado](https://github.com/Pdrokk/fincontrol/actions/runs/45733822820/artifacts/15078142692) (ZIP; pode exigir login no GitHub). Extraia o arquivo `FinControl-1.6.4-portable.exe`.
3. Execute o EXE com duplo clique. Não é necessário instalar Node.js nem VS Code. A extração temporária pode tornar o primeiro início mais lento.
4. Confirme a versão em **Configurações → Sobre o aplicativo**.

Artefatos do GitHub Actions expiram. Se o download não estiver disponível, gere o EXE com as instruções de desenvolvimento abaixo ou consulte a próxima versão homologada. Este link é de um artefato de testes aprovado, não de uma release definitiva publicada. O EXE acadêmico não possui certificado de assinatura; confira a procedência e não desative as proteções do Windows.

## Funcionalidades

| Área | Recursos |
|---|---|
| Visão Geral | Saldos, receitas, despesas, faturas abertas e gráficos realizados/previstos |
| Transações | Cadastro, edição, exclusão, filtros, ordenação e paginação |
| Relatórios | Resumo do período, categorias, gráficos e alternativa textual |
| Minhas contas | Contas, transferências, entradas, ajustes auditáveis e salário recorrente |
| Cartões e faturas | Limites, compras parceladas, pagamentos individuais/em lote, estornos e histórico |
| Investimentos | Carteira, rosca por ativo, compras, vendas, proventos, ficha, cotações e fundamentos |
| Configurações | Consulta de categorias, backup/restauração e informações de versão |

Tema claro/escuro, interface compacta, persistência local e navegação por teclado. O sistema não envia ordens à corretora, não movimenta dinheiro real e não se conecta a contas bancárias.

## Dados e segurança

O arquivo de dados é `dados/fincontrol.db` no diretório `app.getPath('userData')` do Electron, normalmente dentro do perfil do Windows. O banco não fica embutido no EXE nem necessariamente ao seu lado. Faça backup antes de atualizar. Para migrar a outro computador, use **Configurações → Exportar backup** e **Restaurar backup**; a restauração substitui os dados atuais após validação e cria cópia de emergência.

Cotações de ações, ETFs e FIIs brasileiros podem usar BRAPI; USD/EUR usam BCB PTAX. Demais posições podem ser informadas manualmente. Fundamentos de ações e FIIs dependem da cobertura/plano BRAPI. Dados podem ter atraso; valores ausentes não são zero. A chave BRAPI opcional usa armazenamento seguro local do Electron em arquivo separado do SQLite; não é incluída no backup. Não publique bancos, backups ou chaves.

## Desenvolver e testar

Windows x64 com Git, Node.js 24 e npm. Em PowerShell no VS Code:

```powershell
git clone https://github.com/Pdrokk/fincontrol.git
cd fincontrol
git switch develop
npm.cmd ci
npm.cmd run dev
```

Para atualizar um clone já existente, confira `git status`, preserve alterações locais e use `git switch develop` seguido de `git pull --ff-only origin develop`.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:win -- --x64
```

O último comando gera `dist/Fin Control.exe`. O workflow Windows da branch `main` disponibiliza o pacote `Fin Control` em Actions; artefatos antigos mantêm seus nomes históricos. A CI usa Node 24 e valida o executável com bancos temporários. A versão 1.6.4 obteve 45 testes aprovados, zero falhas e 1.719 avisos de lint (sem erros); consulte as evidências em [homologação atual](docs/HOMOLOGACAO_V1.md). Não confunda testes automatizados com homologação manual em um computador do usuário.

## Documentação

- [Manual de utilização](docs/manual-usuario.md)
- [Arquitetura e regras técnicas](docs/arquitetura.md)
- [Design system](DESIGN.md)
- [Homologação e evidências](docs/HOMOLOGACAO_V1.md)
- [Matriz de homologação final](docs/homologacao-final.md)
- [Roteiro de entrega e apresentação](docs/entrega-tcc.md)
- [Histórico de versões](CHANGELOG.md)
- [Investimentos](docs/evolucao-investimentos.md) e [referências CVM/SEC](docs/referencia-cvm-sec.md)

`src/main/`: processo principal, regras, SQLite e serviços. `src/preload/`: contratos IPC. `src/renderer/`: React e estilos. `tests/`: testes de regressão. `.github/workflows/`: CI e build. `docs/`: documentação atual e registros históricos de desenvolvimento.

## Limites

Não é um sistema bancário certificado, plataforma de negociação, consultoria de investimentos nem serviço de sincronização. Recorrência salarial é processada ao abrir e enquanto o aplicativo estiver em execução. Cotações/fundamentos dependem do provedor; não existe reconstrução de histórico anterior nem importação automática de documentos regulatórios. Confira os registros contra extratos reais. macOS e Linux não foram homologados nesta entrega.

Projeto acadêmico. Este README não concede licença de redistribuição de terceiros.
