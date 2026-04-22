# LaudoDetails Table Map for the Database Search Agent

## Description

The Apsis team already has a database search agent running inside an n8n workflow: the agent receives a business question in Portuguese ("which laudos were signed for Petrobras in 2025?"), is supposed to translate it into SQL, run it through the existing SQL Lambda proxy, and summarize the answer. Today it cannot do this reliably because it has no structural knowledge of the `LaudoDetails` table — the table where the bulk of valuation information ("laudos") lives. It does not know the table's columns, what they mean, how their values are actually stored, or which other tables are on the other side of references like `ProposalId` and `SentDocumentId`.

This feature produces that knowledge, narrowly and precisely, for this one table. The deliverable is a committed Portuguese-language map of `[projects].[LaudoDetails]` — every column described in business terms, every direct relationship to a neighboring table resolved and labeled by how it was discovered, every type trap (numeric and date values stored as text) flagged so the agent does not build wrong SQL — plus the small script that regenerates the map whenever the table changes. The map is pasted into the agent's system prompt so the agent can reason about laudos without retrieval.

## Goals

- Give the search agent a complete and trustworthy understanding of `LaudoDetails` so it builds correct SQL against the laudos domain, including correct JOINs to neighboring tables.
- Prevent the most likely silent failure: the agent trying to filter, sort, or aggregate columns stored as text as if they were numbers or dates.
- Keep the effort proportional to the scope — one table and its direct neighbors, not the whole database — while leaving the script structured so mapping another table later is inexpensive.
- Make regeneration cheap enough that the map stays current as the table evolves (target: a full refresh in under five minutes by any Softo developer).

## How It Works

### Schema introspection

A Softo developer runs a single command inside `repos/sql/`. The script walks the SQL Server catalog through the existing Lambda and captures everything needed to describe `LaudoDetails`: its columns and types, any foreign keys the database knows about, any extended-property descriptions, row counts for the table and each neighbor, and — for fields where no real foreign key exists — a pass by naming convention to find which table each `*Id` column most likely points to and which other tables reference `LaudoDetails.Id`. The script writes the full captured data to a raw JSON snapshot in the repository so the next step (and any future tooling) has a clean input to consume.

1. The developer runs the command (e.g., `npm run map-laudo-details`) with the Lambda credentials already present in `.env.tool`.
2. The script runs each introspection query in small batches so none exceeds the Lambda's five-second timeout.
3. It prints a short progress summary — what it found in the catalog, what it had to infer by name, which candidate fields did not match any existing table.
4. It writes the JSON snapshot to a fixed path inside `repos/sql/`.

### Map generation

A second step consumes the JSON snapshot and produces the final map: a single Markdown file, written in Brazilian Portuguese, designed to be pasted into the agent's system prompt. The file leads with a prominent "type warnings" section listing every column whose stored type does not match its semantic meaning — margins and financial ratios stored as text, dates stored as strings — with the simple rule the agent must follow ("do not filter or aggregate numerically; cast or parse first"). Each warned column is also flagged inline on its own row so the rule is impossible to miss. The rest of the file lists each column with a Portuguese description, a table of direct relationships (each one marked as "FK", "inferred by name", or "by value match"), and a compact summary of neighbor tables the agent may need to JOIN against.

1. The developer runs the second command (`npm run generate-laudo-details-map`) — or, if we fold the flow into one, the same command as before.
2. The script reads the JSON snapshot and renders the Markdown.
3. It prints a summary: how many columns were described automatically, how many are flagged as missing a description, how many relationships were found, which ones are FK-backed vs. inferred.
4. The Markdown is written to a fixed path in the repository and committed.

### Agent integration

The developer replaces the laudos section of the n8n agent's system prompt — delimited by clear marker comments — with the contents of the generated Markdown. A short usage section in `repos/sql/README.md` documents the two commands, where the outputs live, and how to update the agent.

1. The developer opens the n8n workflow and locates the agent's system prompt.
2. They replace the section between `<!-- LAUDO-DETAILS:START -->` and `<!-- LAUDO-DETAILS:END -->` with the newly generated Markdown.
3. They save the workflow.
4. They spot-check by asking the agent a few real laudos questions and sanity-check the SQL it produces.

## Success Metrics

How do we know this worked? Because the scope is a single table, success is measured by coverage and correctness on that table rather than by a broad validation battery.

| Metric | Target | How to measure |
|--------|--------|----------------|
| Column coverage | 19/19 columns of `LaudoDetails` documented — or explicitly flagged as "pendente" with a reason | Checklist reviewed in the pull request; the generator itself prints the count |
| Relationship resolution | 100% of `*Id` columns plus `ClientName` and `GICS` resolved to either a target table, an inferred target, or an explicit "no match found" label | Script output compared against the committed map during review |
| Type-trap coverage | Every column whose stored type differs from its semantic type (numeric or date values stored as text) appears in the type-warnings section and on its own row | Manual diff of the CREATE TABLE against the generated map |
| Agent SQL quality on pilot questions | 4 of 5 pilot laudos questions answered with correct SQL (structurally valid, correct JOINs, correct handling of text-stored numeric fields) | Softo developer runs five real questions against the agent after the map is pasted in |
| Regeneration time | Under 5 minutes end-to-end for a Softo developer | Timed by the developer on the first two runs |

## Milestones

### Milestone 1 — LaudoDetails Map (MVP)

The whole feature. Delivers the script, the generated map, and the agent integration so the database search agent can answer laudos questions correctly from day one. Everything listed in "How It Works" lives in this milestone.

**Includes:**
- Schema introspection script (JSON snapshot of `LaudoDetails` + direct neighbors + cardinality)
- Map generator (Portuguese Markdown with type-warnings section, inline flags, relationship table, neighbor summaries)
- Agent integration (map pasted between markers in the n8n prompt, short README section)

## Future Ideas

- **Parameterize the script by table name** — once a second table is requested (likely `Proposal` or `SentDocument`), generalize `map-laudo-details` into `map-table` and keep per-table outputs side by side. Low cost because the script is already structured around a single table parameter internally.
- **Validation question battery** — if the map proves its worth, add a committed set of 5–10 laudos questions with expected answers, like the archived plan had, so regressions are caught objectively instead of anecdotally.
- **Apsis semantic review** — ask the Apsis team to review the provisional descriptions on financial terms (`UnleveredBeta`, `GrossMarginPerpetuity`, `GICS`, etc.) and replace them with authoritative language. Done in a single pass once the map is stable.
- **Extended-property authoring flow** — instead of carrying descriptions only in the generated Markdown, push confirmed descriptions back into SQL Server `sys.extended_properties`, so the database itself becomes the source of truth and every future regeneration preserves them.
- **Stale-map indicator** — embed a hash of the table's DDL in the map so the agent (or a CI check) can warn when the live schema no longer matches the map.
- **Second-hop context on demand** — if the agent starts needing context beyond direct neighbors (e.g., client owner of a proposal), add a lookup tool that fetches per-table fact sheets without bloating the system prompt.

## Notes

- The work happens entirely inside `repos/sql/`. No new infrastructure, no new deploy targets. The existing SQL Lambda (Node.js, `mssql` v11, `x-api-key`, five-second connection timeout) is the only transport.
- Credentials live in `.env.tool` at the project root (`URL`, `API_KEY`) and are already available to any Softo developer.
- The `CREATE TABLE` shared for `LaudoDetails` has no PRIMARY KEY and no FOREIGN KEY constraints declared. The script must handle both cases — real FKs present in the live database or not — and label each discovered relationship by the discovery mechanism so the reader always knows how trustworthy it is.
- Semantics are authored by Softo drawing on general domain knowledge. Any column Softo cannot confidently describe is written as "pendente" with a short reason and completed in a follow-up — possibly with input from Apsis.
- The archived feature `features/archived/20260422-db-schema-map-for-llm-agent` is the previous whole-database approach. Nothing from it is being reused directly.
