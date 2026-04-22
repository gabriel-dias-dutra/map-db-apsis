---
name: softo-wrapper-dev-implement
description: Implement a development plan — creates branches, implements code, marks checklist items, and optionally commits/creates PRs.
argument-hint: "<feature-name> <deliverable> [phase-N] [task-N]"
---

# Dev Plan Implementation

You are implementing a technical development plan. Read the dev-plan and execute the implementation, respecting the plan's architecture decisions, file changes, and checklist items.

## Process

1. **Parse arguments** from: $ARGUMENTS
   - First argument: feature name — matched against `features/active/` directories. Partial match supported. If multiple match, list and ask.
   - Second argument: deliverable — can be a number (e.g., `0001`) or name. Find the dev-plan file across milestone directories.
   - Third argument (optional): scope filter
     - Omitted → implement the entire plan
     - `phase-N` → implement only that phase's tasks
     - `task-N` → implement only that specific task (within the appropriate phase)

2. **Read the dev-plan** at `milestone-N-<title>/dev-plans/deliverable-NNNN-<name>-dev-plan.md`
   - Parse the architecture decisions, phases, tasks, and checklists
   - Identify which checklist items are already marked `[x]` (to support resuming)
   - Determine which tasks fall within the requested scope

3. **Identify impacted repositories** from the dev-plan's file listings.

4. **Ask the user for base branches** for each impacted repository:
   - List the impacted repos detected from the dev-plan
   - Ask: "Which base branch for `<repo-name>`?" for each
   - Default suggestion based on common patterns (e.g., `develop`, `main`)

5. **Create branches** in each impacted repository:
   - Branch name: `feature/<feature-name>/<deliverable-name>`
   - Check `implement.useWorktree` in `settings.json`:

   **When `useWorktree` is `false` (default):**
   - Run `git checkout -b <branch-name>` from the specified base branch in each `repos/<repo-name>/`
   - If the branch already exists (resuming), switch to it instead of creating

   **When `useWorktree` is `true`:**
   - Sanitize the branch name for directory use (replace `/` with `-`)
   - Create a worktree at `repos/.worktrees/<sanitized-branch>/<repo-name>/` for each impacted repo:
     ```
     cd repos/<repo-name>
     git worktree add ../../../repos/.worktrees/<sanitized-branch>/<repo-name> -b <branch-name> <base-branch>
     ```
   - If the worktree already exists (resuming), use it as-is
   - All subsequent file operations for this repo happen inside the worktree path, not `repos/<repo-name>/`
   - The main repo at `repos/<repo-name>/` stays on the principal branch — untouched and available for reference

6. **Read each repository's `CLAUDE.md`** before implementing any changes in that repo. Follow its conventions.

7. **Implement the plan** — for each task in scope (respecting phase/task ordering):
   - Read the task's implementation details and file listings from the dev-plan
   - Make the code changes described
   - **Validate before committing** — after implementing each checklist item, run all necessary validations in the affected repo(s):
     a. **Build:** run the project's build command to ensure compilation succeeds
     b. **Tests:** run the test suite (unit, integration, or whatever the repo defines) to ensure nothing is broken
     c. **Linting/formatting:** run linters and formatters if configured in the repo
     d. **Any other validation** defined in the repo's `CLAUDE.md` or CI configuration
     e. If any validation fails, **fix the issue before proceeding** — do not commit broken code
   - After all validations pass for a checklist item:
     a. **Mark it `[x]`** in the dev-plan file
     b. **Commit** (if `implement.autoCommit` is `true` in `settings.json`):
        - Stage the changed files in the relevant repo(s)
        - Commit message derived from the checklist item description
     c. Inform the user of progress

8. **After completing the scope:**
   - If `implement.autoPR` is `true` in `settings.json`:
     - Create a PR in each impacted repo using `gh pr create`
     - PR title: deliverable name
     - PR body: summary of changes, link to the dev-plan
   - Report what was implemented and what checklists were marked

## Important Rules

- **Always read the repo's `CLAUDE.md`** before making changes — follow its conventions for code style, architecture, testing, etc.
- **Never force-push or reset** — use safe git operations only
- **Checklist is the source of truth** — mark items `[x]` as you complete them, commit after each item (when autoCommit is enabled)
- **Resumable:** if checklist items are already `[x]`, skip them. Only implement unchecked items within the requested scope.
- **Branch safety:** if the branch already exists, verify it's based on the expected base branch before continuing
- **Scope respect:** when given `phase-N` or `task-N`, only implement that subset — do not touch other phases/tasks
- **Settings:** read `implement.autoCommit`, `implement.autoPR`, and `implement.useWorktree` from the root `settings.json` to determine commit/PR and worktree behavior. `autoCommit` and `autoPR` default to `true`, `useWorktree` defaults to `false`.
- **Per-repo git:** each directory under `repos/` is its own git repository. Branches, commits, and PRs are per-repo, not per-wrapper.
- **Worktree paths:** when `useWorktree` is `true`, all file operations (reads, writes, commits) for a repo must use the worktree path (`repos/.worktrees/<sanitized-branch>/<repo-name>/`) instead of `repos/<repo-name>/`. The main repo path is only for reference reads.
- **No subagent delegation for implementation:** execute all tasks sequentially in the main agent's context. Do not spawn subagents (via the Agent tool) to implement tasks, phases, or tasks across repositories in parallel. Reason: subagents start with empty context and must re-read the dev-plan, overview, and repo conventions — this is consistently slower than sequential execution in the main agent, which already has that context loaded. Exception: read-only `Explore` subagents are allowed when the dev-plan omitted a file location that must be discovered before implementing.
