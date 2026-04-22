# SQL Server Schema Map for Database Search Agent

## Description

Apsis has a SQL Server database with around 202 tables. A database search agent running inside an n8n workflow is meant to answer business questions — "who is on the RH team?", "show me the laudos tied to Petrobras" — by translating each question into SQL, running it, and summarizing the result. Today the agent has the execution channel (an existing Lambda that runs arbitrary SQL from inside the database's VPC) but no structural knowledge of the data: it does not know which tables exist, what they mean, or how they relate. Without that knowledge the agent cannot build a correct query.

This feature produces the knowledge layer the agent is missing. The deliverable is not an application — it is a set of artifacts and a generation process that extract the database structure, translate it into human-readable business terms, and feed it to the agent so it can reason about what to query.

## Goals

- Give the search agent a complete, trustworthy map of the Apsis database so it can build correct SQL against tables it has never seen before.
- Keep the update process simple: on-demand regeneration by a Softo developer, no scheduled jobs, no new infrastructure in the first iteration.
- Establish a validation baseline (a fixed set of real questions) so agent improvements can be measured objectively over time.
- Avoid adding operational complexity (no vector store, no new services) until real usage proves they are needed.

## How It Works

### Schema Extraction

A script, executed on demand by a Softo developer, connects to the existing SQL execution Lambda and runs a series of introspection queries against the SQL Server catalogs. It retrieves the full list of tables, their columns and data types, foreign-key relationships between them, and any business descriptions already stored in the database's extended properties.

1. The developer runs the extraction command locally with the API credentials already available in the project's configuration.
2. The script queries the database in small, fast batches through the Lambda.
3. Raw schema data is saved as an intermediate file, ready to feed the map generator.

### Database Map

From the raw extraction, a second step produces a single Markdown document — the Database Map — written in Brazilian Portuguese. Tables are grouped by the business domain they belong to (inferred from SQL Server schemas and naming patterns, with room for human correction). Each table gets a one-line description, and the main relationships between domains are shown in a relationship summary.

1. The generator reads the raw extraction and groups tables into inferred domains.
2. It produces a clean Markdown file committed to the `sql` repository.
3. A developer reviews the generated map and, if needed, corrects domain grouping or descriptions before adopting it.
4. The map is pasted into the n8n agent's system prompt, giving the agent an always-loaded overview of the database.

### Validation Question Battery

To check whether the agent actually answers well with the new map, a fixed battery of realistic questions is created — roughly 20 to 30 questions in the style of "who is on the RH team?" or "which laudos were signed for Petrobras in 2025?". Softo drafts the battery after reviewing the generated map; Apsis confirms the questions reflect real operational needs.

1. Softo drafts an initial set of questions covering the main inferred domains.
2. Apsis reviews and adjusts for realism.
3. The battery is run manually against the agent; the hit rate becomes the baseline for measuring future improvements.

### Operator Guide

A short operational guide explains how to run the extraction, how to review and commit the map, and how to replace the map section of the agent's system prompt in n8n. The goal is that anyone on the Softo team can refresh the map when the database changes.

### Table Fact Sheets (Milestone 2)

In the second milestone the extraction is expanded: for each table, a separate detailed fact sheet is generated — including the full column list, incoming and outgoing relationships, a sample of real rows, and a few example queries involving the table. These fact sheets are not loaded into the prompt; the agent retrieves them on demand, by exact table name, when it needs detail beyond the map.

### Table Lookup Mechanism (Milestone 2)

To serve the fact sheets to the agent, a lookup mechanism is exposed — either an additional endpoint on the existing Lambda or a simple HTTP access to the files. The concrete choice is deferred to the Milestone 2 technical plan.

### Agent Integration (Milestone 2)

The n8n workflow is extended so the agent exposes the lookup as a tool. When a user question requires detail about a specific table, the agent calls the tool, receives the fact sheet, and uses it to compose a more precise SQL query.

## Success Metrics

| Metric | Target | How to measure |
|--------|--------|----------------|
| Map coverage | 100% of base tables listed with name, domain and one-line description | Automated check: tables found in `INFORMATION_SCHEMA.TABLES` vs. tables listed in the map |
| Agent answer quality | ≥ 80% of battery questions answered correctly | Manual run of the validation battery; Softo scores each answer, Apsis confirms |
| Agent response time | ≤ 20 seconds per question | n8n execution logs |
| Regeneration effort | One developer can regenerate and deploy the map in under 30 minutes end-to-end | Timed by the developer during the first two runs |

## Milestones

### Milestone 1 — Database Map (MVP)

Delivers the core knowledge layer: a generated, human-reviewable map of the database that can be pasted into the agent's prompt, plus a validation battery to measure whether the agent is actually answering well.

**Includes:**
- Schema Extraction script
- Database Map generator (Markdown, pt-BR content)
- Validation Question Battery
- Operator Guide

### Milestone 2 — Table Fact Sheets

Expands the knowledge layer so the agent can pull detail about specific tables on demand, improving answer quality on questions that require looking into particular columns, relationships or sample values.

**Includes:**
- Table Fact Sheet generator
- Lookup mechanism
- n8n tool integration

## Future Ideas

- **Real-question corpus (Q&A layer)** — once the agent runs in production, collect real question → SQL pairs. When enough accumulate they become a semantic retrieval layer that markedly improves accuracy on recurring questions.
- **Semantic search backed by OpenSearch** — when the Q&A corpus grows beyond what deterministic lookup can handle, the OpenSearch cluster already available in the stack becomes the natural home for it.
- **Views and stored procedures** — not included in the first iterations because their presence in the Apsis database needs exploration. When confirmed relevant, extend the extraction to cover them.
- **Automated regeneration** — move from manual run to a trigger (schema-change detection or cron) so the map is never silently stale.
- **Stale-map warning** — embed a schema hash or timestamp in the map so the agent can flag to the user when the map is older than the live database.
- **Cardinality annotations** — add row counts and value distribution per table so the agent can pick more intelligent filtering strategies.
- **Exploration side-effects** — the first regeneration doubles as a discovery pass; whatever surfaces (views, PII, unusual conventions) may reshape the backlog.

## Notes

- The existing Lambda at `repos/sql/` is reused both for runtime queries by the agent and as the transport for introspection queries from the extraction script — no new infrastructure is required for Milestone 1.
- The Lambda's API credentials are already available to the project in `.env.tool`.
- The Lambda has a 5-second connection timeout; extraction queries must be split into small batches.
- PII is assumed absent from the Apsis database; if exploration shows otherwise, the plan for sample data in Milestone 2 is revisited.
