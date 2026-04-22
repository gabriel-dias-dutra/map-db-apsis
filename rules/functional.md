# Functional Phase

Instructions for the functional planning phase: creating feature overviews, breaking them into milestones, defining deliverables and acceptance criteria, and generating client presentations.

## Translations

English is always the primary working copy — write it directly in the feature root. Read the `languages` array from `settings.json` for additional languages (e.g., `["pt-BR"]`). For each language listed, create a subdirectory (e.g., `pt-BR/`, `es/`) and generate translated versions of `overview.md` and `presentation.html` there. If the array is empty or missing, generate English only.

**Translations are limited to `brainstorm.md`, `overview.md`, and `presentation.html` only.** Milestone directories, deliverable files, acceptance criteria, and dev-plans are not translated — they remain in English.

**Translations must be written as a native speaker would** — use proper accents, diacritics, and special characters for each language (e.g., "ã", "ç", "é" for pt-BR, "ñ", "ü" for es). **Do not strip or omit accents.**

## Features

All features are stored in the [`features/`](../features/) directory, organized by status.

### Structure

```
features/
├── active/                                          # Features currently in progress
│   └── YYYYMMDD-<feature-name>/                     # One directory per feature
│       ├── brainstorm.md                            # Problem exploration brief (optional, from /softo-wrapper-brainstorm)
│       ├── overview.md                              # Description, goals, how it works, milestones
│       ├── presentation.html                        # Client-facing HTML presentation (English)
│       ├── milestone-1-<title>/                     # One directory per milestone
│       │   ├── milestone-1-<title>.md               # Lean index (description + deliverable list)
│       │   ├── functional/                          # Functional specifications
│       │   │   ├── deliverable-0001-<name>-functional.md
│       │   │   ├── deliverable-0001-<name>-acceptance-criteria.md
│       │   │   ├── deliverable-0002-<name>-functional.md
│       │   │   └── deliverable-0002-<name>-acceptance-criteria.md
│       │   └── dev-plans/                           # Technical development plans
│       │       ├── deliverable-0001-<name>-dev-plan.md
│       │       └── deliverable-0002-<name>-dev-plan.md
│       ├── milestone-2-<title>/
│       │   └── ...
│       └── <lang>/                                  # Translated versions (e.g., pt-BR/, es/)
│           ├── brainstorm.md
│           ├── overview.md
│           └── presentation.html
├── completed/                                       # Finished features (for reference)
└── archived/                                        # Discarded or obsolete features
```

### Naming Conventions

- **Feature directories:** prefix with date `YYYYMMDD` followed by kebab-case name (e.g., `20260401-auth-middleware-rewrite`)
- **Overview:** every feature must have an `overview.md`. Use [`templates/overview.md`](../templates/overview.md) as base
- **Milestone directories:** named `milestone-N-<title>` inside each feature (e.g., `milestone-1-core-login`). No zero-padding on the milestone number.
- **Milestone index:** each milestone directory contains a `milestone-N-<title>.md` file as a lean index. Use [`templates/milestone-index.md`](../templates/milestone-index.md) as base
- **Deliverable files:** inside `functional/`, named `deliverable-NNNN-<name>-functional.md` with 4-digit zero-padded number. Use [`templates/deliverable-functional.md`](../templates/deliverable-functional.md) as base. Tag deliverables with repository names (e.g., `backend`, `mobile`, `admin`) to indicate affected systems
- **Acceptance criteria:** one file per deliverable named `deliverable-NNNN-<name>-acceptance-criteria.md` inside `functional/`. Use [`templates/acceptance-criteria.md`](../templates/acceptance-criteria.md) as base
- **Dev plans:** inside `dev-plans/`, named `deliverable-NNNN-<name>-dev-plan.md`. No fixed template — structure is flexible per deliverable
- **Deliverable numbering:** global across the entire feature (not per milestone). The first deliverable is `0001`, the second `0002`, regardless of which milestone they belong to

### Client Presentation

Every feature directory must contain a `presentation.html` file:
- Use [`templates/presentation.html`](../templates/presentation.html) as base for consistent styling
- Single self-contained HTML file (no external dependencies)
- Inline SVG for all icons, responsive design, print-friendly
- Sections (in order): hero, feature overview, feature goals, how it works (feature cards with icons), success metrics (table), delivery milestones (overview grid + timeline), future ideas, notes (optional, commented by default)
- **Must be updated** (in all configured languages) whenever `overview.md` changes

> **Important:** Whenever you modify an `overview.md` file — whether via `/softo-wrapper-overview` or through direct editing in conversation — you must also update the corresponding `presentation.html` (and its translated versions for all languages in `settings.json`). Never leave the HTML out of sync with the overview.

### Slash Commands

| Command | Description |
|---------|-------------|
| `/softo-wrapper-brainstorm <problem or feature idea>` | Explores a problem space through structured discussion. Produces a lightweight `brainstorm.md` brief that feeds into `/softo-wrapper-overview`. |
| `/softo-wrapper-overview <feature description or existing feature directory>` | Creates a new feature overview. Enters plan mode and interviews until all doubts are resolved. Generates `overview.md` and `presentation.html`. Automatically reads `brainstorm.md` if one exists. |
| `/softo-wrapper-milestone-deliverables [feature-name] <all \| milestone-N>` | Reads existing overview and generates milestone directories with deliverable breakdowns and acceptance criteria. Feature name is optional if there is only one active feature; supports partial matching. |
| `/softo-wrapper-dev-plan <feature-name> <deliverable>` | Creates a technical development plan for a specific deliverable. Enters plan mode, analyzes codebase, interviews user, generates dev-plan. |
| `/softo-wrapper-dev-implement <feature-name> <deliverable> [phase-N] [task-N]` | Implements a dev-plan. Creates branches, implements code, marks checklist items. |
| `/softo-wrapper-plan-status` | Shows a quick status report of all features across active, completed, and archived. |
| `/softo-wrapper-plan-status complete <feature>` | Moves a feature from `active/` to `completed/`. |
| `/softo-wrapper-plan-status archive <feature>` | Moves a feature from `active/` to `archived/`. |

### Manual Workflow

1. Create the feature directory: `features/active/YYYYMMDD-feature-name/`
2. Write `overview.md` — functional, client-facing, with deliverables, success metrics, MVP and additional milestones
3. Create milestone directories: `milestone-N-<title>/`
4. For each milestone, create `milestone-N-<title>.md` (lean index) and `functional/` subdirectory
5. Break each milestone into `deliverable-NNNN-<name>-functional.md` files with functional descriptions
6. Write `deliverable-NNNN-<name>-acceptance-criteria.md` for each deliverable
7. Generate `presentation.html` with the full plan
8. Generate translated `overview.md` and `presentation.html` in language subdirectories if configured

### Lifecycle

When a feature is fully completed, **move the entire feature directory** from `active/` to `completed/`. If a feature is discarded or becomes obsolete, move it to `archived/`.
