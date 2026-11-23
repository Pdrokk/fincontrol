# FinControl 1.0 — Homologação para instalação no Windows

**Versão:** 1.0.0 · **Plataforma:** Windows 64 bits · **Build:** Electron + React + TypeScript + SQLite · **Artefato esperado:** `FinControl-1.0.0-setup.exe`

## 1. Níveis de validação

| Camada | Execução automática |
|---|---|
| TypeScript do processo Electron/preload e renderer | `npm run typecheck` |
| Análise estática | `npm run lint` |
| Regras e SQL em memória | `npm test` |
| Build de produção | `npm run build` |
| Empacotamento NSIS Windows x64 | workflow `windows-installer.yml` |
| Executável empacotado | `fincontrol.exe --fincontrol-smoke-test` |
| Instalador + aplicativo instalado | instalação silenciosa e smoke do EXE instalado |
| Migração de SQLite legado | smoke com DB antigo descartável |
| Backup/restauração | smoke em DB descartável (inclui rejeição de arquivo inválido) |
| Interface com mouse, teclado, leitor de tela e conta pessoal | **homologação manual necessária** |

Os testes integrados do Electron usam apenas `app.setPath('userData', pastaTemporaria)` e removem essa pasta ao final, nunca os dados pessoais do usuário.

## 2. Testes manuais em ambiente Windows (após aprovação da CI)

Prepare um banco fictício ou faça backup antes de começar.

1. Instale o `.exe`; verifique atalho, inicialização, fechamento e reabertura.
2. Confira se a sidebar, o switch de tema e os painéis funcionam com Light/Dark Mode.
3. Cadastre e edite duas contas com bancos distintos (Inter e Nubank).
4. Registre receita, despesa e transferência e confira saldos e filtros do Dashboard.
5. Registre cartão, compra em três parcelas e confira limite contratado/disponível.
6. Pague duas parcelas de uma vez; confira saldo bancário, limite liberado e histórico.
7. Estorne uma parcela e tente estorná-la novamente. Confira o histórico da justificativa.
8. Arquive uma parcela quitada e restaure a visibilidade no histórico.
9. Configure salário recorrente e confirme que não duplica após reiniciar.
10. Em Relatórios, alterne **Realizado** e **Previsto**, altere mês/ano e navegue nas páginas.
11. Exporte um backup; faça uma mudança fictícia e **restaure o backup com esse banco de testes**, confirmando a reversão.
12. Reinicie e confira persistência; desinstale e instale novamente usando outro banco de testes.

## 3. Uso de dados pessoais

- Nunca envie o `fincontrol.db` ao GitHub ou a um serviço público.
- Faça backup antes de atualizar o aplicativo para 1.0.
- O instalador **não deve apagar a pasta de dados**; a verificação na máquina final ainda é recomendada.
- Se notar algum saldo divergente, compare com as movimentações cadastradas antes de usar o resultado para tomar decisões reais.
- A restauração substitui os dados correntes, mas mantém snapshot de emergência para diagnóstico.

## 4. Distribuição

O pipeline do GitHub publica um **artefato ZIP** que contém `FinControl-1.0.0-setup.exe` e `SHA256SUMS.txt`, disponível na página da execução aprovada.

O instalador acadêmico não é assinado com certificado de desenvolvedor. O Windows poderá mostrar aviso de editor desconhecido.

## 5. Limitações conhecidas

- O projeto não possui sincronização entre computadores, app mobile nem integração bancária real.
- As cores dos bancos são aproximações visuais, não logotipos oficiais.
- A recorrência salarial funciona ao abrir o programa e enquanto ele está aberto, não como serviço de fundo com o computador desligado.
- Transações e despesas de cartão cadastradas manualmente para o mesmo evento ainda exigem conferência de duplicidade pelo usuário.
- O aplicativo não substitui escrituração contábil profissional nem conciliação com extratos reais.

## 6. Decisão de liberação

**Liberar para instalação acadêmica somente se:** workflow Windows passar (incluindo montagem/instalação/smoke), versão do executável for `1.0.0` e teste manual básico de abertura e persistência passar.

**Não afirmar homologação em máquina pessoal** sem evidência de execução nessa máquina.
