# Deliverable 0003 — Agent prompt integration and operator README `sql` `n8n`

**Milestone:** Milestone 1 — LaudoDetails Map (MVP)

**Deliverables:**
- Marker-delimited section in the n8n agent's system prompt populated with the generated map + operator README section in `repos/sql/` covering the full three-step flow

**Description:** Once the map is committed (Deliverable 0002), a Softo developer can make the n8n agent actually use it. The agent's system prompt gains a clearly delimited section — between the comment markers `<!-- LAUDO-DETAILS:START -->` and `<!-- LAUDO-DETAILS:END -->` — that holds the contents of `repos/sql/laudo-details/map.md`. Refreshing the map later is a single copy-paste between those markers. A new "Mapa da tabela LaudoDetails" section in `repos/sql/README.md` documents the full operator flow end-to-end — the two npm commands, where the outputs live, how to paste the map into n8n, and the five-question pilot that confirms the agent now answers laudos questions correctly.

**Dependencies:** Deliverable 0002 (the generated `map.md` is what gets pasted between the markers).

**Complexity:** Very Low — Simple and routine functionality, no uncertainties. A text-level integration: define the markers, paste the map between them, document the flow, run five manual pilot questions.

**Size:** Very Small — Minimal scope — a single screen, action, or minor adjustment. One edit in the n8n workflow and one section added to the `sql` repo's README.

## User Flow

### First-time setup (one-time, during this milestone)

1. The developer opens the n8n workflow that hosts the database search agent and locates the agent node's system prompt.
2. Inside the system prompt, the developer inserts two comment markers on their own lines, in the position where laudos knowledge belongs in the prompt's structure:

   ```
   <!-- LAUDO-DETAILS:START -->
   <!-- LAUDO-DETAILS:END -->
   ```

3. The developer copies the full contents of `repos/sql/laudo-details/map.md` and pastes them between the two markers.
4. The developer saves the workflow.
5. The developer opens `repos/sql/README.md`, adds a new "Mapa da tabela LaudoDetails" section describing the end-to-end flow (two commands, output paths, n8n paste procedure, pilot-question checklist), and commits the change via a pull request.
6. Once the README PR is merged, the developer runs the five pilot questions (see Business Rules) against the agent in n8n and records pass/partial/fail for each. No committed results file — the grading is informal and only confirms the first-time integration works.

### Regular refresh (every time the map changes)

1. The developer follows Deliverables 0001 and 0002 to regenerate `map.md`.
2. The developer opens the n8n workflow, locates the existing markers, and replaces everything between them with the new contents of `map.md`.
3. The developer saves the workflow and runs a quick spot-check with two or three laudos questions to make sure the agent still behaves.

## Fields and Data

The operator README section documents the following, in Brazilian Portuguese:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Section title | Heading | Yes | "Mapa da tabela LaudoDetails" — stable anchor in the README. |
| Purpose paragraph | Text | Yes | One-paragraph explanation of what the map is and why it exists. |
| Pré-requisitos | Block | Yes | `.env.tool` with `URL` and `API_KEY`; Node version aligned with `package.json`. |
| Passo 1 — Introspecção | Block | Yes | Command (`npm run laudo-details:introspect`), expected output path (`repos/sql/laudo-details/introspection.json`), short note on the summary to read, when to commit. |
| Passo 2 — Geração do mapa | Block | Yes | Command (`npm run laudo-details:generate`), expected output path (`repos/sql/laudo-details/map.md`), how to read the summary, when to commit. |
| Passo 3 — Atualizar o agente no n8n | Block | Yes | Where the agent lives in n8n, the two markers (`<!-- LAUDO-DETAILS:START -->` / `<!-- LAUDO-DETAILS:END -->`), how to replace the content, how to save. |
| Perguntas-piloto | List | Yes | The five pilot questions (exact pt-BR text), the pass/partial/fail rubric, and what to do when a question fails. |
| Troubleshooting | Block | No | Short notes on the three most likely failure modes observed during first-time setup. Can grow over time. |

**List view displays:** the README section is a linear document — there is no list/detail split.

**Detail view displays:** not applicable.

## Business Rules

- The markers `<!-- LAUDO-DETAILS:START -->` and `<!-- LAUDO-DETAILS:END -->` are the single canonical contract between the generated map and the n8n prompt. The map is pasted only between the markers, and the markers themselves are never deleted.
- Nothing else in the agent's system prompt depends on the exact content between the markers — the map is self-contained and can be fully replaced without touching surrounding instructions.
- The five pilot questions are fixed for this deliverable (so "pass rate on the first integration" is a comparable signal):
  1. "Quais laudos foram assinados para a Petrobras em 2025?"
  2. "Qual a metodologia usada no laudo mais recente?"
  3. "Liste os laudos com EBITDA margin maior que 20% — quando possível."
  4. "Quais laudos estão ligados à proposta X?"
  5. "Quais clientes têm mais de três laudos cadastrados?"
  The third question deliberately stresses the type-trap behavior (a text-stored numeric field); it measures whether the agent reads the "Avisos de tipo" section.
- Pilot grading rubric: **pass** when the agent's SQL runs and returns the right entities, **partial** when the SQL runs but the filter/JOIN is imprecise, **fail** when the SQL errors or returns wrong entities.
- A pass rate of at least 4 of 5 (80%) confirms the first-time integration. A lower rate is not a blocker for merging the README, but it is a signal to improve the map (usually the pending descriptions or the type-warnings section) in a follow-up pull request.
- Pilot results from the first integration live as a comment on the integration pull request, not as a committed artifact. A committed question battery is explicitly a future idea (see overview).
- The README section is owned by this deliverable but assumes the commands and output paths from Deliverables 0001 and 0002. If any of those change, this deliverable's documentation must change in the same pull request.
- The integration touches the n8n workflow only — no other system. No scheduled trigger, no external webhook, no new node.

## Error Behavior

- **Markers missing in the n8n prompt:** the developer adds them once during first-time setup. Subsequent refreshes assume the markers exist.
- **More than one pair of markers present:** the developer keeps only the pair nearest the laudos section and deletes any accidental duplicates in the same commit.
- **Map contents pasted outside the markers:** detected visually during the save step — the developer removes the stray content and re-pastes between the markers. No tooling enforces this in the MVP.
- **Pilot question returns clearly wrong SQL on first run:** the developer opens the "Avisos de tipo" section of the map and confirms the relevant column is listed; if it is missing, Deliverable 0002 is the right place to fix the rendering.
- **n8n workflow save fails:** standard n8n behavior — the workflow shows its own error message. No custom handling on our side.
- **README section out of date with the scripts:** detected when a developer tries to follow a command that no longer exists. The fix is a documentation pull request — the "if this section is out of date, open a PR" note sits at the top of the section.

## Notifications and Communications

No notifications are triggered by this deliverable. All actions are manual and produce no side effects visible to external systems.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Edit the n8n agent's system prompt | Any Softo developer with access to the n8n workspace | n8n workspace access is a prerequisite for the integration. |
| Save the n8n workflow | Any Softo developer with edit rights on the specific workflow | Standard n8n permissions apply. |
| Edit `repos/sql/README.md` | Any Softo developer with write access to the `sql` repository | Normal pull-request review applies. |
| Run pilot questions against the agent | Any Softo developer with access to the n8n workflow | No credentials beyond n8n access are needed. |
| Update the five pilot questions | Softo developer, with a note in the README changelog | Changing the pilot set resets the comparability of first-integration scores. |
