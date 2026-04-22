# Deliverable 0002 — Database Map generation `sql`

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Database Map generator + generated map (pt-BR)

**Description:** A Softo developer can run a single command that consumes the schema snapshot from Deliverable 0001 and produces the Database Map — a single Markdown document in Brazilian Portuguese, grouped by inferred business domain, with a one-line description per table and a relationship summary across domains. The map is the artifact the n8n database search agent loads into its system prompt to reason about what to query. Human corrections are preserved across regenerations through a sidecar overrides file that the generator reads and applies.

**Dependencies:** Deliverable 0001 (consumes `schema-snapshot.json`).

**Complexity:** Medium — Functionality involving multiple rules or interactions between system areas. Domain grouping is heuristic, natural pt-BR descriptions must be authored, the overrides merge flow must be predictable, and the output size must stay under 3k tokens.

**Size:** Medium — Moderate scope — multiple screens, flows, or entity interactions. Generator + overrides file + committed Markdown output + human review loop.

## User Flow

1. After a successful extraction (Deliverable 0001), the developer runs the generation command from `repos/sql/` (e.g., `npm run generate-map`).
2. The script reads the committed `schema-snapshot.json` and the committed overrides file (e.g., `schema-map-overrides.yaml`) if it exists.
3. The script infers a business domain for each table — first from its SQL Server schema, then from name prefixes (e.g., `rh_`, `fin_`) when the schema is generic (`dbo`). Overrides from the sidecar file replace inferred domains and descriptions wherever present.
4. The script writes/overwrites a single Markdown file at a fixed path (e.g., `repos/sql/database-map.md`) with: a header naming the snapshot timestamp and domain count, one section per domain listing its tables with one-line descriptions in pt-BR, and a closing section listing the main cross-domain relationships.
5. The script prints a summary — number of domains produced, number of tables per domain, number of descriptions pulled from extended properties vs. from overrides vs. auto-generated from the column list, and the final token count estimate.
6. The developer reads the map, edits `schema-map-overrides.yaml` to correct any misgrouped table, missing description, or awkward pt-BR phrasing, then reruns the generator until the map reads cleanly.
7. The developer commits both the overrides file and the regenerated `database-map.md`, and opens a pull request.
8. Once merged, the developer follows the Operator Guide (Deliverable 0004) to paste the map into the n8n agent's system prompt.

## Fields and Data

The Database Map (the generator's output) contains the following elements:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Map title | Text | Yes | e.g., "Mapa do banco de dados Apsis". |
| Snapshot timestamp | Timestamp | Yes | From the snapshot header — communicates how fresh the map is. |
| Domain section | Group | Yes | One section per inferred business domain (e.g., "RH", "Financeiro", "Laudos"). |
| Domain description | Text | Yes | One-line pt-BR description of what the domain covers. |
| Table entry | Row | Yes | Table name + one-line pt-BR description. |
| Cross-domain relationship summary | List | Yes | Pairs of domains connected by FKs, with a short note on what the relationship represents. |
| Token count estimate | Number | No | Printed by the generator (not embedded in the map) so the developer can keep the file under the 3k target. |

**The overrides file (`schema-map-overrides.yaml`) stores:** per-table domain assignment, per-table pt-BR description, per-domain description, and optional domain ordering. Any field not present in the overrides file falls back to the generator's inference.

**Map file sections (in order):** header → domain ordering summary → one section per domain (table with name + pt-BR description) → cross-domain relationships → generation footer (snapshot timestamp, generator version).

## Business Rules

- The map is written in Brazilian Portuguese — table descriptions, domain names, relationship notes. Table identifiers (names) remain in their original form.
- Target size: under 3k tokens. If the generator estimate exceeds the target, it still produces the map but prints a warning naming the threshold and the excess, so the developer can shorten descriptions or split domains.
- Domain inference precedence: overrides file → SQL Server schema name → table name prefix → fallback bucket named "Outros".
- Each regeneration fully overwrites `database-map.md`. The file is not meant to be hand-edited — all human corrections live in `schema-map-overrides.yaml`.
- When a table has no extended-property description and no override, the generator produces a best-effort one-line description from the column list. These entries are flagged in the run summary so the developer can prioritize them in the overrides file.
- The cross-domain relationship section includes at most the top N relationships (by number of FK connections), to respect the token budget. N is tunable in the generator's configuration.
- The overrides file is the single source of human authorship; it must round-trip cleanly (reading and rewriting it produces an identical file).

## Error Behavior

- **`schema-snapshot.json` missing:** the script aborts with a message instructing the developer to run Deliverable 0001 first. No map file is written.
- **`schema-snapshot.json` malformed:** the script aborts and points to the parse error location in the file.
- **Overrides file malformed:** the script aborts and points to the offending line, preserving the current `database-map.md`.
- **Overrides file references a table that no longer exists in the snapshot:** the script continues but prints a warning listing each stale entry, so the developer can prune the overrides file.
- **Output exceeds the 3k-token target:** the script completes and emits the map, but prints a prominent warning with the estimated count so the developer can tighten it.
- **Zero tables after filtering:** the script aborts with a message naming the cause (e.g., snapshot empty). The previous map is preserved.
- **Generator version mismatch:** if the overrides file records a generator-version field that doesn't match the current generator, the script continues but prints a note so a migration can be planned.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Run the generator | Any Softo developer with the repository cloned | No credentials needed — generator is offline. |
| Edit `schema-map-overrides.yaml` | Any Softo developer with write access to the `sql` repository | Normal pull-request review applies. |
| Commit the regenerated map | Any Softo developer with write access to the `sql` repository | Diff against the previous map is part of review. |
| Paste the map into the n8n agent prompt | A Softo developer with access to the n8n workflow | Covered by Deliverable 0004 (Operator Guide). |
