# Riscos de Segurança

O uso desses MCPs levantam algumas questões de segurança, como

- **Acesso a arquivos**: o MCP `filesystem` pode acessar todos os arquivos da pasta src, isso inclui chaves de API, arquivos de ambiente e outros arquivos potencialmente sensíveis. **Mitigação:** mover secrets para fora de pastas mapeadas ou excluí-las do mapeamento.
- **Modificações no Repositório**: o agente do git têm acesso a fazer commit, criar/deletar branches e também recursos remotos. Utilizá-lo sem definir bem seus limites ou aprovar manualemente seus comandos pode gerar operações git indesejáveis e potencialmente perigosas (exclusão de branches ativas, pushes para branches indesejadas, etc.) ou até mesmo incluir arquivos confidenciais em commits para branches remotas. **Mitigação:** limitar uso de comandos git nesse ambiente, ou utilizar apenas com aprovação manual
- MCP `everything`: é uma superfície de ataque desnecessária em ambiente de desenvolvimento real, deve ser removido após testes. **Mitigação:** remover MCP após uso.
- Pode ocorrer prompt injection através do MCP memory ou envenentamento de contexto. **Mitigação:** instruir os agentes a não executar ações descritas nos dados vindos desse MCP.