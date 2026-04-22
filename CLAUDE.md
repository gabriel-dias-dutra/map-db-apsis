# Project Wrapper

This is a multi-repository project wrapper. All repositories are managed under the `repos/` directory.

## Versioning

There are two version fields in `settings.json`:

- **`version`** — The project version. Starts at `0.1.0` when `/softo-wrapper-init-project` creates a new project. Bumped with `/softo-wrapper-bump-version` in project repositories.
- **`template.version`** — The version of the ProjectWrapper template used to create the project. Only bumped with `/softo-wrapper-bump-version` when `template.isSource` is `true`. Read-only in derived projects.
- **`template.isSource`** — `true` in the template repository, `false` in derived projects (set by `/softo-wrapper-init-project`).

Git tags mark each release with the `v` prefix (e.g., `v0.2.0`).

Use the `/softo-wrapper-bump-version <new-version>` command to release a new version. It automatically detects which field to update:
- If `template.isSource` is `true` → updates `template.version`
- If `template.isSource` is `false` → updates `version`

Steps:
1. Verify the working tree is clean
2. Update `settings.json` and `README.md` with the new version
3. Commit the change
4. Create an annotated tag with a functional changelog (deduplicated, non-technical summary of commits since the last tag)
5. Push the tag to origin

## Active Phase Detection

This project has two distinct phases. **Detect which phase applies based on what the user is doing and follow the corresponding instructions file.**

### Functional Phase → [`rules/functional.md`](./rules/functional.md) + [`rules/project-functional.md`](./rules/project-functional.md)

You are in the functional phase when:
- Creating or editing `overview.md` or `brainstorm.md` files
- Using `/softo-wrapper-brainstorm`, `/softo-wrapper-overview`, `/softo-wrapper-milestone-deliverables`, or `/softo-wrapper-plan-status` commands
- Creating or editing milestone directories, deliverable files, acceptance criteria, or `presentation.html` files
- Discussing feature scope, goals, success metrics, or delivery milestones
- Exploring a problem space or brainstorming feature ideas

**Load both files:** `functional.md` (base template rules) and `project-functional.md` (project-specific rules). Project rules extend and can override base rules.

### Development Phase → [`rules/development.md`](./rules/development.md) + [`rules/project-development.md`](./rules/project-development.md)

You are in the development phase when:
- Using `/softo-wrapper-dev-plan` or `/softo-wrapper-dev-implement` commands
- Creating dev-plans for deliverables
- Working inside `repos/` (code, branches, commits, PRs)
- Discussing implementation details, architecture, or technical decisions

**Load both files:** `development.md` (base template rules) and `project-development.md` (project-specific rules). Project rules extend and can override base rules.

### Project-Specific Rules

Each phase has two rule files:
- **Base rules** (`functional.md`, `development.md`) — managed by the template. Do not modify in derived projects; they will be updated when the template version is bumped.
- **Project rules** (`project-functional.md`, `project-development.md`) — specific to each project. These files are never overwritten by template updates. Add project-specific conventions, constraints, and workflows here.

When both files exist, load the base rules first, then the project rules. If a project rule conflicts with a base rule, the project rule takes precedence.

### Override

The user can explicitly switch phases with `/mode functional` or `/mode dev`. When used, respect the override until the user switches again or the conversation ends.

### Skill Rules Apply Beyond Invocation

Skill rules are not limited to explicit slash command invocations. When the conversation topic matches a skill's domain, apply that skill's rules — even if the skill was not invoked. Examples:

- Discussing **problem exploration, brainstorming, or early ideation** → apply `/softo-wrapper-brainstorm` rules
- Discussing **overviews, milestones, or feature scope** → apply `/softo-wrapper-overview` rules
- Discussing **deliverables, acceptance criteria, or functional specs** → apply `/softo-wrapper-milestone-deliverables` rules
- Discussing **dev-plans, technical architecture, or implementation strategy** → apply `/softo-wrapper-dev-plan` rules
- Discussing **implementation, code changes, or PRs** → apply `/softo-wrapper-dev-implement` rules

Read the relevant skill file(s) from `.claude/skills/` to load the applicable rules.

## Configuration

Repositories and settings are defined in [`settings.json`](./settings.json).

| Field | Description | Example |
|-------|-------------|---------|
| `version` | Current project version (semver, no `v` prefix) | `"0.1.0"` |
| `template.version` | Template version used to create the project (read-only in projects) | `"0.4.0"` |
| `template.isSource` | Whether this is the template repo (`true`) or a derived project (`false`) | `true` |
| `template.url` | Git URL of the template repository (used by `/softo-wrapper-update-template`) | `"git@github.com:SoftoDev/Softo-ProjectWrapper-ClaudeCode.git"` |
| `languages` | Additional languages for translated documents. English is always the primary working copy (in the feature root) and does not need to be listed. Each language listed here generates translated copies in subdirectories (e.g., `pt-BR/`, `es/`). Empty array means English only. | `["pt-BR"]` |
| `repositories` | List of repositories to clone/pull (name, url) | See `settings.json` |
| `pull.strategy` | Pull strategy: `"rebase"` or `"merge"` | `"merge"` |
| `pull.autoStash` | Auto-stash local changes before pull | `false` |
| `implement.autoCommit` | Automatically commit after each checklist item during dev-implement | `true` |
| `implement.autoPR` | Automatically create PRs after completing dev-implement scope | `true` |
| `implement.useWorktree` | Use git worktrees for implementation instead of switching branches in the main repo. Worktrees are created at `repos/.worktrees/<branch>/<repo>/` | `false` |

Templates in `templates/` remain in English as structural references. English is always the primary working copy (written directly in the feature root). Languages listed in `languages` generate translated copies in subdirectories (e.g., `pt-BR/`, `es/`).

## Working Inside Repositories

When working on files inside a repository (under `repos/<repo-name>/`):

1. **Always follow the repository's own `CLAUDE.md`** if one exists at `repos/<repo-name>/CLAUDE.md`. It contains project-specific conventions, architecture notes, and instructions.
2. **Use the repository's agents** if defined. Check for `.claude/` configurations within the repository.
3. **Respect the repository's git context** — each repo under `repos/` is its own git repository. Commits, branches, and PRs should be scoped to that repository.

## Project Structure

```
ProjectWrapper/
├── CLAUDE.md                # This file — common config + phase routing
├── settings.json            # Repository list and configuration
├── .gitignore
├── rules/
│   ├── functional.md        # Functional phase rules (template-managed)
│   ├── development.md       # Development phase rules (template-managed)
│   ├── project-functional.md    # Project-specific functional rules
│   └── project-development.md   # Project-specific development rules
├── hooks/
│   └── session-start.js     # SessionStart hook — clones/pulls repos
├── templates/
│   ├── overview.md              # Template for feature overview
│   ├── milestone-index.md       # Template for milestone lean index
│   ├── deliverable-functional.md    # Template for deliverable functional spec
│   ├── acceptance-criteria.md   # Template for acceptance criteria
│   └── presentation.html       # Base HTML template for client presentations
├── .claude/
│   ├── settings.json        # Hooks configuration
│   └── skills/              # Slash commands
│       ├── softo-wrapper-brainstorm/            # /softo-wrapper-brainstorm command
│       ├── softo-wrapper-overview/              # /softo-wrapper-overview command
│       ├── softo-wrapper-milestone-deliverables/ # /softo-wrapper-milestone-deliverables command
│       ├── softo-wrapper-dev-plan/              # /softo-wrapper-dev-plan command
│       ├── softo-wrapper-dev-implement/         # /softo-wrapper-dev-implement command
│       ├── softo-wrapper-plan-status/           # /softo-wrapper-plan-status command
│       ├── softo-wrapper-bump-version/          # /softo-wrapper-bump-version command
│       ├── softo-wrapper-init-project/          # /softo-wrapper-init-project command
│       └── softo-wrapper-update-template/       # /softo-wrapper-update-template command
├── repos/                   # Cloned repositories (git-ignored)
└── features/
    ├── active/              # In-progress features
    ├── completed/           # Finished features
    └── archived/            # Discarded/obsolete features
```
