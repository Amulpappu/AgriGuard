---
name: dependency-audit
description: >-
  Audits third-party packages, libraries, and runtime dependencies for vulnerabilities,
  outdated versions, and license compliance. Use when adding or updating packages.
---

# Dependency Audit Skill

## When to Use It
Activate this skill when adding new packages, upgrading existing dependencies, or investigating security advisories from vulnerability scanners.

## Prerequisites
- Node.js package manager (`npm` / `pnpm` / `yarn`).
- Python package manager (`pip` / `poetry` / `uv`).

## Step-by-Step Procedure
1. **Audit Node.js Packages:**
   - Run `npm audit` or `npm outdated` within the `frontend/` directory.
   - Review reported vulnerabilities and breaking version changes.
2. **Audit Python Packages:**
   - Run `pip check` to detect broken requirements or dependency conflicts.
   - Run `pip list --outdated` to identify obsolete libraries.
3. **Resolve Critical Advisories:**
   - Upgrade targeted packages to patched versions (`npm update <pkg>`, `pip install --upgrade <pkg>`).
   - Run full test suite to guarantee zero breaking regressions.

## Verification Checklist
- [ ] No unpatched high or critical severity vulnerabilities.
- [ ] No dependency version conflicts reported by `pip check` or `npm`.
- [ ] All application tests pass after dependency upgrades.

## Failure Recovery
- If an automated upgrade introduces breaking API changes, pin to the latest secure patch version instead of a major version bump.

## Safety Constraints
- Avoid introducing unvetted third-party packages with low community trust or excessive permissions.
