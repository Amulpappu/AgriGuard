---
name: git-workflow
description: >-
  Guides clean, safe, and professional local Git version control workflows.
  Covers staging, atomic commits, branch creation, rebasing, and stashing.
---

# Git Workflow Skill

## When to Use It
Activate this skill when creating branches, staging changes, writing structured commit messages, resolving merge conflicts, or taking safety checkpoints.

## Prerequisites
- Git repository initialized.
- Clean working directory or stashed changes.

## Step-by-Step Procedure
1. **Status Inspection:**
   - Run `git status` and `git branch` to understand repository state.
2. **Selective Staging:**
   - Stage only related files: `git add <file1> <file2>`. Never blindly `git add .` if untracked temporary files exist.
3. **Semantic Commit Message:**
   - Follow Conventional Commits: `<type>(<scope>): <short description>`.
   - Examples: `feat(ml): add leaf disease confidence filter`, `fix(api): handle missing sensor token`.
4. **Safety Checkpoints:**
   - Create local branches or lightweight tags for risky refactoring before making experimental edits.

## Verification Checklist
- [ ] No unintended files, secrets, or build artifacts staged for commit.
- [ ] Commit message accurately reflects the diff content.

## Failure Recovery
- If the wrong file was staged, unstage with `git restore --staged <file>` without losing working tree modifications.

## Safety Constraints
- Never execute destructive reset commands (`git reset --hard`) on uncommitted user files.
