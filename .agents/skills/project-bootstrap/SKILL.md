---
name: project-bootstrap
description: >-
  Initializes, bootstraps, and verifies local runtime environments for backend,
  frontend, and embedded modules. Use when setting up new services or onboarding.
---

# Project Bootstrap Skill

## When to Use It
Activate this skill when initializing the development environment, verifying dependencies, setting up local databases, or bootstrapping a new service or module.

## Prerequisites
- Node.js (v18+) and npm installed.
- Python (v3.10+) installed.
- Git initialized in workspace.

## Step-by-Step Procedure
1. **Inspect Environment:**
   - Check Node.js: `node -v` and `npm -v`.
   - Check Python: `python -v`.
2. **Backend Setup:**
   - Verify Python dependencies: `pip list` or install requirements.
   - Ensure environment file exists (`.env` configured from `.env.example`).
   - Run database schema migration or table creation.
3. **Frontend Setup:**
   - Navigate to `frontend/`.
   - Run `npm install` if `node_modules` is absent or package.json was modified.
   - Verify environment file (`.env.local`).
4. **Verification:**
   - Start backend test: `pytest backend/tests`.
   - Start frontend build: `npm --prefix frontend run build`.

## Verification Checklist
- [ ] Backend imports resolve cleanly without `ModuleNotFoundError`.
- [ ] Next.js frontend builds without syntax or type errors.
- [ ] Database connection tests succeed.

## Failure Recovery
- If dependencies fail to install, inspect conflicting package versions in `package.json` or `requirements.txt`.
- Clear cached files (`.next`, `__pycache__`) and retry installation.

## Safety Constraints
- Never overwrite an existing `.env` with dummy values if production or active keys exist.
