# CLAUDE.md

Before writing or changing any UI in this project, read DESIGN.md at the root.

- Product context (who it's for, constraints, tone): see PRODUCT.md at the root.
- Project rules and directory map: see AGENTS.md at the root.
- The web app lives in `frontend/` (Next.js 14 App Router, TypeScript, Tailwind 3). Run npm / npx / shadcn commands inside `frontend/`.
- All user-facing text goes through `t()` from `frontend/lib/i18n.tsx`; add every new string to both `frontend/locales/en.json` and `frontend/locales/ta.json`.
