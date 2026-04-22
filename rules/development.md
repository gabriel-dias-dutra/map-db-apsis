# Development Phase

Instructions for the development phase: creating technical development plans for deliverables and implementing them across repositories.

## Dev-Plan Workflow (`/softo-wrapper-dev-plan`)

The dev-plan creates a detailed technical plan for implementing a single deliverable. It bridges the functional specification with actual code changes.

### What the Dev-Plan Contains

- **Architecture decisions** with rationale
- **Phases** (for complex deliverables) or **Tasks** (for simple ones)
- For each task:
  - Affected repositories and files
  - Detailed implementation instructions
  - Checklist items for tracking progress
- **Notes** on risks, constraints, or dependencies

### Terminology

Within dev-plans, **"Phase"** and **"Task"** are technical concepts — they are NOT renamed to Milestone/Deliverable. The functional-level terms (Milestone, Deliverable) describe what the client sees; the dev-plan terms (Phase, Task) describe how the developer builds it.

### Context Chain

The dev-plan reads this chain to understand the full context:
1. `overview.md` — big picture of the feature
2. Milestone index (`milestone-N-<title>.md`) — which deliverables belong to this milestone
3. `deliverable-NNNN-<name>-functional.md` — what needs to be built
4. Repository codebases (`repos/`) — what already exists, including each repo's `CLAUDE.md`

Acceptance criteria (`deliverable-NNNN-<name>-acceptance-criteria.md`) are **not** read during dev-plan creation — they are reserved for a future testing workflow.

### Plan File Location

Dev-plans are stored at:
```
features/active/<feature>/milestone-N-<title>/dev-plans/deliverable-NNNN-<name>-dev-plan.md
```

There is no fixed template for dev-plans — the structure is flexible and should be adapted to the deliverable's complexity. The `/softo-wrapper-dev-plan` skill prompt defines the required content.

## Dev-Implement Workflow (`/softo-wrapper-dev-implement`)

The dev-implement reads a dev-plan and executes the implementation.

### Branching Convention

- Branch name: `feature/<feature-name>/<deliverable-name>`
- Created in each impacted repository under `repos/`
- The user provides the base branch for each impacted repo when running the command

### Implementation Scope

The command can target:
- **Whole plan** — implements all phases/tasks
- **Specific phase** — `phase-N` implements only that phase's tasks
- **Specific task** — `task-N` implements only that task within a phase

### Checklist Tracking

As each task is completed, the corresponding checklist item in the dev-plan is marked `[x]`. This allows:
- Resuming interrupted implementations
- Tracking progress across sessions
- Using checklist items as commit boundaries

### Commit and PR Strategy

Controlled by `settings.json`:

| Setting | Default | Description |
|---------|---------|-------------|
| `implement.autoCommit` | `true` | Automatically commit after completing each checklist item |
| `implement.autoPR` | `true` | Automatically create a PR per repo after completing the scope |

When `autoCommit` is `true`, commit messages are derived from the checklist item description. When `autoPR` is `true`, a PR is created in each impacted repo after the implementation scope is complete.

### Repository Rules

When implementing inside a repository:
1. **Always follow the repository's own `CLAUDE.md`** if one exists at `repos/<repo-name>/CLAUDE.md`
2. **Use the repository's agents** if defined in `.claude/` within the repository
3. **Respect the repository's git context** — each repo under `repos/` is its own git repository
