# Justificativas Escopos

| Escopo | Justificativa |
| ------ | ------------- |
| filesystem-sdd | Tem acesso apenas às especificações e as skills do repositório **em modo de leitura**. Desse modo, esse agente não pode modificar as especificações para encaixar com o que ele desenvolveu, mas sim modificar o que fez para se alinhar com as specs. |
| filesystem-docs | Tem acesso apenas aos documentos da novatech, também com acesso exclusivo para leitura |
| filesystem-code | Tem acesso à todo o código da aplicação, com permissões de leitura e escrita para desenvolvimento |
| filesystem-retrieval | Também possui acesso apenas de leitura aos documentos da pipeline RAG. |
| Demais MCPs | Não possuem forma direta de limitar privilégios. |