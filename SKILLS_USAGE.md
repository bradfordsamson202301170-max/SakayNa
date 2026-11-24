# MotoGo — Matt Pocock Skills Usage Evidence (`SKILLS_USAGE.md`)

This document provides verifiable evidence of how **Matt Pocock's Skills (`https://github.com/mattpocock/skills`)** were installed, verified, and applied inside Google Antigravity during MotoGo's development.

---

## 1. Installation & Workspace Verification Evidence

- **Official Command Executed (Batch 1, with student authorization):**
  ```powershell
  npx --yes skills@latest add mattpocock/skills --agent antigravity --skill '*' --copy -y
  ```
- **Workspace Isolation:** Installed strictly into `F:\ws semi brad\.agents\skills\` (39 skills, tracked in `skills-lock.json`) without modifying global directories (`~/.gemini/config` or `~/.agents/skills`) or affecting any other project.
- **Discovery Mechanism:** Verified against Antigravity's built-in `agy-customizations` documentation — Antigravity loads workspace `.agents/skills/<name>/SKILL.md` with highest priority via progressive disclosure.

---

## 2. Specific Skills Applied & Concrete Project Artifacts Produced

| Matt Pocock Skill | Source File in Workspace | How It Shaped MotoGo | Resulting Artifacts |
| :--- | :--- | :--- | :--- |
| **`domain-modeling`** | `.agents/skills/domain-modeling/SKILL.md` | Enforced a single canonical vocabulary (*User Account*, *Passenger*, *Driver*, *Motorcycle*, *Fare Configuration*, *Ride*, *Activity Log*) and ADR criteria (hard-to-reverse, trade-off-driven decisions). | `PROJECT_SPEC.md` (§3 Glossary), `DECISION_LOG.md` (`ADR-001`–`ADR-007`), normalized 12-table PostgreSQL schema |
| **`grill-with-docs`** | `.agents/skills/grill-with-docs/SKILL.md` | Stress-tested critical edge cases before writing code: double-booking race conditions, unapproved drivers going online, fare changes during active rides, self-promotion via PostgREST, and duplicate trip completions. | `FUNCTIONAL_REQUIREMENTS.md` (`BR-01`–`BR-15`), `202611230006` (`accept_ride`), `202611230008` (`complete_ride_trip`), `202611230010` (`SEC-01`/`SEC-02`) |
| **`to-spec`** | `.agents/skills/to-spec/SKILL.md` | Structured the project specification with Problem Statement, Solution, 27 numbered User Stories (`As a <role>, I want <feature>, so that <benefit>`), deep module boundaries, high-seam testing decisions, and explicit Out of Scope. | `PROJECT_SPEC.md` |
| **`to-tickets`** | `.agents/skills/to-tickets/SKILL.md` | Decomposed delivery into 10 **tracer-bullet vertical slices** (`T01`–`T10`) with explicit `Blocked by` edges and verifiable acceptance criteria instead of disconnected horizontal layers. | `IMPLEMENTATION_PLAN.md` (with Mermaid dependency graph) |
| **High-Seam Testing (`tdd` / `to-spec`)** | `.agents/skills/tdd/SKILL.md` | Separated pure domain logic (`fare.ts`, `rideRequest.ts`, `driver.ts`, `matching.ts`, `tripCompletion.ts`, `reports.ts`) from React UI so business invariants are verified directly in `scripts/regression-tests.mjs`. | `scripts/regression-tests.mjs` (`14/14` passing) & `TESTING_REPORT.md` |
