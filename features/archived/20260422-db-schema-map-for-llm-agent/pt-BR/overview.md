# Mapa de Schema SQL Server para Agente de Busca em Banco

## Descrição

A Apsis tem um banco SQL Server com cerca de 202 tabelas. Um agente de busca em banco rodando dentro de um workflow n8n deve responder perguntas de negócio — "quem faz parte do time de RH?", "informações sobre laudos da Petrobras" — traduzindo cada pergunta em SQL, executando e resumindo o resultado. Hoje o agente tem o canal de execução (uma Lambda existente que roda SQL arbitrário de dentro da VPC do banco), mas não tem conhecimento estrutural dos dados: não sabe quais tabelas existem, o que significam nem como se relacionam. Sem esse conhecimento, o agente não consegue montar uma query correta.

Esta feature produz a camada de conhecimento que falta ao agente. O entregável não é uma aplicação — é um conjunto de artefatos e um processo de geração que extraem a estrutura do banco, traduzem para termos de negócio e alimentam o agente para que ele possa raciocinar sobre o que consultar.

## Objetivos

- Dar ao agente de busca um mapa completo e confiável do banco da Apsis para que ele monte SQL correto contra tabelas que nunca viu antes.
- Manter o processo de atualização simples: regeneração sob demanda por um desenvolvedor da Softo, sem jobs agendados, sem nova infraestrutura na primeira iteração.
- Estabelecer uma base de validação (um conjunto fixo de perguntas reais) para que melhorias futuras no agente possam ser medidas objetivamente ao longo do tempo.
- Evitar adicionar complexidade operacional (sem vector store, sem novos serviços) até que o uso real prove necessidade.

## Como Funciona

### Extração do Schema

Um script, executado sob demanda por um desenvolvedor da Softo, conecta-se à Lambda de execução SQL existente e roda uma série de queries de introspecção contra os catálogos do SQL Server. Ele recupera a lista completa de tabelas, suas colunas e tipos, relacionamentos de chave estrangeira e quaisquer descrições de negócio já armazenadas nas extended properties do banco.

1. O desenvolvedor roda o comando de extração localmente com as credenciais de API já disponíveis na configuração do projeto.
2. O script consulta o banco em lotes pequenos e rápidos através da Lambda.
3. Os dados brutos do schema são salvos em um arquivo intermediário, pronto para alimentar o gerador do Mapa.

### Mapa do Banco

A partir da extração bruta, um segundo passo produz um único documento Markdown — o Mapa do Banco — escrito em português brasileiro. As tabelas são agrupadas pelo domínio de negócio a que pertencem (inferido dos schemas do SQL Server e padrões de nome, com espaço para correção humana). Cada tabela recebe uma descrição de uma linha, e os principais relacionamentos entre domínios aparecem em um resumo de relacionamentos.

1. O gerador lê a extração bruta e agrupa as tabelas em domínios inferidos.
2. Produz um arquivo Markdown limpo, commitado no repositório `sql`.
3. Um desenvolvedor revisa o mapa gerado e, se necessário, corrige o agrupamento por domínio ou as descrições antes de adotar.
4. O mapa é colado no system prompt do agente no n8n, dando ao agente uma visão sempre carregada do banco.

### Bateria de Perguntas de Validação

Para verificar se o agente realmente responde bem com o novo mapa, uma bateria fixa de perguntas realistas é criada — cerca de 20 a 30 perguntas no estilo "quem faz parte do time de RH?" ou "quais laudos foram assinados para a Petrobras em 2025?". A Softo rascunha a bateria depois de revisar o mapa gerado; a Apsis confirma que as perguntas refletem necessidades operacionais reais.

1. A Softo rascunha um conjunto inicial de perguntas cobrindo os principais domínios inferidos.
2. A Apsis revisa e ajusta para realismo.
3. A bateria é rodada manualmente contra o agente; a taxa de acerto vira a base para medir melhorias futuras.

### Guia do Operador

Um guia operacional curto explica como rodar a extração, como revisar e commitar o mapa e como substituir a seção de mapa no system prompt do agente no n8n. O objetivo é que qualquer pessoa do time Softo consiga atualizar o mapa quando o banco mudar.

### Fichas por Tabela (Milestone 2)

No segundo milestone, a extração é expandida: para cada tabela, uma ficha detalhada separada é gerada — incluindo lista completa de colunas, relacionamentos de entrada e saída, uma amostra de linhas reais e alguns exemplos de queries envolvendo a tabela. Essas fichas não são carregadas no prompt; o agente as recupera sob demanda, pelo nome exato da tabela, quando precisa de detalhe além do mapa.

### Mecanismo de Lookup por Tabela (Milestone 2)

Para servir as fichas ao agente, um mecanismo de lookup é exposto — seja um endpoint adicional na Lambda existente ou um acesso HTTP simples aos arquivos. A escolha concreta é adiada para o plano técnico do Milestone 2.

### Integração com o Agente (Milestone 2)

O workflow no n8n é estendido para que o agente exponha o lookup como uma tool. Quando a pergunta do usuário exige detalhe sobre uma tabela específica, o agente chama a tool, recebe a ficha e a usa para compor uma query SQL mais precisa.

## Métricas de Sucesso

| Métrica | Alvo | Como medir |
|---------|------|------------|
| Cobertura do mapa | 100% das tabelas base listadas com nome, domínio e descrição de uma linha | Verificação automática: tabelas encontradas em `INFORMATION_SCHEMA.TABLES` vs. tabelas listadas no mapa |
| Qualidade de resposta do agente | ≥ 80% das perguntas da bateria respondidas corretamente | Execução manual da bateria de validação; Softo pontua cada resposta, Apsis confirma |
| Tempo de resposta do agente | ≤ 20 segundos por pergunta | Logs de execução do n8n |
| Esforço de regeneração | Um desenvolvedor consegue regerar e implantar o mapa em menos de 30 minutos ponta a ponta | Cronometrado pelo desenvolvedor nas duas primeiras execuções |

## Milestones

### Milestone 1 — Mapa do Banco (MVP)

Entrega a camada de conhecimento central: um mapa gerado, revisável por humano, que pode ser colado no prompt do agente, mais uma bateria de validação para medir se o agente está de fato respondendo bem.

**Inclui:**
- Script de Extração do Schema
- Gerador do Mapa do Banco (Markdown, conteúdo em pt-BR)
- Bateria de Perguntas de Validação
- Guia do Operador

### Milestone 2 — Fichas por Tabela

Expande a camada de conhecimento para que o agente consiga puxar detalhe sobre tabelas específicas sob demanda, melhorando a qualidade de resposta em perguntas que exigem olhar colunas, relacionamentos ou valores de exemplo.

**Inclui:**
- Gerador de Fichas por Tabela
- Mecanismo de lookup
- Integração da tool no n8n

## Ideias Futuras

- **Corpus de perguntas reais (camada Q&A)** — assim que o agente começar a rodar em produção, coletar pares reais pergunta → SQL. Quando acumular o suficiente, viram uma camada de busca semântica que melhora muito a precisão em perguntas recorrentes.
- **Busca semântica com OpenSearch** — quando o corpus Q&A crescer além do que o lookup determinístico consegue atender, o cluster OpenSearch já disponível na stack vira o lar natural para ele.
- **Views e stored procedures** — não incluídas nas primeiras iterações porque a presença delas no banco da Apsis precisa ser explorada. Confirmada a relevância, estender a extração para cobri-las.
- **Regeneração automática** — sair da execução manual para um gatilho (detecção de mudança de schema ou cron) para que o mapa nunca fique silenciosamente desatualizado.
- **Aviso de mapa desatualizado** — embutir um hash de schema ou timestamp no mapa para que o agente sinalize ao usuário quando o mapa está mais antigo que o banco ao vivo.
- **Anotações de cardinalidade** — adicionar contagens de linhas e distribuição de valores por tabela para que o agente escolha estratégias de filtragem mais inteligentes.
- **Efeitos colaterais da exploração** — a primeira regeneração também serve como passada de descoberta; o que aparecer (views, PII, convenções incomuns) pode remodelar o backlog.

## Notas

- A Lambda existente em `repos/sql/` é reutilizada tanto para queries de runtime pelo agente quanto como transporte para queries de introspecção pelo script de extração — nenhuma nova infraestrutura é necessária para o Milestone 1.
- As credenciais de API da Lambda já estão disponíveis ao projeto em `.env.tool`.
- A Lambda tem timeout de conexão de 5 segundos; queries de extração precisam ser fatiadas em lotes pequenos.
- Assume-se que não há PII no banco da Apsis; se a exploração provar o contrário, o plano para sample data no Milestone 2 é revisitado.
