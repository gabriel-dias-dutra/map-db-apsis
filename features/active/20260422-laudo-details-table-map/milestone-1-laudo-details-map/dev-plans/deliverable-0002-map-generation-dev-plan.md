# Dev Plan — Deliverable 0002: LaudoDetails map generation

**Feature:** `features/active/20260422-laudo-details-table-map`
**Milestone:** Milestone 1 — LaudoDetails Map (MVP)
**Repositories affected:** `sql` (single repo)
**Depends on:** Deliverable 0001 (produces `repos/sql/laudo-details/introspection.json`).

## Context & Goal

Implement `npm run laudo-details:generate`: a TypeScript script that runs **on the developer's local machine**, reads `repos/sql/laudo-details/introspection.json`, and writes a single Brazilian-Portuguese Markdown document at `repos/sql/laudo-details/map.md`. The script is fully offline — it does not talk to the tool and does not touch any remote service. The output is designed to be pasted into the n8n agent's system prompt in Deliverable 0003.

Full functional spec: `milestone-1-laudo-details-map/functional/deliverable-0002-map-generation-functional.md`. This dev-plan translates it into concrete files, sections, and phases.

## Architecture Decisions

### D1. Same language and runtime as Deliverable 0001

- TypeScript (`.ts`), executed via `node --experimental-strip-types` (Node ≥ 22.6, default on Node 24+).
- No `tsx`, no `ts-node`, no `tsc` build step. Same constraints on syntax (no `enum`, no `namespace`, etc.) — the existing `tsconfig.json` from D0001 covers it.
- No new runtime or dev dependencies. `@types/node` from D0001 is the only dev dep on the repo.

### D2. Module layout extends the D0001 layout

Inside `repos/sql/scripts/laudo-details/` (created in D0001), the generator adds:

```
scripts/laudo-details/
├── generate.ts            # NEW — D0002 entrypoint
├── wording.ts             # NEW — Softo-authored descriptions + type-trap map
├── render.ts              # NEW — top-level section composer
└── rendering/             # NEW — one module per output section
    ├── header.ts
    ├── type-warnings.ts
    ├── columns.ts
    ├── relationships.ts
    ├── reverse-refs.ts
    ├── value-match.ts
    ├── neighbors.ts
    └── footer.ts
```

Existing files from D0001 (`introspect.ts`, `tool-client.ts`, `queries.ts`, `discovery.ts`, `serializer.ts`, `types.ts`) are **not modified**, except `types.ts` gains a few additional types used by the generator (documented in Phase 2). No change to the snapshot contract itself.

### D3. Softo-authored wording lives in `wording.ts` (typed TS)

- Column descriptions, neighbor descriptions, and type-trap declarations all live in a single `wording.ts` module with strict types.
- Advantages over JSON/YAML: PR diffs highlight authoring changes clearly; TypeScript rejects typos in column names via a union type derived from the snapshot's own column list (see D5); no new parser dependency.
- Non-authors (e.g., Apsis reviewers in a future iteration) can still edit this file — the shape is a plain literal record, not code logic.

### D4. Type-trap detection: explicit per-column map (no regex)

- Every column the agent must treat as a type trap is listed by name in `typeTraps` in `wording.ts`. No regex heuristic.
- Rationale: the table has 19 columns and the list is stable. Explicit enumeration avoids false positives (e.g., a future `BaseDate` that is a real `date` type) and makes the rule for each column authoritative.
- Columns not in the map are rendered without a type-trap flag; columns in the map appear both in the "Avisos de tipo" section and with an inline flag on their row.

### D5. Wording is keyed by column name strings (no enum, per D1)

- The column-description map uses a plain `Record<string, ColumnDescription>`. Type safety against typos comes from a test (Phase 5) that compares `Object.keys(columnDescriptions)` against the column list in a reference fixture. That check runs once in Phase 5 verification; it is not part of the happy-path runtime.
- A column with no entry in `columnDescriptions` is rendered as `_Descrição pendente — sem descrição autorada_`. Authors add the entry to remove the marker.

### D6. Deterministic, byte-identical output

- The generator is pure given a fixed input snapshot: two runs against the same `introspection.json` produce byte-identical `map.md` (no embedded run timestamp; the only timestamp in the output is the snapshot's `extractionTimestamp`, which is already fixed in the input).
- Sorting rules (from `Snapshot` arrays in `types.ts`) are preserved as-is when rendering. Columns render in `ordinalPosition` order; relationships in `sourceColumn` order; etc.
- Generator version is a string constant declared in `generate.ts` and echoed in the footer. Changing it is a manual bump in a dedicated commit.

### D7. Soft size limit: 20,000 characters, warning only

- After rendering, the generator measures the length of the Markdown string.
- If length > 20,000 characters, it emits a prominent warning in the run summary (`⚠ mapa excede 20.000 caracteres (atual: 23.412)`) and still writes the file. Never aborts on length alone.
- The threshold is a `SOFT_CHAR_LIMIT` constant in `generate.ts`; easy to raise.

### D8. pt-BR narrative, identifiers untouched

- All headings, inline text, table column headers, empty-state messages, warnings, and footer strings render in Brazilian Portuguese.
- Schema names, table names, column names, and constraint names stay exactly as the snapshot provides them (including case). No quoting, no transliteration.

### D9. Markdown is rendered via string templates, not a library

- Each rendering module exports a pure function `render<SectionName>(input): string`. The top-level `render.ts` concatenates section outputs with a blank line between sections, nothing more.
- Avoids pulling in a Markdown AST library for what is effectively templated text. Sections are short and the output is linear.

## Output Contract: `map.md` structure

The document is a single Markdown file, assembled in this fixed order:

1. **Header block**
   - `# Mapa da tabela [projects].[LaudoDetails]`
   - One-paragraph lead: purpose, that it is generated, that authoritative content lives in `scripts/laudo-details/wording.ts`.
   - A "Metadados" subsection as a small Markdown table: Snapshot, Data da extração, Linhas na tabela, Vizinhos mapeados, Versão do gerador.

2. **"Avisos de tipo" section** (`## ⚠ Avisos de tipo`)
   - One-paragraph rule statement: "As colunas abaixo são armazenadas como texto (`nvarchar`/`varchar`) mas carregam valores numéricos ou datas. Ao consultar estas colunas, não filtre, ordene ou agregue numericamente sem um `CAST`/`PARSE` explícito."
   - A Markdown table with columns: **Coluna** · **Tipo armazenado** · **Tipo semântico** · **Observação**.
   - When no columns are in the trap map: the section still renders with a single-line empty-state message "Nenhuma coluna exige tratamento de tipo especial." (Not expected for LaudoDetails.)

3. **Columns section** (`## Colunas`)
   - A Markdown table with columns: **Coluna** · **Tipo armazenado** · **Obrigatório** · **Descrição** · **⚠**.
   - One row per snapshot column, in `ordinalPosition` order.
   - `Obrigatório` = `Sim` when `nullable === false`, `Não` otherwise; PK columns append `(PK)`.
   - `Descrição` = authored text, or `_Descrição pendente — <motivo>_` (italic markdown).
   - `⚠` = emoji when the column is in the type-trap map, empty cell otherwise.

4. **Relationships section** (`## Relacionamentos diretos`)
   - A Markdown table with columns: **Coluna de origem** · **Tabela-alvo** · **Coluna-alvo** · **Origem**.
   - `Tabela-alvo` is rendered as `schema.table` or `—` when `source === "inferred-no-match"`.
   - `Origem` is one of: `FK do catálogo`, `inferido por nome`, `sem correspondência`.
   - Empty-state line when zero relationships: "Nenhum relacionamento direto identificado."

5. **Reverse references section** (`## Referências reversas (tabelas que apontam para LaudoDetails.Id)`)
   - A Markdown table with columns: **Tabela** · **Coluna** · **Origem**.
   - `Origem` ∈ `FK do catálogo` | `inferido por nome`.
   - Empty-state line when zero: "Nenhuma referência reversa identificada."

6. **Value-match contextuals section** (`## Relacionamentos implícitos por valor`)
   - Intro paragraph: the join must use text equality, not `*Id`.
   - A Markdown table with columns: **Coluna de origem** · **Tabela candidata** · **Padrão**.
   - Empty-state line when no candidates for both fields: "Nenhuma tabela correspondente encontrada para `ClientName` ou `GICS`."
   - When candidates exist for only one of the two fields, the table renders only those rows and the missing one is called out in a one-liner above the table.

7. **Neighbor summaries section** (`## Vizinhos mapeados`)
   - An unordered list. One bullet per neighbor: `` **`schema.table`** (~<cardinality>) — <authored description or pending marker> ``
   - Cardinality format: exact integer under 1000 (e.g., `812`); abbreviated thousands between 1000 and 1,000,000 (e.g., `~12 mil`); abbreviated millions above that (e.g., `~3,4 milhões`).
   - Neighbors render in `(schema, table)` order from the snapshot.
   - Empty-state: "Nenhum vizinho mapeado." (Not expected for LaudoDetails.)

8. **Footer**
   - A horizontal rule `---` and a line: `_Gerado pelo `laudo-details:generate` v<generator-version> · snapshot extraído em <iso-timestamp>_`

A single trailing newline is always appended. Sections are separated by exactly one blank line.

## Types added to `types.ts`

Additions only — existing types from D0001 stay untouched.

```typescript
// scripts/laudo-details/types.ts (additions)

export type ColumnDescription =
  | { type: "described"; text: string }
  | { type: "pending"; reason: string };

export type SemanticType = "numeric" | "date";

export interface TypeTrap {
  semanticType: SemanticType;
  observation: string;   // pt-BR, e.g., "texto com valor percentual"
}

export interface GenerationSummary {
  descriptionsAuthored: number;
  descriptionsPending: number;
  typeTrapsFlagged: number;
  relationshipsCatalog: number;
  relationshipsInferred: number;
  relationshipsNoMatch: number;
  reverseReferencesCatalog: number;
  reverseReferencesInferred: number;
  valueMatchCandidates: number;
  neighborsTotal: number;
  outputCharCount: number;
  outputExceedsSoftLimit: boolean;
}
```

## Phases and Tasks

### Phase 1 — Wiring

- [x] Add `"laudo-details:generate"` to `repos/sql/package.json` `scripts`:
  ```
  "laudo-details:generate": "node --experimental-strip-types scripts/laudo-details/generate.ts"
  ```
  Note: this script does **not** need `--env-file` — the generator is offline and reads no environment variables.
- [x] Confirm the existing `repos/sql/tsconfig.json` from D0001 includes `scripts/**/*.ts` (it already does; no edit needed).
- [x] Confirm the directory `repos/sql/laudo-details/` exists (created in D0001 with a `.gitkeep`). If the generator writes `map.md`, the `.gitkeep` can remain or be removed in the same PR.

### Phase 2 — Types and wording

- [x] Extend `repos/sql/scripts/laudo-details/types.ts` with the additions listed in "Types added to `types.ts`" above. Keep the existing types verbatim; append the new ones at the bottom of the file.
- [x] Create `repos/sql/scripts/laudo-details/wording.ts`. Exports three records plus re-exports used types from `types.ts`:
  - [x] `export const typeTraps: Record<string, TypeTrap>` — one entry per known text-stored numeric/date column in `LaudoDetails`. Initial list (columns drawn from the CREATE TABLE shared by the user):
    ```typescript
    export const typeTraps: Record<string, TypeTrap> = {
      BaseDate:               { semanticType: "date",    observation: "texto em formato de data" },
      GrossMarginBaseDate:    { semanticType: "numeric", observation: "texto com valor percentual" },
      EbitdaMarginBaseDate:   { semanticType: "numeric", observation: "texto com valor percentual" },
      GrossMarginPerpetuity:  { semanticType: "numeric", observation: "texto com valor percentual" },
      EbitdaMarginPerpetuity: { semanticType: "numeric", observation: "texto com valor percentual" },
      PerpetuityYear:         { semanticType: "numeric", observation: "texto com ano (int)" },
      UnleveredBeta:          { semanticType: "numeric", observation: "texto com valor numérico (beta)" },
      DebtCost:               { semanticType: "numeric", observation: "texto com taxa numérica" },
      NetOperatingRevenue:    { semanticType: "numeric", observation: "texto com valor monetário" },
      RevenueGrowthLast3Years:{ semanticType: "numeric", observation: "texto com taxa numérica" },
      LastHistoricalYear:     { semanticType: "date",    observation: "texto com ano histórico" },
    };
    ```
    `Id`, `ProposalId`, `SentDocumentId`, `ClientName`, `EvaluationObject`, `ReportObjective`, `Methodology`, `GICS` are intentionally **not** traps — they are genuinely text-shaped semantics.
  - [x] `export const columnDescriptions: Record<string, ColumnDescription>` — one entry per column in `LaudoDetails`. Columns whose business meaning is confidently known get `{ type: "described", text: "<pt-BR>" }`. Columns the author cannot describe confidently (financial domain specifics that Apsis will later review) get `{ type: "pending", reason: "<motivo curto>" }`. Initial authoring seed (implementer should refine wording during Phase 5 review):
    ```typescript
    export const columnDescriptions: Record<string, ColumnDescription> = {
      Id:                       { type: "described", text: "Identificador único do laudo (UUID)." },
      ProposalId:               { type: "described", text: "Proposta comercial que deu origem ao laudo." },
      SentDocumentId:           { type: "described", text: "Documento enviado associado ao laudo." },
      ClientName:               { type: "described", text: "Nome do cliente do laudo, armazenado como texto (não é FK)." },
      EvaluationObject:         { type: "described", text: "Descrição do objeto avaliado (texto longo)." },
      ReportObjective:          { type: "described", text: "Objetivo do relatório de avaliação (texto longo)." },
      Methodology:              { type: "described", text: "Metodologia aplicada na avaliação (texto longo)." },
      GICS:                     { type: "described", text: "Código ou nome do setor GICS do avaliado (texto; não é FK)." },
      BaseDate:                 { type: "described", text: "Data-base da avaliação (armazenada como texto)." },
      GrossMarginBaseDate:      { type: "pending",   reason: "confirmar com Apsis se é percentual da data-base ou valor absoluto" },
      EbitdaMarginBaseDate:     { type: "pending",   reason: "confirmar com Apsis se é percentual da data-base ou valor absoluto" },
      GrossMarginPerpetuity:    { type: "pending",   reason: "confirmar com Apsis a interpretação de margem na perpetuidade" },
      EbitdaMarginPerpetuity:   { type: "pending",   reason: "confirmar com Apsis a interpretação de margem na perpetuidade" },
      PerpetuityYear:           { type: "described", text: "Ano a partir do qual o modelo considera perpetuidade." },
      UnleveredBeta:            { type: "pending",   reason: "confirmar com Apsis a fonte do beta desalavancado utilizado" },
      DebtCost:                 { type: "described", text: "Custo da dívida (taxa) considerado no modelo, armazenado como texto." },
      NetOperatingRevenue:      { type: "described", text: "Receita operacional líquida registrada, armazenada como texto." },
      RevenueGrowthLast3Years:  { type: "described", text: "Taxa de crescimento da receita nos últimos 3 anos, armazenada como texto." },
      LastHistoricalYear:       { type: "described", text: "Último ano com dado histórico considerado no laudo (armazenado como texto)." },
    };
    ```
  - [x] `export const neighborDescriptions: Record<string, string>` — one entry per neighbor likely to appear, keyed as `"<schema>.<table>"`. Initial seeds are best-effort; neighbors not in the map render with the pending marker. Seed at least: `"projects.Proposal"`, `"projects.SentDocument"`. Example:
    ```typescript
    export const neighborDescriptions: Record<string, string> = {
      "projects.Proposal":     "Proposta comercial que precede o laudo.",
      "projects.SentDocument": "Documento enviado/arquivado ligado ao laudo.",
    };
    ```
  - [x] Any neighbor not present in the map is rendered as `_Descrição pendente — vizinho não autorado_`.

### Phase 3 — Per-section rendering modules

Each module exports one pure function. Input is the already-loaded `Snapshot` (plus wording imports where needed); output is a string of Markdown with no leading/trailing blank lines (the composer handles separators).

- [x] `repos/sql/scripts/laudo-details/rendering/header.ts` — `renderHeader(snapshot: Snapshot, generatorVersion: string, neighborsCount: number): string`. Produces title, intro paragraph, and a Markdown "Metadados" table with the five rows (Snapshot version, Data, Linhas na tabela, Vizinhos mapeados, Versão do gerador).
- [x] `repos/sql/scripts/laudo-details/rendering/type-warnings.ts` — `renderTypeWarnings(snapshot: Snapshot): string`. Walks `snapshot.columns` in order, keeps those present in `typeTraps`, and renders them. Empty-state line when none.
- [x] `repos/sql/scripts/laudo-details/rendering/columns.ts` — `renderColumns(snapshot: Snapshot): string`. Renders every column row. Merges data from the snapshot with `columnDescriptions` (pending marker fallback), and the inline `⚠` flag when the column is in `typeTraps`. `Obrigatório` = `Sim` / `Não`, appending `(PK)` when `isPrimaryKey`.
- [x] `repos/sql/scripts/laudo-details/rendering/relationships.ts` — `renderRelationships(snapshot: Snapshot): string`. Renders `snapshot.foreignKeys` in snapshot order. Origin string mapping: `"catalog" → "FK do catálogo"`, `"inferred" → "inferido por nome"`, `"inferred-no-match" → "sem correspondência"`. When target is null, show `—`. Empty-state line when `foreignKeys.length === 0`.
- [x] `repos/sql/scripts/laudo-details/rendering/reverse-refs.ts` — `renderReverseRefs(snapshot: Snapshot): string`. Analogous to relationships, over `snapshot.reverseReferences`.
- [x] `repos/sql/scripts/laudo-details/rendering/value-match.ts` — `renderValueMatch(snapshot: Snapshot): string`. Intro paragraph + table of `valueMatchContextuals`. Computes presence per source column: if both present, shows both; if one missing, a callout line above the table says "Sem candidatos para `<missing column>`"; if both missing, renders only the single empty-state line.
- [x] `repos/sql/scripts/laudo-details/rendering/neighbors.ts` — `renderNeighbors(snapshot: Snapshot): string`. Bulleted list with abbreviated row counts. Helper `formatRowCount(n: number): string` handles the three-tier formatting described in the output contract.
- [x] `repos/sql/scripts/laudo-details/rendering/footer.ts` — `renderFooter(snapshot: Snapshot, generatorVersion: string): string`. Horizontal rule + italicized one-liner.

### Phase 4 — Composer and entrypoint

- [x] Create `repos/sql/scripts/laudo-details/render.ts`:
  - [x] Export `function renderMap(snapshot: Snapshot, generatorVersion: string): string`.
  - [x] Calls each `render<Section>` in the order listed above, joins with `\n\n`, appends a single trailing `\n`.
- [x] Create `repos/sql/scripts/laudo-details/generate.ts`:
  - [x] `const GENERATOR_VERSION = "1.0.0"` near the top.
  - [x] `const SOFT_CHAR_LIMIT = 20_000` near the top.
  - [x] `const INPUT_PATH = "laudo-details/introspection.json"`, `const OUTPUT_PATH = "laudo-details/map.md"` (paths resolved from `process.cwd()` = `repos/sql/`).
  - [x] Entry-point flow:
    1. Check `INPUT_PATH` exists. If not, abort with `arquivo 'laudo-details/introspection.json' não encontrado — rode 'npm run laudo-details:introspect' primeiro.` (stderr, exit 1, preserve any existing `map.md`).
    2. Read and parse the JSON. On parse error: abort with a message naming the parse error line/column and preserve the current `map.md`.
    3. Validate `schemaVersion === SCHEMA_VERSION`. If mismatch: abort with `versão desconhecida do snapshot (<valor>) — verifique a versão do gerador.` Preserve `map.md`.
    4. Validate `columns.length > 0`. If zero: abort with `snapshot sem colunas — revise o resultado da introspecção.` Preserve `map.md`.
    5. Detect inconsistencies (non-fatal): for each relationship referencing a `sourceColumn` not present in `columns`, print a stderr warning `(referência órfã: <col>)` and continue. The relationship still renders, with `(referência órfã)` appended to its origin cell.
    6. Detect stale wording entries (non-fatal): for each key in `columnDescriptions` that is not in `snapshot.columns`, print a stderr warning `wording obsoleto: <coluna> não está no snapshot`. Continues.
    7. Call `renderMap(snapshot, GENERATOR_VERSION)`.
    8. Write the result to `OUTPUT_PATH` via `fs.writeFileSync` with UTF-8 (no BOM).
    9. Compute and print a `GenerationSummary` — counts described here, plus `outputCharCount` (length of the rendered string) and `outputExceedsSoftLimit` boolean.
    10. If `outputExceedsSoftLimit`, print an extra line: `⚠ mapa excede ${SOFT_CHAR_LIMIT.toLocaleString("pt-BR")} caracteres (atual: ${outputCharCount.toLocaleString("pt-BR")})`.
    11. Exit 0 on success.
  - [x] All user-facing strings in pt-BR; internal error messages in English are fine for developer stack traces only.

### Phase 5 — Smoke test and wording pass

- [x] Run `npm run laudo-details:introspect` first (prerequisite — produces `laudo-details/introspection.json`).
- [x] Run `npm run laudo-details:generate` and open `laudo-details/map.md`.
- [x] Visually verify each section:
  - [x] Title matches `# Mapa da tabela [projects].[LaudoDetails]`.
  - [x] Metadados table is populated.
  - [x] "Avisos de tipo" section lists the 11 expected columns (see `typeTraps` above).
  - [x] Columns section shows 19 rows in `ordinalPosition` order, with descriptions from `wording.ts`.
  - [x] Relationships section has rows for `ProposalId` and `SentDocumentId` (origin depends on catalog presence).
  - [x] Reverse references section populated according to snapshot.
  - [x] Value-match table or empty-state rendered depending on snapshot content.
  - [x] Neighbor summaries show abbreviated row counts.
  - [x] Footer references `GENERATOR_VERSION` and the snapshot timestamp.
- [x] Run the generator twice and `diff` the two outputs — expect zero differences.
- [x] Simulate missing input: `mv laudo-details/introspection.json /tmp/` → `npm run laudo-details:generate` → expect the pt-BR abort message and no change to `map.md`. Restore the file.
- [x] Simulate malformed input: append garbage to `introspection.json`, run, expect abort + preserved `map.md`. Restore.
- [x] Simulate schema version bump: edit `schemaVersion` to `"999"` in the snapshot, run, expect abort. Restore.
- [x] Verify total length against the soft limit: `wc -c laudo-details/map.md`. If > 20,000, confirm the warning line is present in the summary and trim descriptions as needed.
- [x] Refine any column or neighbor description where the Markdown reads awkwardly; re-run to confirm deterministic output.
- [ ] Commit `map.md` + `wording.ts` + the new rendering modules in a single PR.

## Files Affected (summary)

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | modify | Add `"laudo-details:generate"` script |
| `scripts/laudo-details/types.ts` | modify | Append generator-only types (`ColumnDescription`, `TypeTrap`, `SemanticType`, `GenerationSummary`) |
| `scripts/laudo-details/wording.ts` | create | Column descriptions, neighbor descriptions, type-trap map |
| `scripts/laudo-details/render.ts` | create | Composer calling each section renderer |
| `scripts/laudo-details/rendering/header.ts` | create | Header + Metadados table |
| `scripts/laudo-details/rendering/type-warnings.ts` | create | "Avisos de tipo" section |
| `scripts/laudo-details/rendering/columns.ts` | create | Columns section |
| `scripts/laudo-details/rendering/relationships.ts` | create | Direct relationships table |
| `scripts/laudo-details/rendering/reverse-refs.ts` | create | Reverse references block |
| `scripts/laudo-details/rendering/value-match.ts` | create | Value-match contextuals section |
| `scripts/laudo-details/rendering/neighbors.ts` | create | Neighbor summaries list |
| `scripts/laudo-details/rendering/footer.ts` | create | Footer |
| `scripts/laudo-details/generate.ts` | create | Entrypoint, orchestration, error handling |
| `laudo-details/map.md` | created by first run | First committed Markdown map |

No changes to `index.mjs`, `build.sh`, `tsconfig.json`, any D0001 script module beyond `types.ts`, or any other existing file. The generator is strictly additive.

## Risks and Constraints

- **Input drift between D0001 and D0002**: the snapshot's shape is the contract. If D0001 changes the `Snapshot` type, the generator must follow in the same PR. `schemaVersion` + the strict TS types are the tripwire.
- **Pt-BR wording quality**: the initial seed in `wording.ts` is best-effort. Any column whose description is not confidently authored must stay marked as `pending` — the map surfaces gaps honestly rather than guessing.
- **Financial-domain pending items**: `GrossMarginBaseDate`, `EbitdaMarginBaseDate`, `GrossMarginPerpetuity`, `EbitdaMarginPerpetuity`, and `UnleveredBeta` are intentionally `pending` in the seed. This is not a bug — it is the contract for a follow-up Apsis-review iteration (see overview "Future Ideas").
- **Soft size limit is advisory, not enforced**: if the agent's system prompt grows too large, the warning is the only signal. Teams noticing bloat should either tighten descriptions in `wording.ts` or raise `SOFT_CHAR_LIMIT` deliberately.
- **Cardinality formatting thresholds** (`< 1000` exact, `< 1_000_000` thousands, otherwise millions) are opinionated. Easy to revisit; centralized in `formatRowCount` inside `rendering/neighbors.ts`.
- **Identifier rendering**: schema/table/column names are echoed byte-for-byte from the snapshot. Any SQL Server collation quirks (casing, accented characters) are preserved — the generator never normalizes them.
- **`map.md` is not hand-edited**: if a reviewer wants different wording, the change goes into `wording.ts`, not the generated file. Calling this out in the PR description during the first commit saves confusion later.

## Verification

End-to-end verification before merging:

1. `npm install` succeeds from `repos/sql/` (no new deps expected).
2. `npm run laudo-details:introspect` has run and `laudo-details/introspection.json` is present.
3. `npm run laudo-details:generate` completes in under 2 seconds.
4. `laudo-details/map.md` exists, is valid UTF-8, and starts with `# Mapa da tabela [projects].[LaudoDetails]`.
5. `wc -l laudo-details/map.md` and `wc -c laudo-details/map.md` are stable across two successive runs.
6. `diff <(npm run laudo-details:generate --silent 1>/dev/null && cat laudo-details/map.md) <(sleep 1 && npm run laudo-details:generate --silent 1>/dev/null && cat laudo-details/map.md)` is empty.
7. `grep -c '⚠' laudo-details/map.md` equals (count of `typeTraps` entries) × 2 (once in warnings table, once inline per affected column row).
8. `grep -c 'Descrição pendente' laudo-details/map.md` equals the number of `pending` entries in `columnDescriptions` (plus any missing neighbor descriptions).
9. Running with a missing `introspection.json` produces the expected pt-BR abort and `map.md` is unchanged on disk.
10. Running with a tampered `schemaVersion` produces the expected pt-BR abort and `map.md` is unchanged on disk.
11. Git status after a successful run: only `laudo-details/map.md` is modified beyond the source files added in this PR.
