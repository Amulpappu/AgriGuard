# Web Application & Frontend Architecture Rule

## Directive
When developing web frontends (Next.js, React, Tailwind):

1. **Rich Modern Aesthetics:**
   - Use curated color palettes (emerald, cyan, glassmorphic dark themes).
   - Use modern typography, glowing borders, smooth hover animations, and clear data cards.
   - Avoid plain, default, or unstyled UI elements.
2. **Dual-Engine & Latency Optimization:**
   - When running on cloud platforms (e.g. Vercel), never execute dead proxy rewrites to localhost (`127.0.0.1:8001`) that trigger 60-second gateway timeouts.
   - Use direct cloud database fallbacks (Supabase SDK) for sub-150ms instant responses.
3. **Build & Type Integrity:**
   - Always run `npm run build` or `tsc --noEmit` before considering any web modification complete.
   - Ensure all routes, layouts, and page parameters have strict TypeScript interfaces.
4. **Responsive & Mobile View:**
   - Ensure layouts look pristine on both desktop monitors and mobile/tablet screens.
