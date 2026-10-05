---
name: web-ui-build
description: >-
  Builds, modernizes, and polishes web user interfaces using React, Next.js, and Tailwind CSS.
  Enforces rich aesthetics, glassmorphism, responsive layouts, and zero-latency data binding.
---

# Web UI Build Skill

## When to Use It
Activate this skill when creating new frontend pages, designing UI components, enhancing visual styling, or connecting frontend views to backend/cloud APIs.

## Prerequisites
- Next.js 14 App Router project located in `frontend/`.
- Tailwind CSS and Lucide React icons configured.

## Step-by-Step Procedure
1. **Design System Adherence:**
   - Use established design tokens: dark backgrounds, emerald/green accent gradients, glassmorphism cards (`glass`), and subtle micro-borders (`border-white/10`).
   - Use Lucide React icons for all navigation, actions, and status indicators.
2. **Component Architecture:**
   - Split pages into focused, reusable components.
   - Separate client components (`"use client"`) from static server components where appropriate.
3. **Data Fetching & State:**
   - Use unified API client (`frontend/lib/api.ts`) with immediate cloud database fallback.
   - Handle loading states with clean skeletons rather than blank screens.
   - Handle errors with informative UI alerts and retry actions.
4. **Verification:**
   - Execute `npm --prefix frontend run build` to verify prerendering across all routes.
   - Verify layout responsiveness on mobile (375px), tablet (768px), and desktop (1280px+).

## Verification Checklist
- [ ] No layout shifts or unstyled elements during page load.
- [ ] Responsive navigation works smoothly on mobile viewports.
- [ ] Build succeeds with 0 TypeScript and ESLint errors.

## Failure Recovery
- If styles conflict, inspect `tailwind.config.ts` and ensure custom classes are declared in `globals.css`.

## Safety Constraints
- Never include sensitive API secret keys in frontend client components.
