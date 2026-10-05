---
name: release-check
description: >-
  Executes comprehensive pre-release checklists across testing, security,
  configuration, documentation, and build pipelines prior to production deployment.
---

# Release Check Skill

## When to Use It
Activate this skill before deploying a release to production (Vercel, Cloud Run, app stores, or GitHub releases) to prevent broken deployments.

## Prerequisites
- Working tree clean or prepared for release commit.
- Target release version determined (e.g. `v1.0.0`).

## Step-by-Step Procedure
1. **Automated Test Validation:**
   - Execute backend test suite: `pytest backend/tests/ -v`. Must be 100% passing.
   - Execute frontend production build: `npm --prefix frontend run build`. Must compile with 0 errors.
2. **Security & Secrets Quarantine:**
   - Verify no `.env` or secret keys are tracked in git: `git status --ignored`.
   - Verify production environment variables are properly documented in `.env.example`.
3. **Database & Schema Synchronization:**
   - Verify database migrations or schema synchronization scripts are up to date.
4. **Documentation & Versioning:**
   - Update `CHANGELOG.md` and version strings in `package.json` and API definitions.
5. **Deployment Tag:**
   - Commit all changes with a release message and tag the commit: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.

## Verification Checklist
- [ ] 100% of automated tests passing.
- [ ] Production build passes with 0 warnings or errors.
- [ ] No private keys or unencrypted passwords in repository history.
- [ ] All environment variables documented and verified.

## Failure Recovery
- If any check fails, abort release process, fix the underlying defect, and restart the checklist from Step 1.

## Safety Constraints
- Never deploy to production with failing tests or unverified secret configurations.
