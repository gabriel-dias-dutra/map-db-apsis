# Handoff operacional — Deliverable 0003

Instruções para o operador humano concluir as etapas manuais do D0003. As fases automatizadas (README + commits + push) já estão feitas na branch `feature/20260422-laudo-details-table-map/milestone-1-laudo-details-map` do repo `sql`.

## 1. Atualizar o agente no n8n (Phase 2 do D0003)

Abra o workflow do agente de busca no n8n e:

1. Localize o nó do agente (`AI Agent` ou `LLM Chain`) — procure por `database search agent` no system prompt.
2. No system prompt, insira os dois marcadores em linhas próprias, logo após a descrição de domínio e antes das instruções de formato:
   ```
   <!-- LAUDO-DETAILS:START -->
   <!-- LAUDO-DETAILS:END -->
   ```
3. Cole o conteúdo de `repos/sql/laudo-details/map.md` (versão atual da branch `feature/20260422-laudo-details-table-map/milestone-1-laudo-details-map`) **entre** os marcadores — copy/paste direto, sem editar.
4. Salve o workflow. Confirme que o n8n aceitou o salvamento sem erro.
5. Capture uma prova breve: descrição curta (`prompt atualizado no workflow <nome> em <data>`) ou um print que não exponha dados sensíveis.

## 2. Rodar a bateria-piloto (Phase 3 do D0003)

Dispare o agente com cada uma das 5 perguntas, uma por vez, e anote pass/partial/fail:

| # | Pergunta | Classificação | SQL gerado (resumo) |
|---|---|---|---|
| 1 | Quais laudos foram assinados para a Petrobras em 2025? | Pass / Partial / Fail | ... |
| 2 | Qual a metodologia usada no laudo mais recente? | Pass / Partial / Fail | ... |
| 3 | Liste os laudos com EBITDA margin maior que 20% — quando possível. | Pass / Partial / Fail | ... |
| 4 | Quais laudos estão ligados à proposta X? | Pass / Partial / Fail | ... |
| 5 | Quais clientes têm mais de três laudos cadastrados? | Pass / Partial / Fail | ... |

Rubrica:
- **Pass**: SQL executou e retornou as entidades corretas.
- **Partial**: SQL executou mas filtro/JOIN impreciso.
- **Fail**: SQL gerou erro ou entidades erradas.

Meta: 4 de 5 passes.

**Nota sobre a pergunta 3**: é um estressor deliberado — testa se o agente respeita os "Avisos de tipo" do mapa e aplica `CAST`/`PARSE` em campos `nvarchar` numéricos (coluna `EbitdaMarginBaseDate`). Fail aqui é sinal esperado na primeira rodada. Se falhar, reporte o SQL gerado — o ajuste provável é reforçar a redação da seção "Avisos de tipo" em `scripts/laudo-details/wording.ts` (`typeTraps`) e regenerar o mapa.

## 3. Abrir a PR grande

URL direta para criar a PR contra `main`:

```
https://github.com/gabriel-dias-dutra/tool-sql-apsis/pull/new/feature/20260422-laudo-details-table-map/milestone-1-laudo-details-map
```

### Título sugerido (< 70 chars)

```
feat(laudo-details): LaudoDetails map — milestone 1 (D0001 → D0003)
```

### Body sugerido

```markdown
## Summary

First milestone of the LaudoDetails map feature, consolidating three deliverables:

- **D0001 — Schema introspection.** Adds `npm run laudo-details:introspect` — a TypeScript script (native type stripping, no transpiler) that queries the SQL Server catalog via the existing Lambda tool and writes `laudo-details/introspection.json`. First snapshot: 19 columns, 2544 rows, 2 catalog FKs, 2 neighbors.
- **D0002 — Map generation.** Adds `npm run laudo-details:generate` — an offline script that reads the snapshot and renders a pt-BR Markdown map at `laudo-details/map.md` (4.991 chars; soft limit 20.000). Composer + 8 section renderers; wording authored in `scripts/laudo-details/wording.ts`. Deterministic and byte-identical across runs for a fixed snapshot.
- **D0003 — Operator guide.** Adds `repos/sql/README.md` documenting the tool, env contract, and the three-step operator flow (introspect → generate → manually refresh the n8n agent prompt between marker comments). Includes the five fixed pilot questions and the pass/partial/fail rubric.

Notable fix: Q10's `rowCount` alias collided with T-SQL's `@@ROWCOUNT` keyword; quoted as `[rowCount]`.

## Links

- Feature overview: `features/active/20260422-laudo-details-table-map/overview.md` (wrapper repo)
- Deliverables 0001, 0002, 0003 dev-plans in the same milestone directory

## Manual steps (operator)

- [ ] Edit the n8n agent workflow: insert `<!-- LAUDO-DETAILS:START -->` / `<!-- LAUDO-DETAILS:END -->` markers in the system prompt and paste the contents of `laudo-details/map.md` between them. Save.
- [ ] Run the five pilot questions from the README against the agent. Post results as a PR comment (rubric pass/partial/fail, target ≥ 4/5).

## Test plan

- [x] `npm run laudo-details:introspect` runs <15s; idempotent across runs (aside from `extractionTimestamp`)
- [x] Invalid `API_KEY` / missing `.env.tool` abort cleanly with pt-BR messages; snapshot preserved on failure
- [x] `npm run laudo-details:generate` runs <2s; byte-identical output on repeated runs
- [x] Missing / malformed / schema-version-bumped snapshot all abort with pt-BR messages; `map.md` preserved on failure
- [x] README contains all verbatim commands, paths, markers, pilot questions and rubric
- [ ] Pilot battery result (pending — human operator)
```

### Comentário a postar na PR (após rodar a bateria)

```
## Resultado da bateria-piloto — LaudoDetails Map

- Q1: Pass / Partial / Fail — <uma linha sobre o resultado>
- Q2: ...
- Q3: ...
- Q4: ...
- Q5: ...

Taxa: X/5.
```

## Depois da PR

- Se algum Pass < 4/5 ou se Q3 falhar por tipo: reabrir `wording.ts` (`typeTraps` / `columnDescriptions`), regenerar o mapa com `npm run laudo-details:generate`, refazer o refresh no n8n (passo 1 acima) e reexecutar só a(s) pergunta(s) afetada(s).
- Após merge: deletar a branch `feature/20260422-laudo-details-table-map/milestone-1-laudo-details-map` e mover o feature de `features/active/` para `features/completed/` via `/softo-wrapper-plan-status complete`.
