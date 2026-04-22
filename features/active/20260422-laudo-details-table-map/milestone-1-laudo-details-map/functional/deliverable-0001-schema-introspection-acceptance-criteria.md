# Acceptance Criteria — Deliverable 0001: Schema introspection of LaudoDetails

**Milestone:** Milestone 1 — LaudoDetails Map (MVP)

**Deliverables:**
- Schema introspection script for `[projects].[LaudoDetails]` + committed JSON snapshot

- [ ] Running `npm run laudo-details:introspect` inside `repos/sql/` with a valid `.env.tool` completes successfully and writes a file at `repos/sql/laudo-details/introspection.json`.
- [ ] The JSON snapshot contains all 19 columns of `[projects].[LaudoDetails]` with their stored type, precision where applicable, and nullability — no column is missing.
- [ ] Each column entry includes an `extendedPropertyDescription` field — an empty string when no description exists, populated when it does.
- [ ] Every `*Id` column on `LaudoDetails` appears either in the catalog-backed FK list or in the name-inferred FK list; no `*Id` column is silently dropped.
- [ ] Name-inferred relationships that could not resolve to an existing table are present in the JSON with target `null` and source `"inferred-no-match"`, and are listed in the progress output and run summary.
- [ ] Reverse references are captured by scanning for columns named exactly `LaudoDetailsId` across all schemas (excluding the `LaudoDetails` table itself); broader patterns are not followed.
- [ ] For `ClientName` and `GICS`, candidate value-match tables (`Client*`, `Cliente*`, `GICS*`, `Setor*`) are recorded under `valueMatchContextuals` — empty list when no candidates exist.
- [ ] Each direct neighbor table appears under `neighbors` with its schema, name, and row count (cardinality).
- [ ] The central table's own row count (cardinality) is present in the `tableIdentity` object.
- [ ] The snapshot carries a `schemaVersion` string and an `extractionTimestamp` in UTC.
- [ ] Running the script twice against an unchanged database produces byte-identical JSON aside from the `extractionTimestamp` field.
- [ ] When a batch exceeds the Lambda's five-second timeout, the script retries with a narrower scope up to two times before aborting.
- [ ] A Lambda timeout that exhausts retries aborts the run, names the failing query in the error message, and leaves the previous snapshot in place (not overwritten).
- [ ] A missing or invalid `API_KEY` aborts the run with a message pointing to `.env.tool` and the expected variable names; no partial snapshot is written.
- [ ] A SQL error from the Lambda is surfaced verbatim along with the query that produced it; no partial snapshot is written.
- [ ] Zero columns or an absent `projects.LaudoDetails` table aborts the run with the message "tabela `[projects].[LaudoDetails]` não encontrada".
- [ ] The run summary prints counts for: total columns, columns with/without extended-property description, FKs by source (`catalog` vs. `inferred`), reverse references by source, unmatched inference candidates, and any batch retries.
- [ ] The snapshot file is committed to the `sql` repository via a pull request that shows a human-readable diff.

## General Criteria

- [ ] Running the script does not mutate any data in the Apsis database — all queries are reads against system catalogs.
- [ ] No new infrastructure is introduced; the existing Lambda at `.env.tool.URL` is the only transport.
- [ ] No regressions in other scripts or files in `repos/sql/`.
