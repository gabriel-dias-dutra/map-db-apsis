# Mapa da tabela LaudoDetails para o agente de busca do banco

## Descrição

A Apsis já tem um agente de busca no banco rodando dentro de um workflow n8n: o agente recebe uma pergunta de negócio em português ("quais laudos foram assinados para a Petrobras em 2025?"), deveria traduzi-la em SQL, executá-la pelo Lambda de SQL existente e resumir a resposta. Hoje ele não consegue fazer isso de forma confiável porque não tem conhecimento estrutural da tabela `LaudoDetails` — a tabela onde mora o grosso das informações dos laudos. Ele não conhece as colunas, o que elas significam, como seus valores estão de fato armazenados, nem quais tabelas ficam do outro lado de referências como `ProposalId` e `SentDocumentId`.

Esta feature entrega esse conhecimento, de forma estreita e precisa, para essa única tabela. O entregável é um mapa commitado, em português, de `[projects].[LaudoDetails]` — todas as colunas descritas em linguagem de negócio, todos os relacionamentos diretos com tabelas vizinhas resolvidos e rotulados pela forma como foram descobertos, todas as armadilhas de tipo (valores numéricos e datas armazenados como texto) sinalizadas para o agente não montar SQL errado — mais o pequeno script que regera o mapa sempre que a tabela mudar. O mapa é colado no system prompt do agente para que ele raciocine sobre laudos sem precisar de retrieval.

## Objetivos

- Dar ao agente de busca uma compreensão completa e confiável de `LaudoDetails` para que ele construa SQL correto no domínio de laudos, inclusive JOINs corretos com tabelas vizinhas.
- Evitar a falha silenciosa mais provável: o agente tentando filtrar, ordenar ou agregar colunas armazenadas como texto como se fossem números ou datas.
- Manter o esforço proporcional ao escopo — uma tabela e seus vizinhos diretos, não o banco inteiro — deixando o script estruturado de modo que mapear outra tabela depois seja barato.
- Tornar a regeneração barata o suficiente para que o mapa se mantenha atual conforme a tabela evolui (meta: refresh completo em menos de cinco minutos por qualquer desenvolvedor Softo).

## Como funciona

### Introspecção do schema

Um desenvolvedor Softo roda um único comando dentro de `repos/sql/`. O script percorre o catálogo do SQL Server através do Lambda existente e captura tudo que é preciso para descrever `LaudoDetails`: suas colunas e tipos, quaisquer foreign keys que o banco conheça, quaisquer descrições em extended properties, contagens de linhas da tabela e de cada vizinho e — para campos em que não existe foreign key real — uma passada por convenção de nome para descobrir para qual tabela cada coluna `*Id` provavelmente aponta e quais outras tabelas referenciam `LaudoDetails.Id`. O script escreve todos os dados capturados num snapshot JSON bruto no repositório, para que o próximo passo (e qualquer ferramenta futura) tenha uma entrada limpa.

1. O desenvolvedor roda o comando (ex.: `npm run map-laudo-details`) com as credenciais do Lambda já presentes em `.env.tool`.
2. O script executa cada query de introspecção em lotes pequenos para nenhum extrapolar o timeout de cinco segundos do Lambda.
3. Imprime um resumo curto de progresso — o que achou no catálogo, o que teve que inferir por nome, quais campos candidatos não casaram com nenhuma tabela existente.
4. Grava o snapshot JSON em um caminho fixo dentro de `repos/sql/`.

### Geração do mapa

Um segundo passo consome o snapshot JSON e produz o mapa final: um único arquivo Markdown, em português brasileiro, desenhado para ser colado no system prompt do agente. O arquivo abre com uma seção proeminente de "avisos de tipo" listando todas as colunas cujo tipo de armazenamento não bate com o significado semântico — margens e razões financeiras guardadas como texto, datas como strings — com a regra simples que o agente deve seguir ("não filtrar nem agregar numericamente; fazer cast ou parse primeiro"). Cada coluna avisada também recebe um marcador inline na sua própria linha, para a regra ser impossível de ignorar. O resto do arquivo lista cada coluna com descrição em português, uma tabela de relacionamentos diretos (cada um marcado como "FK", "inferido por nome" ou "por valor correspondente") e um resumo compacto das tabelas vizinhas nas quais o agente pode precisar fazer JOIN.

1. O desenvolvedor roda o segundo comando (`npm run generate-laudo-details-map`) — ou, se fundirmos o fluxo num só, o mesmo comando anterior.
2. O script lê o snapshot JSON e renderiza o Markdown.
3. Imprime um resumo: quantas colunas foram descritas automaticamente, quantas estão marcadas como descrição pendente, quantos relacionamentos foram encontrados, quais são FK e quais são inferidos.
4. O Markdown é escrito em um caminho fixo no repositório e commitado.

### Integração com o agente

O desenvolvedor substitui a seção de laudos do system prompt do agente n8n — delimitada por comentários-marcador claros — pelo conteúdo do Markdown gerado. Uma seção curta de uso no `repos/sql/README.md` documenta os dois comandos, onde ficam as saídas e como atualizar o agente.

1. O desenvolvedor abre o workflow n8n e localiza o system prompt do agente.
2. Substitui a seção entre `<!-- LAUDO-DETAILS:START -->` e `<!-- LAUDO-DETAILS:END -->` pelo Markdown recém-gerado.
3. Salva o workflow.
4. Faz um teste rápido submetendo algumas perguntas reais de laudos e sanitiza o SQL produzido.

## Métricas de sucesso

Como saber se deu certo? Porque o escopo é uma única tabela, o sucesso é medido por cobertura e correção nessa tabela, em vez de por uma bateria ampla de validação.

| Métrica | Alvo | Como medir |
|---------|------|------------|
| Cobertura de colunas | 19/19 colunas de `LaudoDetails` documentadas — ou explicitamente marcadas como "pendente" com motivo | Checklist revisado no pull request; o próprio gerador imprime a contagem |
| Resolução de relacionamentos | 100% das colunas `*Id` mais `ClientName` e `GICS` resolvidas para uma tabela-alvo, um alvo inferido ou um "sem correspondência encontrada" explícito | Saída do script comparada com o mapa commitado durante a revisão |
| Cobertura da armadilha de tipos | Toda coluna cujo tipo armazenado difere do tipo semântico (valor numérico ou data guardado como texto) aparece na seção de avisos de tipo e na própria linha | Diff manual do CREATE TABLE contra o mapa gerado |
| Qualidade do SQL do agente em perguntas-piloto | 4 de 5 perguntas-piloto de laudos respondidas com SQL correto (estruturalmente válido, JOINs corretos, tratamento correto de campos numéricos guardados como texto) | Desenvolvedor Softo roda cinco perguntas reais contra o agente depois que o mapa foi colado |
| Tempo de regeneração | Abaixo de 5 minutos de ponta a ponta para um desenvolvedor Softo | Cronometrado pelo desenvolvedor nas duas primeiras execuções |

## Marcos

### Marco 1 — Mapa da LaudoDetails (MVP)

A feature inteira. Entrega o script, o mapa gerado e a integração com o agente para que o agente de busca consiga responder perguntas sobre laudos corretamente desde o primeiro dia. Tudo listado em "Como funciona" vive neste marco.

**Inclui:**
- Script de introspecção do schema (snapshot JSON da `LaudoDetails` + vizinhos diretos + cardinalidade)
- Gerador do mapa (Markdown em português com seção de avisos de tipo, marcas inline, tabela de relacionamentos, resumos de vizinhos)
- Integração com o agente (mapa colado entre marcadores no prompt n8n, seção curta de README)

## Ideias futuras

- **Parametrizar o script por nome de tabela** — assim que uma segunda tabela for pedida (provavelmente `Proposal` ou `SentDocument`), generalizar `map-laudo-details` em `map-table` e manter saídas por tabela lado a lado. Custo baixo porque o script já é estruturado em torno de um parâmetro de tabela internamente.
- **Bateria de perguntas de validação** — se o mapa provar seu valor, adicionar um conjunto commitado de 5–10 perguntas de laudos com respostas esperadas, como o plano arquivado tinha, para que regressões sejam detectadas de forma objetiva em vez de anedótica.
- **Revisão semântica da Apsis** — pedir ao time da Apsis para revisar as descrições provisórias de termos financeiros (`UnleveredBeta`, `GrossMarginPerpetuity`, `GICS`, etc.) e substituí-las por linguagem autorizada. Feito numa única passada quando o mapa estiver estável.
- **Fluxo de autoria por extended property** — em vez de carregar descrições só no Markdown gerado, empurrar descrições confirmadas de volta para `sys.extended_properties` do SQL Server, para que o próprio banco seja a fonte da verdade e cada regeneração futura preserve o conteúdo.
- **Indicador de mapa desatualizado** — embutir um hash do DDL da tabela no mapa para que o agente (ou um check de CI) avise quando o schema ao vivo não bater mais com o mapa.
- **Contexto de 2 hops sob demanda** — se o agente começar a precisar de contexto além dos vizinhos diretos (ex.: cliente dono de uma proposta), adicionar uma ferramenta de lookup que busque fact sheets por tabela sem inchar o system prompt.

## Notas

- O trabalho acontece inteiramente dentro de `repos/sql/`. Sem nova infraestrutura, sem novos destinos de deploy. O Lambda de SQL existente (Node.js, `mssql` v11, `x-api-key`, timeout de conexão de cinco segundos) é o único transporte.
- As credenciais vivem em `.env.tool` na raiz do projeto (`URL`, `API_KEY`) e já estão disponíveis para qualquer desenvolvedor Softo.
- O `CREATE TABLE` compartilhado para `LaudoDetails` não tem PRIMARY KEY declarada nem FOREIGN KEY declarada. O script precisa tratar os dois casos — FKs reais presentes no banco real ou não — e rotular cada relacionamento descoberto pelo mecanismo de descoberta, para que o leitor sempre saiba quão confiável ele é.
- A semântica é autorada pela Softo com base em conhecimento geral de domínio. Qualquer coluna que a Softo não consiga descrever com segurança é escrita como "pendente" com um motivo curto e completada em iteração seguinte — possivelmente com input da Apsis.
- A feature arquivada `features/archived/20260422-db-schema-map-for-llm-agent` é a abordagem anterior, de banco inteiro. Nada dela está sendo reaproveitado diretamente.
