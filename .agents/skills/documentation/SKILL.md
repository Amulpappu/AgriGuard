---
name: documentation
description: >-
  Generates and synchronizes technical documentation, architecture specifications,
  API references, and user guides. Use when updating or creating project docs.
---

# Documentation Skill

## When to Use It
Activate this skill when creating architecture diagrams, drafting README guides, documenting API contracts, or compiling user manuals.

## Prerequisites
- Working knowledge of the codebase and active configuration.

## Step-by-Step Procedure
1. **Source of Truth Audit:**
   - Read the actual code implementation to extract truthful parameters, types, and behaviors.
2. **Structure & Clarity:**
   - Use clear headers, tables, code snippets with language syntax highlighting, and Mermaid diagrams.
   - Use clickable file links (`[filename](file:///path/to/file)`).
3. **Keep Examples Verifiable:**
   - Ensure all CLI commands and API payloads shown in docs actually execute successfully.
4. **Maintenance & Changelog:**
   - Update `CHANGELOG.md` or version release notes reflecting new features or bug fixes.

## Verification Checklist
- [ ] No stale or outdated commands in markdown files.
- [ ] Code examples and environment keys match actual code schemas.
- [ ] Markdown links resolve correctly.

## Failure Recovery
- If documentation conflicts with code behavior, align documentation with code or file an issue if code has a bug.

## Safety Constraints
- Never include real production passwords, API secret keys, or private phone numbers in documentation.
