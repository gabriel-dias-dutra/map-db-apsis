# Deliverable 0003 — Validation question battery `sql`

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Fixed set of 20–30 realistic business questions with expected answers

**Description:** A fixed set of 20–30 realistic business questions in Brazilian Portuguese — the style the Apsis team actually asks the agent in practice, such as "quem está na equipe de RH?" or "quais laudos foram assinados para a Petrobras em 2025?". Each question carries the expected answer in natural language (no canonical SQL). The battery is co-authored: Softo drafts an initial version after reviewing the generated Database Map, and Apsis confirms the questions reflect real operational needs. Running the battery manually against the agent produces a hit-rate score — the baseline against which future improvements are measured (target ≥ 80%).

**Dependencies:** Deliverable 0002 (battery is drafted after reviewing the generated Database Map, so questions cover the main inferred domains).

**Complexity:** Low — Functionality with predictable and well-defined behavior. Produces a static document; the main challenge is authoring questions that genuinely exercise the map without overfitting to it.

**Size:** Very Small — Minimal scope — a single screen, action, or minor adjustment. One Markdown file in `repos/sql/`.

## User Flow

### Initial authoring (one-time, during Milestone 1)

1. After the Database Map is generated and reviewed (Deliverable 0002), a Softo developer reads the map end-to-end.
2. The developer drafts an initial set of 20–30 questions in pt-BR covering each main inferred domain, matching real operational language. Each question is paired with the expected answer in natural language — short, concrete, verifiable (names, counts, dates).
3. The developer commits the battery as a Markdown file at a fixed path (e.g., `repos/sql/validation-battery.md`) inside the `sql` repository.
4. Apsis reviews the draft: adjusts phrasing, replaces unrealistic examples, adds domain-specific questions, and confirms expected answers match the current state of the database.
5. The corrected battery is merged. From this point the battery is treated as a stable baseline — changes to questions or expected answers invalidate past scores and must be called out in the commit message.

### Execution (each time accuracy is measured)

1. The developer opens the battery and the n8n workflow side by side.
2. For each question, the developer submits it to the agent, captures the agent's answer, and marks one of three outcomes: correct, partially correct, incorrect.
3. The developer records the run as a dated result file (e.g., `validation-battery-results-2026-05-10.md`) with the per-question outcomes and a final hit-rate percentage.
4. The result file is committed to `repos/sql/` alongside the battery. The hit-rate timeline is readable from git history.

## Fields and Data

The battery document stores:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Question ID | Text | Yes | Stable short identifier (e.g., `Q01`, `Q02`) so result files can reference questions unambiguously. |
| Domain | Text | Yes | The business domain the question exercises (e.g., "RH", "Laudos"). Matches a Database Map domain. |
| Question text | Text | Yes | The pt-BR natural-language question, phrased as the Apsis team would actually ask. |
| Expected answer | Text | Yes | Short, concrete, verifiable answer (names, counts, dates, lists) in pt-BR. Not a SQL query. |
| Notes | Text | No | Optional context — why the question matters, what makes it tricky. |

Each result file stores:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Run date | Date | Yes | The day the battery was executed. |
| Agent version / map version | Text | Yes | Snapshot of what was being evaluated (git commit of the map, agent prompt reference). |
| Per-question outcome | Enum | Yes | Correct / Partial / Incorrect, plus the agent's actual answer and a one-line justification. |
| Hit rate | Percentage | Yes | Correct / total, counted as (correct + 0.5 × partial) / total. |

**Empty state (initial commit):** the battery file is created with the agreed structure, the domain list pulled from the Database Map, and a placeholder note "perguntas a serem redigidas após a revisão do mapa" — so the file exists, is committable, and its final authoring is tracked as a deliverable step rather than a hidden TODO. Softo drafts the real questions in a follow-up commit once the Database Map is stable, and Apsis confirms in a subsequent commit.

## Business Rules

- The battery has between 20 and 30 questions. Below 20 gives insufficient coverage; above 30 makes a manual run too long.
- Every main domain in the Database Map must be represented by at least one question. Coverage is validated by checking the `Domain` field against the map's domain list.
- Expected answers are natural-language, not SQL. They describe what the right answer looks like (e.g., "lista dos funcionários do departamento RH — atualmente 8 pessoas") so a human can grade the agent's reply.
- Once Apsis confirms the battery, the questions and expected answers are treated as frozen. Changes require explicit agreement and a clear commit note, because they break the ability to compare scores over time.
- Scoring uses three outcomes: Correct (full), Partial (right entities but incomplete or slightly off), Incorrect. Hit rate weights Partial as half a Correct.
- Result files are never edited after commit — reruns produce new dated files, not overwrites.
- Questions must match the language Apsis actually uses. Technical terms from the database (table names, schemas) should not appear in the question text — only in the expected-answer justification if needed.

## Error Behavior

- **Battery file missing when scoring:** the developer cannot run a scored battery; they are directed to Deliverable 0002 first (the battery is drafted after the map is ready).
- **Question references a domain not present in the map:** during review, this is flagged as a drafting error — either the domain was renamed in the map or the question targets data that doesn't exist. The question is fixed or removed before the battery is frozen.
- **Expected answer no longer matches reality (e.g., a person listed as being in RH has left):** the agent may answer correctly and still be marked incorrect against a stale expectation. The first run after a database change flags these; expected answers are updated as a deliberate versioning event (new commit, clear note) before the next scored run.
- **Agent gives a correct answer that the expected answer did not anticipate:** the grader marks Partial and records the agent's answer. On the next review, the expected answer is broadened.
- **Ambiguous question (Apsis confirms it could be read multiple ways):** the question is rephrased before the battery is frozen.

## Permissions

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| Draft the initial battery | Softo developer familiar with the generated map | Based on reading the Database Map end-to-end. |
| Confirm / adjust questions and expected answers | Apsis business owner | Apsis has the operational knowledge needed to judge realism. |
| Freeze the battery (merge the confirmed version) | Softo developer with `sql` repo write access | Frozen only after Apsis explicit confirmation. |
| Run the battery and commit a result file | Any Softo developer with access to the n8n workflow | Each run produces a new dated result file. |
| Modify a frozen question or expected answer | Softo + Apsis jointly | Requires a clear commit note explaining why past scores no longer apply. |
