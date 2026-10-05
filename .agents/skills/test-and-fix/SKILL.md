---
name: test-and-fix
description: >-
  Executes automated test suites across backend and frontend, analyzes all failures,
  applies targeted fixes, and re-runs tests until 100% pass rate is achieved.
---

# Test and Fix Skill

## When to Use It
Activate this skill after making substantial code changes, or when tasked with resolving a suite of failing unit, integration, or E2E tests.

## Prerequisites
- Test runners configured (`pytest` for Python backend, `npm run build` / `jest` / `playwright` for frontend).

## Step-by-Step Procedure
1. **Execute Initial Suite:**
   - Run backend tests: `pytest backend/tests/ -v`.
   - Run frontend build/tests: `npm --prefix frontend run build`.
2. **Prioritize Failures:**
   - Group errors by root cause (e.g. schema changes, broken mocks, syntax issues).
3. **Iterative Repair:**
   - Address failures one by one, starting with fundamental models and progressing to high-level endpoints.
4. **Re-Verification:**
   - Re-run the specific failing test first, followed by the complete suite.
5. **Enforce 100% Pass Rate:**
   - Repeat until 0 failures and 0 unhandled warnings remain.

## Verification Checklist
- [ ] Backend: All pytest cases report `PASSED`.
- [ ] Frontend: `next build` generates all static and dynamic pages with 0 errors.

## Failure Recovery
- If fixing one test breaks another, evaluate whether the test expectation is outdated due to an intentional business logic update, or if a true regression occurred.

## Safety Constraints
- Never delete or disable valid tests solely to achieve a passing report.
