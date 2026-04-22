---
name: softo-wrapper-update-template
description: Update the project wrapper to the latest template version, preserving project-specific data (settings, versions, project rules). Reports any manual changes needed.
---

# Update Template

Updates the project wrapper files to the latest version from the template repository, preserving all project-specific data.

## Pre-flight checks

1. **Must be a derived project:** read `settings.json` and verify `template.isSource` is `false`. If `true`, abort: "This command is for derived projects only. You are in the template repository."
2. **Template URL must exist:** verify `template.url` exists in `settings.json`. If missing, ask the user for the template repository URL and save it before proceeding.
3. **Working tree must be clean:** run `git status --porcelain`. If there is any output, abort and tell the user to commit or stash their changes first.

## Steps

### 1. Clone the template

- Clone the template repository to a temporary directory: `git clone --depth 1 <template.url> .template-update`
- If the clone fails, abort with a clear error message and clean up.

### 2. Version check

- Read `template.version` from the cloned template's `settings.json`
- Read `template.version` from the project's `settings.json`
- Compare using semver:
  - If the template version is **equal or lower** than the project's template version → print: "Project is already up to date with template version X.Y.Z. No changes needed." → skip to cleanup step
  - Otherwise → print: "Updating template from vX.Y.Z to vY.Y.Z" → continue

### 3. Snapshot project values

Before modifying anything, read and store the following from the project's current files:

From `settings.json`:
- `version`
- `template.version` (current, before update)
- `template.isSource` (always `false`)
- `template.url`
- `languages`
- `repositories`
- `pull`
- Any other fields that are NOT in the template's `settings.json` (these are project-specific additions)

From `README.md`:
- Project name (first `# ...` heading)
- `**Version: X.Y.Z**` line
- `**Template Version: X.Y.Z**` line

### 4. Update template-managed files

Copy the following files from `.template-update/` to the project, **overwriting** the existing ones:

| Source | Destination | Notes |
|--------|-------------|-------|
| `rules/functional.md` | `rules/functional.md` | Overwrite |
| `rules/development.md` | `rules/development.md` | Overwrite |
| `templates/*` | `templates/*` | Overwrite all template files |
| `hooks/*` | `hooks/*` | Overwrite all hook files |
| `.claude/settings.json` | `.claude/settings.json` | Overwrite (hooks config) |
| `.claude/skills/*/SKILL.md` | `.claude/skills/*/SKILL.md` | Overwrite all skills. Add new skill directories if they exist in the template but not in the project. |
| `CLAUDE.md` | `CLAUDE.md` | Overwrite |

**Project-specific files — create if missing, never overwrite:**
- `rules/project-functional.md` — if it does **not** exist in the project, copy it from the template. If it already exists, leave it untouched.
- `rules/project-development.md` — if it does **not** exist in the project, copy it from the template. If it already exists, leave it untouched.

This rule applies to any new project-specific file introduced in future template versions: if the file is meant to be owned by the project (not overwritten on updates), create it only when absent.

**Do NOT copy:**
- `settings.json` (merged separately in step 5)
- `README.md` (merged separately in step 6)
- `repos/` (project repositories)
- `features/` (project features)
- `.git/` (project git history)
- `.template-update/` itself

### 5. Merge settings.json

Build the new `settings.json` by merging the template's structure with the project's values:

1. Start with the template's `settings.json` as the base structure (this brings in any new fields and removes deprecated ones)
2. Apply project values on top:
   - `version` → keep the project's value
   - `template.version` → set to the **template's** new version
   - `template.isSource` → keep as `false`
   - `template.url` → keep the project's value
   - `languages` → keep the project's value
   - `repositories` → keep the project's value
   - `pull` → keep the project's value
3. Detect changes for the report:
   - **New fields:** fields present in the template but not in the old project settings → flag for manual review (the user may need to configure them)
   - **Removed fields:** fields present in the old project settings but not in the template → flag as removed (informational)

### 6. Merge README.md

1. Start with the template's `README.md` as the base
2. Restore project-specific values:
   - Replace the first `# ...` heading with the project's name
   - Replace the `**Version: X.Y.Z**` line with the project's version
   - Replace the `**Template Version: X.Y.Z**` line with the new template version

### 7. Cleanup

- Remove the `.template-update/` directory: `rm -rf .template-update`

### 8. Summary report

Print a clear summary of everything that was done:

```
✅ Template updated from vX.Y.Z to vY.Y.Z

Files updated:
  - CLAUDE.md
  - rules/functional.md
  - rules/development.md
  - templates/* (list files)
  - hooks/* (list files)
  - .claude/settings.json
  - .claude/skills/* (list skills)
  - settings.json (merged)
  - README.md (merged)

New files created (did not exist in the project):
  - <list any project-specific files that were created because they were missing>

Files preserved (not modified):
  - rules/project-functional.md (if it already existed)
  - rules/project-development.md (if it already existed)
  - features/
  - repos/
```

Omit the "New files created" section if no new project-specific files were created.

If there are new or removed settings fields, add a section:

```
⚠️  Manual review needed:

New settings fields (review and configure if needed):
  - <field.name>: <default value from template> — <brief description if available>

Removed settings fields (no longer used):
  - <field.name>
```

If no manual review is needed:

```
No manual changes required.
```

## Rules

- **Never modify project-specific files:** `project-functional.md`, `project-development.md`, anything under `repos/` or `features/`
- **Always clean up** the `.template-update/` directory, even if the command fails mid-way
- **Always verify the version** before proceeding — never downgrade or re-apply the same version
- **The working tree must be clean** before starting — this allows the user to review the changes via `git diff` after the update
- **Settings merge must be lossless** for project values — never drop a project's configured repositories, languages, or other customizations
- If a skill directory exists in the project but not in the template (project added a custom skill), leave it untouched
- Print step-by-step progress so the user can follow along
- **Do not read or compare template-managed files before overwriting them.** Copy them directly from the template to the project — no diff, no content inspection. This saves time and tokens.
