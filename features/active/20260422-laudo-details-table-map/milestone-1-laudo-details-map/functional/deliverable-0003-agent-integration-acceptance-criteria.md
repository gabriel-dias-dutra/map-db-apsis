# Acceptance Criteria — Deliverable 0003: Agent prompt integration and operator README

**Milestone:** Milestone 1 — LaudoDetails Map (MVP)

**Deliverables:**
- Marker-delimited section in the n8n agent's system prompt populated with the generated map + operator README section in `repos/sql/` covering the full three-step flow

- [ ] The n8n agent's system prompt contains the two markers `<!-- LAUDO-DETAILS:START -->` and `<!-- LAUDO-DETAILS:END -->`, each on its own line, in the position where laudos knowledge belongs.
- [ ] The contents between the markers match the current `repos/sql/laudo-details/map.md` exactly — no edits, no trimming, no re-ordering.
- [ ] No map content appears outside the markers.
- [ ] Saving the workflow in n8n completes without error and the change is visible to other users of the same workspace.
- [ ] `repos/sql/README.md` has a new section titled "Mapa da tabela LaudoDetails" with, at minimum: purpose paragraph, prerequisites, Passo 1 (introspect), Passo 2 (generate), Passo 3 (n8n paste), and the five pilot questions with the pass/partial/fail rubric.
- [ ] The README section lists the exact command strings: `npm run laudo-details:introspect` and `npm run laudo-details:generate`.
- [ ] The README section lists the exact output paths: `repos/sql/laudo-details/introspection.json` and `repos/sql/laudo-details/map.md`.
- [ ] The README section references the exact marker strings `<!-- LAUDO-DETAILS:START -->` and `<!-- LAUDO-DETAILS:END -->`.
- [ ] The five pilot questions in the README appear verbatim as specified in the functional document (including the one that stresses the type-trap behavior).
- [ ] The pass/partial/fail rubric is present in the README and matches the functional document.
- [ ] The README notes that pilot results from the first integration live as a comment on the integration pull request, not as a committed artifact, and that a committed question battery is a future idea.
- [ ] A Softo developer running the five pilot questions against the agent after the integration records at least 4 of 5 passes (or the drop is explained in the pull-request comment with a concrete follow-up).
- [ ] When a pilot question returns wrong SQL on a text-stored numeric or date column, the developer can find that column in the "Avisos de tipo" section of `map.md`; if it is missing, a Deliverable 0002 follow-up pull request is opened.
- [ ] Refresh path is verifiable: regenerating `map.md` and replacing the content between the markers produces the new map in the agent without any other change.
- [ ] No side effects external to n8n and the `sql` repository — no notifications are sent, no other workflows change.

## General Criteria

- [ ] The integration does not introduce any new infrastructure — only the existing n8n workspace and the existing `sql` repository are touched.
- [ ] The integration does not depend on any credential beyond n8n workspace access and `sql` repo write access.
- [ ] No regressions in other sections of the agent's system prompt or in other workflows in the n8n workspace.
