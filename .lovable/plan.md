# Naming, brand color, and product-voice pass

## 1. Say what the calculators actually are

Nav group labels stop being generic:

- `Calculators` -> **SOR Calculators** with a group caption "Direct Loan Schedule of Reductions (OBBBA / One Big Beautiful Bill Act)"
- `Developers` -> **Developers & AI agents**
- `About` -> **Product work**

Item labels get the subject in the name:

| Now | New |
| --- | --- |
| Staff calculator | Staff SOR calculator |
| Student estimate | Student SOR estimate |
| Advanced student estimate | Advanced student SOR estimate |
| Lifecycle tracker | SOR lifecycle tracker |
| Public API | Public SOR API |
| AI agents (MCP) | Ask an AI agent (MCP) |
| Work | Product work |
| About me | About Tirath |

Page titles, hero headings, and `head()` metadata on those routes are updated to match, so the label in the nav is the label on the page. Federal-aid framing ("2026-27 Direct Loan limits under the One Big Beautiful Bill Act") appears in the group caption and hero decks rather than being repeated in every link.

## 2. One brand palette everywhere except the staff calculator

Today maroon is scoped to `/student*` and everything else runs the Ellucian-adjacent purple.

- Rename the scope from `.theme-student` to `.theme-brand` (keep `.theme-student` as an alias so nothing breaks).
- Apply `.theme-brand` to every route **except** `/` (the staff calculator keeps its current palette, since staff use it daily inside an SIS context).
- So `/api-docs`, `/mcp-guide`, `/compare`, `/migration`, `/work`, `/about`, `/methodology`, `/releases`, `/lifecycle`, `/student*` all become maroon + slate.

### Killing the pink

The pink cast comes from the accent and gradient tokens drifting toward hue 20-25 at high lightness. Fixes:

- `--accent`: from a pink-tinted `oklch(0.955 0.025 17)` to a warm neutral `oklch(0.972 0.006 20)` — reads as soft gray-warm, not blush.
- `--gradient-primary`: keep both stops inside true maroon (`oklch(0.42 0.12 18)` -> `oklch(0.52 0.115 16)`), no slide toward orange/rose.
- Section washes on `/student` switch from `from-accent/70` tints to white cards on a light slate page with maroon as a *line and type* color (borders, rules, numerals, the SOR bar) plus one deep maroon block per page for contrast.
- Result: maroon, white, and cool gray only. Maroon stays a stated crimson-maroon, never a wash.

## 3. Product-manager voice on the home page and shell

- Home page gets a short positioning line above the calculator: product manager in higher-ed technology, shipping student-aid tooling — with links to Product work and About.
- A slim "built in public" strip: public source register, versioned releases, passing test count, open API + MCP, and a "challenge a scenario" link. Subtle single row, not a marketing band.
- Footer tagline rewritten in the same voice and pointed at the product work hub.

## 4. Student calculator behavior

Live recalculation on every change (including program level) is kept — it is the better interaction. It gains a quiet "updates as you type" caption plus the existing stale/`aria-live` handling, so nothing looks like an unsubmitted form. The Estimate button remains for keyboard/explicit submit.

## Out of scope

No change to SOR math, engine outputs, API contracts, gate behavior, or the staff calculator layout and palette.

## Technical notes

- `src/components/site/nav.ts` gains an optional `caption` per group; `SiteHeader` and `SiteFooter` render it.
- `src/routes/__root.tsx` swaps `pathname.startsWith("/student")` for `pathname !== "/"`.
- Token edits are confined to the `.theme-brand` block in `src/styles.css`; no hardcoded color utilities in components.
- Copy/label changes touch route `head()` blocks and hero components only.
