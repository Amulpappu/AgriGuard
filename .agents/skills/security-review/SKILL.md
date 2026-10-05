---
name: security-review
description: >-
  Conducts comprehensive security audits across code, dependencies, secrets,
  and network protocols. Use when assessing codebase security or before production release.
---

# Security Review Skill

## When to Use It
Activate this skill before committing sensitive code, prior to deploying to production, or when auditing authentication and API security.

## Prerequisites
- Static code analysis tools and secret scanners.

## Step-by-Step Procedure
1. **Secret & Key Scanning:**
   - Search for potential leaked strings (`apikey`, `secret_key`, `BEGIN PRIVATE KEY`, passwords).
   - Verify `.env` files are excluded by `.gitignore`.
2. **Authentication & Authorization:**
   - Verify all private endpoints require valid bearer tokens (`Depends(get_current_user)`).
   - Audit database access rules and Row Level Security (RLS) policies.
3. **Input Validation & Injection Prevention:**
   - Ensure all database queries use parameterized SQL (SQLAlchemy / prepared statements). Never concatenate raw strings into SQL.
   - Verify image uploads check file extensions, MIME types, and file size limits.
4. **CORS & Transport Security:**
   - Ensure CORS origins in production do not allow wildcard `*` with credentials.
   - Require HTTPS for all production remote traffic.

## Verification Checklist
- [ ] Zero hardcoded secrets in version control.
- [ ] All sensitive endpoints require authentication.
- [ ] Safe input validation on all API boundaries.

## Failure Recovery
- If a secret was committed accidentally, revoke the key immediately on the provider dashboard and rotate credentials.

## Safety Constraints
- Never print detected secret values into chat output or log files.
