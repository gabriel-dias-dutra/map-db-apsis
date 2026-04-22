---
name: softo-wrapper-overview
description: Create a feature overview with milestones, using plan mode and interviewing the user until all doubts are resolved. Generates client-facing documentation.
argument-hint: "<feature description or existing feature directory>"
---

# Overview Creation

You are creating a **functional overview** for a feature. This document is meant to be presented to the **client**, who generally has no technical knowledge. Write everything in clear, non-technical language.

## Process

1. **Enter plan mode** before doing anything else.
2. **Read the project context**: check `settings.json` to understand which repositories exist and `CLAUDE.md` for project conventions.
3. **Check for brainstorm context** before analyzing repositories.
   - Check if $ARGUMENTS matches an existing feature directory in `features/active/` (exact or partial match).
   - If a matching directory exists and contains `brainstorm.md`, read it. This document contains pre-explored problem context — conclusions, scope boundaries, approaches considered, and open questions from a prior `/softo-wrapper-brainstorm` session.
   - When brainstorm context is available: the problem definition, scope boundaries, and high-level approach are already resolved — do not re-explore those. However, the interview (step 6) must still be **equally thorough on all functional details**: edge cases, permissions, business rules, user flows, integrations, and everything else. The brainstorm saves time on "what problem are we solving", NOT on "how exactly should this feature work." Use the brainstorm conclusions as your starting point, then drill deep into functional specifics.
   - If no brainstorm exists, proceed normally — the interview will cover both problem exploration and functional details.
4. **Analyze existing repositories** before asking any questions.
   - Read the codebase in `repos/` to understand what already exists: models, endpoints, screens, flows, integrations.
   - Identify what would be impacted by the new feature.
   - Use this knowledge to ask informed questions and avoid asking about things you can already see in the code.
5. **Research benchmarks and best practices** for the type of feature being planned.
   - Search the web for how similar features are implemented in well-known products and competitors.
   - Identify UX patterns, common pitfalls, and industry standards relevant to the feature.
   - Bring ideas and suggestions the user hasn't mentioned — propose enhancements, alternative approaches, or features that typically complement the one being planned.
   - Present your findings during the interview to enrich the discussion.
6. **Interview the user** about the feature described in: $ARGUMENTS
   - Conduct the interview in **multiple rounds** — do not dump all questions at once. Start with the big picture, then drill deeper based on answers.
   - Do NOT proceed until all your doubts are resolved.
   - Ask about: target users, expected behavior, integrations, business rules, priorities, and any constraints.
   - **Explore edge cases and exceptions** — what happens when things go wrong, when data is missing, when limits are reached.
   - **Ask about user roles and permissions** — who can do what, who cannot, what is restricted.
   - **Ask what should NOT happen** — negative requirements are often overlooked and critical.
   - **Do not accept vague answers** — ask for concrete examples, specific numbers, or real scenarios.
   - **Understand the "why"** — don't just accept what the user wants, understand the motivation behind each request. This leads to better solutions.
   - **Challenge the scope** — push back when something seems too broad for MVP or too small to deliver real value. Help the user find the right balance.
7. **Summarize your understanding** before writing any document.
   - Present a structured summary of what you understood to the user.
   - Wait for explicit validation before proceeding to document generation.
   - If the user corrects anything, update your understanding and re-confirm.
8. **Create the feature directory** under `features/active/` following the naming convention `YYYYMMDD-feature-name/`. If the directory already exists (e.g., created by `/softo-wrapper-brainstorm`), reuse it.
9. **Write `overview.md`** using the template at `templates/overview.md` as the base. Include:
   - Clear description of the feature and the problem it solves
   - Goals written from the user/business perspective
   - **How it works**: step-by-step user experience flow — what the user does and sees, not how it's built
   - **Success metrics**: measurable indicators of success (e.g., more sales, more engagement, reduced support tickets) with targets and how to measure them
   - **Milestone breakdown**: organize into MVP (Milestone 1) and additional milestones. Each milestone should represent a meaningful, deliverable increment.
   - **Future ideas**: include ideas that came up during the interview but don't fit the current scope, plus your own suggestions for enhancements that could add value
   - **Notes** (optional): constraints, dependencies, or decisions worth recording — include only if there is relevant context
10. **Generate `presentation.html`** in the same directory using `templates/presentation.html` as the base template. Replace the placeholder content with the actual feature data while preserving the styling and structure. The HTML sections must match the overview content:
   - **Hero**: project name (+ core feature if applicable), feature name, description, date
   - **Feature overview**: description from overview.md
   - **Feature goals**: goals list
   - **How it works**: one feature-card per deliverable (with icon, title, description with bold keywords)
   - **Success metrics**: table with Metric, Target, How to measure columns
   - **Delivery milestones**: overview grid (clickable mini-cards) + timeline with deliverables and repo tags
   - **Future ideas**: list with lightbulb icons, bold title + description
   - **Notes** (optional): uncomment the section if notes exist, render as list items
11. **Exit plan mode** when done.
12. **Suggest next step**: inform the user they can now run `/softo-wrapper-milestone-deliverables all` to break down all milestones into detailed deliverables and acceptance criteria, or `/softo-wrapper-milestone-deliverables milestone-N` for a specific milestone.

## Important Rules

- **Language**: follow the translation rules defined in [`rules/functional.md`](../../../rules/functional.md#translations).
- Keep everything **functional and non-technical** — the client does not need to know about APIs, databases, or frameworks
- Milestones should follow MVP methodology: Milestone 1 delivers core value, subsequent milestones add enhancements
- Each milestone description should make clear what the user/client will see or be able to do
- Always update `presentation.html` (in all configured languages) when `overview.md` changes
