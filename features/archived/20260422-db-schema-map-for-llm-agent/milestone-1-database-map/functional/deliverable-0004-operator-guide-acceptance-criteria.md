# Acceptance Criteria — Deliverable 0004: Operator guide

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Operator guide (pt-BR) with troubleshooting

- [ ] `OPERATOR-GUIDE.md` exists at a fixed path in `repos/sql/` and is linked from the repo's main README.
- [ ] The guide is written in Brazilian Portuguese with correct accents and diacritics.
- [ ] It contains a **Pré-requisitos** section listing `.env.tool`, API key variable name, Node version, and n8n access.
- [ ] It documents the four operational steps in order: extrair, gerar, atualizar o agente no n8n, rodar a bateria.
- [ ] Each step shows the exact command the developer runs and the expected shape of the output summary.
- [ ] The n8n update step explains the markers (`<!-- DATABASE-MAP:START -->` / `<!-- DATABASE-MAP:END -->`) and never relies on UI screenshots.
- [ ] A **Troubleshooting** section covers at minimum: Lambda timeout, invalid API key, missing extended properties, map exceeds 3k tokens, table in wrong domain, agent answers worsened, battery divergence.
- [ ] Each troubleshooting entry describes the symptom and the concrete fix in a single short paragraph.
- [ ] A **Checklist final** near the end of the guide enumerates the commits the developer should see on the branch (snapshot, overrides if changed, map, battery result file if applicable).
- [ ] The guide states the target end-to-end time (~30 minutes) explicitly, matching the feature success metric.
- [ ] Guidance is written so that a Softo developer unfamiliar with the Apsis database can complete a full regeneration without asking questions.
- [ ] When a script or command name changes in another deliverable, the guide is updated in the same pull request.
- [ ] The guide includes a top-line note inviting the next developer to add a new troubleshooting entry when they encounter an unlisted problem.

## General Criteria

- [ ] No screenshots are embedded (by design).
- [ ] No regressions — the guide is documentation and does not affect runtime behavior.
