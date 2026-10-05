---
name: debugging
description: >-
  Systematically diagnoses unexpected application errors, crashes, build failures,
  and network timeouts by analyzing root causes from raw logs. Use when investigating bugs.
---

# Systematic Debugging Skill

## When to Use It
Activate this skill whenever a test fails, a build breaks, an endpoint returns 500, or a user encounters unexpected runtime behavior.

## Prerequisites
- Access to raw execution logs, terminal output, or browser console messages.

## Step-by-Step Procedure
1. **Gather Evidence:**
   - Capture the full stack trace and exact error message. Never guess based on a high-level summary.
2. **Reproduce & Isolate:**
   - Execute the failing command or create a minimal reproduction script in a scratch directory.
   - Trace backwards from the crash line to the originating caller.
3. **Formulate Hypothesis:**
   - Identify the exact condition (null reference, type mismatch, network timeout, missing environment variable).
4. **Apply Surgical Fix:**
   - Modify only the affected lines without introducing side effects or broad refactoring.
5. **Verify Resolution:**
   - Re-run the reproduction command and the full test suite.

## Verification Checklist
- [ ] The exact error message no longer occurs.
- [ ] No regression introduced in neighboring features or tests.
- [ ] Root cause documented clearly in the response.

## Failure Recovery
- If the first fix fails, do not chain random edits. Revert to the clean checkpoint and re-examine input parameters.

## Safety Constraints
- Never mask errors with broad try/except blocks that suppress critical debugging signals.
