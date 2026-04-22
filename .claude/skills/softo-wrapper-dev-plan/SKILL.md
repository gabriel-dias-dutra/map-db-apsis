---
name: softo-wrapper-dev-plan
description: Create a technical development plan for a deliverable, using plan mode and deep codebase analysis. Interviews the user and generates a comprehensive dev-plan.
argument-hint: "<feature-name> <deliverable-number-or-name>"
---

# Dev Plan Creation

You are creating a **technical development plan** for a specific deliverable. This document is meant for an AI agent to implement — write with precision, including exact file paths, architecture decisions, and step-by-step implementation details.

## Process

1. **Enter plan mode** before doing anything else.
2. **Parse arguments** from: $ARGUMENTS
   - First argument: feature name — matched against directory names in `features/active/`. Partial match supported. If multiple match, list them and ask. Always ask the user to specify, never assume the only active feature.
   - Second argument: deliverable — can be a number (e.g., `0001`) or a name (e.g., `login-form`). Search across all milestone directories in the feature to find the matching deliverable file. If multiple match, list and ask.
3. **Read the context chain:**
   - `overview.md` — understand the big picture of the feature
   - Milestone index (`milestone-N-<title>.md`) — understand which deliverables belong to this milestone
   - `deliverable-NNNN-<name>-functional.md` — the functional specification of what needs to be built
   - **Do NOT read** acceptance criteria files (reserved for future testing workflow)
4. **Analyze all repositories** in depth:
   - Read the codebase in `repos/` for ALL repositories listed in `settings.json`
   - Read each repository's `CLAUDE.md` if it exists — follow its conventions and architecture rules
   - Identify existing models, endpoints, screens, flows, integrations
   - Identify what can be reused or extended vs. what needs to be built from scratch
   - Map out the exact files that would need to change
5. **Deep interview with the user:**
   - Conduct the interview in **multiple rounds** — do not dump all questions at once
   - Start with architecture-level decisions, then drill into specifics
   - Ask about: technology choices, patterns to follow, edge cases, error handling, performance considerations
   - **Do not accept vague answers** — ask for concrete decisions
   - **Challenge the approach** — suggest alternatives when you see better options
   - Do NOT proceed until all your technical doubts are resolved
6. **Propose the technical plan:**
   - Present the full plan structure to the user: architecture decisions, phases/tasks, files affected
   - Wait for explicit approval before writing any files
   - If the user wants changes, iterate until approved
7. **Write the dev-plan file** at `milestone-N-<title>/dev-plans/deliverable-NNNN-<name>-dev-plan.md`. Structure the document freely based on the deliverable's complexity — there is no fixed template. The plan must include at minimum:
   - Architecture decisions with rationale
   - Phases with tasks (for complex deliverables) or just tasks (for simple ones) — choose the structure that best fits
   - For each task: repositories, files affected with exact paths and description of changes, detailed implementation instructions, checklist items (`- [ ]`) for progress tracking
   - Notes on risks or constraints
   - Any other technical information needed for implementation (data models, API contracts, state management, etc.)
8. **Exit plan mode** when done.
9. **Suggest next step**: inform the user they can run `/softo-wrapper-dev-implement <feature> <deliverable>` to implement the plan.

## Important Rules

- **Scope:** a dev-plan covers exactly ONE deliverable
- **Terminology:** within dev-plans, "Phase" and "Task" are technical terms — do NOT use "Milestone" or "Deliverable" for these
- **Depth:** the plan must contain enough detail for another AI agent to implement without asking questions — include exact file paths, code patterns, data structures
- **Repository awareness:** always check each repo's `CLAUDE.md` for conventions, architecture, and constraints
- **Checklist items:** these will be used for commit messages and progress tracking — make them specific and actionable
- **File references:** use paths relative to `repos/<repo-name>/` when describing changes
- **Linear execution assumed:** the plan must assume sequential execution by a single agent. Do not recommend parallelizing tasks, phases, or cross-repo work across subagents — the implementer runs everything linearly in a single context.
