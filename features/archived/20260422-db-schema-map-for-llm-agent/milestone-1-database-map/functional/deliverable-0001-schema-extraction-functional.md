# Deliverable 0001 — Schema extraction `sql`

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Schema extraction script

**Description:** A Softo developer can run a single command locally to capture the full structural snapshot of the Apsis SQL Server — every base table, its columns, its foreign-key relationships, and any business descriptions stored as SQL Server extended properties — and produce a single snapshot file committed to the `sql` repository that downstream steps (map generation, future fact sheets) consume.

**Dependencies:** None.

**Complexity:** Medium — Functionality involving multiple rules or interactions between system areas. Coordinates several SQL Server catalog queries through a Lambda with a 5-second connection timeout, requires batching, reuses existing API credentials, and must degrade gracefully when extended properties are sparse.

**Size:** Small — Limited scope — few screens or interactions, straightforward flow. A single script inside `repos/sql/`, no UI, no new deploys, one output file.

## User Flow

1. The developer opens a terminal inside `repos/sql/` and confirms `.env.tool` (already available in the project) contains the Lambda API key and endpoint.
2. The developer runs the extraction command (e.g., `npm run extract-schema`).
3. The script prints a short progress summary as it runs: which catalog is being read (tables, columns, foreign keys, extended properties), how many items were retrieved, and whether any batch had to be retried due to the 5-second Lambda timeout.
4. When extraction finishes, the script writes/overwrites a single snapshot file at a fixed path inside `repos/sql/` (e.g., `schema-snapshot.json`).
5. The script prints a final summary — total tables extracted, total columns, total foreign-key relationships, how many tables had an extended-property description and how many did not — and the path of the written snapshot.
6. The developer reviews the summary, checks the snapshot file into git, and opens a pull request if the content changed since the last extraction.

## Fields and Data

The extraction captures and stores the following information about the database:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Table name | Text | Yes | Base table identifier from `INFORMATION_SCHEMA.TABLES`. |
| Schema name | Text | Yes | SQL Server schema owning the table (e.g., `dbo`, `rh`, `fin`). Used later for domain inference. |
| Business description (table) | Text | No | Extended property attached to the table (if present). Empty when not set. |
| Columns | List | Yes | For each column: name, data type, nullability, primary-key flag. |
| Business description (column) | Text | No | Extended property attached to the column (if present). Empty when not set. |
| Foreign keys | List | Yes | For each relationship: source table and column, target table and column, constraint name. |
| Extraction timestamp | Timestamp | Yes | When the extraction ran (UTC). Embedded in the snapshot header. |
| Run summary | Object | Yes | Counts (tables, columns, FKs, descriptions present/absent) and any batch-retry notes. |

**Snapshot file stores:** one committed JSON document at a fixed path (`repos/sql/schema-snapshot.json`), overwritten by each successful run, containing the full payload above.

## Business Rules

- Only base tables are extracted. Views, stored procedures, and functions are out of scope for this deliverable (listed as future ideas in the overview).
- Each catalog query is sent through the existing Lambda SQL proxy. No new endpoint is introduced.
- Queries must be batched so that no single call exceeds the Lambda's 5-second connection timeout. The practical batch size is determined empirically during implementation.
- The snapshot file is the only committed output. There is no per-run history file — the previous snapshot is replaced in place, and git history serves as the audit trail.
- The script is idempotent in effect: running it twice against an unchanged database must produce byte-identical output (aside from the extraction timestamp).
- The existing Lambda credential in `.env.tool` is the only authentication. The script never prompts for new credentials.
- When an extended property is missing for a table or column, the corresponding description field is stored as an empty string (not omitted), so the snapshot schema stays stable.

## Error Behavior

- **Lambda timeout on a batch:** the script retries the batch up to two times with a smaller batch size before failing. If all retries fail, the script aborts with a clear message naming the catalog and the batch range, and the snapshot file is **not** overwritten — the previous snapshot is preserved.
- **Invalid or missing API key:** the script aborts immediately with a message pointing to `.env.tool` and the variable name expected. No partial snapshot is written.
- **Lambda returns a SQL error:** the error message from `mssql` is surfaced verbatim along with the catalog query that triggered it. The snapshot file is not overwritten.
- **Empty database (no tables found):** the script aborts with "nenhuma tabela encontrada — verifique a conexão e o schema". No snapshot is written.
- **Network failure mid-run:** the script aborts, preserves the previous snapshot, and prints the last catalog/batch it completed so the developer knows where the interruption happened.
- **Extended properties catalog unavailable:** the script continues (extended properties are best-effort) and the run summary flags that descriptions are entirely absent for this run.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Run the extraction | Any Softo developer with access to `.env.tool` | The Lambda API key is the only gate. |
| Commit the snapshot | Any Softo developer with write access to the `sql` repository | Normal pull-request review applies. |
| Consume the snapshot | Downstream scripts in the same repository | The snapshot is the contract between Deliverables 0001 and 0002. |
