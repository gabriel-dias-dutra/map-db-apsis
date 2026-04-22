# Deliverable NNNN — Title `backend` `mobile`

**Milestone:** Milestone N — Title

**Deliverables:**
- Deliverable A

**Description:** Brief summary of what the user will be able to do when this deliverable is complete.

**Dependencies:** None | Deliverable NNNN from Milestone X

**Complexity:** Medium — Functionality involving multiple rules or interactions between system areas. Deliverable-specific justification for this level.

**Size:** Small — Limited scope — few screens or interactions, straightforward flow. Deliverable-specific justification for this level.

## User Flow

Step-by-step description of the user experience:

1. The user navigates to / opens / triggers...
2. The system displays / presents...
3. The user fills in / selects / confirms...
4. The system validates / processes / responds with...
5. The user sees the confirmation / result / next step...

## Fields and Data

What information is involved in this deliverable — what the user sees, enters, or interacts with.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| e.g., Full name | Text | Yes | User's full name, displayed in the profile |
| e.g., Status | Selection | Yes | Active, Inactive, Pending — determines visibility |

**List view displays:** which fields appear in the list/summary view.

**Detail view displays:** which additional fields appear when opening the full detail.

## Business Rules

Validation rules, conditions, and constraints that govern this deliverable's behavior.

- Rule 1: description of the rule and when it applies
- Rule 2: description of the rule and when it applies

## Error Behavior

What happens when things go wrong or when edge cases are reached.

- Scenario 1: what the user sees / what the system does
- Scenario 2: what the user sees / what the system does

## Notifications and Communications

What communications are triggered by actions in this deliverable.

| Trigger | Channel | Recipient | Content |
|---------|---------|-----------|---------|
| e.g., Order placed | Email | Customer | Order confirmation with details |
| e.g., New signup | Push notification | Admin | "New user registered: {name}" |

## State Transitions

If this deliverable involves entities with status/state, define the valid transitions.

| From | To | Triggered by | Who can trigger | Notes |
|------|----|-------------|-----------------|-------|
| e.g., Pending | Approved | Manager review | Manager, Admin | Requires all fields filled |
| e.g., Approved | Cancelled | User request | User, Admin | Only within 24h of approval |

## Permissions

Who can perform each action in this deliverable.

| Action | Allowed roles | Notes |
|--------|---------------|-------|
| e.g., View list | All authenticated users | — |
| e.g., Create new | Admin, Manager | Manager can only create for their own team |
| e.g., Delete | Admin only | Requires confirmation dialog |
