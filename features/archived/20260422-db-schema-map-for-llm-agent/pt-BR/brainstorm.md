# Brainstorm: Mapa de Schema SQL Server para Agente LLM

**Data**: 2026-04-22
**Participantes**: Gabriel, Claude

## Enunciado do Problema

Está sendo construído um Agente de Busca em Banco de Dados dentro de um workflow n8n já existente. Um roteador decide qual agente atende cada requisição do usuário; quando a pergunta exige dados do SQL Server da empresa, esse agente é acionado. Para responder corretamente, o agente precisa gerar o SQL certo contra um schema de ~202 tabelas — tarefa que não se faz de forma confiável apenas com nomes de tabelas e colunas.

O objetivo desta feature é produzir os artefatos que ensinam o agente sobre o que existe no banco, o que cada coisa significa em termos de negócio e como se relacionam. O agente usa esses artefatos em tempo de inferência para compor SQL, que é executado através da Lambda SQL proxy existente (a mesma Lambda que o agente já chama como ferramenta).

Não se trata de expor uma nova API ou UI — trata-se de produzir os artefatos de conhecimento certos para que o agente responda de forma confiável.

## Estado Atual

- Banco de dados: SQL Server em AWS RDS, cerca de 202 tabelas. O agrupamento por domínio de negócio não é conhecido de antemão e precisa ser inferido durante a introspecção. Descrições a nível de coluna (extended properties do SQL Server) devem existir, mas precisam ser verificadas.
- Lambda existente (`repos/sql/index.mjs`): implantada na VPC do banco, aceita `POST` com body `{query}` e header `x-api-key`, executa SQL arbitrário e retorna `{rowCount, rows}`. Já é usada como ferramenta pelo agente do n8n em runtime.
- Workflow n8n: router → agente de DB → ferramenta Lambda. O agente hoje não tem contexto de schema — tem o canal de execução, mas não a camada de conhecimento.
- Não existe corpus de queries SQL, relatórios ou exemplos de perguntas em linguagem natural para alimentar o agente.
- OpenSearch está disponível na stack mas não é adotado em v1 (ver conclusões).

## Conclusões Principais

- O resultado desta feature não é um único documento. É um **pacote de conhecimento em três camadas**, desenhado para como o agente consome contexto.
  - **Camada 1 — Mapa do Banco (no prompt):** documento Markdown curto (meta abaixo de 3k tokens) listando as 202 tabelas agrupadas por domínio de negócio, com uma linha de descrição cada, os principais relacionamentos entre domínios e convenções. Carregado diretamente no system prompt do agente de DB.
  - **Camada 2 — Fichas por Tabela (lookup determinístico):** um arquivo por tabela, com estrutura fixa — descrição de negócio, DDL (colunas, tipos, nullability, PK), FKs de saída e de entrada, 3–5 linhas de sample data real e 2–3 exemplos de queries envolvendo a tabela. O agente busca a ficha pelo nome exato da tabela via uma tool de lookup. Sem busca semântica.
  - **Camada 3 — Exemplos Q&A:** adiada para iteração futura. Começa vazia. Será adicionada quando o uso real produzir um corpus de pares "pergunta → SQL" que justifique indexação.
- **OpenSearch não é usado em v1.** A Camada 1 vive no prompt, a Camada 2 é recuperada por nome exato e a Camada 3 ainda não existe. OpenSearch volta a ser candidato depois, quando a Camada 3 crescer e busca semântica passar a agregar valor.
- Os artefatos são produzidos por um **script de extração separado** que vive dentro do repositório `repos/sql/` existente (mesmo projeto), rodando fora do handler da Lambda mas reutilizando a Lambda como canal para consultar o banco.
- O processo de extração roda **manualmente, sob demanda** — não há agendamento — disparado quando o schema muda de forma relevante.
- O agente **não** precisa dos dados dentro do prompt. Ele tem execução direta de SQL via ferramenta Lambda. Os artefatos existem para ajudá-lo a decidir *o que consultar*, não para simular o banco.
- **Assume-se que não há PII** neste banco. Sample data real vai para as fichas sem anonimização.
- A introspecção usa catálogos nativos do SQL Server: `INFORMATION_SCHEMA.TABLES`, `INFORMATION_SCHEMA.COLUMNS`, `sys.foreign_keys` + `sys.foreign_key_columns` para relacionamentos e `sys.extended_properties` para descrições de negócio em tabelas e colunas.

## Abordagens Consideradas

| Abordagem | Prós | Contras | Veredito |
|-----------|------|---------|----------|
| Documento único monolítico no prompt do agente | Simples, sem camada de retrieval para manter | 80–200k tokens por turno; caro; ~70% irrelevante em qualquer pergunta | Descartada |
| Dump de DDL puro (apenas CREATE TABLE) | Fácil de gerar via introspecção | LLM perde o significado de negócio; joins e colunas erradas | Descartada |
| Três camadas com RAG em OpenSearch para Camadas 2 e 3 | Escala bem quando a Camada 3 crescer; um padrão único de retrieval | Adiciona complexidade de infra; busca semântica agrega pouco na Camada 2 (lookup por nome exato é melhor); Camada 3 vazia em v1 torna o retrieval quase inútil | Descartada em v1, mantida como opção futura |
| Três camadas sem OpenSearch (mapa no prompt + fichas via tool determinística + Q&A adiada) | Infra mínima; lookup determinístico; entrega mais rápida; casa com o que v1 realmente precisa | Exige revisitar infra quando a Camada 3 amadurecer | Escolhida |
| Introspecção dinâmica em runtime (agente consulta catálogos ao vivo) | Sempre atualizado; sem artefato para manter | Lento; uma chamada Lambda por passo de descoberta; contexto ruidoso | Descartada |
| Camada Q&A populada com queries reais da empresa | Linguagem real do usuário; qualidade alta desde o início | Esse corpus não existe | Não viável em v1 |
| Camada Q&A populada com exemplos sintéticos gerados por LLM | Já dá um corpus inicial no dia 1 | Qualidade desigual; exige curadoria; sem camada de retrieval pode atrapalhar mais do que ajudar | Descartada em v1 |

## Delimitação de Escopo

### Dentro do Escopo
- Introspecção do schema via a Lambda SQL proxy existente.
- Geração do Mapa do Banco (Camada 1) e das Fichas por Tabela (Camada 2).
- Mecanismo de lookup determinístico para a Camada 2 (ficha por nome de tabela) — o formato exato (novo endpoint na Lambda, arquivos estáticos lidos pelo n8n etc.) será decidido nas fases de overview/dev-plan.
- Fluxo de regeneração manual, sob demanda.
- Agrupamento por domínio de negócio inferido a partir de schemas do SQL Server / prefixos de tabela, com espaço para revisão humana.

### Fora do Escopo (para v1)
- OpenSearch ou qualquer vector store.
- Camada 3 (exemplos Q&A) — considerada em iteração futura, quando o uso real gerar exemplos.
- Alteração do router n8n existente ou criação de novos agentes.
- Mudanças no comportamento central de execução SQL da Lambda (novos endpoints para o lookup da Camada 2 estão em aberto; nova autenticação, paginação, reescrita de query não).
- Lógica de detecção ou anonimização de PII.
- Regeneração automática/agendada (cron, triggers em DDL).
- UI para editar ou explorar o mapa de schema.
- Controle de custo de query ou cache de resultados SQL.
- Suporte a bancos que não sejam SQL Server.

## Restrições e Riscos

- **Timeout de conexão da Lambda é de 5 segundos** (`connectionTimeout: 5000` em `index.mjs`). Queries de introspecção precisam ser individualmente rápidas; joins pesados contra system views podem precisar ser fatiados.
- **API key é a única autenticação** da Lambda. O script de extração reutiliza a mesma credencial; nenhuma nova superfície de auth é introduzida.
- **Extended properties podem estar esparsas ou ausentes** em algumas tabelas, apesar da premissa. As fichas precisam degradar bem quando descrições faltam, caindo para nomes de colunas e significado inferido.
- **O lookup determinístico depende de o agente escolher o nome certo da tabela a partir do Mapa.** Se a Camada 1 estiver confusa ou incompleta, o agente vai pedir a ficha errada. A qualidade da Camada 1 é, portanto, crítica.
- **Inferência de domínio é heurística**. Schemas e prefixos de nome podem não se alinhar de forma limpa aos domínios de negócio; a Camada 1 vai exigir uma passagem de revisão humana.
- **Drift de schema é invisível** entre regenerações manuais. Se o agente começar a errar após uma mudança de DDL, a depuração começa com "o mapa está desatualizado?"
- **Adiar a Camada 3** é uma aposta deliberada de que lookup determinístico + um bom Mapa são suficientes para a precisão inicial. Se a precisão decepcionar, reabrir Q&A (e possivelmente OpenSearch) volta para a mesa.

## Perguntas em Aberto

- O que deve disparar uma regeneração na prática — uma cadência de calendário, um aviso do DBA ou "quando o agente começar a errar"?
- A Camada 1 deveria registrar qual versão do schema reflete (timestamp ou hash do DDL) para que o agente avise o usuário quando estiver desatualizado?
- Onde a Camada 2 fica fisicamente e como é servida — novo handler na Lambda existente (ex.: `GET /schema/tables/:name`), arquivos estáticos lidos por um nó n8n, ou outra coisa?
- O script de extração também deve capturar views e stored procedures, ou limitar a v1 apenas a tabelas base?
- Formato das fichas: JSON (mais fácil para código gerar e consumir) vs. Markdown (mais natural para o LLM ler). Escolher um, ou suportar os dois?
- Qual sinal diz que a Camada 3 vale a pena ser adicionada — uma contagem de perguntas reais, um gap de precisão medido, um padrão específico de falhas?
