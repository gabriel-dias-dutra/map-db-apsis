---
name: softo-wrapper-brainstorm
description: Explore a problem space through structured discussion before creating an overview. Produces a lightweight brief that feeds into /softo-wrapper-overview.
argument-hint: "<problem or feature idea>"
---

# Brainstorm — Problem Space Exploration

You are facilitating a **structured brainstorm** to explore a problem space before formalizing it into a feature overview. The goal is NOT to define requirements — it's to **understand the problem deeply** and arrive at shared conclusions that will feed into `/softo-wrapper-overview`.

## Process

1. **Enter plan mode** before doing anything else.
2. **Read the project context**: check `settings.json` to understand which repositories exist and `CLAUDE.md` for project conventions.
3. **Analyze existing repositories** to understand the current state.
   - Read the codebase in `repos/` to understand what already exists: models, endpoints, screens, flows, integrations.
   - Identify what's relevant to the problem area described by the user.
   - Use this knowledge to ground the discussion in reality — what exists today, what would be impacted, what infrastructure is already in place.
4. **Research the problem space**.
   - Search the web for how similar problems are solved in the industry.
   - Look for benchmarks, common patterns, known pitfalls, and alternative approaches.
   - Identify competing products or analogous solutions in other domains.
   - Bring these findings into the discussion proactively.
5. **Facilitate the exploration** around: $ARGUMENTS
   - This is a **free-form discussion**, not a requirements interview. Think of it as two colleagues at a whiteboard.
   - Guide the conversation through these dimensions (not necessarily in order — follow the natural flow):
     - **The real problem**: What's the actual problem we're solving? Why does it matter? Who feels the pain?
     - **Current state**: How is this handled today? What are the workarounds? What's broken or missing?
     - **Alternative approaches**: What are the different ways to solve this? What are the trade-offs of each?
     - **Scope boundaries**: What should be in scope? What should explicitly NOT be? Where does this feature end and another begins?
     - **Constraints and risks**: What could go wrong? What limitations exist (technical, business, regulatory)?
     - **User perspective**: Who are the users? What do they expect? What would delight them?
     - **Success definition**: How will we know this worked? What does "done" look like?
   - **Actively contribute ideas** — don't just ask questions. Propose approaches, challenge assumptions, suggest alternatives the user hasn't considered.
   - **Push back on vague thinking** — if the user says "it should be smart" or "it needs to be fast", ask what that means concretely.
   - **Connect the dots** — relate what the user says to what you found in the codebase and in your research. "You mentioned X, and I noticed the codebase already has Y — we could leverage that."
   - **It's OK to not reach a conclusion on everything** — some questions may remain open. That's fine. Document them as open questions.
   - Continue the discussion until you both feel the problem is well understood OR the user wants to move on.
6. **Synthesize conclusions** before writing anything.
   - Present a structured summary of what you understood and the conclusions reached.
   - Wait for the user to validate before proceeding.
   - If the user corrects anything, update your understanding and re-confirm.
7. **Create the feature directory** under `features/active/` following the naming convention `YYYYMMDD-feature-name/` (if it doesn't already exist).
8. **Write `brainstorm.md`** in the feature directory. This is a lightweight document — a brief, not a spec. Use this structure:

   ```markdown
   # Brainstorm: [Feature/Problem Name]

   **Date**: YYYY-MM-DD
   **Participants**: [User name], Claude

   ## Problem Statement

   What problem are we solving and why it matters. 1-3 paragraphs.

   ## Current State

   How things work today — workarounds, pain points, gaps.

   ## Key Conclusions

   The main decisions and agreements reached during the discussion. Each conclusion should be a clear statement, not a question.

   - Conclusion 1
   - Conclusion 2

   ## Approaches Considered

   Alternative approaches discussed and why each was favored or discarded.

   | Approach | Pros | Cons | Verdict |
   |----------|------|------|---------|
   | ... | ... | ... | Chosen / Discarded / Open |

   ## Scope Boundaries

   ### In Scope
   - ...

   ### Out of Scope
   - ...

   ## Constraints and Risks

   - Constraint/risk 1
   - Constraint/risk 2

   ## Open Questions

   Questions that remain unresolved and should be addressed during overview creation or later.

   - Question 1
   - Question 2
   ```

9. **Exit plan mode** when done.
10. **Suggest next step**: inform the user they can now run `/softo-wrapper-overview <feature-directory>` to create the formal feature overview, which will automatically use this brainstorm as input.

## Important Rules

- **Language**: follow the translation rules defined in [`rules/functional.md`](../../../rules/functional.md#translations).
- This is an **exploration**, not a spec. Keep the tone conversational and the output concise.
- Do NOT try to define milestones, deliverables, or acceptance criteria — that's the job of `/softo-wrapper-overview` and `/softo-wrapper-milestone-deliverables`.
- The brainstorm document should be **self-contained** — someone reading it should understand the problem and conclusions without needing to replay the conversation.
- If the user already has a clear vision and doesn't need exploration, suggest going directly to `/softo-wrapper-overview` instead.
