# Auditoria de segurança — FinControl

Base: develop `407f72b40a460ca35764dd089eda71037c45a235` (1.6.4). Revisão estática, não pentest ou certificação. Referência: [checklist Electron](https://www.electronjs.org/docs/latest/tutorial/security/).

| Severidade preliminar | Achado | Tratamento proposto |
|---|---|---|
| Alta | Sandbox desativada | Sandbox e isolamento explícitos, Node/webview/conteúdo inseguro desativados |
| Alta | API genérica do toolkit exposta | Somente versões de diagnóstico e contrato financeiro; remoção de ping genérico |
| Alta | IPC sem validação uniforme | Validar janela registrada, frame principal e documento em todos os handlers |
| Média | Navegação e permissões sem bloqueio explícito | Bloquear navegação, redirecionamento, webview e permissões; restringir links e CSP |
| Média | Múltiplas instâncias no mesmo perfil | Bloqueio de instância única, preservando modos smoke isolados |
| Média | Sem portão explícito de auditoria | npm audit --audit-level=high na CI, incluindo dependências de desenvolvimento |

## Proteções e riscos residuais

- Consultas financeiras parametrizadas e transações SQLite nos fluxos de pagamento, transferência e investimento; SQL dinâmico de migração requer revisão adicional de esquemas importados.
- Backup verifica integridade e tabelas esperadas, usa snapshot e rollback. Proteção integral contra arquivos adulterados, aliases, concorrência e falha de energia não comprovada.
- Chave BRAPI usa safeStorage quando disponível, fora do banco. Consultas HTTPS com host delimitado, timeout e redirecionamento desabilitado. Histórico Git e logs não auditados exaustivamente.
- Banco e backups sem criptografia integral documentada. EXE sem assinatura; acesso local ao perfil pode expor dados. Criptografia/migração e assinatura não implementadas.
- Proteção IPC não impede renderer comprometido de usar operações legítimas; validação de entradas no main continua necessária. Sem autenticação multiusuário.

## Validação

Quatro novos testes de remetente e links; smoke Windows reforçado para conferir isolamento, preferências e ausência de API genérica. Validar também links, modo dev, backup/restauração, instância única e sete páginas no EXE. Analisar npm audit antes de aprovar; não usar npm audit fix --force. Pendências: revisão aprofundada de backup/concorrência, fuses, assinatura, criptografia e vulnerabilidades conforme resultado real.

Status: correções propostas, CI e homologação manual pendentes. Sem alteração financeira, de schema ou versão numérica.
