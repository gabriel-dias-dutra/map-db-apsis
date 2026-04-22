# Deliverable 0004 — Operator guide `sql`

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Operator guide (pt-BR) with troubleshooting

**Description:** A short operational guide, written in Brazilian Portuguese, that any Softo developer can follow end-to-end to refresh the Database Map when the Apsis schema changes and to measure the agent's accuracy afterwards. It covers the four steps a developer walks through — extract, regenerate, review, run validation — and the practical fixes for the problems most likely to come up along the way (Lambda timeouts, credential issues, broken map output, agent answers diverging from the expected answers). No screenshots.

**Dependencies:** Deliverables 0001, 0002, 0003 (the guide documents how to operate each of them).

**Complexity:** Very Low — Simple and routine functionality, no uncertainties. Documentation of steps that already exist in the other deliverables.

**Size:** Very Small — Minimal scope — a single screen, action, or minor adjustment. Single Markdown file, 1–2 pages in length.

## User Flow

1. A developer who needs to refresh the map opens the guide at a fixed path in the `sql` repository (e.g., `repos/sql/OPERATOR-GUIDE.md`).
2. The developer follows the four top-level sections in order:
   1. **Preparar o ambiente** — confirm `.env.tool` exists, API key is present, node version matches `package.json`.
   2. **Extrair o schema** — run the extraction command, interpret the run summary, handle common failures, commit the new `schema-snapshot.json` when the content changed.
   3. **Gerar o mapa** — run the generator, read the run summary, edit `schema-map-overrides.yaml` for any misgrouped table or missing description, rerun until the map is clean, commit the regenerated `database-map.md`.
   4. **Atualizar o agente no n8n** — open the n8n workflow, locate the agent's system prompt, replace the section delimited by the marker comments (e.g., `<!-- DATABASE-MAP:START -->` / `<!-- DATABASE-MAP:END -->`) with the contents of `database-map.md`, save the workflow.
   5. **Rodar a bateria de validação** — open `validation-battery.md`, submit each question to the agent in n8n, mark outcomes, commit a dated result file. Compare the hit rate with the previous run.
3. When the developer hits a problem, they jump to the **Troubleshooting** section (below the four steps) and look up the specific symptom.
4. When the process is done, the guide closes with a short checklist the developer can use to confirm everything was committed.

## Fields and Data

The guide document itself contains:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | Heading | Yes | e.g., "Guia do operador — Mapa do banco Apsis". |
| Pré-requisitos | Section | Yes | Environment setup, credentials, Node version. |
| Passo 1 — Extrair o schema | Section | Yes | Command, expected output, what to commit. |
| Passo 2 — Gerar o mapa | Section | Yes | Command, how to read the summary, how to edit overrides, when to commit. |
| Passo 3 — Atualizar o agente no n8n | Section | Yes | Where in the workflow to paste, the markers to look for, how to verify. |
| Passo 4 — Rodar a bateria de validação | Section | Yes | How to execute questions, how to score, how to commit the result file. |
| Troubleshooting | Section | Yes | One subsection per common failure (see Business Rules for the list). |
| Checklist final | Section | Yes | Short list the operator ticks off to confirm everything was done. |
| Tempo estimado | Field | Yes | Plain statement — "uma regeneração completa leva ~30 minutos", matching the success metric. |

## Business Rules

- Written in Brazilian Portuguese, with correct accents and diacritics.
- No screenshots — pure text + command blocks.
- Covers the **happy path** in four linear steps, then a **troubleshooting** section separated visually so it doesn't clutter the happy path.
- Troubleshooting includes at minimum these symptoms, each with a one-paragraph fix:
  - Lambda returns `connection timeout` → smaller batch size, retry; if persistent, check RDS availability.
  - Lambda returns `401 / API key inválida` → check `.env.tool` has the expected variable, not an expired key.
  - Extraction completes but no extended-property descriptions are present → verify the catalog query ran successfully; this is expected when the DBA hasn't annotated tables.
  - Map exceeds 3k tokens → shorten descriptions in overrides, split a large domain into two.
  - A table appears in a wrong domain → add a domain override in `schema-map-overrides.yaml`.
  - Agent starts giving wrong answers after the update → check map was pasted between the correct markers; run the battery to quantify the regression.
  - Battery result diverges from previous run without a clear cause → compare the Database Map git diff; flag any table whose description changed materially.
- The guide is versioned alongside the scripts it documents. When a command name changes, the guide must be updated in the same commit.
- The guide's target audience is "any Softo developer" — no prior knowledge of the Apsis database is assumed, but standard familiarity with git, Node, and n8n is.

## Error Behavior

- **Developer encounters a symptom not covered in troubleshooting:** the guide's last troubleshooting line directs them to update the guide after the issue is resolved, so the coverage grows with real experience.
- **Guide becomes out of date with the scripts:** detected when a developer tries to run a command that no longer exists. The fix is a documentation PR; this is called out at the top of the guide ("se o comando não funcionar, verifique se este guia foi atualizado no último PR do gerador").
- **n8n UI changes its prompt editor layout:** the guide refers to the markers in the prompt (`<!-- DATABASE-MAP:START -->`), not to UI coordinates, so a UI change does not invalidate the instructions. A note in the guide states this explicitly.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Read the guide | Any Softo developer | Lives in a public (internal) repository. |
| Update the guide | Any Softo developer with `sql` repo write access | Updates ride along with the PR that changed the underlying script. |
| Follow the guide end-to-end | Any Softo developer with `.env.tool` and n8n access | The guide lists both as prerequisites. |
