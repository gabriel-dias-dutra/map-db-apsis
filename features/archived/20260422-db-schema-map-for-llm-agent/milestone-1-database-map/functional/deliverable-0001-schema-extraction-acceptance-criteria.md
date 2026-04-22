# Acceptance Criteria — Deliverable 0001: Schema extraction

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Schema extraction script

- [ ] A developer can run a single command from `repos/sql/` that extracts the full schema snapshot and writes it to `repos/sql/schema-snapshot.json`.
- [ ] The snapshot contains every base table in the Apsis database — the count matches `SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`.
- [ ] For each table, the snapshot records schema name, table name, table-level business description (or empty), and the full column list with name, data type, nullability, and primary-key flag.
- [ ] For each column, the snapshot records the column-level business description (or empty) when an extended property exists.
- [ ] Foreign-key relationships are captured with source table/column, target table/column, and constraint name.
- [ ] The script respects the Lambda 5-second connection timeout — no single call exceeds it; oversized catalog queries are automatically split into smaller batches.
- [ ] When a batch times out, the script retries with a smaller batch size up to two times before aborting.
- [ ] When the script aborts mid-run, the previous snapshot file is preserved intact.
- [ ] Running the script twice against an unchanged database produces byte-identical snapshots (ignoring the timestamp line).
- [ ] The script surfaces a clear final summary: table count, column count, FK count, descriptions present vs. absent, and the output path.
- [ ] The script reads credentials only from `.env.tool` and never prompts interactively.
- [ ] Missing or invalid API key aborts the script with a message naming the expected variable in `.env.tool`.
- [ ] When a Lambda SQL error occurs, the verbatim error message and the triggering catalog query are shown to the developer.
- [ ] Views, stored procedures, and functions are **not** captured (out of scope for this deliverable).
- [ ] The snapshot file is tracked in git and diff-able between runs.

## General Criteria

- [ ] The script runs on a standard developer workstation with the repository's existing Node.js setup — no new global dependencies.
- [ ] No regressions in the existing Lambda behavior — the extraction only consumes it as a client, never modifies it.
