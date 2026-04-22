---
name: softo-wrapper-milestone-deliverables
description: Break down overview milestones into detailed deliverable documents with functional descriptions, using plan mode and interviewing the user. Reads the existing overview and generates milestone directories with deliverable specs and acceptance criteria.
argument-hint: "[feature-name] <all | milestone-N>"
---

# Milestone Deliverable Breakdown

You are breaking down milestones from an existing overview into detailed deliverable documents. These documents are **client-facing** — write in clear, functional language that non-technical stakeholders can understand.

## Process

1. **Enter plan mode** before doing anything else.
2. **Identify the feature and milestones from arguments:** `$ARGUMENTS`

   Parse the arguments to determine the feature name and milestone scope:
   - `<feature-name> all` — generate deliverables for all milestones of the specified feature (e.g., `user-authentication all`)
   - `<feature-name> milestone-N` — generate deliverables for a specific milestone (e.g., `user-authentication milestone-1`)
   - `all` (no feature name) — if there is exactly one active feature, use it. Otherwise, list all features in `features/active/` and ask the user to specify.
   - `milestone-N` (no feature name) — same logic: use the single active feature, or ask.

   The feature name is matched against directory names in `features/active/`. It can be a partial match (e.g., `auth` matches `20260401-user-authentication`). If multiple directories match, list them and ask the user to be more specific.

3. **Read the `overview.md`** to understand the full feature scope and milestone breakdown.
4. **Analyze existing repositories** to inform the deliverable breakdown — focus on what relates to the feature, not the entire codebase.
   - Read domain models, entity definitions, and database schemas relevant to the feature.
   - Identify existing screens, flows, and integrations that the feature will touch or extend.
   - Identify which repositories are actually impacted by each milestone — don't guess, verify in the code.
   - Detect what can be reused or extended vs. what needs to be built from scratch.
   - Use this to produce more realistic deliverables with accurate repo tags.
   - **Retain what you learned** — this analysis feeds into step 8 (interview), where you should present inferred details instead of asking from scratch.
5. **Determine which milestones to process** based on the parsed milestone scope:
   - `all` — generate deliverable documents for every milestone listed in the overview
   - `milestone-N` (e.g., `milestone-1`, `milestone-2`) — generate only that specific milestone
   
   **Resumability:** before starting, check if milestone directories already exist for this feature. If some milestones have already been generated (from a previous run or interrupted conversation), skip them and continue from the first incomplete milestone. Inform the user which milestones were detected as already done.

6. **Process one milestone at a time.** When the scope is `all`, complete steps 7–10 entirely for each milestone before moving to the next. Do not mix deliverables or interviews from different milestones — finish one, then start the next.
7. **Present the proposed deliverable breakdown for the current milestone** before writing any files.
   - List each deliverable with its description, repo tags, and dependencies.
   - Wait for the user to validate, adjust, or reorder deliverables.
   - Only proceed after explicit approval of the deliverable list.
8. **Interview the user for each deliverable in the current milestone** — each deliverable requires detailed functional information (user flow, fields, business rules, error behavior, notifications, state transitions, permissions). For each deliverable:
   - **Lead with what you already know** — from the overview (step 3) and codebase analysis (step 4), present the details you can already infer: likely fields, flows, entities, permissions, and behaviors. Then ask the user to confirm, correct, or add what's missing. This is faster and more productive than asking everything from scratch.
   - Conduct the interview in **multiple rounds** — start with the main flow, then drill into specifics.
   - Ask about: fields and data types, validation rules, what happens on errors, who can do what, status transitions, notifications triggered.
   - **Do not accept vague answers** — ask for concrete examples, specific field names, exact rules.
   - **Explore edge cases** — what happens when data is missing, when limits are reached, when permissions are denied.
   - **Do not guess** — if you are unsure about a business rule, permission, or behavior, ask.
   - Do NOT proceed to file generation until all your doubts are resolved for each deliverable.
   - You may interview multiple deliverables together if they are closely related, but ensure each one gets sufficient detail.
9. **For the current milestone**, create the following directory structure and files:

   **a) Milestone directory: `milestone-N-<title>/`**

   **b) Milestone index: `milestone-N-<title>/milestone-N-<title>.md`** using the template at `templates/milestone-index.md`. Contains:
   - Brief description of the milestone (from the overview)
   - List of deliverables included in this milestone with their complexity and size summaries

   **c) Functional directory: `milestone-N-<title>/functional/`**

   **d) For each deliverable**, create two files inside `functional/`:

   - **`deliverable-NNNN-<name>-functional.md`** using the template at `templates/deliverable-functional.md`, containing:
     - Represents a **functional deliverable** that makes sense to the client (e.g., "User can reset their password via email")
     - Includes repository tags indicating which systems are affected: `backend`, `mobile`, `admin`, etc.
     - Lists dependencies on other deliverables if applicable
     - Consider changes needed across **all repositories** — a single functional deliverable may touch multiple repos
     - Flag dependencies on deliverables from other milestones (e.g., "Requires Milestone 1 deliverable: User registration")
     - **User Flow:** step-by-step description of the user experience — what the user does, what the system responds, in sequence. Detail enough for someone to visualize the interaction.
     - **Fields and Data:** what information is displayed, entered, or manipulated. Specify which fields appear in list views vs. detail views. Include field types and whether they are required.
     - **Business Rules:** validation rules, conditions, constraints, and special cases that govern behavior. Be specific — include thresholds, limits, and conditions.
     - **Error Behavior:** what happens when things go wrong — invalid input, missing data, permissions denied, network failures. Describe what the user sees in each case.
     - **Notifications and Communications:** what communications are triggered by actions — emails, push notifications, webhooks. Specify the trigger, channel, recipient, and content summary.
     - **State Transitions:** if the deliverable involves entities with status/state, define the valid transitions — from, to, who triggers, and any conditions or time constraints.
     - **Permissions:** who can perform each action — which roles, what restrictions. Include any conditional permissions (e.g., "Manager can only edit their own team's records").
     - Omit any section that genuinely does not apply to the deliverable (e.g., a background data migration may not have a User Flow), but **do not omit a section just because it seems simple** — always consider whether there are rules or edge cases worth documenting.

   - **`deliverable-NNNN-<name>-acceptance-criteria.md`** using the template at `templates/acceptance-criteria.md`, containing:
     - Acceptance criteria for the deliverable
     - Written as checkboxes describing expected behavior from the user's perspective
     - Include edge cases and validation rules where relevant

   **e) Dev-plans directory: `milestone-N-<title>/dev-plans/`** (created empty, ready for the dev-plan stage)

   **Deliverable numbering**: use 4-digit zero-padded numbers (e.g., `0001`, `0002`, ...) that are **global across the entire feature**, not per milestone. If milestone 1 ends at deliverable `0005`, milestone 2 starts at `0006`.

10. **Milestone completion checkpoint.** After generating all files for the current milestone, briefly confirm with the user:
   - Summarize what was generated (number of deliverables, their names).
   - Ask if anything needs adjustment before moving on.
   - Only proceed to the next milestone after the user confirms.

11. **Exit plan mode** when done.
12. **Do NOT update `presentation.html`** — the presentation reflects the overview content and is managed by the `/softo-wrapper-overview` command. Milestone deliverable breakdowns and acceptance criteria live only in the markdown files.

## Next Step

After generating deliverable documents, suggest to the user that they can run `/softo-wrapper-dev-plan` to create a technical plan for a deliverable.

## Important Rules

- **Language**: follow the translation rules defined in [`rules/functional.md`](../../../rules/functional.md#translations).
- Keep everything **functional and non-technical**
- Each deliverable should be a meaningful piece of functionality, not a technical chore
- Deliverables should be scoped so that when completed, the client can verify the result
- Use repo tags (e.g., `backend`, `mobile`, `admin`) to indicate which systems are involved — these match the repository names in `settings.json`
- Do NOT modify `presentation.html` — it is managed by the `/softo-wrapper-overview` command
- **Empty states**: when a deliverable involves displaying lists or sections that can be empty, always include empty state behavior in the deliverable description and acceptance criteria
- **Deployment prerequisites**: consider whether the milestone requires data seeding, database migrations, or infrastructure setup. Include these in the relevant deliverables rather than omitting them — they are functional deliverables the client needs to verify
- **Display attributes**: for deliverables involving lists or detail views, explicitly state what information is displayed and where (e.g., which fields appear in the list vs. inside the detail screen). Do not leave display details implicit
- **Complexity classification**: assign a complexity level to each deliverable using the following scale:
  | Level | Label | Description |
  |-------|-------|-------------|
  | 1 | Very Low | Simple and routine functionality, no uncertainties |
  | 2 | Low | Functionality with predictable and well-defined behavior |
  | 3 | Medium | Functionality involving multiple rules or interactions between system areas |
  | 4 | High | Functionality with high uncertainty, complex business rules, or significant impact |
  | 5 | Very High | Critical functionality with external dependencies, high risk, and strategic impact |

  Place the complexity field after **Dependencies** in each deliverable, using the format: `**Complexity:** Label — Level description. Deliverable-specific justification.` The first sentence is always the fixed description from the table above; the second sentence explains why this specific deliverable received that level. Example: `**Complexity:** Medium — Functionality involving multiple rules or interactions between system areas. Involves integration with the payment gateway and validation of multiple reservation rules.`
- **Size classification**: assign a size level to each deliverable using the following scale:
  | Level | Label | Description |
  |-------|-------|-------------|
  | 1 | Very Small | Minimal scope — a single screen, action, or minor adjustment |
  | 2 | Small | Limited scope — few screens or interactions, straightforward flow |
  | 3 | Medium | Moderate scope — multiple screens, flows, or entity interactions |
  | 4 | Large | Broad scope — many screens, flows, roles, or data entities involved |
  | 5 | Very Large | Extensive scope — spans multiple areas of the system with significant breadth |

  Place the size field after **Complexity** in each deliverable, using the same format: `**Size:** Label — Level description. Deliverable-specific justification.` Example: `**Size:** Small — Limited scope — few screens or interactions, straightforward flow. Single screen with a form and a confirmation dialog.`
- **Milestone-level summaries**: at the milestone level, after **Deliverables included**, add a **Complexity** summary line and a **Size** summary line, each showing total deliverable count and distribution (e.g., `6 deliverables — 1 Very Low · 2 Low · 2 Medium · 1 High`). Omit levels with zero deliverables from each summary.
- **Never split a feature by technical layer**: a single functional deliverable (e.g., "Admin can manage reservation periods") must be ONE deliverable with multiple repo tags — never separate deliverables like "Backend API for periods" + "Admin screen for periods". Repo tags indicate which systems are involved, not how to split the work. The deliverable describes what the user can do, not what each layer does. Avoid technical terms like API, endpoint, CRUD, DTO, controller, migration, or database in deliverable descriptions.
