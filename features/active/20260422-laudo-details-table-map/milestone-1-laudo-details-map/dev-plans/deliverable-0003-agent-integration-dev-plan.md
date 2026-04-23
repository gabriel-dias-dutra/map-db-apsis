# Dev Plan — Deliverable 0003: Agent prompt integration and operator README

**Feature:** `features/active/20260422-laudo-details-table-map`
**Milestone:** Milestone 1 — LaudoDetails Map (MVP)
**Repositories affected:** `sql` (README, by commit) + n8n workspace (manual edit, no commit)
**Depends on:** Deliverable 0002 (produces `repos/sql/laudo-details/map.md`).

## Context & Goal

Two deliverables land side by side:

1. **Operator README**: `repos/sql/README.md` is created from scratch. It explains what the tool is, how it is deployed, the environment variables it expects, and — front and center — the three-step operator flow for the LaudoDetails map (introspect, generate, integrate in n8n) plus the five fixed pilot questions that validate the first integration.
2. **n8n prompt integration**: the developer manually edits the n8n workflow hosting the database search agent, inserts the marker comments `<!-- LAUDO-DETAILS:START -->` / `<!-- LAUDO-DETAILS:END -->` into the agent node's system prompt, and pastes the current contents of `repos/sql/laudo-details/map.md` between them. No automation — the integration is documented and executed by a human.

Full functional spec: `milestone-1-laudo-details-map/functional/deliverable-0003-agent-integration-functional.md`. Complexity is Very Low and size is Very Small; the plan below is short by design.

## Architecture Decisions

### D1. README in Portuguese, covering the whole repo (not just this feature)

- Primary language is pt-BR — the operators and maintainers are Softo developers working in Portuguese, and the existing in-code error strings (`"API key inválida ou ausente"`, `"Campo 'query' é obrigatório no body"`) are already Portuguese.
- Scope: the README describes the tool (the Lambda), how to deploy it, what environment variables it needs at runtime, **and** the LaudoDetails map operator flow. A later repo-wide PR can extend sections unrelated to this feature — but this PR creates a real, usable README, not a stub.

### D2. The n8n integration is manual; the plan documents the exact sequence

- No MCP automation, no scripted n8n API call. A human opens the workflow, edits the system prompt between markers, and saves.
- Rationale: (a) the integration is infrequent (the functional spec lists it as a refresh-on-demand action); (b) the marker contract makes refreshes cheap even manually; (c) automation would add a surface area (credentials, MCP configuration) that is not justified by the frequency.
- Automation is listed in the overview's "Future Ideas" if a later iteration makes it worthwhile.

### D3. Pilot questions live in the README, not in a separate file

- Five fixed Portuguese questions with a pass/partial/fail rubric.
- A separate file would invite drift and require cross-referencing. Keeping them in the README keeps the operator flow linear: finish the integration → run the five questions on the same page.

### D4. Pilot results are a PR comment, not a committed artifact

- Per the functional spec, the first-integration pilot results live as a comment on the integration pull request. The README explicitly states this and points to the overview's "Future Ideas" for the eventual committed question battery.
- The dev-plan enforces this by not creating any result file.

### D5. Markers are case-sensitive, placed on their own lines

- Canonical form, to be used verbatim both in the README examples and in the n8n prompt:
  ```
  <!-- LAUDO-DETAILS:START -->
  <conteúdo de laudo-details/map.md>
  <!-- LAUDO-DETAILS:END -->
  ```
- The map content between markers is a literal copy — no interpolation, no templating, no leading or trailing blank lines beyond what `map.md` already contains.

### D6. No new source code in `repos/sql/`

- This deliverable does not add any `.ts`, `.mjs`, or `.json` file. It adds one `README.md` and modifies nothing else in the repo. The n8n edit is done outside the repo.

## README Structure

The README is a single Markdown document at `repos/sql/README.md`, in Brazilian Portuguese. Sections in order:

1. **Título e descrição curta** — "Tool SQL Apsis" + one-paragraph explanation: a Lambda-hosted SQL proxy that executes SQL Server queries on demand, used by the n8n database search agent and by on-demand developer tooling.

2. **Arquitetura** — short bullet list:
   - AWS Lambda (Node.js, ESM).
   - Entrada: `POST` com header `x-api-key` e body `{ "query": "<SQL>" }`.
   - Saída: `{ rowCount, rows }` (200) ou `{ error }` (400/401).
   - Conexão com SQL Server via `mssql` (driver), `connectionTimeout` de 5s (configurado em `index.mjs:33`) — apenas bounding no handshake com o banco, **não** no tempo total de execução.

3. **Pré-requisitos** — Node ≥ 22.6 (para type-stripping nativo), `.env.tool` na raiz do projeto wrapper (`../../.env.tool` a partir de `repos/sql/`) com `URL` e `API_KEY`.

4. **Variáveis de ambiente** — tabela Markdown:
   | Variável | Onde | Propósito |
   |----------|------|-----------|
   | `URL` | `.env.tool` (na raiz do projeto) | Endpoint HTTP da Lambda, usado pelos scripts locais |
   | `API_KEY` | `.env.tool` e env da Lambda | Chave de API (header `x-api-key`) |
   | `DATABASE_HOST` | env da Lambda apenas | Host do SQL Server |
   | `DATABASE_PORT` | env da Lambda apenas | Porta do SQL Server (default 1433) |
   | `DATABASE_NAME` | env da Lambda apenas | Nome do banco |
   | `DATABASE_USER` | env da Lambda apenas | Usuário |
   | `DATABASE_PASSWORD` | env da Lambda apenas | Senha |

5. **Deploy da tool** — como gerar os artefatos do Lambda (`./build.sh` gera `lambda-rds-test.zip` + `layer.zip`) e que o deploy em si é feito via console/CLI da AWS. Sem prescrever a ferramenta exata (fica a critério do time de ops).

6. **Uso como biblioteca local (scripts de mapeamento)** — intro curta de que o repo também abriga scripts Node que consultam a tool. Lista os comandos disponíveis:
   - `npm run laudo-details:introspect` — captura estrutura de `LaudoDetails` e vizinhos.
   - `npm run laudo-details:generate` — renderiza o mapa em Markdown a partir do snapshot.

7. **Mapa da tabela LaudoDetails** — a seção central, estruturada em sub-seções:

   7.1. **Propósito** — um parágrafo: por que esse mapa existe e como o agente do n8n o consome.

   7.2. **Pré-requisitos** — `.env.tool` populado, Node ≥ 22.6, acesso ao workflow do agente no n8n.

   7.3. **Passo 1 — Introspecção** — comando (`npm run laudo-details:introspect`), saída esperada (`laudo-details/introspection.json`), como ler o resumo impresso, quando commitar.

   7.4. **Passo 2 — Geração do mapa** — comando (`npm run laudo-details:generate`), saída (`laudo-details/map.md`), o que o resumo informa (descrições pendentes, armadilhas de tipo, relacionamentos), quando commitar. Reforçar: **o arquivo `map.md` não é editado à mão**; toda mudança vai via `scripts/laudo-details/wording.ts`.

   7.5. **Passo 3 — Atualizar o agente no n8n** — sequência exata:
   1. Abrir o workflow `<nome do workflow>` no n8n.
   2. Localizar o nó do agente de busca (um nó `AI Agent` ou `LLM Chain` — o README orienta a busca pela presença do texto "database search agent" no system prompt).
   3. No system prompt, verificar se os marcadores `<!-- LAUDO-DETAILS:START -->` e `<!-- LAUDO-DETAILS:END -->` já existem.
      - Se não existirem (primeira integração): inserir os dois marcadores, cada um em sua própria linha, no ponto onde o conhecimento sobre laudos cabe (logo após a descrição de domínio e antes de instruções específicas de formato).
      - Se existirem (refresh): prosseguir direto ao próximo passo.
   4. Substituir tudo entre os dois marcadores pelo conteúdo atual de `laudo-details/map.md` (copy/paste direto, sem edição).
   5. Salvar o workflow.

   7.6. **Perguntas-piloto** — as cinco perguntas fixas, rubrica pass/partial/fail, e onde registrar o resultado:

   > Após a primeira integração, execute manualmente estas cinco perguntas contra o agente no n8n e registre o resultado como comentário no pull request que introduz o mapa. Meta mínima: 4 de 5 passes. Bateria versionada é uma ideia futura (ver overview).
   >
   > 1. Quais laudos foram assinados para a Petrobras em 2025?
   > 2. Qual a metodologia usada no laudo mais recente?
   > 3. Liste os laudos com EBITDA margin maior que 20% — quando possível.
   > 4. Quais laudos estão ligados à proposta X?
   > 5. Quais clientes têm mais de três laudos cadastrados?
   >
   > Rubrica:
   > - **Pass**: SQL executou e retornou as entidades corretas.
   > - **Partial**: SQL executou mas filtro ou JOIN está impreciso.
   > - **Fail**: SQL gerou erro ou retornou entidades erradas.

   Nota associada à pergunta 3: a EBITDA margin está armazenada como texto — a pergunta existe justamente para verificar se o agente lê a seção "Avisos de tipo" do mapa e aplica `CAST`/`PARSE` antes de comparar numericamente.

   7.7. **Troubleshooting** — três subseções curtas, cada uma com sintoma + causa + correção:
   - Marcadores ausentes no prompt após refresh → o dev deve re-inseri-los e repetir o paste.
   - Mais de um par de marcadores presente → manter apenas o par mais próximo da seção de laudos e remover duplicatas.
   - Pergunta-piloto retorna SQL errado em coluna de tipo armazenado como texto → verificar se a coluna aparece na seção "Avisos de tipo" do mapa; se não aparecer, abrir PR em D0002 para incluir a coluna em `typeTraps`.

8. **Links relacionados** — seção final curta:
   - Overview da feature (caminho relativo para `features/active/20260422-laudo-details-table-map/overview.md`).
   - Overview em pt-BR (subdiretório `pt-BR/`).
   - Spec funcional deste deliverable (caminho para o `deliverable-0003-*-functional.md`).

## Phases and Tasks

### Phase 1 — Create `repos/sql/README.md`

- [x] Create `repos/sql/README.md` with the full structure described in "README Structure" above, all in pt-BR.
- [x] Verify that every command string appears verbatim: `npm run laudo-details:introspect`, `npm run laudo-details:generate`, `./build.sh`.
- [x] Verify that every output path appears verbatim: `laudo-details/introspection.json`, `laudo-details/map.md`.
- [x] Verify that every marker string appears verbatim (including the spaces and the `-->`): `<!-- LAUDO-DETAILS:START -->` and `<!-- LAUDO-DETAILS:END -->`.
- [x] Verify that the five pilot questions appear verbatim as listed above.
- [x] Verify that the pass/partial/fail rubric appears verbatim as listed above.
- [x] Add the explicit note that `map.md` is generator output and must not be hand-edited.
- [x] Add the explicit note that pilot results live as a PR comment and that a committed battery is a future idea.
- [x] Run a local Markdown preview (IDE preview is enough — no CI step in this repo) and confirm headings, tables, and code blocks render correctly.

### Phase 2 — Perform the n8n integration

- [ ] Open the n8n workflow that hosts the database search agent.
- [ ] Locate the agent node's system prompt.
- [ ] If the markers `<!-- LAUDO-DETAILS:START -->` / `<!-- LAUDO-DETAILS:END -->` are not present, insert them on their own lines in the appropriate position in the prompt.
- [ ] Copy the full contents of `repos/sql/laudo-details/map.md` (the latest committed version on the branch under review).
- [ ] Paste the copied contents between the two markers, replacing whatever is there.
- [ ] Save the n8n workflow. Confirm it saves without error.
- [ ] Capture a short proof of action for the PR comment — either a brief description ("prompt atualizado no workflow `<nome>` em `<data>`") or a safe screenshot that does not reveal sensitive data.

### Phase 3 — Run the five pilot questions

- [ ] Trigger the agent in n8n (whatever the normal trigger mechanism is for this workspace) with question 1: "Quais laudos foram assinados para a Petrobras em 2025?".
- [ ] Capture the agent's answer and the SQL it produced (if visible in the workflow execution view). Classify as Pass / Partial / Fail.
- [ ] Repeat for questions 2, 3, 4, 5.
- [ ] Aggregate results. Confirm pass rate ≥ 4/5.
- [ ] Post the pilot results as a comment on the pull request that introduces this `README.md` change. Format:
  ```
  ## Resultado da bateria-piloto — LaudoDetails Map

  - Q1: Pass / Partial / Fail — <uma linha sobre o resultado>
  - Q2: ...
  - Q3: ...
  - Q4: ...
  - Q5: ...

  Taxa: X/5.
  ```

### Phase 4 — Commit and open the PR

- [ ] Commit `repos/sql/README.md` with message `docs: add operator guide and LaudoDetails map integration section`.
- [ ] Push the branch.
- [ ] Open the pull request. In the description, link to the feature overview, reference deliverables 0001 and 0002, and state that the n8n prompt was updated manually (pointing to the comment with the pilot results).
- [ ] After the PR is merged, if any of the pilot questions failed, open a follow-up issue (or a Softo-internal task) describing the gap and pointing to which deliverable likely needs a change.

## Files Affected (summary)

| Location | File | Action | Purpose |
|----------|------|--------|---------|
| `repos/sql/` | `README.md` | create | Operator guide, full repo coverage, with LaudoDetails map section |
| n8n workspace (external) | agent system prompt | manual edit | Insert markers (first time) + paste `map.md` content between them |

No changes to any other file in `repos/sql/`. No new dependencies. No new scripts.

## Risks and Constraints

- **Marker drift over time**: if the agent's system prompt evolves and the markers are accidentally removed during an unrelated edit, the next refresh will not find them. The README troubleshooting section covers this — and it is cheap to re-insert.
- **Pilot question 3 is deliberately a stressor**: it asks the agent to filter by a text-stored numeric field (EBITDA margin). A Fail on question 3 is not a surprise on the first run — it is a signal that the agent is not yet reading the "Avisos de tipo" section of the map. The README explains this so a Fail here is handled as "expected, investigate type-warnings phrasing in D0002" rather than as a blocker.
- **Manual pilot grading is subjective**: the pass/partial/fail rubric is defined but relies on human judgment. This is the functional decision, not a plan gap. The follow-up idea of a committed battery exists precisely to replace this judgment with a deterministic comparison later.
- **n8n access**: the Softo developer executing this deliverable must have edit rights on the n8n workflow. If not, the deliverable blocks on permissions — handled outside the plan.
- **README scope creep**: this PR creates a README that covers the whole repo, not only the feature. That is by design (D1). Any repo-wide content that later proves wrong or stale should be corrected in a follow-up PR, not here — this deliverable only owns the LaudoDetails-map section and the base scaffolding around it.

## Verification

- [ ] `repos/sql/README.md` exists on the branch and opens correctly in any Markdown viewer (GitHub, IDE, `mdcat`).
- [ ] `grep -c 'LAUDO-DETAILS:START' repos/sql/README.md` returns a number ≥ 2 (marker used in the example block and in the step-by-step explanation).
- [ ] `grep 'npm run laudo-details:introspect' repos/sql/README.md` returns exactly one match.
- [ ] `grep 'npm run laudo-details:generate' repos/sql/README.md` returns exactly one match.
- [ ] All five pilot questions appear literally in the README (a simple `grep` on a distinctive fragment of each confirms this).
- [ ] The n8n workflow has been saved with the markers and the map content between them (visible by opening the workflow).
- [ ] The PR has a comment with the pilot results; the pass rate is stated and meets 4/5 (or the gap is explained with a concrete follow-up).
- [ ] No other file in `repos/sql/` is modified by this PR (`git diff --stat` on the merge base shows only `README.md`).
