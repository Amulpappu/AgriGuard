# Autonomous Development Loop Rule

## Directive
For every software change, bug fix, or feature addition, the agent must autonomously execute the complete 6-stage development loop:

1. **Understand:** Read files, assess dependencies, identify existing patterns.
2. **Plan:** Outline minimal, cohesive changes and list risks before editing.
3. **Implement:** Write idiomatic, cleanly structured code preserving existing architecture.
4. **Verify:** Run static analysis, linters, compilation, and automated test suites.
5. **Debug:** When an error occurs, inspect full error logs, trace root cause, fix, and re-test.
6. **Report:** Provide a concise summary of changes and verification status. Never report "done" without verification passing.
