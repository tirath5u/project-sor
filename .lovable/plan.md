# Information architecture redesign — sor.myproduct.life (+ IA spec for myproduct.life)

Applying the IA discipline from the Aakash Gupta piece: organize and label so each audience finds its task fast. IA is structure, labels, taxonomy, metadata, wayfinding. The palette stays exactly as-is; everything else is open.

## What's wrong today (verified in the code)

- There is no global header or footer. `__root.tsx` renders only `<Outlet />` plus the access gate, so `/lifecycle`, `/api-docs`, `/mcp-guide`, `/releases`, `/compare`, and `/migration` are orphan pages reachable only by typing a URL. The only nav in the project is the 4-pill student header.
- `/` is the full staff calculator with no orientation layer, so a recruiter or administrator landing there sees a dense form, not a product.
- Two visual identities exist (Ellucian purple on staff pages, maroon `.theme-student` on student pages) with no shared chrome tying them together.
- Nothing is labeled by audience. `/compare` and `/migration` are not even in the sitemap.
- No personal-brand surface: nothing says who built this or why it exists.

## The new structure

The calculator stays at `/`, so no URL breaks. Orientation gets added around it, plus one global shell.

```text
/                     Staff calculator + new "Start here" audience strip on top
/student              Student estimator            (exists)
/student/advanced     Advanced student estimate    (exists)
/lifecycle            Aid lifecycle tracker        (exists)
/api-docs             REST API                     (exists)
/mcp-guide            AI agent / MCP               (exists)
/compare  /migration  Parity + version tools       (exists, finally surfaced)
/releases             Changelog                    (exists)
/work                 NEW  Proof-of-work hub: shipped products, case study index
/work/$slug           NEW  Case studies: Project SOR, COD annual update, MCP contract
/about                NEW  Who I am, how I work, contact
/methodology          NEW  Route wrapping docs/methodology.md: sources, rounding, caveats
```

## Global shell (the biggest single win)

Add a persistent header and footer in `__root.tsx` — one component, theme-aware so it inherits maroon under `.theme-student` and purple elsewhere:

- Wordmark "myproduct.life" — the personal brand, always visible.
- Primary nav grouped by audience, not by feature: **Calculators** (Staff · Student · Advanced · Lifecycle) · **Developers** (API · MCP · Compare · Releases) · **Work** · **About**. Dropdown on desktop, sheet on mobile.
- Right side: a status chip with engine version and policy year (from `sor.version.ts`) and a "Report a scenario" link.
- Footer: full sitemap in three columns (Calculators / Developers / About & sources), disclaimer line, license, last-updated marker.

The student pill switcher folds into this shell so there is one nav model, not two.

## Per-audience task design

- **Students** (`/student`): keep the current redesign; add a quiet "Not a student?" link row so misrouted visitors leave in one click.
- **Staff and financial aid administrators** (`/`): a compact strip above the calculator — one line on what the tool does, the engine/policy version, and three chips: "Jump to calculator", "Methodology and sources", "Report a scenario". Collapsible and remembered, so daily users see it once.
- **Recruiters and product leaders**: `/work` — a short positioning line, then one card per shipped artifact with the metric that matters (institutions reached, endpoints, tests passing, MCP tools). Each card opens a case study: Problem → Constraints → What I shipped → Evidence → What I'd do next. Contact and LinkedIn CTA at the bottom, with a condensed version of the same block on the home hub.
- **Developers**: `/api-docs` and `/mcp-guide` cross-link to each other and to `/compare`, each opening with a copy-paste quickstart.

## Metadata and findability

- Unique `head()` on every new route (title, description, og:title/description); `og:image` on leaves only.
- Add `/work`, `/work/$slug`, `/about`, `/methodology`, `/compare`, `/migration`, and `/student/advanced` to `sitemap.xml`, and rewrite `public/llms.txt` to match the new structure.
- JSON-LD: `Person` on `/about`, `SoftwareApplication` on `/`, `FAQPage` on `/student`.
- Breadcrumbs on case studies and documentation pages.

## Colors and design system

Palette unchanged — Ellucian purple tokens on staff and developer pages, `.theme-student` maroon on student pages, both already in `src/styles.css`. Improvements within that constraint: reuse Space Grotesk and DM Sans site-wide (already loaded) so the staff side stops looking like a different product; consistent card radius and shadow via existing tokens; a shared `PageHeader` so every route opens the same way.

## Suggested improvements beyond the ask

1. Global `Cmd/Ctrl+K` command palette over routes and scenarios — a real power move for staff who use this daily.
2. Version chip in the header linking to `/releases`, so version questions never need an email.
3. Shareable result URLs (student inputs encoded in search params) so an advisor can send a student their exact estimate.
4. Print stylesheet for the `/` results so staff can attach output to a file review.

## myproduct.life (separate project — IA spec to apply there)

Delivered as a written spec at `docs/myproduct-life-ia.md` in this repo, ready to implement in the other project: home = who I am, what I ship, three proof tiles; `/products` listing SOR and COD Updates with cross-domain links; `/work` case studies on the same template; `/about`; identical shell, wordmark, and palette so both domains read as one brand. The spec includes nav labels, the route table, metadata rules, and cross-links back to sor.myproduct.life.

## Technical notes

- New shell components under `src/components/site/` (`SiteHeader`, `SiteFooter`, `PageHeader`), mounted in `__root.tsx` inside the existing `AccessGate` boundary. API, MCP, and sitemap server routes are untouched.
- Case studies as typed data in `src/content/work.ts` (no CMS, matching the case-studies-only choice), consumed by `/work` and `createFileRoute("/work/$slug")`.
- No changes to `src/lib/sor.ts`, `loanLimits.ts`, `phase-b.ts`, or any endpoint — SOR math and API contracts stay byte-identical, and the existing test suite must stay green.
- Build order: shell and footer → `/` orientation strip → `/work` and case studies → `/about` and `/methodology` → sitemap, llms.txt, JSON-LD → optional extras above.