# Student page redesign — brand-aligned, student-first

## Goal
Turn `/student` from a plain form page into a confident, screenshot-worthy student landing + calculator that carries the myproduct.life brand (no Ellucian purple), reads instantly, and clearly routes the three audiences.

## Brand palette (pulled from the live myproduct.life stylesheet)
Your site already defines these tokens — I'll reuse them exactly, scoped to the student experience:

- Accent (brand crimson): `oklch(51.5% 0.115 17)`
- Accent hover: `oklch(45% 0.13 17)`
- Accent soft (chip/wash): `oklch(95.5% 0.025 17)`
- Accent foreground: `oklch(98.4% 0.003 247.858)`
- Neutrals (slate family): bg `oklch(100% 0 0)`, foreground `oklch(12.9% 0.042 264.695)`, muted `oklch(96.8% 0.007 247.896)`, muted-foreground `oklch(55.4% 0.046 257.417)`, border `oklch(92.9% 0.013 255.508)`
- Dark mode counterparts: bg `oklch(12.9% 0.042 264.695)`, card `oklch(20.8% 0.042 265.755)`

Zero purple on the student pages. Staff calculator keeps its current tokens untouched.

## Typography
Space Grotesk for headings, DM Sans for body, loaded via `<link>` in the root route head and registered as `--font-display` / `--font-sans` theme tokens. Headlines get real size and tight tracking — no more tiny "Student estimate" label as the loudest thing on the page.

## Layout — split screen
```text
┌──────────────────────────── header ───────────────────────────┐
│ Project SOR            [ Student · Advanced · For staff/devs ]│
└───────────────────────────────────────────────────────────────┘
┌─────────────── left rail ───────────┬──── right: calculator ──┐
│ eyebrow: FOR STUDENTS               │  ┌───────────────────┐  │
│ H1: Will my loan be reduced         │  │ Award year        │  │
│     this year?                      │  │ Program / grade   │  │
│ sub: One minute. No login. No       │  │ Fall / Spring cr. │  │
│      personal info.                 │  │ [ See my estimate ]│ │
│ 3 trust chips: no data stored ·     │  └───────────────────┘  │
│   official formula · free           │  result card appears    │
│ "How it works" 1-2-3 mini steps     │  inline under the form  │
└─────────────────────────────────────┴─────────────────────────┘
┌── Result hero (when calculated): big % + $ figures, brand wash ┐
┌── "What this does / doesn't do" two-column explainer ─────────┐
┌── Student FAQ (short accordion) ──────────────────────────────┐
┌── Audience router cards: Advanced estimate · Staff & devs ────┐
```

## Navigation (per your note)
Header gets a real segmented pill switcher, not bare text links:
- **Student estimate** (default, active)
- **Advanced estimate** — labelled "Also for students"
- **For financial aid staff & developers** → staff calculator / API / MCP

Advanced is presented as a peer student path, not a hidden staff tool. The same three options repeat as tappable cards at the page bottom so nothing depends on noticing the header.

## Result presentation (the LinkedIn screenshot moment)
- Big brand-accent hero number: SOR % as the headline, dollar figures as supporting stats.
- Plain-language one-liner: "Based on your credits, your annual Direct Loan maximum is reduced to about $X."
- A simple horizontal bar showing full maximum vs. reduced amount, so the reduction is visual, not just numeric.
- Warnings and the disclaimer stay verbatim, styled as a calm bordered note — not decorative, not hidden.

## Content & tone changes (copy only, no math)
- Headline speaks the student's question, not the policy term.
- Every field gets a short helper line ("Ask your advisor or check your class schedule").
- "What this can't tell you" list stays, reworded for a student reader.
- Short FAQ: what SOR is, why credits matter, who decides the final award, what to do next.

## Explicitly unchanged
- All SOR math, `/api/public/v2/student-estimate`, engine, warnings text, disclaimers, and API/MCP surfaces.
- Staff calculator (`/`), compare, lifecycle, api-docs visual design.

## Technical notes
- Add brand tokens as a scoped token set in `src/styles.css` (e.g. a `.theme-student` class applied to the student route wrappers) plus `@theme inline` mappings, so `/student` and `/student/advanced` render brand crimson while the staff app keeps existing tokens. No hardcoded hex/`text-white` in components.
- Fonts via `<link>` in `src/routes/__root.tsx` (never `@import` a URL in CSS).
- New presentational components under `src/components/student/`: `StudentHeader` (segmented nav), `StudentHero`, `EstimateForm`, `EstimateResult`, `StudentFaq`, `AudienceCards`. `src/routes/student.tsx` becomes composition only; fetch logic stays as-is.
- Apply the same header + tokens to `src/routes/student/advanced.tsx` so the two student pages feel like one product.
- Add unique `head()` metadata (title, description, og/twitter) for both student routes.
- Responsive: split screen collapses to single column under `lg`; verified at mobile width. Existing test suite must stay green.
