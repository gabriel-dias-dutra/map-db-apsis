---
name: softo-wrapper-plan-status
description: Show plan status report, or move a feature to completed/archived. Usage - /softo-wrapper-plan-status, /softo-wrapper-plan-status complete <feature>, /softo-wrapper-plan-status archive <feature>.
argument-hint: "[complete|archive <feature-name>]"
---

# Plan Status

This command has two modes based on the arguments: $ARGUMENTS

## Mode 1 — Status Report (no arguments)

If no arguments are provided, scan the `features/` directory and generate a concise status report.

1. **Read all feature directories** under `features/active/`, `features/completed/`, and `features/archived/`.
2. **For each feature in `active/`**, read its `overview.md` to determine:
   - Feature name and description
   - Total number of milestones
   - Which milestone directories with deliverable files exist (to determine progress)
   - Whether acceptance criteria files exist
   - Whether `brainstorm.md` exists
   - Whether `presentation.html` exists
3. **Count features** in `completed/` and `archived/` (just names, no deep read needed).
4. **Present the report** in this format:

```
## Plan Status

### Active (N features)
| Feature | Brainstorm | Milestones | Tasks Done | Presentation |
|---------|------------|------------|------------|--------------|
| feature-name | Yes/No | 2/4 milestones documented | Yes/No | Yes/No |

### Completed (N features)
- feature-name-1
- feature-name-2

### Archived (N features)
- feature-name-1
```

## Mode 2 — Move Feature (with arguments)

If arguments are `complete <feature-name>` or `archive <feature-name>`:

1. **Find the feature directory** under `features/active/` matching the provided name (partial match is fine).
2. **If not found**, inform the user and list available active features.
3. **Clean up worktrees** — if `implement.useWorktree` is `true` in `settings.json`, scan `repos/.worktrees/` for directories whose branch name contains the feature name. For each match:
   - Run `git worktree remove <path>` from the corresponding repo in `repos/`
   - If the worktree directory remains (e.g., untracked files), inform the user
4. **Move the entire feature directory** to `features/completed/` or `features/archived/` respectively.
5. **Confirm** the move to the user, including how many worktrees were cleaned up (if any).

## Rules

- If there are no features in a status category, show "None" instead of an empty table
- "Milestones documented" means the milestone directories with deliverable files exist (not counting acceptance criteria)
- Keep the output concise — this is a quick status check, not a deep review
- When moving, always move the entire directory including all translations
