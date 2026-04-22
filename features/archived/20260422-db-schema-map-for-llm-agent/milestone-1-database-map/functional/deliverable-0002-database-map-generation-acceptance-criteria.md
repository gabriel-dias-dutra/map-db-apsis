# Acceptance Criteria — Deliverable 0002: Database Map generation

**Milestone:** Milestone 1 — Database Map (MVP)

**Deliverables:**
- Database Map generator + generated map (pt-BR)

- [ ] A developer can run a single command that reads `schema-snapshot.json` and writes `database-map.md` to a fixed path in `repos/sql/`.
- [ ] Every base table present in the snapshot appears exactly once in the generated map.
- [ ] Tables are grouped under business-domain sections, never listed in a single flat list.
- [ ] Domain inference precedence is honored: overrides file > SQL Server schema > name prefix > "Outros" fallback.
- [ ] Every domain section has a one-line pt-BR description at its top.
- [ ] Every table entry has a one-line pt-BR description — pulled from extended properties, overrides, or auto-generated from columns (flagged in the run summary).
- [ ] A cross-domain relationship section lists the main FK relationships between domains, respecting the configured top-N limit.
- [ ] The map includes a header with the snapshot timestamp and a footer with generation metadata.
- [ ] The generator emits a run summary with counts: domains produced, tables per domain, description sources, estimated token count.
- [ ] When the estimated token count exceeds the 3k target, the generator still produces the map and prints a prominent warning.
- [ ] Running the generator twice against an unchanged snapshot and overrides file produces byte-identical `database-map.md` output.
- [ ] Edits made in `schema-map-overrides.yaml` survive regeneration — they override inferred domain and description.
- [ ] The overrides file round-trips cleanly — reading and writing it produces an identical file.
- [ ] A stale entry in the overrides file (referring to a missing table) produces a warning, not an abort.
- [ ] Missing `schema-snapshot.json` aborts the run with a message pointing to Deliverable 0001. The existing map is preserved.
- [ ] Malformed overrides file aborts the run with the offending line identified. The existing map is preserved.
- [ ] Empty snapshot aborts the run; the existing map is preserved.
- [ ] The entire map is written in Brazilian Portuguese — domain names, descriptions, relationship notes — with correct accents and diacritics. Table identifiers stay in their original form.
- [ ] The committed map is human-readable at a glance — a reviewer unfamiliar with the database can skim it and understand what each domain covers.

## General Criteria

- [ ] The generator runs on a standard developer workstation with no new global dependencies.
- [ ] No regressions in Deliverable 0001 — the generator only reads the snapshot.
