---
name: softo-wrapper-init-project
description: Initialize a new project — interactively configure project name, repositories, languages, pull strategy, and implement settings, then set up settings.json, README.md, and clone all repos.
---

# Project Initialization

Interactive setup for a new project. Collects all configuration through an interview, validates everything, and only executes if all checks pass.

## Pre-flight check

1. **Must be a fresh project:** if `repos/` already contains cloned repositories (directories with `.git/`), abort and inform the user this command is for new projects only.

## Interview

Collect the following from the user, one topic at a time:

1. **Project name** — will be used as the title in `README.md` (e.g., "My SaaS Platform")
2. **Repositories** — for each repo, ask for:
   - Display name (used as directory name under `repos/`, e.g., `backend`, `mobile`, `admin`)
   - Git URL (SSH or HTTPS format)
   - Keep asking "Any more repositories?" until the user says no
3. **Languages** — additional languages for translated documents. English is always the default and does not need to be listed. Ask which additional languages to support (e.g., `pt-BR`, `es`). None is a valid answer (empty array).
4. **Pull strategy** — `merge` (default) or `rebase`
5. **Auto-stash** — auto-stash local changes before pull? Default: `false`
6. **Implement settings** — configure dev-implement behavior:
   - **Auto-commit** — automatically commit after each checklist item during dev-implement? Default: `true`
   - **Auto-PR** — automatically create PRs after completing dev-implement scope? Default: `true`
   - **Use worktree** — use git worktrees for implementation instead of switching branches in the main repo? Worktrees are created at `repos/.worktrees/<branch>/<repo>/`. Default: `false`

## Validation

After collecting all inputs, validate **everything before executing anything**:

| Check | Rule | Error message |
|-------|------|---------------|
| Project name | Non-empty string | "Project name cannot be empty" |
| Repo names | Non-empty, no spaces, no duplicates | "Repo name '{name}' is invalid or duplicated" |
| Repo URLs | Must match SSH (`git@...`) or HTTPS (`https://...`) format | "URL '{url}' is not a valid git URL" |
| Repo accessibility | Run `git ls-remote {url}` for each repo to verify access | "Cannot access repo '{name}' at {url} — check the URL and your SSH keys" |
| Languages | Must be valid BCP 47 codes (e.g., `pt-BR`, `es`, `fr`). Do not include `"en"` — English is always the default. Empty array is valid. | "Invalid language code: '{code}'" |
| Pull strategy | Must be `"rebase"` or `"merge"` | "Pull strategy must be 'rebase' or 'merge'" |

**If any validation fails:** list ALL problems found (do not stop at the first one), and ask the user to correct them. Do NOT proceed to execution.

**If all validations pass:** present a summary of the configuration and ask the user to confirm before executing.

## Execution

Execute each step sequentially, printing clear status messages for each:

1. **Remove wrapper `.git` directory**
   - Run `rm -rf .git`
   - Print: `✓ Removed wrapper .git — this project is now detached from the wrapper repository`

2. **Update `settings.json`**
   - Print: `✓ Updated settings.json with project configuration`
   - Set `version` to `"0.1.0"`, set `template.isSource` to `false`, keep `template.version` and `template.url` unchanged (preserves the template version and origin), set `languages`, `repositories`, `pull`, and `implement` config

3. **Update `README.md`**
   - Print: `✓ Updated README.md with project name: {name}`
   - Replace the first heading (`# ...`) with `# {project name}`
   - Replace the `**Template Version: X.Y.Z**` line with the template version from `settings.json`
   - Replace the `**Version: X.Y.Z**` line with `0.1.0`

4. **Clone repositories** — for each repo:
   - Print: `⏳ Cloning {name} from {url}...`
   - Run `git clone {url} repos/{name}`
   - On success, print: `✓ Cloned {name}`
   - On failure, print: `✗ Failed to clone {name}: {error}` — continue with remaining repos

5. **Final summary**
   - Print how many repos were cloned successfully vs failed
   - If any clone failed, remind the user they can re-run the session-start hook or clone manually

## Rules

- This command is for **new projects only** — abort if repos already exist
- **Never execute before validation passes** — collect everything, validate everything, then execute
- Always print step-by-step progress so the user can follow along
- Convert HTTPS GitHub URLs to SSH format automatically (same logic as `session-start.js`)
- The `version` field always starts at `"0.1.0"` for new projects
