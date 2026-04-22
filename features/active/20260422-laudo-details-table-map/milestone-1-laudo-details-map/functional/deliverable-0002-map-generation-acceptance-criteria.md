# Acceptance Criteria — Deliverable 0002: LaudoDetails map generation

**Milestone:** Milestone 1 — LaudoDetails Map (MVP)

**Deliverables:**
- Map generator script + committed Markdown map in Brazilian Portuguese

- [ ] Running `npm run laudo-details:generate` inside `repos/sql/`, after a successful introspection, completes and writes a file at `repos/sql/laudo-details/map.md`.
- [ ] The Markdown document is entirely in Brazilian Portuguese for narrative text; identifiers (schema, table, column names) are preserved in their original form.
- [ ] The document opens with a "Avisos de tipo" section listing every column whose stored type is text (`nvarchar`/`varchar`) but whose semantic type is numeric or date, with the rule "não filtrar/ordenar numericamente sem CAST/PARSE".
- [ ] Every column listed in the warnings section also carries an inline flag on its own row in the columns section.
- [ ] All 19 columns of `LaudoDetails` appear in the columns section in the same order as in the snapshot; alphabetical sorting is not applied.
- [ ] Columns without a description from extended properties and without a Softo-authored description are rendered as `_Descrição pendente — <motivo>_` and counted in the generation summary.
- [ ] Every direct relationship is rendered with an origin label: one of `FK do catálogo`, `inferido por nome`, or `por valor`.
- [ ] When the snapshot reports zero direct relationships, the relationships table displays the empty-state message "nenhum relacionamento direto identificado".
- [ ] Reverse references are rendered in their own block with origin labels; when none exist, an empty-state message is shown.
- [ ] The value-match contextuals section always renders — showing either the candidate tables (with an explicit "JOIN por texto, não por ID" warning) or the empty-state message when neither `ClientName` nor `GICS` produced candidates.
- [ ] Each neighbor table in the summary block shows its row count in compact form (exact under 1000; abbreviated thousands for 1000–1M; abbreviated millions above 1M).
- [ ] The header block shows the snapshot's `extractionTimestamp` and `LaudoDetails` row count.
- [ ] The footer shows the generator version.
- [ ] Running the generator twice against the same snapshot produces byte-identical Markdown.
- [ ] A missing snapshot aborts the run with "arquivo `laudo-details/introspection.json` não encontrado — rode `npm run laudo-details:introspect` primeiro"; the previous `map.md` is preserved.
- [ ] A malformed snapshot aborts the run and points to the parse error location; the previous `map.md` is preserved.
- [ ] An unknown `schemaVersion` in the snapshot aborts the run with a clear message; the previous `map.md` is preserved.
- [ ] A relationship that references a column not present in the snapshot's columns list is rendered with "(referência órfã)" and logged as a warning in the summary; generation continues.
- [ ] The generation summary prints: descriptions from extended properties, Softo-authored descriptions, pending descriptions, type-trap columns flagged, relationships by source, reverse references by source, neighbor count, and the final document length.
- [ ] When the document exceeds the configured soft size limit, the file is still written and a visible warning appears in the summary.

## General Criteria

- [ ] The generator does not talk to the Lambda or to any remote service — the snapshot is the only input.
- [ ] The generated `map.md` is committed to the `sql` repository via a pull request.
- [ ] No regressions in other scripts or files in `repos/sql/`.
