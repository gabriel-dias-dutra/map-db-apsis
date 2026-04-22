# Brainstorm: SQL Server Schema Map for LLM Agent

**Date**: 2026-04-22
**Participants**: Gabriel, Claude

## Problem Statement

A Database Search Agent is being built inside an existing n8n workflow. A router decides which agent handles each user request; when the user asks something that requires data from the company's SQL Server database, this agent is invoked. To answer correctly, the agent must generate the right SQL against a schema of ~202 tables — a task that cannot be done reliably from table and column names alone.

The goal of this feature is to produce the artifacts that teach the agent what exists in the database, what each thing means in business terms, and how things relate. The agent uses those artifacts at inference time to compose SQL, which is executed through the existing Lambda SQL proxy (the same Lambda the agent already calls as a tool).

This is not about exposing a new API or UI — it is about producing the right knowledge artifacts so the agent answers reliably.

## Current State

- Database: SQL Server on AWS RDS, around 202 tables. Business-domain grouping is not known in advance and must be inferred during introspection. Column-level descriptions (SQL Server extended properties) are expected to exist but must be verified.
- Existing Lambda (`repos/sql/index.mjs`): deployed in the DB's VPC, accepts `POST` with body `{query}` and header `x-api-key`, executes arbitrary SQL, returns `{rowCount, rows}`. Already used as a tool by the n8n agent at runtime.
- n8n workflow: router → DB agent → Lambda tool. The agent currently has no schema context — it has the execution channel, but not the knowledge layer.
- No existing corpus of SQL queries, reports, or natural-language question examples to seed the agent with.
- OpenSearch is available in the stack but is not adopted for v1 (see conclusions).

## Key Conclusions

- The output of this feature is not a single document. It is a **three-layer knowledge pack** tailored to how the agent consumes context.
  - **Layer 1 — Database Map (in-prompt):** a short Markdown document (target under 3k tokens) listing the 202 tables grouped by business domain, with one-line descriptions, the main cross-domain relationships, and conventions. Loaded directly into the DB agent's system prompt.
  - **Layer 2 — Table Fact Sheets (deterministic lookup):** one file per table with a fixed structure — business description, DDL (columns, types, nullability, PK), outgoing and incoming FKs, 3–5 rows of real sample data, and 2–3 example queries involving the table. The agent fetches a sheet by exact table name through a lookup tool. No semantic retrieval.
  - **Layer 3 — Q&A Examples:** deferred to a later iteration. Starts empty. Will be added once real usage produces a corpus of question → SQL pairs worth indexing.
- **OpenSearch is not used in v1.** Layer 1 lives in the prompt, Layer 2 is retrieved by exact name, and Layer 3 does not exist yet. OpenSearch becomes a candidate later, when Layer 3 grows and semantic search adds value.
- The artifacts are produced by a **separate extraction script** that lives inside the existing `repos/sql/` repository (same project), running outside the Lambda handler but reusing the Lambda as the transport to query the database.
- The extraction process runs **manually, on demand** — not on a schedule — triggered when the schema changes meaningfully.
- The agent does **not** need data inside its prompt. It has direct SQL execution via the Lambda tool. The artifacts exist to help it decide *what to query*, not to simulate the database.
- **PII is assumed to be absent** from this database. Real sample data is included in the fact sheets without anonymization.
- Introspection relies on SQL Server native catalogs: `INFORMATION_SCHEMA.TABLES`, `INFORMATION_SCHEMA.COLUMNS`, `sys.foreign_keys` + `sys.foreign_key_columns` for relationships, and `sys.extended_properties` for business descriptions on tables and columns.

## Approaches Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Single monolithic document in the agent's prompt | Simple, no retrieval layer to maintain | 80–200k tokens per turn; expensive; ~70% irrelevant on any given question | Discarded |
| Pure DDL dump (CREATE TABLE statements only) | Easy to generate from introspection | LLMs miss business meaning; wrong joins and wrong column choices | Discarded |
| Three-layer pack with RAG on OpenSearch for Layers 2 and 3 | Scales cleanly when Q&A grows; single retrieval pattern | Adds infra complexity; semantic search gives little value for Layer 2 (exact table-name lookup is better); Layer 3 is empty at v1 so retrieval is barely useful | Discarded for v1, kept as future option |
| Three-layer pack without OpenSearch (map in prompt + fact sheets via deterministic tool + Q&A deferred) | Minimal infra; deterministic lookup; faster to ship; matches actual v1 needs | Requires revisiting infra later when Q&A grows | Chosen |
| Dynamic schema introspection at agent runtime (agent queries catalogs live) | Always up to date; no artifact to maintain | Slow; a Lambda call per discovery step; noisy context | Discarded |
| Q&A layer seeded by harvesting existing company queries | Real-world phrasing, immediate high quality | No such corpus exists | Not viable at v1 |
| Q&A layer seeded by LLM-generated synthetic examples | Gets a starting corpus on day 1 | Uneven quality; needs curation; may do more harm than good without a retrieval layer | Discarded for v1 |

## Scope Boundaries

### In Scope
- Schema introspection via the existing Lambda SQL proxy.
- Generation of the Database Map (Layer 1) and Table Fact Sheets (Layer 2).
- A deterministic lookup mechanism for Layer 2 (fact sheet by table name) — exact shape (new Lambda endpoint, static files read by n8n, etc.) to be decided in the overview/dev-plan phase.
- Manual, on-demand regeneration workflow.
- Business-domain grouping inferred from SQL Server schemas / table-name prefixes, with room for human review.

### Out of Scope (for v1)
- OpenSearch or any vector store.
- Layer 3 (Q&A examples) — will be considered in a future iteration once real usage produces examples.
- Modifying the existing n8n router or adding new agents.
- Changes to the core SQL execution behavior of the Lambda (new endpoints for Layer 2 lookup are on the table; new auth, pagination, query rewriting are not).
- PII detection or anonymization logic.
- Automated/scheduled regeneration (cron, DDL triggers).
- A UI for editing or exploring the schema map.
- Query-cost controls or SQL result caching.
- Support for databases other than SQL Server.

## Constraints and Risks

- **Lambda connection timeout is 5 seconds** (`connectionTimeout: 5000` in `index.mjs`). Introspection queries must be individually fast; heavy joins against system views may need to be split into smaller calls.
- **API key is the only auth** on the Lambda. The extraction script reuses the same credential; no new auth surface is introduced.
- **Extended properties may be sparse or absent** on some tables despite the assumption. Fact sheets must degrade gracefully when descriptions are missing, falling back to column names and inferred meaning.
- **Deterministic lookup relies on the agent picking the right table name from the Map.** If Layer 1 is unclear or incomplete, the agent will request the wrong fact sheet. Layer 1 quality is therefore load-bearing.
- **Domain inference is heuristic**. Schemas and name prefixes may not align cleanly with business domains; Layer 1 needs a human review pass.
- **Schema drift is invisible** between manual regenerations. If the agent starts giving wrong answers after a DDL change, debugging begins with "is the map stale?"
- **Deferring Layer 3** is a deliberate bet that deterministic lookup plus a good Layer 1 is enough for initial accuracy. If accuracy disappoints, reopening Q&A (and possibly OpenSearch) comes back on the table.

## Open Questions

- What should trigger a regeneration in practice — a calendar cadence, a DBA notifying the team, or "when the agent starts getting things wrong"?
- Should Layer 1 record which version of the schema it reflects (timestamp or DDL hash) so the agent can warn the user when stale?
- Where does Layer 2 physically live and how is it served — new handler in the existing Lambda (e.g. `GET /schema/tables/:name`), static files read by an n8n node, or something else?
- Should the extraction script also capture views and stored procedures, or limit v1 to base tables only?
- Fact sheet format: JSON (easier for code to produce and consume) vs. Markdown (more natural for the LLM to read). Pick one, or support both?
- What signal tells us Layer 3 is worth adding — a count of real user questions, a measured accuracy gap, a specific pattern of failures?
