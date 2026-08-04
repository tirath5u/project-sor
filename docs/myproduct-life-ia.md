# Information architecture spec — myproduct.life

Implementation-ready spec for the personal-brand site, written so the two
domains read as one product family. `sor.myproduct.life` already implements the
shell, nav grouping, and page-header rhythm described here; mirror them.

## Goals by audience

| Audience | Job on this site | Success |
| --- | --- | --- |
| Recruiters / hiring managers | Judge scope and depth fast | Reaches a case study in one click from home |
| Product leaders | See how decisions were made | Reads Problem → Constraints → Evidence |
| Financial aid staff | Find the working tools | Lands on sor.myproduct.life in one click |
| Students | Get an estimate | Deep link straight to /student on the SOR domain |
| Developers | Find the API / MCP | Reaches api-docs or mcp-guide from Products |

## Route table

```text
/                 Who I am, what I ship, three proof tiles, latest work
/products         Product index: Project SOR, COD Updates (cross-domain links)
/products/sor     Product page for Project SOR, CTA to sor.myproduct.life
/products/cod     Product page for COD annual updates (gated detail)
/work             Case study index (same template as the SOR domain)
/work/$slug       Case study: Problem, Constraints, What I shipped, Evidence, Next
/about            Bio, principles, contact
/writing          Optional later: notes and analysis (only if maintained weekly)
```

No hash-anchor sections for these; each is its own route so it can be shared,
indexed, and measured independently.

## Global shell (identical to the SOR domain)

- Wordmark `myproduct.life` at top left, always linking home.
- Nav grouped by audience task: **Products** · **Work** · **About**, with a
  right-side link out to the live SOR calculator.
- Footer as a human-readable sitemap in three columns, plus the estimates-only
  disclaimer where any calculator is referenced.
- Reuse the component names `SiteHeader`, `SiteFooter`, `PageHeader`.

## Design system

- Palette unchanged: same tokens as this repo's `src/styles.css`. Purple
  primary for product/professional surfaces, the maroon student theme only for
  student-facing screens.
- Typography: Space Grotesk for display, DM Sans for body.
- Every route opens with the same eyebrow / H1 / summary rhythm via `PageHeader`.

## Metadata rules

- Unique `title`, `description`, `og:title`, `og:description` per route.
- Self-referencing `canonical` and `og:url` on leaf routes only.
- `og:image` on leaves only, never on the root layout.
- JSON-LD: `Person` on `/about`, `WebSite` sitewide, `Article` on case studies,
  `SoftwareApplication` on product pages.
- `sitemap.xml` as a server route listing every public route, including one
  entry per case study; `llms.txt` grouped by the same headings as the nav.

## Cross-linking contract

- `myproduct.life/products/sor` → `https://sor.myproduct.life/` (staff) and
  `/student` (students), labelled by audience.
- `sor.myproduct.life/work` and `/about` → back to `myproduct.life`.
- Case studies exist on both domains only if the content is identical; otherwise
  keep the canonical copy on `myproduct.life` and link to it.