# Acceptance Criteria — Deliverable 0003: Validation question battery

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Fixed set of 20–30 realistic business questions with expected answers

- [ ] A Markdown file `validation-battery.md` exists in `repos/sql/` with a stable structure: ID, Domain, Question text, Expected answer, Notes.
- [ ] The battery contains between 20 and 30 questions once confirmed.
- [ ] Every main domain listed in the generated Database Map has at least one question in the battery.
- [ ] Every question has a stable ID (e.g., `Q01`) and a natural-language expected answer in pt-BR. Expected answers are never raw SQL.
- [ ] Question text is written as the Apsis team would actually ask — technical identifiers (table names, columns, schemas) do not appear in the question text.
- [ ] The initial empty-state commit contains the agreed structure, domain list pulled from the map, and a placeholder note indicating questions are to be drafted after map review.
- [ ] Softo commits a drafted battery after the Database Map is generated and reviewed.
- [ ] Apsis confirms the battery via pull-request review — the confirmation is traceable in git history.
- [ ] Once Apsis confirms, changes to questions or expected answers require an explicit commit note explaining that past scores no longer apply.
- [ ] A scored run produces a dated result file (e.g., `validation-battery-results-YYYY-MM-DD.md`) in `repos/sql/` with per-question outcomes (Correct / Partial / Incorrect), the agent's actual answer, a one-line justification, and a final hit-rate percentage.
- [ ] Hit rate computes as (correct + 0.5 × partial) / total.
- [ ] Result files are never edited after commit — reruns produce new dated files.
- [ ] Each result file records which Database Map version (git commit) was being evaluated so regressions can be attributed.
- [ ] The battery file and every result file are written in pt-BR with correct accents and diacritics.

## General Criteria

- [ ] The battery is readable at a glance by a reviewer unfamiliar with the database.
- [ ] No regressions — the battery is a static artifact and does not affect other deliverables.
