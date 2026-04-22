---
name: softo-wrapper-bump-version
description: Bump the wrapper version, create an annotated git tag with a functional changelog, and push it. Usage - /softo-wrapper-bump-version <new-version>
argument-hint: "<new-version (e.g. 0.2.0)>"
---

# Bump Version

Bumps the version to `$ARGUMENTS`.

## Mode detection

Determine which version field to update based on `template.isSource` in `settings.json`:

- **Template mode:** `template.isSource` is `true` → bump both `version` and `template.version` in `settings.json`, and update both **Version** and **Template Version** in `README.md`
- **Project mode:** `template.isSource` is `false` → bump `version` in `settings.json` and update **Version** in `README.md`

## Pre-flight checks

1. **Validate argument:** a version string must be provided (e.g. `0.2.0`). If missing, ask the user.
2. **Working tree must be clean:** run `git status --porcelain`. If there is any output, abort and tell the user to commit or stash their changes first.
3. **Version must be newer:** read the current value of the target field (`template.version` in template mode, `version` in project mode) from `settings.json` and verify the new version is different. If it's the same, abort.

## Steps

1. **Update `settings.json`:** set the target field to the new version (without the `v` prefix).
2. **Update `README.md`:**
   - **Template mode:** update the `**Template Version: X.Y.Z**` line to reflect the new version.
   - **Project mode:** update the `**Version: X.Y.Z**` line to reflect the new version.
3. **Commit the version change:** create a commit with message `chore: bump version to v<version>`.
4. **Push the commit:** `git push` to push the version commit to the remote branch.
5. **Gather changelog:** run `git log <last-tag>..HEAD --oneline` to collect commits since the last tag. If there is no previous tag, use all commits.
6. **Build a functional summary:** from the raw commit list, produce a concise, functional changelog:
   - Group related commits into a single line when they describe the same change
   - Use clear, non-technical language when possible (describe *what changed* for the user, not implementation details)
   - Remove duplicate or redundant entries
   - Use a bulleted list format
7. **Create annotated tag:** `git tag -a v<version>` with the functional summary as the tag message.
8. **Push the tag:** `git push origin v<version>`.
9. **Confirm** to the user with the new version and the changelog summary.

## Rules

- The version fields in `settings.json` store values **without** the `v` prefix (e.g. `0.2.0`)
- Git tags use the `v` prefix (e.g. `v0.2.0`)
- Never skip the clean working tree check
- The changelog in the tag message should be functional and deduplicated, not a raw commit dump
- Always push the tag automatically after creation
- In template mode, both `version` and `template.version` are updated to the same value
- In project mode, only `version` is modified — `template.version` is left unchanged
