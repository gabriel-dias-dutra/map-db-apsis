# Deliverable 0001 — Schema introspection of LaudoDetails `sql`

**Milestone:** Milestone 1 — LaudoDetails Map (MVP)

**Deliverables:**
- Schema introspection script for `[projects].[LaudoDetails]` + committed JSON snapshot

**Description:** A Softo developer can run a single command inside `repos/sql/` and produce a committed JSON snapshot that describes `[projects].[LaudoDetails]` and its direct neighborhood in enough detail to drive the map generator. The snapshot captures every column with its stored type and nullability, every foreign key the SQL Server catalog knows about, every relationship that can only be inferred by column-name convention, every other table that references `LaudoDetails.Id`, any extended-property descriptions attached to the table or its columns, any value-match tables for `ClientName` and `GICS`, and the row count of the central table and each direct neighbor. Each discovered relationship is labeled with how it was discovered so the downstream map can show trust level.

**Dependencies:** None.

**Complexity:** Medium — Functionality involving multiple rules or interactions between system areas. Coordinates roughly eight catalog queries through a Lambda with a five-second connection timeout, runs two discovery paths (catalog-backed and name-inferred) that must stay consistent, scans `INFORMATION_SCHEMA.COLUMNS` across all schemas for reverse references, and must handle the realistic case where the live database has zero formal foreign keys.

**Size:** Small — Limited scope — few screens or interactions, straightforward flow. One script inside `repos/sql/`, one committed JSON output, no UI.

## User Flow

1. The developer confirms `.env.tool` at the project root contains the Lambda `URL` and `API_KEY` variables.
2. The developer opens a terminal inside `repos/sql/` and runs `npm run laudo-details:introspect`.
3. The script prints a short progress summary as it goes — which catalog it is reading (columns, FKs, extended properties, reverse references, value-match candidates, row counts), how many rows each query returned, and whether any batch had to be retried due to the Lambda timeout.
4. As the script runs, it prints a "candidates without match" list whenever a name-inferred relationship could not resolve to an existing table — surfaced as a warning, never silently dropped.
5. When introspection finishes, the script writes (or overwrites) the snapshot at `repos/sql/laudo-details/introspection.json`.
6. The script prints a final summary — total columns, FK relationships (by source: catalog vs. inferred), reverse references found, columns that had an extended-property description vs. those that did not, the path of the written snapshot.
7. The developer reviews the summary, runs `git diff` on the snapshot, and, if the content changed since the last run, commits the file and opens a pull request.

## Fields and Data

The JSON snapshot captures and stores the following information about `LaudoDetails` and its direct neighborhood:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Table identity | Object | Yes | Schema (`projects`) + table name (`LaudoDetails`) + row count. |
| Columns | List | Yes | For each column of `LaudoDetails`: name, stored type with precision, nullability, whether it is part of the primary key (if any), extended-property description (empty when absent). |
| Foreign keys (catalog) | List | Yes | Relationships present in `sys.foreign_keys`: constraint name, source column, target schema + table + column. Empty when the table has no formal FKs. |
| Foreign keys (inferred by name) | List | Yes | For each `*Id` column on `LaudoDetails` with no catalog-backed FK: the candidate target table resolved by stripping `Id` and matching an existing table, or the explicit label "no match". |
| Reverse references | List | Yes | Columns in any schema named `LaudoDetailsId` (exact match) pointing to `LaudoDetails.Id`: source schema + table + column, discovery source (catalog FK or inferred by name). |
| Value-match contextuals | List | Yes | For `ClientName` and `GICS`: candidate target tables whose name matches `Client*`, `Cliente*`, `GICS*`, or `Setor*`. Empty when no candidates exist. |
| Neighbor tables | List | Yes | For each neighbor referenced by any discovered relationship: schema + name + row count (cardinality) + primary-key column name if known. |
| Extraction timestamp | Timestamp | Yes | When the script ran, in UTC. |
| Run summary | Object | Yes | Counts: columns total, columns with/without description, FKs by source, reverse refs by source, unmatched inference candidates, any batch retries. |
| Schema version | Text | Yes | A version string (e.g., `"1"`) so the generator can detect format drift. |

**Snapshot file:** one committed JSON document at `repos/sql/laudo-details/introspection.json`, overwritten by each successful run. Git history is the audit trail; there is no per-run archive.

## Business Rules

- The script targets exactly one central table: `[projects].[LaudoDetails]`. The table name and schema are fixed constants in the script; parameterization for other tables is explicitly a future idea.
- Relationship discovery runs the SQL Server catalog first (`sys.foreign_keys`). Name inference runs second, only on columns that did not yield a catalog-backed FK. Every relationship emitted in the snapshot is labeled with its discovery source.
- Reverse references are discovered by scanning `INFORMATION_SCHEMA.COLUMNS` for columns named exactly `LaudoDetailsId` in any schema (excluding `LaudoDetails` itself). Broader patterns (`LaudoDetails*Id`, `*LaudoDetails*`) are out of scope; candidates that only match those patterns are not reported.
- Value-match lookups for `ClientName` and `GICS` are informative-only: they list candidate target tables but do not assert a relationship. The snapshot records the candidates; judgment about whether they are real lives in the generated map.
- Each catalog query is sent through the existing Lambda at `.env.tool`'s `URL`. No new endpoint or credential is introduced.
- Queries must be batched (or narrowed by filter) so no single call exceeds the Lambda's five-second connection timeout. Practical batch sizes are tuned during implementation.
- Idempotency: running the script twice against an unchanged database must produce byte-identical JSON aside from the `extractionTimestamp` field.
- Missing extended-property descriptions are stored as empty strings (not omitted), so the snapshot shape is stable across runs.
- Unmatched name-inference candidates are reported in the progress output and in the run summary, never silently discarded.
- The snapshot file is the only committed output. There is no per-run history file.

## Error Behavior

- **Lambda timeout on a query:** the script retries up to two times with a narrower scope (fewer rows per call, typically by filtering one schema at a time) before failing. If all retries fail, the script aborts with a message naming the query and the catalog it was reading; the previous snapshot is preserved.
- **Missing or invalid API key:** the script aborts immediately with a message pointing to `.env.tool` and the expected variable names. No partial snapshot is written.
- **Lambda returns a SQL error:** the mssql error is surfaced verbatim along with the query that triggered it. The snapshot file is not overwritten.
- **Table `projects.LaudoDetails` not found:** the script aborts with "tabela `[projects].[LaudoDetails]` não encontrada — verifique a conexão e o schema". No snapshot is written.
- **Zero columns returned:** same as table-not-found — aborts with a clear message; the previous snapshot is preserved.
- **No formal foreign keys found:** this is expected, not an error. The script reports "zero FKs no catálogo — usando inferência por nome" and continues.
- **Extended-properties catalog unavailable:** the script continues (extended properties are best-effort) and the run summary notes that descriptions are entirely absent for this run.
- **Network failure mid-run:** the script aborts, preserves the previous snapshot, and prints the last query it completed so the developer knows where the interruption happened.
- **Name-inference candidate with no matching table:** the unmatched candidate is listed in the progress output and in the run summary under "candidatos sem correspondência". The snapshot records it with target `null` and source `"inferred-no-match"` — it is not a fatal error.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Run the introspection | Any Softo developer with `.env.tool` configured | The Lambda API key is the only gate. |
| Commit the snapshot | Any Softo developer with write access to the `sql` repository | Normal pull-request review applies. |
| Consume the snapshot | Deliverable 0002 (map generator) | The snapshot is the documented contract between Deliverables 0001 and 0002. |
