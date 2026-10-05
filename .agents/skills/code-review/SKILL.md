---
name: code-review
description: >-
  Performs rigorous automated code quality, design token adherence, type safety,
  and architecture reviews on modified code. Use prior to merging or committing changes.
---

# Code Review Skill

## When to Use It
Activate this skill to review modified files, assess PR readiness, check design adherence, or inspect code for maintainability and regressions.

## Prerequisites
- Working tree inspected via `git status` or `git diff`.
- Static analysis tools installed (`tsc`, `pyright`, `eslint`).

## Step-by-Step Procedure
1. **Analyze Diff:**
   - Run `git diff` to view exact modified lines.
2. **Review Criteria:**
   - **Type Safety:** Are all parameters, return types, and schemas explicitly typed?
   - **Error Handling:** Are exceptions gracefully caught and converted to informative error responses?
   - **Aesthetics & Tokens:** Does frontend code use standardized Tailwind classes and project tokens instead of arbitrary inline styles?
   - **Code Integrity:** Were unrelated comments or working features deleted accidentally?
3. **Run Static Checks:**
   - Run type checks on backend and frontend (`npm --prefix frontend run build`, `pyright`).
4. **Produce Findings:**
   - Categorize issues by severity: Critical, Warning, Suggestion.

## Verification Checklist
- [ ] No untyped `any` or broad `except Exception: pass` without logging.
- [ ] Zero unhandled edge cases or missing null checks.
- [ ] Coding conventions consistent with existing repository style.

## Failure Recovery
- If linting or type errors are identified, invoke the `test-and-fix` skill to remedy them before approval.

## Safety Constraints
- Do not auto-approve changes that introduce security regressions or hardcoded secrets.
