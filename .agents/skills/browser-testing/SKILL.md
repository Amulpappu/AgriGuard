---
name: browser-testing
description: >-
  Verifies frontend user interfaces, form submissions, real-time charts,
  and cross-page routing visually and functionally in real browser environments.
---

# Browser Testing Skill

## When to Use It
Activate this skill to verify user flows, check UI layouts after CSS/Tailwind changes, inspect client-side JavaScript execution, or audit visual aesthetics.

## Prerequisites
- Development or production web server active.
- Browser subagent or automated browser runner (Playwright / Puppeteer).

## Step-by-Step Procedure
1. **Launch & Navigate:**
   - Ensure local dev server is running on `http://127.0.0.1:3000` or use production URL.
   - Navigate to the target page URL.
2. **Visual & Layout Inspection:**
   - Verify page renders with correct typography, colors, and layout hierarchy.
   - Check that responsive navbar, cards, and modal dialogs open cleanly.
3. **Interactive Flow Testing:**
   - Test login and registration flows.
   - Test form validation messages for missing/invalid inputs.
   - Test data loading in tables, dashboard charts, and history views.
4. **Console & Network Audit:**
   - Inspect browser console for unhandled JavaScript exceptions.
   - Inspect network panel for failed 4xx/5xx requests or slow asset loads.

## Verification Checklist
- [ ] No unhandled errors printed to the browser developer console.
- [ ] UI elements respond promptly to user click and touch interactions.
- [ ] Forms provide clear feedback upon success or failure.

## Failure Recovery
- If browser rendering hangs, check network requests for hanging API proxy calls or CORS errors.

## Safety Constraints
- Do not automate actions that trigger irreversible real-world transactions without confirmation.
