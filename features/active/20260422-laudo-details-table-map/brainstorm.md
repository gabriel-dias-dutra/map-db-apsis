# Brainstorm: Mapping the `[projects].[LaudoDetails]` table

**Date**: 2026-04-22
**Participants**: cafesao, Claude

## Problem Statement

The database search agent running inside an n8n workflow is meant to answer business questions about valuations ("laudos") by turning each question into SQL, executing it via the existing Lambda SQL proxy (`repos/sql/`), and summarizing the result. Today the agent has the execution channel but no structural knowledge of `[projects].[LaudoDetails]` — it does not know which columns exist, what they mean, which tables they relate to, or the data-shape pitfalls it needs to avoid. Without that knowledge the agent cannot build a correct query against the laudos domain.

A previous plan tried to map the entire Apsis database (~202 tables). That scope has been cut down: the goal now is to produce a focused, trustworthy map of **one table** — `LaudoDetails` — plus the minimum surrounding context the agent needs to reason about it (direct relationships and relevant implications). This is the most valuable slice of the database for the agent today, and it stays small enough that a single developer can author it end-to-end.

The single most impactful observation for SQL correctness is a data-shape one, not a relational one: many `LaudoDetails` columns that look numeric or date-like are stored as `nvarchar` (`GrossMarginPerpetuity`, `EbitdaMarginBaseDate`, `UnleveredBeta`, `DebtCost`, `NetOperatingRevenue`, `RevenueGrowthLast3Years`, `BaseDate`, `LastHistoricalYear`). Without being told this, the agent will try to filter, sort, or aggregate them numerically and fail silently or return wrong results. Documenting this trap is likely the highest-leverage output of the exercise.

## Current State

- **Transport:** `repos/sql/` is a thin AWS Lambda (Node.js, `mssql` v11). It accepts a single `query` per request, authenticates via `x-api-key` header, and has a `connectionTimeout` of 5000 ms. It returns `{ rowCount, rows }` and surfaces mssql errors verbatim. No introspection tooling, no domain knowledge — zero references to `LaudoDetails`, `Proposal`, `SentDocument`, or `projects.*` anywhere in the repo.
- **Credentials:** `.env.tool` at the project root holds the Lambda `URL` and `API_KEY` already available to any Softo developer.
- **Agent side:** the n8n agent has no database map in its system prompt today; it cannot reason about `LaudoDetails` at all.
- **The table itself (from the user-provided CREATE TABLE):** no PRIMARY KEY declared, no FOREIGN KEY constraints declared. Columns like `ProposalId` and `SentDocumentId` read as foreign keys by convention but are not enforced in the DDL that was shared. This may reflect the real database or may be an artifact of the snippet — the script will need to check `sys.foreign_keys` to find out.
- **Previous attempt:** `features/archived/20260422-db-schema-map-for-llm-agent` covered the whole-database approach and has been archived. Nothing from it is being reused directly; the Lambda-as-transport pattern and the idea of a committed Markdown artifact carry over conceptually.

## Key Conclusions

- The deliverable is a **single-table fact sheet** for `[projects].[LaudoDetails]` plus its direct relational neighborhood — not a database-wide map.
- **Data-shape implications are first-class content.** The map must flag columns stored as `nvarchar` that hold numeric or date values, because that governs what SQL the agent can write against them.
- **Relationship discovery runs the SQL Server catalog first, then falls back to name inference.** The script queries `sys.foreign_keys` for real constraints; when none are present (or only partial), it infers by column-name convention (`ProposalId` → `Proposal`, `SentDocumentId` → `SentDocument`, and scans for `LaudoDetailsId` in other tables for reverse references). The final document states which mechanism produced each relationship so the agent (and the reader) can judge trust.
- **Scope stops at one hop.** Direct neighbors of `LaudoDetails` are mapped with a minimal description; their neighbors are not. Going deeper reopens the whole-database-map problem.
- **Context fields without FKs (`ClientName`, `GICS`) are "implicit-by-value" relationships.** If a likely target table exists (`Client*`, `Cliente*`, `GICS*`, `Setor*`), it is documented with an explicit warning that any JOIN has to be by text, not by ID. If no such table exists, the column is documented as denormalized string data on `LaudoDetails` and nothing more.
- **Softo authors all semantics.** Column descriptions come from SQL Server extended properties when available, otherwise from Softo — drawing on general domain knowledge for financial terms (e.g., `UnleveredBeta`, `GrossMarginPerpetuity`, `GICS`). Any column the author cannot describe is listed explicitly as "missing description" in the output so it can be filled in a follow-up.
- **The artifact is a reusable script,** committed to `repos/sql/` (e.g., `npm run map-laudo-details`), that runs the introspection queries and emits the final Markdown. Not generically parameterized now, but structured so expanding to another table later is cheap.
- **No validation battery in this scope.** Validation stays informal: the developer tries a few laudo questions against the agent and judges the result. A committed battery is deferred.

## Approaches Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Name-inference only for relationships | Simpler script; matches the observation that the CREATE TABLE has no FKs | Silently loses information if any FKs do exist in the real database; no way to tell which relationships are trustworthy | Discarded |
| Catalog-only for relationships | Fully deterministic; no guessing | Returns nothing if the database lacks formal FKs (likely in this DB); agent ends up without JOIN hints | Discarded |
| **Catalog first, then name inference** | Captures real FKs when they exist and still produces a useful map when they don't; labels each relationship with its source | Slightly more code; two code paths to keep honest | **Chosen** |
| One-hop mapping | Keeps the scope bounded; fits what the agent needs to JOIN correctly | Misses transitive context (e.g., client owner of a proposal) | **Chosen** |
| Two-hop mapping | Richer picture for the agent | Re-introduces the whole-database-map problem; explodes scope | Discarded |
| Softo-only semantic authoring | Fastest; no blocking on Apsis availability | Financial terms may be imprecise until Apsis reviews later | **Chosen**, with explicit "to fill later" markers |
| Apsis-authored semantics | Most accurate for financial terms | Blocks delivery on Apsis availability | Discarded |
| Reusable script | Cheap to re-run when the table changes; structured for future reuse | More upfront work than a one-shot | **Chosen** |
| One-shot manual investigation | Fastest initial write-up | Every future refresh is manual rework; no compounding value | Discarded |
| Generic per-table script (parameterized now) | Maximum future reuse | Overbuilds for current needs — YAGNI risk | Discarded for now; revisit if a second table is requested |

## Scope Boundaries

### In Scope
- All columns of `[projects].[LaudoDetails]` with the semantic descriptions needed for the agent to build correct SQL.
- Explicit typing notes on columns stored as `nvarchar` that hold numeric or date values (the "type trap").
- Direct relationships (one hop) discovered via `sys.foreign_keys` **and** via column-name convention — with each relationship labeled by its discovery source.
- Reverse references: other tables whose columns reference `LaudoDetails.Id` (by FK or by name).
- A minimal description of each neighbor table — just enough for the agent to know when a JOIN is warranted.
- Implicit-by-value context: `ClientName`, `GICS` mapped to likely target tables when such tables exist, with a clear JOIN-by-text warning.
- A reusable script in `repos/sql/` that runs the introspection and emits the final Markdown.
- Committed Markdown artifact in the `sql` repository.

### Out of Scope
- Mapping any table beyond `LaudoDetails` and its one-hop neighbors.
- Second-hop relationships (neighbors of neighbors).
- A validation question battery.
- A formal operator guide (a short README/command usage section is enough).
- An overrides YAML file (carry-over from the archived plan — not needed at this scope; Softo edits the script or the generated Markdown directly).
- Views, stored procedures, and functions.
- Sample row data or PII handling.

## Constraints and Risks

- **Lambda 5s connection timeout** — all introspection queries must be small and targeted; no scan over all schemas in a single request.
- **Missing formal FKs** — likely given the CREATE TABLE, so the name-inference path is the primary one and must be robust; any misses must be reported rather than silently dropped.
- **Unexpected naming conventions** — the database may use shortened prefixes (`PropId` instead of `ProposalId`, `LaudoDetailsRef` instead of `LaudoDetailsId`, etc.). The script should print unmatched candidates so a human can decide rather than guess.
- **Reverse references across all schemas** — requires scanning `INFORMATION_SCHEMA.COLUMNS`. Kept narrow by filtering on column name patterns only, which is cheap — but the query must still be written to stay under the timeout.
- **Financial domain terms authored by Softo** — `UnleveredBeta`, `GrossMarginPerpetuity`, `GICS`, etc. may need Apsis review in a later iteration. The map should be explicit about which descriptions are provisional.
- **The previous plan's assets** live under `features/archived/` and must not be edited or reused silently — the new feature starts clean.

## Open Questions

- What is the exact output path and filename for the generated Markdown (e.g., `repos/sql/laudo-details-map.md`)?
- Does the script write an intermediate JSON snapshot before the Markdown, or go directly from catalog query to Markdown? (The archived plan kept a JSON intermediate; at one-table scope that may be overkill.)
- How is the "type trap" surfaced in the final Markdown — a dedicated top-level section, an inline annotation on each affected column row, or both?
- Should the script also capture and print row counts (cardinality) for `LaudoDetails` and each neighbor? Useful for the agent but adds a query per table.
- Which language does the final committed Markdown live in — English only (agent-facing), Portuguese (human-reviewer-facing), or both? The archived plan chose pt-BR for the agent prompt; confirm for this feature.
