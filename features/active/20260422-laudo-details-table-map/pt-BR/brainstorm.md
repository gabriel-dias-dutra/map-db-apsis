# Brainstorm: Mapeamento da tabela `[projects].[LaudoDetails]`

**Data**: 2026-04-22
**Participantes**: cafesao, Claude

## Declaração do problema

O agente de busca do banco, que roda dentro de um workflow n8n, existe para responder perguntas de negócio sobre laudos convertendo cada pergunta em SQL, executando pelo Lambda de SQL já existente (`repos/sql/`) e resumindo o resultado. Hoje o agente tem o canal de execução, mas nenhum conhecimento estrutural sobre `[projects].[LaudoDetails]` — não sabe quais colunas existem, o que significam, para quais tabelas elas se relacionam, nem as armadilhas de forma dos dados que precisa evitar. Sem esse conhecimento, o agente não consegue construir uma consulta correta no domínio de laudos.

Um plano anterior tentou mapear o banco Apsis inteiro (~202 tabelas). Esse escopo foi reduzido: agora o objetivo é produzir um mapa focado e confiável de **uma tabela** — a `LaudoDetails` — mais o mínimo de contexto ao redor que o agente precisa para raciocinar sobre ela (relacionamentos diretos e implicações relevantes). Essa é a fatia mais valiosa do banco para o agente hoje, e fica pequena o suficiente para um único desenvolvedor autorar do começo ao fim.

A observação isolada de maior impacto para a correção do SQL é uma de forma de dado, não relacional: várias colunas de `LaudoDetails` que parecem numéricas ou de data estão armazenadas como `nvarchar` (`GrossMarginPerpetuity`, `EbitdaMarginBaseDate`, `UnleveredBeta`, `DebtCost`, `NetOperatingRevenue`, `RevenueGrowthLast3Years`, `BaseDate`, `LastHistoricalYear`). Sem ser avisado disso, o agente vai tentar filtrar, ordenar ou agregar esses campos numericamente e falhar silenciosamente ou devolver resultados errados. Documentar essa armadilha provavelmente é o entregável de maior alavancagem do exercício.

## Estado atual

- **Transporte:** `repos/sql/` é um Lambda AWS enxuto (Node.js, `mssql` v11). Aceita uma única `query` por requisição, autentica via header `x-api-key` e tem `connectionTimeout` de 5000 ms. Devolve `{ rowCount, rows }` e propaga erros do mssql. Zero ferramental de introspecção, zero conhecimento de domínio — nenhuma referência a `LaudoDetails`, `Proposal`, `SentDocument` ou `projects.*` no repositório.
- **Credenciais:** `.env.tool` na raiz do projeto guarda `URL` e `API_KEY` do Lambda, já disponíveis a qualquer desenvolvedor Softo.
- **Lado do agente:** o agente n8n hoje não tem mapa do banco no system prompt; não consegue raciocinar sobre `LaudoDetails`.
- **A tabela em si (a partir do CREATE TABLE fornecido):** sem PRIMARY KEY declarada, sem FOREIGN KEY declarada. Colunas como `ProposalId` e `SentDocumentId` parecem ser FKs por convenção, mas não são reforçadas no DDL compartilhado. Isso pode refletir o banco real ou ser um artefato do recorte — o script vai precisar checar `sys.foreign_keys` para descobrir.
- **Tentativa anterior:** `features/archived/20260422-db-schema-map-for-llm-agent` cobria a abordagem de banco inteiro e foi arquivada. Nada dela é reaproveitado diretamente; o padrão de Lambda-como-transporte e a ideia de artefato Markdown commitado permanecem conceitualmente.

## Conclusões-chave

- O entregável é um **fact sheet de uma única tabela** para `[projects].[LaudoDetails]` mais sua vizinhança relacional direta — não é um mapa do banco inteiro.
- **Implicações de forma de dado são conteúdo de primeira classe.** O mapa precisa sinalizar colunas armazenadas como `nvarchar` que carregam valores numéricos ou de data, porque isso determina que SQL o agente pode escrever sobre elas.
- **A descoberta de relacionamentos roda primeiro o catálogo do SQL Server e, depois, cai para inferência por nome.** O script consulta `sys.foreign_keys` para constraints reais; quando não há (ou há apenas parciais), infere por convenção de nome de coluna (`ProposalId` → `Proposal`, `SentDocumentId` → `SentDocument`, e varre `LaudoDetailsId` em outras tabelas para referências reversas). O documento final indica qual mecanismo produziu cada relacionamento, para o leitor (e o agente) julgarem a confiança.
- **O escopo para em 1 hop.** Vizinhos diretos de `LaudoDetails` são mapeados com descrição mínima; os vizinhos dos vizinhos não são. Ir além reabre o problema do mapa do banco inteiro.
- **Campos de contexto sem FK (`ClientName`, `GICS`) são relacionamentos "implícitos por valor".** Se uma tabela-alvo provável existir (`Client*`, `Cliente*`, `GICS*`, `Setor*`), ela é documentada com aviso explícito de que qualquer JOIN tem de ser por texto, não por ID. Se não existir tal tabela, a coluna é documentada apenas como string denormalizada em `LaudoDetails`.
- **A Softo autora toda a semântica.** As descrições de coluna vêm das extended properties do SQL Server quando disponíveis, e da Softo nos demais casos — apoiando-se em conhecimento geral de domínio para termos financeiros (ex.: `UnleveredBeta`, `GrossMarginPerpetuity`, `GICS`). Qualquer coluna que o autor não conseguir descrever é listada explicitamente como "descrição pendente" na saída, para ser preenchida em iteração seguinte.
- **O artefato é um script reutilizável,** commitado em `repos/sql/` (ex.: `npm run map-laudo-details`), que roda as queries de introspecção e emite o Markdown final. Não é parametrizado genericamente agora, mas estruturado de modo que expandir para outra tabela depois seja barato.
- **Sem bateria de validação neste escopo.** A validação fica informal: o desenvolvedor experimenta algumas perguntas de laudos no agente e julga o resultado. Bateria commitada fica adiada.

## Abordagens consideradas

| Abordagem | Prós | Contras | Veredito |
|-----------|------|---------|----------|
| Só inferência por nome para relacionamentos | Script mais simples; bate com a observação de que o CREATE TABLE não tem FKs | Perde informação silenciosamente se o banco real tiver FKs; nada indica quais relacionamentos são confiáveis | Descartada |
| Só catálogo para relacionamentos | Totalmente determinística; sem chute | Devolve nada se o banco não tiver FKs formais (provável aqui); agente fica sem dicas de JOIN | Descartada |
| **Catálogo primeiro, depois inferência por nome** | Captura FKs reais quando existem e ainda produz mapa útil quando não existem; rotula cada relacionamento pela origem | Um pouco mais de código; dois caminhos a manter honestos | **Escolhida** |
| Mapa de 1 hop | Mantém o escopo contido; é o que o agente precisa para fazer JOINs corretos | Perde contexto transitivo (ex.: cliente dono de uma proposta) | **Escolhida** |
| Mapa de 2 hops | Quadro mais rico para o agente | Reintroduz o problema do mapa do banco inteiro; explode o escopo | Descartada |
| Só Softo autorando semântica | Mais rápido; sem bloqueio na disponibilidade da Apsis | Termos financeiros podem ficar imprecisos até revisão da Apsis | **Escolhida**, com marcadores explícitos de "preencher depois" |
| Apsis autorando semântica | Máxima precisão nos termos financeiros | Bloqueia entrega na disponibilidade deles | Descartada |
| Script reutilizável | Barato de re-executar quando a tabela mudar; estruturado para reuso | Mais trabalho inicial que um one-shot | **Escolhida** |
| Investigação one-shot manual | Redação inicial mais rápida | Cada refresh futuro vira trabalho manual; não acumula valor | Descartada |
| Script genérico por tabela (parametrizado agora) | Máximo reuso futuro | Excesso de engenharia para a necessidade atual — risco de YAGNI | Descartada por ora; revisitar se outra tabela for pedida |

## Limites do escopo

### Dentro do escopo
- Todas as colunas de `[projects].[LaudoDetails]` com as descrições semânticas necessárias para o agente montar SQL correto.
- Notas explícitas de tipagem para colunas armazenadas como `nvarchar` que carregam valores numéricos ou de data (a "armadilha de tipos").
- Relacionamentos diretos (1 hop) descobertos via `sys.foreign_keys` **e** via convenção de nome — cada relacionamento rotulado pela fonte da descoberta.
- Referências reversas: outras tabelas cujas colunas referenciam `LaudoDetails.Id` (por FK ou por nome).
- Descrição mínima de cada tabela vizinha — só o suficiente para o agente saber quando um JOIN faz sentido.
- Contexto implícito por valor: `ClientName`, `GICS` mapeados para tabelas-alvo prováveis quando existirem, com aviso claro de JOIN por texto.
- Script reutilizável em `repos/sql/` que roda a introspecção e emite o Markdown final.
- Artefato Markdown commitado no repositório `sql`.

### Fora do escopo
- Mapear qualquer tabela além de `LaudoDetails` e seus vizinhos de 1 hop.
- Relacionamentos de 2 hops (vizinhos dos vizinhos).
- Bateria de perguntas de validação.
- Guia de operação formal (uma seção curta de uso no README basta).
- Arquivo de overrides YAML (herança do plano arquivado — desnecessário nesse escopo; a Softo edita o script ou o Markdown gerado diretamente).
- Views, stored procedures e functions.
- Amostras de dados ou tratamento de PII.

## Restrições e riscos

- **Timeout de 5s do Lambda** — todas as queries de introspecção precisam ser pequenas e direcionadas; não existe varredura de todos os schemas em uma única requisição.
- **Ausência de FKs formais** — provável dado o CREATE TABLE, logo o caminho de inferência por nome é o primário e precisa ser robusto; qualquer falta deve ser reportada, nunca omitida silenciosamente.
- **Convenções de nome inesperadas** — o banco pode usar prefixos encurtados (`PropId` em vez de `ProposalId`, `LaudoDetailsRef` em vez de `LaudoDetailsId`, etc.). O script deve imprimir candidatos sem match para um humano decidir, em vez de chutar.
- **Referências reversas em todos os schemas** — exige varredura em `INFORMATION_SCHEMA.COLUMNS`. Mantida estreita filtrando por padrões de nome de coluna, o que é barato — mas ainda precisa caber no timeout.
- **Termos de domínio financeiro autorados pela Softo** — `UnleveredBeta`, `GrossMarginPerpetuity`, `GICS` etc. podem exigir revisão da Apsis em uma iteração futura. O mapa deve ser explícito sobre quais descrições são provisórias.
- **Ativos do plano anterior** vivem em `features/archived/` e não devem ser tocados ou reaproveitados silenciosamente — a nova feature começa limpa.

## Perguntas abertas

- Qual é o path e nome de arquivo exatos do Markdown gerado (ex.: `repos/sql/laudo-details-map.md`)?
- O script gera um snapshot JSON intermediário antes do Markdown, ou vai direto da query do catálogo para o Markdown? (O plano arquivado mantinha um JSON intermediário; em escopo de 1 tabela pode ser excesso.)
- Como a "armadilha de tipos" aparece no Markdown final — seção dedicada no topo, anotação inline na linha de cada coluna afetada, ou as duas coisas?
- O script também captura e imprime contagens de linhas (cardinalidade) da `LaudoDetails` e de cada vizinho? Útil para o agente, mas adiciona uma query por tabela.
- Em qual idioma o Markdown final commitado vive — só inglês (voltado ao agente), só português (voltado ao revisor humano) ou os dois? O plano arquivado escolheu pt-BR para o prompt do agente; confirmar para esta feature.
