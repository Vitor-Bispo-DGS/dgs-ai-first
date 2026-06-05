# Identidade
Você é um assistente de IA da NovaTech, focado em fornecer de forma rápida informações sobre as políticas, operações e regras de negócio à equipe de atendimento, seguindo o cenário em anexo.

# Objetivo
Seu papel é consultar os documentos disponíveis para responder de formar objetiva os pedidos dos atendentes.

# Regras
Ao responder, você deve seguir as seguintes regras fundamentais:

Siga as informações presentes nos documentos;

Sempre cite a fonte do documento;
Se uma informação requisitada não existir na documentação, não crie valores, apenas informe que o dado não foi encontrado;
Caso não encontre informações relacionadas direta e objetivamente com a pergunta, não cite outras informações não relacionadas, apenas
informe que não encontrou nenhuma informação sólida sobre o assunto. Responda apenas se tiver certeza de que a resposta é válida e existe na documentação fornecida.
Se as informações não vierem de documentos formais (Ex.: FAQs), você pode responder com base neles mas alertando de forma clara de que essas informações podem não ser exatas ou estarem desatualizadas, orientando a busca por orientação formal.
Responda em português formal, mas acessível;
Seja objetivo, forneça todos os principais detalhes necessários e no fim de sua resposta, as fontes que utilizou.
Considere também a distinção entre informações estáticas(não vão mudar) e dinâmicas (podem mudar):

Estáticas: esse system prompt e suas regras; o cenário apresentado.
Dinâmicas: As 3 chunks de informação apresentadas. Sempre que precisar acessar informações dinâmicas, consulte os documentos mais recentes para garantir que você esteja consultando informações atualizadas. Informações estáticas devem ser carregadas sempre. As dinâmicas devem ser escolhidas de acordo com o pedido do usuário. Ao carregar as informações, dê prioridade para as chunks que contém as informações mais relevantes para entregar uma resposta.
Assuma o papel desse assistente de agora em diante.

 Considere os seguintes trechos de documentos indexados:

=== Chunk 1 ===
Fonte: documents\markdown\POL-001-politica-devolucao.md
Distância: 6.9669
### 3.2. Exceções ao prazo geral  
As seguintes categorias de carga NÃO são elegíveis para devolução pelo processo padrão:  
- Cargas perigosas classificadas nas classes 1 a 6 da ANTT (Agência Nacional de Transportes Terrestres), conforme Resolução ANTT nº 5.947/2021. Inclui: explosivos (classe 1), gases (classe 2), líquidos inflamáveis (classe 3), sólidos inflamáveis (classe 4), oxidantes e peróxidos (classe 5), substâncias tóxicas e infectantes (classe 6).
- Cargas refrigeradas que tenham rompido a cadeia de frio (temperatura fora da faixa especificada na nota fiscal por mais de 30 minutos contínuos, conforme registro do sensor IoT).
- Cargas com lacre de segurança violado, salvo quando a violação for documentada no ato de entrega com assinatura do motorista e do recebedor.

=== Chunk 2 ===
Fonte: documents\markdown\POL-001-politica-devolucao.md
Distância: 8.1357
### 3.5. Custos de devolução  
- Defeito ou erro da NovaTech (carga errada, avaria em trânsito): devolução sem custo para o cliente.
- Desistência do cliente (carga correta, sem defeito): o custo do frete reverso é do cliente, calculado com os mesmos multiplicadores do frete original.
- Prazo expirado (solicitação após 7 dias úteis): não elegível para devolução padrão. Encaminhar ao Comercial para negociação caso a caso.

=== Chunk 3 ===
Fonte: documents\markdown\PROC-042-v2-frete-especial-revisado.md
Distância: 8.8112
## 1. Objetivo  
Definir a fórmula e os parâmetros atualizados para cálculo de frete especial aplicável a cargas com peso acima de 500kg. Os multiplicadores foram revisados para refletir os custos operacionais atualizados de cada região.

=== Chunk 4 ===
Fonte: documents\markdown\PROC-042-frete-especial-v1.md
Distância: 8.8609
## 4. Condições especiais  
- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas).
- Descontos de volume (mais de 10 fretes especiais/mês para o mesmo cliente) devem ser negociados pelo Comercial e registrados em aditivo contratual.

=== Chunk 5 ===
Fonte: documents\markdown\FAQ-atendimento.md
Distância: 9.1777
### Item 22 — "Cliente quer saber sobre seguro de carga. O que falar?"
A NovaTech oferece seguro de carga como adicional. O valor é 0,3% do valor declarado da mercadoria para cargas padrão e 0,8% para cargas perigosas. Detalhe: isso vale para contratos a partir de 2023. Contratos mais antigos podem ter percentuais diferentes — confirme com o Comercial.

=== Chunk 6 ===
Fonte: documents\markdown\POL-001-politica-devolucao.md
Distância: 6.9669
Observação: chunk complementar recuperado na segunda passada.
## 3. Regras de Devolução  
### 3.1. Prazo geral  
O cliente pode solicitar a devolução de mercadorias em até 7 (sete) dias úteis após a data de recebimento confirmada no sistema de tracking. A contagem de dias úteis exclui sábados, domingos e feriados nacionais.

=== Chunk 7 ===
Fonte: documents\markdown\POL-001-politica-devolucao.md
Distância: 6.9669
Observação: chunk complementar recuperado na segunda passada.
Para essas categorias, o cliente deve entrar em contato com o setor de Gestão de Riscos (ramal 4500) para tratamento individual.

=== Chunk 8 ===
Fonte: documents\markdown\POL-001-politica-devolucao.md
Distância: 8.1357
Observação: chunk complementar recuperado na segunda passada.
### 3.4. Devoluções parciais  
Quando a entrega envolver múltiplos volumes, o cliente pode devolver volumes individuais. Cada volume devolvido segue o mesmo procedimento da seção 3.3. O cálculo de reembolso é proporcional ao peso/valor do volume devolvido, conforme o CT-e.

=== Chunk 9 ===
Fonte: documents\markdown\POL-001-politica-devolucao.md
Distância: 8.1357
Observação: chunk complementar recuperado na segunda passada.
### 3.3. Procedimento de devolução  
1. O cliente abre chamado no Portal do Cliente (portal.novatech.com.br), selecionando a categoria "Devolução de Mercadoria".
2. O chamado deve incluir: número do CT-e (Conhecimento de Transporte Eletrônico), fotos da mercadoria no estado atual (mínimo 3 fotos: embalagem externa, etiqueta de identificação, e conteúdo), e motivo da devolução.
3. O time de atendimento tem 4 horas úteis para triagem do chamado (verificar elegibilidade, documentação e prazo).
4. Se elegível, a coleta reversa é agendada em até 2 dias úteis após aprovação.
5. O reembolso ou crédito é processado em até 5 dias úteis após o recebimento da mercadoria devolvida no centro de distribuição.

=== Chunk 10 ===
Fonte: documents\markdown\FAQ-atendimento.md
Distância: 9.1777
Observação: chunk complementar recuperado na segunda passada.
### Item 15 — "Cliente diz que é Platinum. Existe esse tier?"
Não existe tier Platinum na NovaTech. Às vezes o cliente confunde com outra transportadora ou com o programa de fidelidade antigo que foi descontinuado em 2022. Oriente que nossos tiers são Gold, Silver e Standard e peça o número do contrato para verificar.

=== Chunk 11 ===
Fonte: documents\markdown\FAQ-atendimento.md
Distância: 9.1777
Observação: chunk complementar recuperado na segunda passada.
### Item 27 — "O tracking mostra 'em trânsito' há 5 dias. O que faço?"
Depende da rota. Rotas para o Norte podem levar até 10 dias úteis. Para Sul/Sudeste, mais de 3 dias parado é estranho. Abra um chamado de rastreamento e classifique como prioridade alta se for Gold ou se o valor da carga for acima de R$ 50.000.

Use essas informações para responder à pergunta a seguir. Priorize chunks com menor distância.


Com base nos documentos indexados, responda à seguinte pergunta:

Prazo de devolução + carga perigosa + frete especial