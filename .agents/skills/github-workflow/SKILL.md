---
name: github-workflow
description: >-
  Manages GitHub remote synchronization, Pull Requests, issues, release tags,
  and GitHub Actions CI/CD workflows. Use when interacting with GitHub remotes.
---

# GitHub Workflow Skill

## When to Use It
Activate this skill when syncing with remote repositories (`git push`, `git fetch`), configuring CI/CD pipelines, tagging releases, or creating pull requests.

## Prerequisites
- Remote repository configured (`git remote -v`).
- Authentication established (SSH key or GitHub credential helper).

## Step-by-Step Procedure
1. **Remote Sync:**
   - Fetch remote changes: `git fetch origin`.
   - Rebase cleanly if working on feature branch: `git pull --rebase origin main`.
2. **Pushing Changes:**
   - Push to current tracking branch: `git push origin <branch>`.
3. **CI/CD Integration:**
   - Configure GitHub Actions workflows in `.github/workflows/` for automated testing and linting.
4. **Release Tagging:**
   - Create annotated release tags: `git tag -a v1.0.0 -m "Release v1.0.0"`.
   - Push tags: `git push origin v1.0.0`.

## Verification Checklist
- [ ] Working tree cleanly aligned with remote tracking branch.
- [ ] GitHub Actions CI passes on pushed commits.

## Failure Recovery
- If push is rejected due to remote updates, inspect remote commit diff with `git log ..origin/main` before rebasing.

## Safety Constraints
- Never force-push to `main` or `master` branches.
