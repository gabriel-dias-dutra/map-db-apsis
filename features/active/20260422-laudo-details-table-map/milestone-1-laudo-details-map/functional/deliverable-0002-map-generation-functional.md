# Deliverable 0002 — LaudoDetails map generation `sql`

**Milestone:** Milestone 1 — LaudoDetails Map (MVP)

**Deliverables:**
- Map generator script + committed Markdown map in Brazilian Portuguese

**Description:** A Softo developer can run a single command that consumes the JSON snapshot from Deliverable 0001 and produces the final LaudoDetails map — a single Markdown document in Brazilian Portuguese, designed to be pasted into the n8n agent's system prompt. The map opens with a prominent "Avisos de tipo" section listing every column whose stored type does not match its semantic meaning (margins, financial ratios, and dates stored as `nvarchar`), with the simple rule the agent must follow and an inline flag repeated next to each affected column. It lists every column with a Portuguese description, a table of direct relationships labeled by discovery source (FK, inferred by name, or value match), a reverse-reference block for tables that reference `LaudoDetails.Id`, and a compact summary of neighbor tables — each with its row count — that the agent may need to JOIN against. Columns that the author cannot describe are rendered as "_Descrição pendente_" so the gap is visible rather than hidden.

**Dependencies:** Deliverable 0001 (consumes `repos/sql/laudo-details/introspection.json`).

**Complexity:** Medium — Functionality involving multiple rules or interactions between system areas. Multi-section rendering with conditional branches (type-trap detection, relationship-origin labeling, missing-description handling, value-match JOIN warnings), pt-BR wording that must read naturally, and an output budget kept compact enough to live inside the agent's system prompt.

**Size:** Small — Limited scope — few screens or interactions, straightforward flow. One offline script, one Markdown output file.

## User Flow

1. After a successful introspection (Deliverable 0001), the developer runs `npm run laudo-details:generate` from `repos/sql/`.
2. The script reads `repos/sql/laudo-details/introspection.json`.
3. The script determines, for each column, whether the stored type creates a type trap — every column whose stored type is text-shaped (`nvarchar`, `varchar`) but whose name or known semantics imply a numeric or date value.
4. The script renders the Markdown document in Brazilian Portuguese: header (table identity, snapshot timestamp, central and neighbor cardinalities) → "Avisos de tipo" section → columns section with inline flags → direct relationships table → reverse references → value-match contextuals → neighbor summaries → generation footer.
5. The script writes the rendered document to `repos/sql/laudo-details/map.md`, overwriting any previous version.
6. The script prints a summary — columns with descriptions vs. pending, relationships by source (catalog / inferred / value-match), reverse references found, type-trap columns flagged, neighbor count.
7. The developer reads the map, edits the generator's wording table (for column descriptions the author is ready to fill) if needed, reruns, commits the regenerated `map.md`, and opens a pull request.

## Fields and Data

The Markdown map (the generator's output) is structured in the following order, all in Brazilian Portuguese:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Header block | Text | Yes | Title (`# Mapa da tabela LaudoDetails`), the snapshot's `extractionTimestamp`, central-table row count, and a one-line paragraph framing the document. |
| "Avisos de tipo" section | Section | Yes | Opens the document. Lists every column whose stored type is text-shaped but semantically numeric or date, with columns: column name, stored type, semantic type, rule ("não filtrar/ordenar numericamente sem CAST/PARSE"). |
| Column entries | List | Yes | For each column of `LaudoDetails`: name, stored type, nullability, pt-BR description (or `_Descrição pendente_` with a short reason), inline flag (e.g., `⚠ texto com valor numérico`) when the column is in the type-warnings section. |
| Direct relationships table | Table | Yes | Columns: source column, target schema.table, target column, origin label (`FK do catálogo`, `inferido por nome`, `por valor`). One row per relationship. Empty-state message "nenhum relacionamento direto identificado" when zero relationships exist. |
| Reverse references block | List | Yes | Tables that reference `LaudoDetails.Id`, with origin label. Empty-state message when none exist. |
| Value-match contextuals | Section | Yes | For `ClientName` and `GICS`: candidate target tables with an explicit warning that any JOIN is by text, not by ID. Omitted only when both fields have zero candidates (that omission is stated in the summary line above the section). |
| Neighbor summaries | List | Yes | Each direct neighbor referenced by any relationship: schema.table, row count, one-line purpose description authored by Softo. |
| Generation footer | Text | Yes | Snapshot timestamp and generator version. |

**List view displays:** the map is a single flowing Markdown document — there is no list/detail split. The "columns section" is the de-facto "detail view" of each column and always shows name, stored type, nullability, description, and type-trap flag when applicable.

**Detail view displays:** not applicable — single-document deliverable.

## Business Rules

- All narrative text in the map is Brazilian Portuguese. Identifiers (table names, column names, schema names) stay in their original form.
- Type traps are detected against a closed list of patterns known from the CREATE TABLE: margins (`*Margin*`), beta (`*Beta`), cost (`*Cost`), revenue (`*Revenue*`, `*Growth*`), dates (`*Date*`, `*Year*`, `*Perpetuity*`). Every column that matches one of these patterns and whose stored type is `nvarchar` or `varchar` is added to the "Avisos de tipo" section and receives an inline flag. The patterns live in the generator code and are easy to extend.
- The column ordering in the map mirrors the ordinal position recorded by the introspection snapshot. Alphabetical sorting is explicitly avoided.
- Columns without an extended-property description from the snapshot and without a Softo-authored description in the generator's wording table are rendered as `_Descrição pendente — <motivo curto>_`. Every such column is reported in the generator's summary.
- Each relationship row carries an explicit origin label. A relationship without an origin label is a generator defect, not a rendering option.
- The value-match contextuals section always renders — it shows "nenhuma tabela correspondente encontrada" when both `ClientName` and `GICS` produced zero candidates.
- Neighbor summaries show row count in compact form (e.g., `~12k linhas`). Cardinality rounding rules: under 1000 → exact; 1000–1M → abbreviated thousands; over 1M → abbreviated millions.
- Output target size: the map should fit inside the agent's system prompt without crowding out other instructions. If the generated document exceeds a configurable soft limit, the script emits a warning in the summary but still writes the file.
- The script is offline — it does not talk to the Lambda or to any remote service. The snapshot is the only input.
- Each regeneration fully overwrites `map.md`. The file is not meant to be hand-edited.
- The generator records its own version in the footer; reading a snapshot produced by a different generator version prints a note but does not block generation.

## Error Behavior

- **Snapshot file missing:** the script aborts with "arquivo `laudo-details/introspection.json` não encontrado — rode `npm run laudo-details:introspect` primeiro". No map is written.
- **Snapshot malformed (parse error):** the script aborts with the parse error location and preserves the current `map.md`.
- **Snapshot schema-version unknown:** the script aborts with "versão desconhecida do snapshot (<valor>) — verifique a versão do gerador". The current `map.md` is preserved.
- **Zero columns in the snapshot:** the script aborts with "snapshot sem colunas — revise o resultado da introspecção". The previous map is preserved.
- **A column referenced by a relationship does not appear in the columns list:** the script prints a warning naming the inconsistency and continues. The relationship is rendered with a note "(referência órfã)".
- **The generator's wording table references a column no longer present in the snapshot:** the script prints a warning listing the stale entry and continues.
- **Output exceeds the soft size limit:** the script writes the file and prints a prominent warning with the estimated length, so the developer can shorten descriptions.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Run the generator | Any Softo developer with the repository cloned | No credentials needed — the generator is fully offline. |
| Edit column descriptions in the generator's wording table | Any Softo developer with write access to the `sql` repository | Normal pull-request review applies. |
| Commit the regenerated `map.md` | Any Softo developer with write access to the `sql` repository | Diff against the previous map is part of review. |
| Consume the map | Deliverable 0003 (agent integration) | The map is the documented contract between Deliverables 0002 and 0003. |
