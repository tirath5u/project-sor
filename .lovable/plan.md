## Locked decisions

1. **Site:** new standalone Lovable project at `cod.myproduct.life`. SOR untouched.
2. **Brand (your real myproduct.life brand):**
   - **Primary:** light maroon
   - **Surface:** white / cream
   - **Supporting:** warm neutrals + a soft complementary accent (muted gold or dusty rose, picked to sit well on cream without competing with maroon)
   - SOR purple + gold tokens are NOT used here. We only switch to the Ellucian palette on a future page if you tell me "this one is for Ellucian clients."
3. **Gate password:** `cod2026` (one shared password for any vendor specific artifact).
4. **Future siblings:** room reserved under `myproduct.life` for One Big Beautiful Bill, Warrior Bits, etc.

## Site map

```text
cod.myproduct.life
├─ /                                COD Updates hub (lists cycles)
├─ /2026-27                         2026-27 cycle landing + your story
│   ├─ /xml-schema-diff             public
│   ├─ /xml-sample-comparison       public
│   ├─ /vol6-changelog              public
│   ├─ /vol6-explorer               public
│   └─ /message-class-rules         GATED (cod2026)
└─ (future)  /2027-28, /obbb, /warrior-bits ...
```

## The 5 artifacts: friendly names + your story for each

### 1. COD XML Schema Diff: 2025-26 vs 2026-27
**Source:** `2026-02-28-xml-schema-diff-2025-26-vs-2026-27.html` · **URL:** `/2026-27/xml-schema-diff` · **Public**

> Every COD annual update lands as a new XML schema, and every team I have worked with reads that schema differently the first time. So I sat with both schemas side by side and built a single view that calls out exactly which elements were added, which moved, which were renamed, and which got new validation rules. The point was not to replace the spec, the point was to make a 200 page change feel like a 20 minute read. Engineering used it to scope, QA used it to plan test data, and Implementation used it to talk to clients without having to translate XSD in their head.

### 2. COD XML Sample Payload Comparison
**Source:** `Xml_Sample_Differences_Dashboard.html` · **URL:** `/2026-27/xml-sample-comparison` · **Public**

> Schema diffs tell you the shape, sample payloads tell you the truth. After the schema diff went out, the next question was always the same: show me a real before and after. So I built a side by side viewer for the COD sample XML payloads, with the changed nodes highlighted inline. No more two browser tabs and a coffee. This one was the most popular with the test data folks because they could finally agree on what a 26-27 disbursement record actually looks like.

### 3. COD Vol. 6 Import Report Changelog (2026-27)
**Source:** `2026-03-03-COD-Vol6-Changes-Visual.html` · **URL:** `/2026-27/vol6-changelog` · **Public**

> Vol. 6 is where the import report changes live, and it is the document the most people pretend to have read. I worked through the 26-27 edition end to end and turned it into a visual changelog: what was added, what shifted, what is new vs cosmetic, with the regulatory tag and effective dates next to each change. The version of this I shipped internally cut Vol. 6 walkthrough meetings from an hour to about fifteen minutes, because nobody had to ask "wait, which page" anymore.

### 4. COD Vol. 6 Field-by-Field Change Explorer
**Source:** `COD-Vol6-Changes-Dashboard.html` · **URL:** `/2026-27/vol6-explorer` · **Public**

> The changelog is the narrative, this is the database behind it. An interactive dashboard that lets you filter every Vol. 6 import report change between 25-26 and 26-27 by status (added, shifted, modified, removed, new), by section, and by impact. Built originally so I could answer "is this field affected" in one click instead of one meeting. Turned out the QA team had it pinned all cycle, which is when I realized the real value was not the analysis, it was that everyone was finally reading from the same row.

### 5. Message Class Award Year Rules
**Source:** `Hide-Show_Message_Classes.html` · **URL:** `/2026-27/message-class-rules` · **Gated (cod2026)**

> When the award year flips, half the message classes our products surface need to disappear or come back, and the rules are not always intuitive. I built a single matrix that shows every relevant message class, what it does, and exactly which combination of award year, loan limit exception flag, and grade level makes it appear or hide. This one stays behind a password because it includes the vendor specific class codes and behaviors, but if you have the gate password the full logic is right there, no slides, no tribal knowledge.

## `/2026-27` cycle landing intro (your voice, drop-in)

> ### COD Annual Update 2026-27
>
> Every COD annual update is, on paper, the same exercise: read the new tech reference, diff the schema, update the import report mappings, retest. In practice it is the moment of the year where engineering, QA, implementation, and product all need to be looking at exactly the same row of exactly the same table at exactly the same time, or the cycle slips.
>
> The hard part is almost never the requirement. The hard part is the communication. Getting twenty people on the same page about what changed, what stayed, what is cosmetic, and what is going to break a customer in production, that is the whole job.
>
> So I built these. Five artifacts that turned the 26-27 COD cycle from a stack of PDFs into something people could actually point at. I shipped them to my team, and the feedback I got back was that this was what they were genuinely depending on during testing, not the spec. That was the moment I knew this belonged outside the team too.
>
> Below are the artifacts, in roughly the order I would read them in if I were starting this cycle today.

## Build order (each step = one follow-up turn)

1. **Foundation** — new `cod.myproduct.life` project scaffold, brand tokens (light maroon primary, cream surface, complementary accent), shared shell (header, footer, breadcrumbs, "last updated" stamp), AccessGate component using `cod2026`, `/` hub, `/2026-27` landing with the intro above.
2. **XML Schema Diff** (Artifact 1).
3. **XML Sample Comparison** (Artifact 2).
4. **Vol. 6 Changelog** (Artifact 3).
5. **Vol. 6 Explorer** (Artifact 4).
6. **Message Class Rules** (Artifact 5) behind the gate.
7. **Polish & launch** — per artifact OG images, JSON-LD Article schema, sitemap (gated routes set to noindex), robots.txt, DNS instructions for pointing `cod.myproduct.life` at the new project.

Approve this and I will start step 1.