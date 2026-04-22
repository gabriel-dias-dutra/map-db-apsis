# Dev Plan — Deliverable 0001: Schema introspection of LaudoDetails

**Feature:** `features/active/20260422-laudo-details-table-map`
**Milestone:** Milestone 1 — LaudoDetails Map (MVP)
**Repositories affected:** `sql` (single repo)

## Context & Goal

Implement `npm run laudo-details:introspect`: a TypeScript script that runs **on the developer's local machine** (inside `repos/sql/`) and talks to the existing SQL tool — an AWS Lambda deployed separately, addressed by `URL` + `API_KEY` from `.env.tool`. The script sends catalog introspection queries to the tool over HTTP, receives `{ rowCount, rows }` responses, and writes a self-contained JSON snapshot at `repos/sql/laudo-details/introspection.json`. The snapshot is the contract consumed by Deliverable 0002 (map generation) and future tooling. Full functional spec lives at `milestone-1-laudo-details-map/functional/deliverable-0001-schema-introspection-functional.md` — this dev-plan translates it into concrete files, queries, and phases.

## Architecture Decisions

### D1. Language: TypeScript with native Node type stripping (no `tsx`, no `ts-node`, no `tsc` build step)

- Files end in `.ts` and are executed directly via `node --experimental-strip-types`. Node 22.6+ supports this; Node 24 enables it by default. `package.json` documents the requirement via `engines.node >= 22.6`.
- This avoids adding a runtime TypeScript transpiler (`tsx`, `ts-node`) and avoids a two-step build (`tsc` → `dist/` → `node`). It gives us types without extra infrastructure.
- Implications for code style: **no `enum`, no `namespace`, no constructor parameter properties, no decorators** — those are non-strippable. Use `const` objects with `as const` and string-union types instead. This is a minor constraint; the script does not need those constructs.
- Dev dependency: `@types/node` only. No new runtime dependency is added — the script uses Node built-ins (`fetch`, `AbortController`, `fs/promises`).

### D2. Layout: source in `scripts/laudo-details/`, output in `laudo-details/`

- The tool's Lambda source (`index.mjs`, `build.sh`) stays visually isolated from the developer tooling that runs locally.
- Source files: `repos/sql/scripts/laudo-details/*.ts` (entrypoint, library modules).
- Committed output: `repos/sql/laudo-details/introspection.json`.
- Reserves `repos/sql/laudo-details/map.md` for Deliverable 0002. Both outputs live together so a reader finds them at the same place.

### D3. Environment loading via Node `--env-file`

- `package.json` script: `node --env-file=../../.env.tool --experimental-strip-types scripts/laudo-details/introspect.ts`.
- No `dotenv` dependency. Variables `URL` and `API_KEY` become `process.env.URL` and `process.env.API_KEY`.
- Path `../../.env.tool` is relative to `repos/sql/` (project root → `repos/` → `sql/`).

### D4. Transport via built-in `fetch`

- Node 18+ exposes `fetch` globally. No HTTP library dependency.
- Every query is a `POST` to `process.env.URL` with headers `content-type: application/json` and `x-api-key: process.env.API_KEY`, body `JSON.stringify({ query })`.
- Per-request timeout of **15 seconds** on the client side via `AbortController`. This bounds how long the script waits for the tool to respond, and is chosen to absorb tool cold starts (a few seconds) plus network jitter without hanging indefinitely.
- Note on the `connectionTimeout: 5000` inside the tool (`index.mjs:33`): that setting bounds how long the tool's `mssql` driver waits to **open** a connection to SQL Server. It is not a bound on query execution time or on the HTTP round-trip, and it is not what the script's retry policy reacts to.

### D5. Retry policy: 2 retries, with narrow scope only on client-side timeout

- **Client-side fetch abort (`AbortError` after 15s):** the script did not hear back from the tool in time — most likely a cold start, secondarily a long-running query. The first retry is identical (handles cold start). A second retry narrows scope for schema-spanning queries (Q6/Q7/Q8), re-issuing them one schema at a time and concatenating rows. Scoped queries (Q1–Q5, Q9, Q10) always retry identically since they are already small.
- **HTTP 400 from the tool with `ETIMEOUT`:** the tool could not open a SQL Server connection. Retrying does not help that condition (nothing the script controls changes in 15 ms). The script aborts with a message naming the tool as unreachable from SQL Server's perspective.
- **HTTP 400 from the tool with any other `mssql` error (SQL syntax, object not found, etc.):** deterministic failure. The script prints the error verbatim and aborts without retrying.
- **HTTP 401 (invalid API key):** aborts immediately, no retry, with a pt-BR message pointing to `.env.tool`.
- **HTTP 5xx or connection reset (tool crash, AWS-side timeout):** treated like `AbortError` — retry once identically, then narrow scope if the query is schema-spanning.
- After 2 retries the script aborts the run, preserves the previous `introspection.json` untouched, and prints the exact query that failed.

### D6. Idempotency

- The JSON snapshot is written via a deterministic serializer (see D7). Two runs against an unchanged database must produce byte-identical JSON except the single `extractionTimestamp` field. Reverse-ref scans and FK lists must be sorted before writing.

### D7. JSON snapshot format and serialization

- Snapshot is 2-space indented JSON. Arrays are sorted by a documented key (see `types.ts`). A trailing newline is always written.
- Field order inside objects matters for byte-identical diffs; objects are constructed with a fixed key order and serialized via `JSON.stringify(value, null, 2)`. Since Node preserves insertion order for string keys, constructing objects in the documented order suffices.

### D8. Error messages in Portuguese

- User-facing error messages emitted to stderr match the pt-BR wording specified in the functional document (`tabela [projects].[LaudoDetails] não encontrada`, `versão desconhecida do snapshot`, etc.). Developer-facing internal errors stay in English.

### D9. Single-file entrypoint, library modules

- `introspect.ts` is a thin orchestrator: parses args (none in MVP), loads env, calls library functions in order, writes the snapshot. No business logic lives in the entrypoint.
- Library modules own one responsibility each (`tool-client.ts`, `queries.ts`, `types.ts`, `discovery.ts`, `serializer.ts`).

## Data Contract: `introspection.json`

The JSON document written at `repos/sql/laudo-details/introspection.json` has this shape (TypeScript-level; the actual file is plain JSON):

```typescript
// scripts/laudo-details/types.ts
export const SCHEMA_VERSION = "1" as const;

export type DiscoverySource =
  | "catalog"
  | "inferred"
  | "inferred-no-match"
  | "value-match";

export interface Column {
  name: string;
  storedType: string;        // e.g., "nvarchar(500)", "uniqueidentifier"
  nullable: boolean;
  isPrimaryKey: boolean;     // false if no PK declared on the table
  ordinalPosition: number;   // from INFORMATION_SCHEMA.COLUMNS
  extendedPropertyDescription: string; // empty string when absent
}

export interface ForeignKey {
  source: DiscoverySource;   // "catalog" | "inferred" | "inferred-no-match"
  constraintName: string | null;   // null for inferred
  sourceColumn: string;
  targetSchema: string | null;     // null when source === "inferred-no-match"
  targetTable: string | null;
  targetColumn: string | null;     // typically "Id"
}

export interface ReverseReference {
  source: DiscoverySource;   // "catalog" | "inferred"
  constraintName: string | null;
  fromSchema: string;
  fromTable: string;
  fromColumn: string;        // always exactly "LaudoDetailsId" in MVP
}

export interface ValueMatchCandidate {
  sourceColumn: "ClientName" | "GICS";
  candidateSchema: string;
  candidateTable: string;
  matchPattern: string;      // which regex matched, e.g., "Client%", "GICS%"
}

export interface Neighbor {
  schema: string;
  table: string;
  rowCount: number;
  primaryKeyColumn: string | null;
}

export interface RunSummary {
  columnsTotal: number;
  columnsWithDescription: number;
  columnsWithoutDescription: number;
  foreignKeysByCatalog: number;
  foreignKeysInferred: number;
  foreignKeysInferredNoMatch: number;
  reverseReferencesByCatalog: number;
  reverseReferencesInferred: number;
  valueMatchCandidates: number;
  neighborsTotal: number;
  batchRetries: number;
}

export interface Snapshot {
  schemaVersion: typeof SCHEMA_VERSION;
  extractionTimestamp: string;       // ISO-8601 UTC, e.g., "2026-04-22T18:00:00.000Z"
  tableIdentity: {
    schema: "projects";
    table: "LaudoDetails";
    rowCount: number;
  };
  columns: Column[];                 // sorted by ordinalPosition asc
  foreignKeys: ForeignKey[];         // sorted by sourceColumn asc
  reverseReferences: ReverseReference[];  // sorted by (fromSchema, fromTable) asc
  valueMatchContextuals: ValueMatchCandidate[];  // sorted by (sourceColumn, candidateSchema, candidateTable)
  neighbors: Neighbor[];             // sorted by (schema, table)
  runSummary: RunSummary;
}
```

## SQL Queries Catalog

All queries are sent verbatim to the tool. They read only system catalogs — no DML is ever issued.

### Q1 — Columns of LaudoDetails
```sql
SELECT
  c.COLUMN_NAME AS name,
  c.DATA_TYPE AS dataType,
  c.CHARACTER_MAXIMUM_LENGTH AS charLength,
  c.NUMERIC_PRECISION AS numericPrecision,
  c.NUMERIC_SCALE AS numericScale,
  c.IS_NULLABLE AS isNullable,
  c.ORDINAL_POSITION AS ordinalPosition
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = 'projects' AND c.TABLE_NAME = 'LaudoDetails'
ORDER BY c.ORDINAL_POSITION;
```
Composed `storedType` string is built in `queries.ts` helper: `nvarchar(500)`, `uniqueidentifier`, `nvarchar(max)`, etc.

### Q2 — Primary key columns of LaudoDetails
```sql
SELECT k.COLUMN_NAME AS name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
  ON k.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
 AND k.TABLE_SCHEMA = tc.TABLE_SCHEMA
WHERE tc.TABLE_SCHEMA = 'projects'
  AND tc.TABLE_NAME = 'LaudoDetails'
  AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';
```
Returns zero rows when no PK is declared.

### Q3 — Outbound FKs of LaudoDetails (catalog)
```sql
SELECT
  fk.name AS constraintName,
  c1.name AS sourceColumn,
  SCHEMA_NAME(t2.schema_id) AS targetSchema,
  t2.name AS targetTable,
  c2.name AS targetColumn
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables t1 ON t1.object_id = fk.parent_object_id
JOIN sys.columns c1 ON c1.object_id = fkc.parent_object_id AND c1.column_id = fkc.parent_column_id
JOIN sys.tables t2 ON t2.object_id = fk.referenced_object_id
JOIN sys.columns c2 ON c2.object_id = fkc.referenced_object_id AND c2.column_id = fkc.referenced_column_id
WHERE SCHEMA_NAME(t1.schema_id) = 'projects' AND t1.name = 'LaudoDetails';
```

### Q4 — Inbound FKs to LaudoDetails (catalog, reverse refs)
```sql
SELECT
  fk.name AS constraintName,
  SCHEMA_NAME(t1.schema_id) AS fromSchema,
  t1.name AS fromTable,
  c1.name AS fromColumn
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables t1 ON t1.object_id = fk.parent_object_id
JOIN sys.columns c1 ON c1.object_id = fkc.parent_object_id AND c1.column_id = fkc.parent_column_id
JOIN sys.tables t2 ON t2.object_id = fk.referenced_object_id
WHERE SCHEMA_NAME(t2.schema_id) = 'projects' AND t2.name = 'LaudoDetails';
```

### Q5 — Extended properties on table and columns of LaudoDetails
```sql
SELECT
  ISNULL(c.name, N'__table__') AS columnName,
  CAST(ep.value AS NVARCHAR(MAX)) AS description
FROM sys.extended_properties ep
JOIN sys.tables t ON t.object_id = ep.major_id
LEFT JOIN sys.columns c ON c.object_id = ep.major_id AND c.column_id = ep.minor_id
WHERE SCHEMA_NAME(t.schema_id) = 'projects'
  AND t.name = 'LaudoDetails'
  AND ep.name = 'MS_Description';
```
Row with `columnName = '__table__'` holds the table-level description.

### Q6 — All tables in the database (for name inference)
```sql
SELECT TABLE_SCHEMA AS schemaName, TABLE_NAME AS tableName
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE';
```
Used to resolve name-inferred FK targets (e.g., is there a table whose name equals the `*Id`-stripped candidate?).

### Q7 — Columns named exactly `LaudoDetailsId` in any table (for inferred reverse refs)
```sql
SELECT TABLE_SCHEMA AS schemaName, TABLE_NAME AS tableName, COLUMN_NAME AS columnName
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'LaudoDetailsId'
  AND NOT (TABLE_SCHEMA = 'projects' AND TABLE_NAME = 'LaudoDetails');
```
Only exact matches. Broader patterns are out of scope.

### Q8 — Value-match candidates for `ClientName` and `GICS`
```sql
SELECT TABLE_SCHEMA AS schemaName, TABLE_NAME AS tableName
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (
    TABLE_NAME LIKE 'Client%' OR
    TABLE_NAME LIKE 'Cliente%' OR
    TABLE_NAME LIKE 'GICS%' OR
    TABLE_NAME LIKE 'Setor%'
  );
```

### Q9 — Primary-key column per neighbor (to fill `Neighbor.primaryKeyColumn`)
Sent once per distinct neighbor after Q3/Q4/Q6/Q7 are resolved:
```sql
SELECT TOP 1 k.COLUMN_NAME AS name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
  ON k.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
 AND k.TABLE_SCHEMA = tc.TABLE_SCHEMA
WHERE tc.TABLE_SCHEMA = @schema
  AND tc.TABLE_NAME = @table
  AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';
```
Since the tool accepts only a raw `query` string (no parameter binding), `@schema`/`@table` are interpolated in code — both come from catalog results (not user input), so SQL injection risk is controlled, but the interpolation function must still quote identifiers with `[...]` and reject anything not matching `^[A-Za-z_][A-Za-z0-9_]*$`. Details in `queries.ts`.

### Q10 — Row count for the central table and each neighbor
Sent once per table (central + each neighbor):
```sql
SELECT COUNT_BIG(*) AS rowCount FROM [<schema>].[<table>];
```
Same identifier-quoting rules as Q9. `COUNT_BIG` avoids integer overflow on large tables.

## Phases and Tasks

### Phase 1 — Project setup

- [x] Create directory `repos/sql/scripts/laudo-details/`.
- [x] Create directory `repos/sql/laudo-details/` and a `.gitkeep` inside it so the empty output directory is tracked by git.
- [x] Update `repos/sql/package.json`:
  - [x] Add `"engines": { "node": ">=22.6.0" }`.
  - [x] Add `"devDependencies": { "@types/node": "^22.0.0" }`.
  - [x] Add `"scripts": { "laudo-details:introspect": "node --env-file=../../.env.tool --experimental-strip-types scripts/laudo-details/introspect.ts" }`. Keep the existing `"test"` script.
- [x] Run `npm install` locally once to generate the updated `package-lock.json`.
- [x] Create `repos/sql/tsconfig.json` (only for editor support; the script never calls `tsc`):
  ```json
  {
    "compilerOptions": {
      "target": "ES2023",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "noEmit": true,
      "allowImportingTsExtensions": true,
      "isolatedModules": true,
      "skipLibCheck": true,
      "types": ["node"]
    },
    "include": ["scripts/**/*.ts"]
  }
  ```
  The `allowImportingTsExtensions` + `isolatedModules` pair matches Node's native type stripping contract (imports must use `.ts` extension).
- [x] Update `repos/sql/.gitignore` if needed. Current contents (`*.zip`, `.env`, `node_modules`) already cover local cruft; no change required unless we want to ignore a temp dir.

### Phase 2 — Tool client and types

- [x] Create `repos/sql/scripts/laudo-details/types.ts`. Contents: the TypeScript types documented in "Data Contract" above (`Column`, `ForeignKey`, `ReverseReference`, `ValueMatchCandidate`, `Neighbor`, `RunSummary`, `Snapshot`, `DiscoverySource`, `SCHEMA_VERSION`).
- [x] Create `repos/sql/scripts/laudo-details/tool-client.ts`:
  - [x] Export `async function runQuery(query: string): Promise<unknown[]>`.
  - [x] Read `URL` and `API_KEY` from `process.env`; throw a typed error `MissingEnvError` when either is absent, with a pt-BR message pointing to `.env.tool`.
  - [x] `POST` to `process.env.URL` with headers `content-type: application/json` and `x-api-key: process.env.API_KEY`; body `JSON.stringify({ query })`. Use `AbortController` with a **15-second** client-side timeout (see D4).
  - [x] Parse the response. If `statusCode === 200`, return `body.rows`.
  - [x] If `statusCode === 401`, throw `ToolAuthError` with a pt-BR message pointing to `.env.tool`.
  - [x] If `statusCode === 400`, parse `body.error`. When `error.code === "ETIMEOUT"`, throw `ToolDbUnreachableError` (the tool could not connect to SQL Server — retry does not help). Otherwise throw `ToolSqlError` carrying the full mssql error payload (`code`, `number`, `state`, `class`, `lineNumber`, `message`).
  - [x] If the request is aborted (fetch rejected with `AbortError`) or the response is `>=500` / reset, throw `ToolTimeoutError` — this is what the retry policy reacts to.
  - [x] The function does **not** retry internally. Retry policy lives in the orchestrator that knows how to narrow scope.
- [x] Create `repos/sql/scripts/laudo-details/queries.ts`:
  - [x] Export the SQL strings from the "SQL Queries Catalog" section as named constants (`Q1_COLUMNS`, `Q2_PRIMARY_KEY`, ...). For parameterized queries (Q9, Q10), export a function that returns the final SQL string after identifier quoting.
  - [x] Export `function quoteIdentifier(name: string): string` that validates `name` against `^[A-Za-z_][A-Za-z0-9_]*$` (throws on mismatch) and returns `[name]`.
  - [x] Export `function composeStoredType(row: { dataType: string; charLength: number | null; numericPrecision: number | null; numericScale: number | null }): string` that renders `nvarchar(500)`, `nvarchar(max)`, `decimal(18,4)`, `uniqueidentifier`, etc.

### Phase 3 — Discovery logic

- [x] Create `repos/sql/scripts/laudo-details/discovery.ts`. One pure function per concern, all consuming raw query results and returning typed outputs.
  - [x] `buildColumns(q1Rows, q2Rows, q5Rows): { columns: Column[]; tableDescription: string }` — merges columns, PK flags, extended properties.
  - [x] `buildCatalogForeignKeys(q3Rows): ForeignKey[]` — maps each row to `ForeignKey` with `source: "catalog"`.
  - [x] `inferForeignKeys(columns: Column[], existingCatalogFks: ForeignKey[], allTables: { schemaName: string; tableName: string }[]): ForeignKey[]` — for each column whose name ends in `Id` (case-insensitive) AND is not already resolved by catalog, strip the trailing `Id`, match case-insensitively against `allTables.tableName` (ignore schema in matching). Emits `source: "inferred"` with the matched table, or `source: "inferred-no-match"` with `targetTable: null` when no table matches.
  - [x] `buildCatalogReverseRefs(q4Rows): ReverseReference[]` — maps each row to `ReverseReference` with `source: "catalog"`.
  - [x] `inferReverseRefs(q7Rows, catalogReverseRefs: ReverseReference[]): ReverseReference[]` — emits `source: "inferred"` for rows whose `(fromSchema, fromTable)` is not already in the catalog list. The query Q7 already filters by exact column name `LaudoDetailsId`.
  - [x] `buildValueMatch(q8Rows): ValueMatchCandidate[]` — for each row, decide which `sourceColumn` it matches (`ClientName` if name starts with `Client`/`Cliente`; `GICS` if name starts with `GICS`/`Setor`) and record the matched pattern. A row matching multiple patterns is recorded once per source column.
  - [x] `collectNeighborTargets(fks: ForeignKey[], reverseRefs: ReverseReference[]): { schema: string; table: string }[]` — deduplicated list of neighbor tables to look up (PK column + row count) in later queries. Excludes `inferred-no-match` entries (they have no target).

### Phase 4 — Orchestrator and outputs

- [x] Create `repos/sql/scripts/laudo-details/serializer.ts`:
  - [x] Export `function serializeSnapshot(s: Snapshot): string` — returns the canonical JSON string (2-space indent, trailing newline). Before serializing, sort arrays as documented in `types.ts` doc-comments (columns by `ordinalPosition`; FKs by `sourceColumn`; reverse refs by `(fromSchema, fromTable)`; value-match by `(sourceColumn, candidateSchema, candidateTable)`; neighbors by `(schema, table)`).
- [x] Create `repos/sql/scripts/laudo-details/introspect.ts`:
  - [x] Entry-point pseudocode:
    1. Read `URL` and `API_KEY`; abort with pt-BR message if missing.
    2. Print `>> Introspecção de [projects].[LaudoDetails]`.
    3. Run Q1 (columns). Abort with `tabela [projects].[LaudoDetails] não encontrada` when zero rows.
    4. Run Q2 (PK).
    5. Run Q5 (extended properties).
    6. Build columns via `buildColumns`.
    7. Run Q3 (outbound FKs). Build `catalogForeignKeys`.
    8. Run Q6 (all tables). Build `inferredForeignKeys`.
    9. Run Q4 (inbound FKs). Build `catalogReverseRefs`.
    10. Run Q7 (exact-name inferred reverse refs). Build `inferredReverseRefs`.
    11. Run Q8 (value-match candidates). Build `valueMatchContextuals`.
    12. `collectNeighborTargets` → list of neighbors.
    13. For each neighbor, run Q9 (PK) then Q10 (row count). Plus Q10 for `[projects].[LaudoDetails]` itself.
    14. Build `RunSummary` with counters.
    15. Build `Snapshot`, set `extractionTimestamp` to `new Date().toISOString()`.
    16. Write `repos/sql/laudo-details/introspection.json` via `serializeSnapshot`.
    17. Print a summary of counts + path.
  - [x] Scope-narrowing retry wrapper: a helper `async function runWithRetry(step: string, fn: () => Promise<unknown[]>, narrow?: () => Promise<unknown[]>): Promise<unknown[]>` that catches `ToolTimeoutError`, increments `runSummary.batchRetries`, and calls `narrow` once if provided (or retries `fn` identically when no `narrow` is given). On second failure, aborts the whole script. `ToolDbUnreachableError`, `ToolAuthError`, and `ToolSqlError` are **not** caught here — they bubble up and abort immediately. Only Q6, Q7, and Q8 receive a `narrow` variant (query scoped by schema, concatenating results across schemas returned by `SELECT DISTINCT TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES`). Q1–Q5, Q9, Q10 have no `narrow` — they are already tiny.
  - [x] Error handling: all typed errors converted to pt-BR stderr messages per the functional spec. Non-zero exit code on any abort. The `introspection.json` is **not** overwritten on any abort path.

### Phase 5 — Final check and documentation

- [ ] Manual smoke test: run `npm run laudo-details:introspect` against the real database. Confirm:
  - [ ] `introspection.json` appears at the expected path with all 19 columns.
  - [ ] Re-run produces byte-identical output aside from `extractionTimestamp`.
  - [ ] Simulate an invalid `API_KEY` (temporarily edit `.env.tool`) → script aborts with the pt-BR message and does not overwrite the file.
  - [ ] Simulate a missing `.env.tool` → script aborts cleanly.
- [ ] Verify `git diff` on the committed `introspection.json` is human-readable.
- [ ] This deliverable does **not** write README changes — that content belongs to Deliverable 0003.

## Files Affected (summary)

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | modify | Add `engines`, `devDependencies.@types/node`, `scripts.laudo-details:introspect` |
| `package-lock.json` | regenerated | After `npm install` |
| `tsconfig.json` | create | Editor support only — no emit |
| `scripts/laudo-details/introspect.ts` | create | Orchestrator entry |
| `scripts/laudo-details/tool-client.ts` | create | `fetch` wrapper (POST to the tool's URL) + typed errors |
| `scripts/laudo-details/queries.ts` | create | SQL query strings + identifier quoting + `composeStoredType` |
| `scripts/laudo-details/types.ts` | create | Snapshot types + `SCHEMA_VERSION` |
| `scripts/laudo-details/discovery.ts` | create | Pure merge/infer functions |
| `scripts/laudo-details/serializer.ts` | create | Canonical JSON serializer |
| `laudo-details/.gitkeep` | create | Track the empty output dir |
| `laudo-details/introspection.json` | created by first run | First committed snapshot |

No changes to `index.mjs`, `build.sh`, or any other existing file.

## Risks and Constraints

- **Node version requirement**: the script needs Node ≥ 22.6 for `--experimental-strip-types`. Document this in `engines` + the Deliverable 0003 README. Older Node versions will fail at parse, not at runtime — the error message is clear.
- **Experimental flag**: `--experimental-strip-types` is behind a flag through Node 22.x and early 23.x; Node 24 enables it by default but the flag is still accepted. Using the flag makes the script work on the widest range of Node versions. Node will print one `ExperimentalWarning` line to stderr; acceptable.
- **Tool cold starts**: after an idle period the tool's Lambda needs to initialize before it starts responding — the first request can take several seconds longer than subsequent ones. The client's 15s fetch timeout absorbs that; the 2-retry policy absorbs any remaining transient cases. Two consecutive cold-start timeouts fail loudly — that is the correct behavior.
- **Tool unreachable from SQL Server (`ETIMEOUT` on the mssql side)**: when the tool itself answers but reports that it cannot open a connection to SQL Server, retrying does not help. The script aborts with a message that names the tool → DB path as the failing link. The 5-second `connectionTimeout` inside the tool (`index.mjs:33`) is what produces this error; it is a tool-internal setting, not a script constraint.
- **No formal FKs in the live database**: expected and handled — Q3/Q4 return zero rows, name inference carries the weight. The snapshot clearly marks every relationship by `source`.
- **SQL injection via dynamic identifiers (Q9, Q10)**: mitigated by the `quoteIdentifier` regex (`^[A-Za-z_][A-Za-z0-9_]*$`). Inputs to `quoteIdentifier` always come from catalog query results, never from CLI args or env vars. Any identifier with non-ASCII characters aborts the whole run — safer than silently quoting.
- **Clock skew between machines**: `extractionTimestamp` uses UTC (`toISOString()`). No local-time ambiguity.
- **Repo does not have a CLAUDE.md**: no repo-specific conventions to honor beyond what is in this plan.

## Verification

End-to-end verification before merging:

1. `npm install` from `repos/sql/` — expect no peer-dep warnings.
2. `npm run laudo-details:introspect` — expect a run that completes in under 15 seconds and writes `laudo-details/introspection.json` with 19 columns.
3. `jq '.runSummary' laudo-details/introspection.json` — counts line up with the printed progress summary.
4. `jq '.columns | length' laudo-details/introspection.json` — returns `19`.
5. `jq '.tableIdentity' laudo-details/introspection.json` — `{ schema: "projects", table: "LaudoDetails", rowCount: <number> }`.
6. Run the script twice; `diff <(jq 'del(.extractionTimestamp)' first.json) <(jq 'del(.extractionTimestamp)' second.json)` is empty.
7. Temporarily unset `API_KEY` and re-run — script aborts with pt-BR message pointing at `.env.tool`; `introspection.json` unchanged on disk.
8. Git status after run: only `laudo-details/introspection.json` is modified; no other file dirty.
