# Git Safety and Version Control Protocol

## Directive
1. **Pre-flight Check:**
   - Always run `git status` and verify current working branch before creating commits or editing files.
2. **Never Overwrite Uncommitted Work:**
   - Check whether files have untracked or unstaged user modifications before performing file replacements.
3. **Non-Destructive Operations:**
   - Never run `git reset --hard` or `git clean -fd` without explicit user permission.
   - Never force-push (`git push -f`) to `main` or shared branches.
4. **Logical Commit Messages:**
   - Use conventional commit prefixes: `feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `test:`.
   - Keep commits focused on a single logical change.
