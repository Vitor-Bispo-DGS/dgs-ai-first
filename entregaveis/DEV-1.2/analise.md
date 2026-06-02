# Pergunta 1: Qual o prazo de devolução para carga perigosa?

A resposta esperada, de acordo com as políticas descritas em POL-0001-politica-devolucao, é que a devolução de carga perigosa não é permitdia.
O agente respondeu:
---
Devolução de Carga Perigosa
Cargas perigosas não são elegíveis para o processo padrão de devolução.
Especificamente, estão excluídas as cargas classificadas nas classes 1 a 6 da ANTT (Resolução ANTT nº 5.947/2021), que incluem:
ClasseTipo1Explosivos2Gases3Líquidos inflamáveis4Sólidos inflamáveis5Oxidantes e peróxidos6Substâncias tóxicas e infectantes
O que fazer nesses casos?
O cliente deve entrar em contato diretamente com o setor de Gestão de Riscos para tratamento individual:

📞 Ramal 4500


Fonte: POL-001 — Política de Devolução de Mercadorias, v3.1 (atualizada em 15/01/2024), Seção 3.2.
---

A resposta está correta. Além da resposta, o agente foi rápido e objetivo, informando a razão da não eligibilidade e informando ao atendente como proceder (entrar em contato com a gestão de riscos).
A fonte também foi corretamente citada.

# Pergunta 2: Meu cliente é Gold, qual o SLA de resolução?

A resposta esperada, de acordo com SLA-2024-tabela-sla-clientes é que o SLA de resolução é de até 24h úteis.
O agente respondeu:

---
## SLA de Resolução — Cliente Gold
Para clientes do tier Gold, os prazos de resolução são:
|Tipo de Chamado | Prazo de Resolução| 
| -------------- | ----------------- |
| Chamados gerais| Até 24h úteis |
| Incidentes críticos | Até 4 horas|

### Pontos importantes

- O relógio de SLA para chamados gerais pausa fora do horário comercial (08h–18h, dias úteis).
- Para incidentes críticos, o relógio não pausa — corre de forma contínua para clientes Gold.
- Clientes Gold contam com gerente de conta dedicado e relatório mensal de performance detalhado.

### Quando um incidente é considerado crítico?
Um incidente é crítico se atender ao menos um dos critérios abaixo:

- Carga com valor declarado acima de R$ 100.000 com status desconhecido há mais de 6 horas;
- Carga perigosa com qualquer irregularidade de documentação ou rastreamento;
- Mais de 5 chamados do mesmo cliente nas últimas 24h sobre o mesmo problema;
- Qualquer situação com risco à segurança de pessoas.


Fonte: SLA-2024 — Tabela de SLA por Tipo de Cliente, v2024.1 (atualizada em 02/01/2024), Seções 2, 3 e 5.

---

A resposta também está correta. Além disso, ele trouxe outras informações úteis, como o tratamento para incidentes críticos e o que define o que é um incidente crítico.
Também apresentou a fonte utilizada na resposta corretamente, tudo de forma objetiva.

# Pergunta 3: Quanto custa o frete para 600kg para Manaus?

A resposta esperada, de acordo com PROC-042-v2-frete-especial, é que o custo do frete teria um multiplicador de 1.8x por conta da região e um multiplicador de 1x de acordo com o fator peso (600kg). O valor base não está especificado no documento, sendo assim, ele não deve fornecer esse valor.
Resposta do agente:
---
## Cálculo de Frete Especial — 600kg para Manaus
### Parâmetros identificados

Manaus está localizada na região Norte. Com 600kg, a carga se enquadra na faixa de 500kg a 1.000kg do frete especial.

Aplicando a fórmula:
>  Valor do frete = Valor base × Multiplicador regional × Fator de peso

| Parâmetro | Valor |
| --------- | ----- |
|Multiplicador regional (Norte)|1,8|
|Fator de peso (500kg–1.000kg) |1,0|

### Resultado

> Valor do frete = Valor base × 1,8 × 1,0

O valor final depende da tarifa base publicada na tabela mensal de fretes, que não está disponível nos documentos consultados. Para obter o valor exato, é necessário consultar a tabela mensal vigente.

### ⚠️ Atenção — Prazo de entrega
Para frete especial, o prazo é o prazo padrão da rota + 3 dias úteis adicionais para manuseio e roteirização.

### ⚠️ Observação importante: 
O documento PROC-042-v2 não possui indicação formal de que substitui a versão anterior (PROC-042 v1), e ambas coexistem no SharePoint. Recomenda-se confirmar com a Diretoria Comercial em caso de dúvida.

Fonte: PROC-042-v2 — Procedimento de Cálculo de Frete Especial (Revisado), v2.0 (emitido em 10/11/2023), Seções 2 e 3.

---

A resposta do agente está correta. Ele identificou corretamente os parâmetros disponíveis e se recusou a fornecer o Valor base, que não está especificado em nenhum dos documentos fornecidos. Além disso, alertou em possível caso de frete especial que o padrão poderia ser diferente.

# Conclusão

O prompt, logo na primeira iteração, conseguiu com sucesso responder as perguntas propostas corretamente, apresentando fontes e detalhes úteis para o usuário. Todos os guardrails especificados foram seguidos e as respostas foram consistentes com os documentos, sem alucinações. Com resultados já satisfatórios, uma segunta iteração não foi necessária, o protótipo já se demonstra funcional.